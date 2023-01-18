import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import BN from "bn.js";
import { ethers, BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import type { CeramicClient } from "@ceramicnetwork/http-client";
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
  Framework,
} from "@superfluid-finance/sdk-core";
import { AssetId, AccountId } from "caip";
import { GeoWebContent } from "@geo-web/content";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import type { IPFS } from "ipfs-core-types";
import { FlowingBalance } from "./FlowingBalance";
import { CopyTokenAddress, TokenOptions } from "../CopyTokenAddress";
import {
  PAYMENT_TOKEN,
  NETWORK_ID,
  SECONDS_IN_WEEK,
  SECONDS_IN_YEAR,
} from "../../lib/constants";
import { getETHBalance } from "../../lib/getBalance";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import { truncateStr, truncateEth } from "../../lib/truncate";
import { calculateBufferNeeded, calculateAuctionValue } from "../../lib/utils";
import { STATE } from "../Map";
import type { Point } from "@turf/turf";
import * as turf from "@turf/turf";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

interface ProfileModalProps {
  accountTokenSnapshot: AccountTokenSnapshot;
  account: string;
  sfFramework: Framework;
  ceramic: CeramicClient;
  ipfs: IPFS;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  provider: ethers.providers.Web3Provider;
  paymentToken: NativeAssetSuperToken;
  showProfile: boolean;
  disconnectWallet: () => void;
  handleCloseProfile: () => void;
  setPortfolioParcelCenter: React.Dispatch<React.SetStateAction<Point | null>>;
  isPortfolioToUpdate: boolean;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  setIsPortfolioToUpdate: React.Dispatch<React.SetStateAction<boolean>>;
}

interface PortfolioParcel {
  parcelId: string;
  status: string;
  actionDate: string;
  name: string;
  price: BigNumber;
  fee: BigNumber;
  buffer: BigNumber;
  action: string;
  center: Point;
}

interface PortfolioTotal {
  price: BigNumber;
  fee: BigNumber;
  buffer: BigNumber;
}

interface Bid {
  contributionRate: string;
  perSecondFeeNumerator: string;
  perSecondFeeDenominator: string;
  forSalePrice: string;
  timestamp: number;
  bidder?: { id: string };
}

interface GeoWebParcel {
  id: string;
  licenseOwner: string;
  licenseDiamond: string;
  currentBid: Bid;
  pendingBid?: Bid;
  bboxN: number;
  bboxS: number;
  bboxE: number;
  bboxW: number;
}

interface BidderBid {
  parcel: GeoWebParcel;
}

interface Bidder {
  bids: BidderBid[];
}

