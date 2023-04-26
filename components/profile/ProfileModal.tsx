import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { ethers, BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { useDisconnect } from "wagmi";
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
  Spinner,
} from "react-bootstrap";
import {
  // eslint-disable-next-line import/named
  AccountTokenSnapshot,
  NativeAssetSuperToken,
  Framework,
} from "@superfluid-finance/sdk-core";
import type { Point } from "@turf/turf";
import * as turf from "@turf/turf";
import { GeoWebContent } from "@geo-web/content";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import type { IPFS } from "ipfs-core-types";
import { FlowingBalance } from "./FlowingBalance";
import { CopyTokenAddress, TokenOptions } from "../CopyTokenAddress";
import CopyTooltip from "../CopyTooltip";
import {
  PAYMENT_TOKEN,
  SECONDS_IN_WEEK,
  SECONDS_IN_YEAR,
} from "../../lib/constants";
import { getETHBalance } from "../../lib/getBalance";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import { truncateStr, truncateEth } from "../../lib/truncate";
import {
  calculateBufferNeeded,
  calculateAuctionValue,
  getParcelContent,
} from "../../lib/utils";
import { STATE } from "../Map";
import { useMediaQuery } from "../../lib/mediaQuery";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

interface ProfileModalProps {
  accountTokenSnapshot: AccountTokenSnapshot;
  account: string;
  signer: ethers.Signer;
  sfFramework: Framework;
  ceramic: CeramicClient;
  ipfs: IPFS;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  paymentToken: NativeAssetSuperToken;
  showProfile: boolean;
  handleCloseProfile: () => void;
  setParcelNavigationCenter: React.Dispatch<React.SetStateAction<Point | null>>;
  shouldRefetchParcelsData: boolean;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
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
    signer,
    geoWebContent,
    registryContract,
    setSelectedParcelId,
    setInteractionState,
    paymentToken,
    showProfile,
    handleCloseProfile,
    setPortfolioNeedActionCount,
    setParcelNavigationCenter,
    shouldRefetchParcelsData,
    setShouldRefetchParcelsData,
  } = props;

  const [ETHBalance, setETHBalance] = useState<string>("");
  const [wrappingAmount, setWrappingAmount] = useState<string>("");
  const [unwrappingAmount, setUnwrappingAmount] = useState<string>("");
  const [wrappingError, setWrappingError] = useState<string>("");
  const [unwrappingError, setUnwrappingError] = useState<string>("");
  const [isWrapping, setIsWrapping] = useState<boolean>(false);
  const [isUnWrapping, setIsUnwrapping] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<PortfolioParcel[] | null>(null);
  const [portfolioTotal, setPortfolioTotal] = useState<PortfolioTotal>();
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [lastSorted, setLastSorted] = useState("");
  const [timerId, setTimerId] = useState<NodeJS.Timer | null>(null);

  const { disconnect } = useDisconnect();
  const { data, refetch } = useQuery<BidderQuery>(portfolioQuery, {
    variables: {
      id: account,
    },
  });

  const { superTokenBalance } = useSuperTokenBalance(
    account,
    paymentToken.address
  );
  const { isMobile, isTablet } = useMediaQuery();

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
    if (!data) {
      return;
    }

    if (!data.bidder) {
      setPortfolio([]);
      setPortfolioTotal({
        price: BigNumber.from(0),
        fee: BigNumber.from(0),
        buffer: BigNumber.from(0),
      });
      setPortfolioNeedActionCount(0);

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
        .then(() =>
          getParcelContent(
            registryContract.address.toLowerCase(),
            geoWebContent,
            parcelId,
            licenseOwner
          )
        )
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
    if (!shouldRefetchParcelsData || !showProfile) {
      return;
    }

    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
      setShouldRefetchParcelsData(false);
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
  }, [shouldRefetchParcelsData, data]);

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
    disconnect();
    handleCloseProfile();
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
          .exec(signer);

        setIsWrapping(true);
      } else if (action === SuperTokenAction.UNWRAP) {
        txn = await paymentToken
          .downgrade({
            amount: ethers.utils.parseEther(amount).toString(),
          })
          .exec(signer);

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
    } else if (action === SuperTokenAction.UNWRAP) {
      setIsUnwrapping(false);
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
        setInteractionState(
          isMobile || isTablet ? STATE.PARCEL_SELECTED : STATE.PARCEL_RECLAIMING
        );
        break;
      default:
        break;
    }

    handleCloseProfile();
    setSelectedParcelId(parcel.parcelId);
    setParcelNavigationCenter(parcel.center);
  };

  return (
    <Modal
      show={showProfile}
      keyboard={false}
      centered
      onHide={handleCloseProfile}
      onExit={() => {
        setWrappingError("");
        setUnwrappingError("");
      }}
      size="xl"
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0">
        <Container className="ps-1 pe-0">
          <Row>
            <Col
              className="px-0 px-sm-2 text-light fs-1 d-flex align-items-center"
              xs="9"
              lg="10"
            >
              <span className="d-none d-sm-block">
                {truncateStr(account, 14)}
              </span>
              <span className="fs-1 d-sm-none">{truncateStr(account, 12)}</span>
              <CopyTooltip
                contentClick="Address Copied"
                contentHover="Copy Address"
                target={
                  <Image
                    src="copy-light.svg"
                    alt="copy"
                    width={isMobile ? 28 : 34}
                    className="ms-1 ms-lg-2"
                  />
                }
                handleCopy={() => navigator.clipboard.writeText(account)}
              />
              <Button
                onClick={deactivateProfile}
                variant="info"
                className="ms-2 ms-lg-4 p-1 px-lg-3 py-lg-2"
              >
                Disconnect
              </Button>
            </Col>
            <Col xs="3" lg="2" className="p-0 text-end align-self-start">
              <Button
                variant="link"
                size="sm"
                className="p-0 px-1 px-lg-2"
                onClick={() => handleCloseProfile()}
              >
                <Image width={isMobile ? 28 : 36} src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body className="px-1 px-lg-3 bg-dark text-light text-start">
        <Row>
          <Col className="d-inline-flex mx-2 fs-6 h-100">
            {!isMobile &&
              !isTablet &&
              accountTokenSnapshot &&
              accountTokenSnapshot.totalNumberOfActiveStreams > 0 && (
                <Image
                  src="notice.svg"
                  width={20}
                  className="flex-start me-2"
                />
              )}
            {!accountTokenSnapshot ||
            accountTokenSnapshot.totalNumberOfActiveStreams ===
              0 ? null : accountTokenSnapshot.maybeCriticalAtTimestamp &&
              Number(accountTokenSnapshot.maybeCriticalAtTimestamp) >
                Date.now() / 1000 ? (
              <p className="mb-0" style={{ fontSize: "0.9rem" }}>
                <span>{isMobile ? "Your " : "At the current rate, your "}</span>
                {PAYMENT_TOKEN} balance will reach 0 on{" "}
                {dayjs
                  .unix(accountTokenSnapshot.maybeCriticalAtTimestamp)
                  .format(
                    `MMM D, YYYY ${!isMobile && !isTablet ? "HH:MM z" : ""}`
                  )}
              </p>
            ) : (
              <span
                style={{ fontSize: isMobile || isTablet ? "0.9rem" : "1rem" }}
              >
                Your ETHx balance is 0. Any Geo Web parcels you previously
                licensed have been put in foreclosure.
              </span>
            )}
          </Col>
        </Row>
        <Row className="mt-3 align-items-start">
          <Col
            className="p-2 p-lg-3 ms-3 fs-6 border border-purple rounded"
            xs="5"
            lg="4"
            xl="3"
          >
            <span className="ms-sm-3">{`ETH: ${truncateEth(
              ETHBalance,
              isMobile ? 6 : 8
            )}`}</span>
            <Form
              id="wrapForm"
              className="form-inline mt-5 px-0 px-sm-3"
              noValidate
              onSubmit={(e) =>
                handleSubmit(e, wrappingAmount, SuperTokenAction.WRAP)
              }
            >
              <Form.Control
                required
                type="text"
                className="mb-2"
                placeholder="0.00"
                size="sm"
                value={wrappingAmount}
                onChange={(e) => {
                  setWrappingAmount(e.target.value);
                  setWrappingError("");
                }}
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
            {wrappingError ? (
              <span className="d-inline-block text-danger m-0 mt-1 ms-3">{`Error: ${wrappingError}`}</span>
            ) : !isOutOfBalanceWrap &&
              wrappingAmount !== "" &&
              Number(ETHBalance) - Number(wrappingAmount) < 0.001 ? (
              <span className="d-inline-block text-danger m-0 mt-1 ms-3">
                Warning: Leave enough ETH for more transactions
              </span>
            ) : null}
          </Col>
          <Col
            xs="1"
            sm="1"
            className="p-0 mt-auto mb-auto d-flex justify-content-center"
          >
            <Image src="exchange.svg" width={isMobile ? 36 : 64} />
          </Col>
          <Col
            className="p-2 p-lg-3 fs-6 border border-purple rounded"
            xs="5"
            lg="4"
            xl="3"
          >
            <div className="ms-0 ms-sm-3">
              {`${PAYMENT_TOKEN}: `}
              <FlowingBalance
                format={(x) =>
                  truncateEth(ethers.utils.formatUnits(x), isMobile ? 6 : 8)
                }
                accountTokenSnapshot={accountTokenSnapshot}
              />
            </div>
            <div
              style={{
                maxWidth: "220px",
                height: "auto",
                margin: isMobile
                  ? "4px 0px 14px 0px"
                  : isTablet
                  ? "4px 15px 14px 16px"
                  : "5px 15px 8px 15px",
              }}
            >
              <CopyTokenAddress options={tokenOptions} />
            </div>
            <Form
              noValidate
              onSubmit={(e) =>
                handleSubmit(e, unwrappingAmount, SuperTokenAction.UNWRAP)
              }
              className="form-inline px-0 px-sm-3"
            >
              <Form.Control
                required
                type="text"
                className="mb-2"
                placeholder="0.00"
                size="sm"
                value={unwrappingAmount}
                onChange={(e) => {
                  setUnwrappingAmount(e.target.value);
                  setUnwrappingError("");
                }}
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
            {unwrappingError && (
              <span className="d-inline-block text-danger m-0 mt-1 ms-3">{`Error: ${unwrappingError}`}</span>
            )}
          </Col>
        </Row>
        <Row className="mt-3 ps-3 fs-1">Portfolio</Row>
        <Row className="scrollable-table">
          {!portfolio || !portfolioTotal ? (
            <span className="d-flex justify-content-center fs-4 my-4 py-4">
              <Spinner animation="border" role="status"></Spinner>
            </span>
          ) : portfolio.length > 0 ? (
            <Table
              bordered
              className="m-3 text-light border border-purple flex-shrink-1"
            >
              <thead>
                <tr className="cursor-pointer">
                  {!isMobile && !isTablet && (
                    <>
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
                    </>
                  )}
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
                    Price
                  </th>
                  {!isMobile && !isTablet && (
                    <>
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
                    </>
                  )}
                  <th
                    onClick={() =>
                      setPortfolio(sortPortfolio(portfolio, "action"))
                    }
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody style={{ maxHeight: 260 }}>
                {portfolio.map((parcel, i) => {
                  return (
                    <tr key={i}>
                      {!isMobile && !isTablet && (
                        <>
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
                        </>
                      )}
                      <td>{parcel.name}</td>
                      <td>
                        {truncateEth(ethers.utils.formatEther(parcel.price), 8)}
                      </td>
                      {!isMobile && !isTablet && (
                        <>
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
                        </>
                      )}
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
                  <td colSpan={isMobile || isTablet ? 0 : 4}>Total</td>
                  <td>
                    {truncateEth(
                      ethers.utils.formatEther(portfolioTotal.price),
                      8
                    )}
                  </td>
                  {!isMobile && !isTablet && (
                    <>
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
                    </>
                  )}
                  <td></td>
                </tr>
              </tbody>
            </Table>
          ) : (
            <span className="d-flex justify-content-center fs-4 my-4 py-4">
              No parcels or bids yet...
            </span>
          )}
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default ProfileModal;
