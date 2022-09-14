import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import BN from "bn.js";
import { ethers, BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { CeramicClient } from "@ceramicnetwork/http-client";
import {
  Modal,
  Container,
  Row,
  Col,
  Form,
  Table,
  Image,
  Button,
} from "react-bootstrap";
import {
  // eslint-disable-next-line import/named
  AccountTokenSnapshot,
  NativeAssetSuperToken,
} from "@superfluid-finance/sdk-core";
import { DataModel } from "@glazed/datamodel";
import { model as GeoWebModel } from "@geo-web/datamodels";
import { AssetId, AccountId } from "caip";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import { FlowingBalance } from "./FlowingBalance";
import { CopyTokenAddress, TokenOptions } from "../CopyTokenAddress";
import { AssetContentManager } from "../../lib/AssetContentManager";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import {
  AUCTION_LENGTH,
  PAYMENT_TOKEN,
  NETWORK_ID,
  SECONDS_IN_WEEK,
  SECONDS_IN_YEAR,
} from "../../lib/constants";
import { getETHBalance } from "../../lib/getBalance";
import { truncateStr, truncateEth } from "../../lib/truncate";
import {
  fromValueToRate,
  calculateBufferNeeded,
  calculateAuctionValue,
} from "../../lib/utils";
import { STATE, GeoPoint } from "../Map";

const LON_OFFSET = 0.00085;
const LAT_OFFSET = 0.0002;

type ProfileModalProps = {
  accountTokenSnapshot: AccountTokenSnapshot;
  account: string;
  ceramic: CeramicClient;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  provider: ethers.providers.Web3Provider;
  paymentToken: NativeAssetSuperToken;
  showProfile: boolean;
  disconnectWallet: () => Promise<void>;
  handleCloseProfile: () => void;
  setPortfolioParcelCoords: React.Dispatch<
    React.SetStateAction<GeoPoint | null>
  >;
  isPortfolioToUpdate: boolean;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  setIsPortfolioToUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

interface Portfolio {
  parcelId: string;
  status: string;
  actionDate: string;
  name: string;
  price: BigNumber;
  fee: BigNumber;
  buffer: BigNumber;
  action: string;
  coords: GeoPoint;
}

interface PortfolioTotal {
  price: BigNumber;
  fee: BigNumber;
  buffer: BigNumber;
}

enum SuperTokenAction {
  WRAP,
  UNWRAP,
}

enum SortOrder {
  ASC,
  DESC,
}

enum PortfolioAction {
  VIEW = "View",
  RESPOND = "Respond",
  RECLAIM = "Reclaim",
  TRIGGER = "Trigger",
}

const portfolioQuery = gql`
  query Bidders($id: String) {
    bidder(id: $id) {
      bids {
        parcel {
          id
          licenseOwner
          licenseDiamond
          currentBid {
            forSalePrice
            perSecondFeeNumerator
            perSecondFeeDenominator
            timestamp
          }
          pendingBid {
            forSalePrice
            perSecondFeeDenominator
            perSecondFeeNumerator
            timestamp
            contributionRate
          }
          coordinates {
            pointTL {
              lon
              lat
            }
          }
        }
      }
    }
  }
`;

function ProfileModal(props: ProfileModalProps) {
  const {
    accountTokenSnapshot,
    account,
    ceramic,
    registryContract,
    setSelectedParcelId,
    setInteractionState,
    provider,
    paymentToken,
    showProfile,
    disconnectWallet,
    handleCloseProfile,
    setPortfolioNeedActionCount,
    setPortfolioParcelCoords,
    isPortfolioToUpdate,
    setIsPortfolioToUpdate,
  } = props;

  const [ETHBalance, setETHBalance] = useState<string>("");
  const [isWrapping, setIsWrapping] = useState<boolean>(false);
  const [isUnWrapping, setIsUnwrapping] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [portfolioTotal, setPortfolioTotal] = useState<PortfolioTotal>();
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [lastSorted, setLastSorted] = useState("");

  const { data, refetch } = useQuery(portfolioQuery, {
    variables: {
      id: account,
    },
  });

  useEffect(() => {
    let isMounted = true;

    const initBalance = async () => {
      if (provider && account) {
        try {
          const ethBalance = await getETHBalance(provider, account);

          if (isMounted) {
            setETHBalance(ethBalance);
          }
        } catch (error) {
          console.error(error);
        }
      }
    };

    initBalance();

    return () => {
      isMounted = false;
    };
  }, [provider, account]);

  useEffect(() => {
    if (!data || !data.bidder) {
      return;
    }

    let isMounted = true;

    const bids = data.bidder.bids;
    const _portfolio: Portfolio[] = [];
    const promises = [];

    for (const bid of bids) {
      let status: string;
      let actionDate: string;
      let forSalePrice: BigNumber;
      let perSecondFeeNumerator: BigNumber;
      let perSecondFeeDenominator: BigNumber;
      let annualFee: BigNumber;
      let buffer: BigNumber;
      let action: string;

      const parcelId = bid.parcel.id;
      const licenseOwner = bid.parcel.licenseOwner;
      const currentBid = bid.parcel.currentBid;
      const pendingBid = bid.parcel.pendingBid;
      const coords = bid.parcel.coordinates;
      const signer = provider.getSigner();
      const licenseDiamondContract = PCOLicenseDiamondFactory.connect(
        bid.parcel.licenseDiamond,
        signer
      );

      if (licenseOwner === account) {
        if (!pendingBid || BigNumber.from(pendingBid.forSalePrice).eq(0)) {
          status = "Valid";
          actionDate = "";
          forSalePrice = BigNumber.from(currentBid.forSalePrice);
          perSecondFeeNumerator = BigNumber.from(
            currentBid.perSecondFeeNumerator
          );
          perSecondFeeDenominator = BigNumber.from(
            currentBid.perSecondFeeDenominator
          );
          action = PortfolioAction.VIEW;
        } else if (BigNumber.from(pendingBid.contributionRate).gt(0)) {
          status = "Incoming Bid";
          actionDate = dayjs
            .unix(pendingBid.timestamp)
            .add(7, "day")
            .format("YYYY/MM/D");
          forSalePrice = BigNumber.from(pendingBid.forSalePrice);
          perSecondFeeNumerator = BigNumber.from(
            pendingBid.perSecondFeeNumerator
          );
          perSecondFeeDenominator = BigNumber.from(
            pendingBid.perSecondFeeDenominator
          );
          action = PortfolioAction.RESPOND;
        } else {
          continue;
        }
      } else if (pendingBid) {
        status = "Outgoing Bid";
        actionDate = dayjs
          .unix(pendingBid.timestamp)
          .add(7, "day")
          .format("YYYY/MM/D");
        forSalePrice = BigNumber.from(pendingBid.forSalePrice);
        perSecondFeeNumerator = BigNumber.from(
          pendingBid.perSecondFeeNumerator
        );
        perSecondFeeDenominator = BigNumber.from(
          pendingBid.perSecondFeeDenominator
        );
        action = PortfolioAction.VIEW;
      } else {
        continue;
      }

      const perSecondFee = fromValueToRate(
        forSalePrice,
        perSecondFeeNumerator,
        perSecondFeeDenominator
      );
      annualFee = perSecondFee.mul(SECONDS_IN_YEAR);
      buffer = calculateBufferNeeded(annualFee, NETWORK_ID);

      const assetContentManager = getAssetContentManager(
        parcelId,
        licenseOwner
      ) as AssetContentManager;
      const basicProfileStreamManager = new BasicProfileStreamManager(
        assetContentManager
      );

      const promiseChain = licenseDiamondContract
        .contributionRate()
        .then((ownerBidContributionRate) => {
          if (pendingBid && BigNumber.from(pendingBid.forSalePrice).gt(0)) {
            const deadline = pendingBid.timestamp + SECONDS_IN_WEEK;
            const isPastDeadline = deadline * 1000 <= Date.now();
            if (isPastDeadline || ownerBidContributionRate.eq(0)) {
              status = "Needs Tranfer";
              actionDate = dayjs
                .unix(
                  deadline < Number(pendingBid.timestamp)
                    ? deadline
                    : pendingBid.timestamp
                )
                .format("YYYY/MM/D");
              forSalePrice = BigNumber.from(pendingBid.forSalePrice);
              perSecondFeeNumerator = BigNumber.from(
                pendingBid.perSecondFeeNumerator
              );
              perSecondFeeDenominator = BigNumber.from(
                pendingBid.perSecondFeeDenominator
              );
              action = PortfolioAction.TRIGGER;
            }
          }
        })
        .then(() => licenseDiamondContract.isPayerBidActive())
        .then((isPayerBidActive) => {
          if (licenseOwner === account && !isPayerBidActive) {
            status = "In Foreclosure";
            actionDate = dayjs.unix(currentBid.timestamp).format("YYYY/MM/D");
            forSalePrice = calculateAuctionValue(
              forSalePrice,
              BigNumber.from(currentBid.timestamp),
              AUCTION_LENGTH
            );
            annualFee = BigNumber.from(0);
            buffer = BigNumber.from(0);
            action = PortfolioAction.RECLAIM;
          }
        })
        .then(() => assetContentManager.getRecordID("basicProfile"))
        .then((basicProfileStreamId) =>
          basicProfileStreamManager.setExistingStreamId(basicProfileStreamId)
        )
        .then(() => {
          const parcelContent = basicProfileStreamManager.getStreamContent();
          const name =
            parcelContent && parcelContent.name
              ? parcelContent.name
              : `Parcel ${parcelId}`;

          _portfolio.push({
            parcelId: parcelId,
            status: status,
            actionDate: actionDate,
            name: name,
            price: forSalePrice,
            fee: annualFee,
            buffer: buffer,
            action: action,
            coords: {
              lon: Number(coords[0].pointTL.lon) + LON_OFFSET,
              lat: Number(coords[0].pointTL.lat) + LAT_OFFSET,
            },
          });
        });

      promises.push(promiseChain);
    }

    Promise.all(promises).then(() => {
      if (_portfolio.length > 0) {
        let needActionCount = 0;

        for (const parcel of _portfolio) {
          if (
            parcel.action === PortfolioAction.RESPOND ||
            parcel.action === PortfolioAction.RECLAIM ||
            parcel.action === PortfolioAction.TRIGGER
          ) {
            needActionCount++;
          }
        }

        const total = {
          price: calcTotal(_portfolio, "price"),
          fee: calcTotal(_portfolio, "fee"),
          buffer: calcTotal(_portfolio, "buffer"),
        };
        const sorted = sortPortfolio(_portfolio, "parcelId");

        if (isMounted) {
          setPortfolioNeedActionCount(needActionCount);
          setPortfolioTotal(total);
          setPortfolio(sorted);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [data]);

  useEffect(() => {
    if (isPortfolioToUpdate) {
      setTimeout(() => refetch({ id: account }), 5000);
      setIsPortfolioToUpdate(false);
    }
  }, [isPortfolioToUpdate]);

  const tokenOptions: TokenOptions = useMemo(
    () => ({
      address: paymentToken.address,
      symbol: PAYMENT_TOKEN,
      decimals: 18,
      image: "",
      size: "small",
    }),
    [paymentToken.address]
  );

  const deactivateProfile = (): void => {
    disconnectWallet();
    handleCloseProfile();
  };

  const getAssetContentManager = (
    parcelId: string,
    licenseOwner: string
  ): AssetContentManager | void => {
    if (ceramic == null || !ceramic.did) {
      console.error("Ceramic instance not found");
      return;
    }

    const assetId = new AssetId({
      chainId: `eip155:${NETWORK_ID}`,
      assetName: {
        namespace: "erc721",
        reference: registryContract.address.toLowerCase(),
      },
      tokenId: new BN(parcelId.slice(2), "hex").toString(10),
    });

    const accountId = new AccountId({
      chainId: `eip155:${NETWORK_ID}`,
      address: licenseOwner,
    });

    const model = new DataModel({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ceramic: ceramic as any,
      aliases: GeoWebModel,
    });

    const assetContentManager = new AssetContentManager(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ceramic as any,
      model,
      `did:pkh:${accountId.toString()}`,
      assetId
    );

    return assetContentManager;
  };

  const executeSuperTokenTransaction = async (
    amount: string,
    action: SuperTokenAction
  ): Promise<void> => {
    let txn: ethers.providers.TransactionResponse | null = null;

    if (action === SuperTokenAction.WRAP) {
      txn = await paymentToken
        .upgrade({
          amount: ethers.utils.parseEther(amount).toString(),
        })
        .exec(provider.getSigner());

      setIsWrapping(true);
    } else if (action === SuperTokenAction.UNWRAP) {
      txn = await paymentToken
        .downgrade({
          amount: ethers.utils.parseEther(amount).toString(),
        })
        .exec(provider.getSigner());

      setIsUnwrapping(true);
    }

    try {
      if (txn === null) {
        return;
      }

      await txn.wait();

      const ethBalance = await getETHBalance(provider, account);

      setETHBalance(ethBalance);
    } catch (error) {
      console.error(error);
    }

    if (action === SuperTokenAction.WRAP) {
      setIsWrapping(false);
    } else if (action === SuperTokenAction.UNWRAP) {
      setIsUnwrapping(false);
    }
  };

  const handleOnSubmit = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e: any,
    action: SuperTokenAction
  ): Promise<void> => {
    e.preventDefault();
    const amount = e.target[0].value;

    if (!Number.isNaN(amount) && amount > 0) {
      await executeSuperTokenTransaction(amount, action);
      e.target.reset();
    }
  };

  const calcTotal = (
    portfolio: Portfolio[],
    field: keyof Portfolio
  ): BigNumber =>
    portfolio
      .map((parcel) => parcel[field] as BigNumber)
      .reduce((prev, curr) => prev.add(curr));

  const sortPortfolio = (
    portfolio: Portfolio[],
    field: keyof Portfolio
  ): Portfolio[] => {
    const sorted = [...portfolio].sort((a, b) => {
      let result = 0;

      if (field !== lastSorted) {
        result = a[field] > b[field] ? 1 : -1;
      } else {
        if (sortOrder === SortOrder.ASC) {
          result = a[field] > b[field] ? 1 : -1;
        } else if (sortOrder === SortOrder.DESC) {
          result = a[field] > b[field] ? -1 : 1;
        }
      }
      return result;
    });

    setSortOrder(
      field !== lastSorted
        ? SortOrder.DESC
        : sortOrder === SortOrder.ASC
        ? SortOrder.DESC
        : SortOrder.ASC
    );
    setLastSorted(field);

    return sorted;
  };

  const handlePortfolioAction = (parcel: Portfolio): void => {
    switch (parcel.action) {
      case PortfolioAction.VIEW:
      case PortfolioAction.RESPOND:
      case PortfolioAction.TRIGGER:
        setInteractionState(STATE.PARCEL_SELECTED);
        break;
      case PortfolioAction.RECLAIM:
        setInteractionState(STATE.PARCEL_RECLAIMING);
        break;
      default:
        break;
    }

    setSelectedParcelId(parcel.parcelId);
    setPortfolioParcelCoords(parcel.coords);
  };

  return (
    <Modal
      show={showProfile}
      keyboard={false}
      centered
      onHide={handleCloseProfile}
      size="xl"
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0">
        <Container>
          <Row>
            <Col className="text-light fs-1 d-flex align-items-center" sm="10">
              Account: {truncateStr(account, 14)}
              <Button
                onClick={deactivateProfile}
                variant="info"
                className="ms-4"
              >
                Disconnect
              </Button>
            </Col>
            <Col sm="2" className="text-end">
              <Button
                variant="link"
                size="sm"
                onClick={() => handleCloseProfile()}
              >
                <Image style={{ width: "36px" }} src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light text-start">
        <Row>
          <Col className="mx-2 fs-6">
            <Image src="notice.svg" className="me-2" />
            {accountTokenSnapshot &&
            accountTokenSnapshot.maybeCriticalAtTimestamp &&
            Number(accountTokenSnapshot.maybeCriticalAtTimestamp) >
              Date.now() / 1000
              ? `At the current rate, your ETHx balance will reach 0 on ${dayjs
                  .unix(accountTokenSnapshot.maybeCriticalAtTimestamp)
                  .format("MMM D, YYYY h:mmA.")}`
              : "Your ETHx balance is 0. Any Geo Web parcels you previously licensed have been put in foreclosure."}
          </Col>
        </Row>
        <Row className="mt-3">
          <Col className="p-3 ms-3 fs-6 border border-purple rounded" sm="3">
            <span style={{ marginLeft: "15px" }}>{`ETH: ${ETHBalance}`}</span>
            <Form
              id="wrapForm"
              className="form-inline"
              noValidate
              onSubmit={(e) => handleOnSubmit(e, SuperTokenAction.WRAP)}
              style={{ marginTop: "46px", marginLeft: "15px", width: "218px" }}
            >
              <Form.Control
                required
                autoFocus
                type="text"
                className="mb-2"
                id="amount"
                placeholder="0.00"
                size="sm"
              />
              <Button
                variant="secondary"
                type="submit"
                disabled={isWrapping}
                size="sm"
                className="w-100"
              >
                {isWrapping ? "Wrapping..." : "Wrap"}
              </Button>
            </Form>
          </Col>
          <Col
            sm="1"
            className="p-0 mt-auto mb-auto d-flex justify-content-center"
          >
            <Image src="exchange.svg" />
          </Col>
          <Col className="p-3 fs-6 border border-purple rounded" sm="3">
            <div style={{ marginLeft: "15px" }}>
              {`${PAYMENT_TOKEN}: `}
              <FlowingBalance
                format={(x) => ethers.utils.formatUnits(x)}
                accountTokenSnapshot={accountTokenSnapshot}
              />
            </div>
            <div
              style={{
                maxWidth: "220px",
                height: "auto",
                margin: "5px 0px 8px 15px",
              }}
            >
              <CopyTokenAddress options={tokenOptions} />
            </div>
            <Form
              noValidate
              onSubmit={(e) => handleOnSubmit(e, SuperTokenAction.UNWRAP)}
              style={{ width: "220px", marginLeft: "15px" }}
            >
              <Form.Control
                required
                autoFocus
                type="text"
                className="mb-2"
                placeholder="0.00"
                size="sm"
              />
              <Button
                variant="primary"
                type="submit"
                disabled={isUnWrapping}
                size="sm"
                className="w-100"
              >
                {isWrapping ? "Unwrapping..." : "Unwrap"}
              </Button>
            </Form>
          </Col>
        </Row>
        <Row className="mt-3 ps-3 fs-1">Portfolio</Row>
        <Row className="scrollable-table">
          {portfolioTotal && portfolio.length > 0 ? (
            <Table
              bordered
              className="m-3 text-light border border-purple flex-shrink-1"
            >
              <thead>
                <tr>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "parcelId"))
                    }
                  >
                    Parcel ID
                  </th>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "status"))
                    }
                  >
                    Status
                  </th>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "actionDate"))
                    }
                  >
                    Action Date
                  </th>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "name"))
                    }
                  >
                    Name
                  </th>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "price"))
                    }
                  >
                    Price|Bid
                  </th>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "fee"))
                    }
                  >
                    Fee/Yr
                  </th>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "buffer"))
                    }
                  >
                    Buffer Deposit
                  </th>
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "action"))
                    }
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((parcel, i) => {
                  return (
                    <tr key={i}>
                      <td>{parcel.parcelId}</td>
                      <td
                        className={
                          parcel.status === "Valid" ||
                          parcel.status === "Outgoing Bid"
                            ? ""
                            : "text-danger"
                        }
                      >
                        {parcel.status}
                      </td>
                      <td
                        className={
                          parcel.status === "Valid" ||
                          parcel.status === "Outgoing Bid"
                            ? ""
                            : "text-danger"
                        }
                      >
                        {parcel.actionDate}
                      </td>
                      <td>{parcel.name}</td>
                      <td>
                        {truncateEth(ethers.utils.formatEther(parcel.price), 8)}
                      </td>
                      <td>
                        {parcel.action === PortfolioAction.RECLAIM
                          ? ""
                          : truncateEth(
                              ethers.utils.formatEther(parcel.fee),
                              8
                            )}
                      </td>
                      <td>
                        {parcel.action === PortfolioAction.RECLAIM
                          ? ""
                          : truncateEth(
                              ethers.utils.formatEther(parcel.buffer),
                              8
                            )}
                      </td>
                      <td>
                        <Button
                          variant={
                            parcel.action === PortfolioAction.VIEW
                              ? "primary"
                              : "danger"
                          }
                          className="w-100"
                          onClick={() => handlePortfolioAction(parcel)}
                        >
                          {parcel.action}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="text-center" colSpan={4}>
                    Total
                  </td>
                  <td>
                    {truncateEth(
                      ethers.utils.formatEther(portfolioTotal.price),
                      8
                    )}
                  </td>
                  <td>
                    {truncateEth(
                      ethers.utils.formatEther(portfolioTotal.fee),
                      8
                    )}
                  </td>
                  <td>
                    {truncateEth(
                      ethers.utils.formatEther(portfolioTotal.buffer),
                      8
                    )}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </Table>
          ) : (
            <span
              style={{
                height: "128px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              No parcel yet...
            </span>
          )}
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default ProfileModal;