interface BidderQuery {
  bidder: Bidder;
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
  query Bidder($id: String) {
    bidder(id: $id) {
      bids {
        parcel {
          id
          licenseOwner
          licenseDiamond
          currentBid {
            forSalePrice
            contributionRate
            perSecondFeeNumerator
            perSecondFeeDenominator
            timestamp
          }
          pendingBid {
            forSalePrice
            perSecondFeeNumerator
            perSecondFeeDenominator
            timestamp
            contributionRate
          }
          bboxN
          bboxS
          bboxE
          bboxW
        }
      }
    }
  }
`;

function ProfileModal(props: ProfileModalProps) {
  const {
    accountTokenSnapshot,
    sfFramework,
    account,
    geoWebContent,
    registryContract,
    setSelectedParcelId,
    setInteractionState,
    provider,
    paymentToken,
    showProfile,
    disconnectWallet,
    handleCloseProfile,
    setPortfolioNeedActionCount,
    setPortfolioParcelCenter,
    isPortfolioToUpdate,
    setIsPortfolioToUpdate,
  } = props;

  const [ETHBalance, setETHBalance] = useState<string>("");
  const [wrappingAmount, setWrappingAmount] = useState<string>("");
  const [unwrappingAmount, setUnwrappingAmount] = useState<string>("");
  const [wrappingError, setWrappingError] = useState<string>("");
  const [unwrappingError, setUnwrappingError] = useState<string>("");
  const [isWrapping, setIsWrapping] = useState<boolean>(false);
  const [isUnWrapping, setIsUnwrapping] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<PortfolioParcel[]>([]);
  const [portfolioTotal, setPortfolioTotal] = useState<PortfolioTotal>();
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [lastSorted, setLastSorted] = useState("");
  const [timerId, setTimerId] = useState<NodeJS.Timer | null>(null);

  const { data, refetch } = useQuery<BidderQuery>(portfolioQuery, {
    variables: {
      id: account,
    },
  });

  const { superTokenBalance } = useSuperTokenBalance(
    account,
    paymentToken.address
  );

  const paymentTokenBalance = ethers.utils.formatEther(superTokenBalance);
  const isOutOfBalanceWrap =
    wrappingAmount !== "" &&
    ETHBalance !== "" &&
    Number(wrappingAmount) > Number(ETHBalance);
  const isOutOfBalanceUnwrap =
    unwrappingAmount !== "" &&
    paymentTokenBalance !== "" &&
    Number(unwrappingAmount) > Number(paymentTokenBalance);
  useEffect(() => {
    let isMounted = true;

    const initBalance = async () => {
      if (sfFramework.settings.provider && account) {
        try {
          const ethBalance = await getETHBalance(
            sfFramework.settings.provider,
            account
          );

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
  }, [sfFramework, account]);

  useEffect(() => {
    if (!data || !data.bidder) {
      return;
    }

    let isMounted = true;

    const bids = data.bidder.bids;
    const _portfolio: PortfolioParcel[] = [];
    const promises = [];

    for (const bid of bids) {
      let status: string;
      let actionDate: string;
      let forSalePrice: BigNumber;
      let contributionRate: BigNumber;
      let perSecondFeeNumerator: BigNumber;
      let perSecondFeeDenominator: BigNumber;
      let annualFee: BigNumber;
      let buffer: BigNumber;
      let action: string;
      let auctionStart: number;
      let foreclosureInfoPromise: Promise<void>;

      const parcelId = bid.parcel.id;
      const licenseOwner = bid.parcel.licenseOwner;
      const currentBid = bid.parcel.currentBid;
      const pendingBid = bid.parcel.pendingBid;
      const signer = provider.getSigner();
      const licenseDiamondAddress = bid.parcel.licenseDiamond;
      const licenseDiamondContract = PCOLicenseDiamondFactory.connect(
        licenseDiamondAddress,
        signer
      );

      if (licenseOwner === account) {
        if (!pendingBid || BigNumber.from(pendingBid.contributionRate).eq(0)) {
          status = "Valid";
          actionDate = "";
          forSalePrice = BigNumber.from(currentBid.forSalePrice);
          contributionRate = BigNumber.from(currentBid.contributionRate);
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
            .format("YYYY-MM-DD");
          forSalePrice = BigNumber.from(pendingBid.forSalePrice);
          contributionRate = BigNumber.from(pendingBid.contributionRate);
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
      } else if (
        pendingBid &&
        BigNumber.from(pendingBid.contributionRate).gt(0)
      ) {
        status = "Outgoing Bid";
        actionDate = dayjs
          .unix(pendingBid.timestamp)
          .add(7, "day")
          .format("YYYY-MM-DD");
        forSalePrice = BigNumber.from(pendingBid.forSalePrice);
        contributionRate = BigNumber.from(pendingBid.contributionRate);
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

      const annualFeePercentage =
        (perSecondFeeNumerator.toNumber() * SECONDS_IN_YEAR * 100) /
        perSecondFeeDenominator.toNumber();

      annualFee = forSalePrice.mul(annualFeePercentage).div(100);

      const promiseChain = licenseDiamondContract
        .shouldBidPeriodEndEarly()
        .then((shouldBidPeriodEndEarly) => {
          if (pendingBid && BigNumber.from(pendingBid.contributionRate).gt(0)) {
            const deadline = Number(pendingBid.timestamp) + SECONDS_IN_WEEK;
            const isPastDeadline = deadline * 1000 <= Date.now();
            if (isPastDeadline || shouldBidPeriodEndEarly) {
              status = "Needs Transfer";
              actionDate = dayjs
                .unix(
                  deadline < Number(currentBid.timestamp)
                    ? deadline
                    : currentBid.timestamp
                )
                .format("YYYY-MM-DD");
              forSalePrice = BigNumber.from(pendingBid.forSalePrice);
              contributionRate = BigNumber.from(pendingBid.contributionRate);
              action = PortfolioAction.TRIGGER;
            }
          }
        })
        .then(() =>
          calculateBufferNeeded(sfFramework, paymentToken, contributionRate)
        )
        .then((bufferNeeded) => {
          buffer = bufferNeeded.mul(2);
        })
        .then(() => licenseDiamondContract.isPayerBidActive())
        .then((isPayerBidActive) => {
          if (licenseOwner === account && !isPayerBidActive) {
            foreclosureInfoPromise = sfFramework.cfaV1
              .getAccountFlowInfo({
                superToken: paymentToken.address,
                account: licenseDiamondAddress,
                providerOrSigner: sfFramework.settings.provider,
              })
              .then(({ timestamp }) => {
                auctionStart = timestamp.getTime() / 1000;
              })
              .then(() => registryContract.getReclaimAuctionLength())
              .then((auctionLength) => {
                status = "In Foreclosure";
                actionDate = dayjs.unix(auctionStart).format("YYYY-MM-DD");
                forSalePrice = calculateAuctionValue(
                  forSalePrice,
                  BigNumber.from(auctionStart),
                  BigNumber.from(auctionLength)
                );
                annualFee = BigNumber.from(0);
                buffer = BigNumber.from(0);
                action = PortfolioAction.RECLAIM;
              });
          }
        })
        .then(() => Promise.resolve(foreclosureInfoPromise))
        .then(() => getParcelContent(geoWebContent, parcelId, licenseOwner))
        .then((parcelContent) => {
          const name =
            parcelContent && parcelContent.name
              ? parcelContent.name
              : `Parcel ${parcelId}`;

          const poly = turf.bboxPolygon([
            bid.parcel.bboxW,
            bid.parcel.bboxS,
            bid.parcel.bboxE,
            bid.parcel.bboxN,
          ]);
          const center = turf.center(poly);

          _portfolio.push({
            parcelId: parcelId,
            status: status,
            actionDate: actionDate,
            name: name,
            price: forSalePrice,
            fee: annualFee,
            buffer: buffer,
            action: action,
            center: center.geometry,
          });
        });

      promises.push(promiseChain);
    }

    Promise.all(promises).then(() => {
      if (isMounted) {
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

        setPortfolioNeedActionCount(needActionCount);
        setPortfolioTotal(total);
        setPortfolio(sorted);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [data]);

  useEffect(() => {
    if (!isPortfolioToUpdate) {
      return;
    }

    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
      setIsPortfolioToUpdate(false);
      return;
    }

    const intervalId = setInterval(() => {
      refetch({ id: account });
    }, 4000);

    setTimerId(intervalId);

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isPortfolioToUpdate, data]);

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

  const getParcelContent = async (
    geoWebContent: GeoWebContent,
    parcelId: string,
    licenseOwner: string
  ) => {
    try {
      const assetId = new AssetId({
        chainId: `eip155:${NETWORK_ID}`,
        assetName: {
          namespace: "erc721",
          reference: registryContract.address.toLowerCase(),
        },
        tokenId: new BN(parcelId.slice(2), "hex").toString(10),
      });
      const ownerId = new AccountId({
        chainId: `eip155:${NETWORK_ID}`,
        address: licenseOwner,
      });
      const parcelContent = await geoWebContent.raw.getPath("/basicProfile", {
        parcelId: assetId,
        ownerId,
      });

      return parcelContent;
    } catch (err) {
      console.error(err);
    }
  };

  const executeSuperTokenTransaction = async (
    amount: string,
    action: SuperTokenAction
  ): Promise<void> => {
    let txn: ethers.providers.TransactionResponse | null = null;

    try {
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

      if (txn === null) {
        return;
      }

      await txn.wait();

      const ethBalance = await getETHBalance(
        sfFramework.settings.provider,
        account
      );

      setETHBalance(ethBalance);

      if (action === SuperTokenAction.WRAP) {
        setWrappingAmount("");
        setWrappingError("");
      } else {
        setUnwrappingAmount("");
        setUnwrappingError("");
      }
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        const message = (err as any).reason
          ? (err as any).reason
              .replace("execution reverted: ", "")
              .replace(/([^.])$/, "$1.")
          : (err as Error).message;
        if (action === SuperTokenAction.WRAP) {
          setWrappingError(message);
        } else {
          setUnwrappingError(message);
        }
        console.error(err);
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    if (action === SuperTokenAction.WRAP) {
      setIsWrapping(false);
      setWrappingAmount("");
    } else if (action === SuperTokenAction.UNWRAP) {
      setIsUnwrapping(false);
      setUnwrappingAmount("");
    }
  };

  const handleSubmit = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e: any,
    amount: string,
    action: SuperTokenAction
  ): Promise<void> => {
    e.preventDefault();

    if (!Number.isNaN(amount) && Number(amount) > 0) {
      await executeSuperTokenTransaction(amount, action);
    }
  };

  const calcTotal = (
    portfolio: PortfolioParcel[],
    field: keyof PortfolioParcel
  ): BigNumber =>
    portfolio
      .map((parcel) => parcel[field] as BigNumber)
      .reduce((prev, curr) => prev.add(curr), BigNumber.from(0));

  const sortPortfolio = (
    portfolio: PortfolioParcel[],
    field: keyof PortfolioParcel
  ): PortfolioParcel[] => {
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

  const handlePortfolioAction = (parcel: PortfolioParcel): void => {
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
    setPortfolioParcelCenter(parcel.center);
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
            {accountTokenSnapshot &&
              accountTokenSnapshot.totalNumberOfActiveStreams > 0 && (
                <Image src="notice.svg" className="me-2" />
              )}
            {!accountTokenSnapshot ||
            accountTokenSnapshot.totalNumberOfActiveStreams === 0
              ? null
              : accountTokenSnapshot.maybeCriticalAtTimestamp &&
                Number(accountTokenSnapshot.maybeCriticalAtTimestamp) >
                  Date.now() / 1000
              ? `At the current rate, your ETHx balance will reach 0 on ${dayjs
                  .unix(accountTokenSnapshot.maybeCriticalAtTimestamp)
                  .format("MMM D, YYYY HH:mm z")}`
              : "Your ETHx balance is 0. Any Geo Web parcels you previously licensed have been put in foreclosure."}
          </Col>
        </Row>
        <Row className="mt-3 align-items-start">
          <Col className="p-3 ms-3 fs-6 border border-purple rounded" sm="3">
            <span style={{ marginLeft: "15px" }}>{`ETH: ${truncateEth(
              ETHBalance,
              8
            )}`}</span>
            <Form
              id="wrapForm"
              className="form-inline mt-5 ms-3 me-3"
              noValidate
              onSubmit={(e) =>
                handleSubmit(e, wrappingAmount, SuperTokenAction.WRAP)
              }
            >
              <Form.Control
                required
                autoFocus
                type="text"
                className="mb-2"
                placeholder="0.00"
                size="sm"
                value={wrappingAmount}
                onChange={(e) => setWrappingAmount(e.target.value)}
              />
              <Button
                variant={isOutOfBalanceWrap ? "info" : "secondary"}
                type="submit"
                disabled={isWrapping || isOutOfBalanceWrap}
                size="sm"
                className="w-100"
              >
                {isWrapping
                  ? "Wrapping..."
                  : isOutOfBalanceWrap
                  ? "Insufficient ETH"
                  : "Wrap"}
              </Button>
            </Form>
            {!isOutOfBalanceWrap &&
            wrappingAmount !== "" &&
            Number(ETHBalance) - Number(wrappingAmount) < 0.001 ? (
              <span className="d-inline-block text-danger m-0 mt-1 ms-3">
                Warning: Leave enough ETH for more transactions
              </span>
            ) : wrappingError ? (
              <span className="d-inline-block text-danger m-0 mt-1 ms-3">{`Error: ${wrappingError}`}</span>
            ) : null}
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
                format={(x) => truncateEth(ethers.utils.formatUnits(x), 8)}
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
              onSubmit={(e) =>
                handleSubmit(e, unwrappingAmount, SuperTokenAction.UNWRAP)
              }
              className="form-inline ms-3 me-3"
            >
              <Form.Control
                required
                autoFocus
                type="text"
                className="mb-2"
                placeholder="0.00"
                size="sm"
                value={unwrappingAmount}
                onChange={(e) => setUnwrappingAmount(e.target.value)}
              />
              <Button
                variant={isOutOfBalanceUnwrap ? "info" : "primary"}
                type="submit"
                disabled={isUnWrapping || isOutOfBalanceUnwrap}
                size="sm"
                className="w-100 text-break"
              >
                {isUnWrapping
                  ? "Unwrapping..."
                  : isOutOfBalanceUnwrap
                  ? `Insufficient ${PAYMENT_TOKEN}`
                  : "Unwrap"}
              </Button>
            </Form>
            {!isOutOfBalanceUnwrap &&
              unwrappingAmount !== "" &&
              Number(paymentTokenBalance) - Number(unwrappingAmount) <
                0.001 && (
                <span className="d-inline-block text-danger m-0 mt-1 ms-3">{`Error: ${unwrappingError}`}</span>
              )}
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
              No parcels or bids yet...
            </span>
          )}
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default ProfileModal;
