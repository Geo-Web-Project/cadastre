import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { ethers } from "ethers";
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
import AccountTokenSnapshot, {
  NativeAssetSuperToken,
} from "@superfluid-finance/sdk-core";
import { FlowingBalance } from "./FlowingBalance";
import { CopyTokenAddress, TokenOptions } from "../CopyTokenAddress";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { getETHBalance } from "../../lib/getBalance";
import { truncateStr } from "../../lib/truncate";

type ProfileModalProps = {
  accountTokenSnapshot: AccountTokenSnapshot | undefined;
  account: string;
  provider: ethers.providers.Web3Provider;
  paymentToken: NativeAssetSuperToken;
  showProfile: boolean;
  disconnectWallet: () => Promise<void>;
  handleCloseProfile: () => void;
};

interface Portfolio {
  parcelId: string;
  status: string;
  actionDate: string;
  name: string;
  price: number;
  fee: number;
  buffer: number;
  action: string;
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

function ProfileModal(props: ProfileModalProps) {
  const {
    accountTokenSnapshot,
    account,
    provider,
    paymentToken,
    showProfile,
    disconnectWallet,
    handleCloseProfile,
    setPortfolioNeedActionCount
  } = props;

  const [ETHBalance, setETHBalance] = useState<string | undefined>();
  const [isWrapping, setIsWrapping] = useState<boolean>(false);
  const [isUnWrapping, setIsUnWrapping] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<Portfolio[] | undefined>([
    {
      parcelId: "0x01",
      status: "Valid",
      actionDate: "",
      name: "Central Park",
      price: 1.0,
      fee: 0.1,
      buffer: 0.00020005,
      action: PortfolioAction.VIEW,
    },
    {
      parcelId: "0x02",
      status: "Incoming Bid",
      actionDate: "2022/07/31",
      name: "Disney Land",
      price: 1.01,
      fee: 0.101,
      buffer: 0.0002005,
      action: PortfolioAction.RESPOND,
    },
    {
      parcelId: "0x03",
      status: "Outgoing Bid",
      actionDate: "2022/07/30",
      name: "Hollywood",
      price: 1.1,
      fee: 0.11,
      buffer: 0.00022006,
      action: PortfolioAction.VIEW,
    },
    {
      parcelId: "0x04",
      status: "In Foreclosure",
      actionDate: "2022/07/26",
      name: "Disney World",
      price: 1.2,
      fee: 0.12,
      buffer: 0.00024005,
      action: PortfolioAction.RECLAIM,
    },
    {
      parcelId: "0x05",
      status: "Needs Transfer",
      actionDate: "2022/07/14",
      name: "Mt Rushmore",
      price: 1.3,
      fee: 0.13,
      buffer: 0.00026005,
      action: PortfolioAction.TRIGGER,
    },
  ]);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [lastSorted, setLastSorted] = useState("parcelId");

  useEffect(() => {
    let needActionCount = 0;
    for (let i in portfolio) {
      if (
        portfolio[i].action === PortfolioAction.RESPOND ||
        portfolio[i].action === PortfolioAction.RECLAIM ||
        portfolio[i].action === PortfolioAction.TRIGGER
      ) {
        needActionCount++;
      }
      console.log(needActionCount);
      setPortfolioNeedActionCount(needActionCount);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
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
    })();

    return () => {
      isMounted = false;
    };
  }, [provider, account]);

  const tokenOptions: TokenOptions = useMemo(
    () => ({
      address: paymentToken.address,
      symbol: PAYMENT_TOKEN,
      decimals: 18,
      image: "",
    }),
    [paymentToken.address]
  );

  const deactivateProfile = (): void => {
    disconnectWallet();
    handleCloseProfile();
  };

  const executeSuperTokenTransaction = async (
    amount: string,
    action: superTokenAction
  ): void => {
    let txn;

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

      setIsUnWrapping(true);
    }

    try {
      await txn.wait();
      // Wrap ETHx successfully!
      const ethBalance = await getETHBalance(provider, account);
      // Update balances
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

  const handleOnSubmit = (e: HTMLElement, action: string): void => {
    e.preventDefault();
    const amount = Number(e.target[0].value);

    if (!Number.isNaN(amount) && amount > 0) {
      (async () => {
        await executeSuperTokenTransaction(amount.toString(), action);
        e.target.reset();
      })();
    }
  };

  const calcTotal = (arr: Portfolio[], field: string): void =>
    arr.map((parcel) => parcel[field]).reduce((prev, curr) => prev + curr, 0);

  const sortPortfolio = (field: string): void => {
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
    setPortfolio(sorted);
  };

  const handlePortfolioAction = (action: PortfolioAction): void => {
    console.log(action);
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
                <Image src="close.svg" />
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
            accountTokenSnapshot.maybeCriticalAtTimestamp > Date.now() / 1000
              ? `At the current rate, your ETHx balance will reach 0 on ${dayjs
                  .unix(accountTokenSnapshot.maybeCriticalAtTimestamp)
                  .format("MMM D, YYYY h:mA.")}`
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
                width: "220px",
                height: "40px",
                marginTop: "5px",
                marginLeft: "15px",
                fontSize: "1rem",
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
                //style={{ width: "220px" }}
              />
              <Button
                variant="primary"
                type="submit"
                disabled={isUnWrapping}
                size="sm"
                className="w-100"
                //style={{ width: "220px" }}
              >
                {isWrapping ? "Unwrapping..." : "Unwrap"}
              </Button>
            </Form>
          </Col>
        </Row>
        <Row className="mt-3 ps-3 fs-1">Portfolio</Row>
        <Row className="scrollable-table">
          {portfolio.length > 0 ? (
            <Table
              bordered
              className="m-3 text-light border border-purple flex-shrink-1"
            >
              <thead>
                <tr>
                  <th onClick={() => sortPortfolio("parcelId")}>Parcel ID</th>
                  <th onClick={() => sortPortfolio("status")}>Status</th>
                  <th onClick={() => sortPortfolio("actionDate")}>
                    Action Date
                  </th>
                  <th onClick={() => sortPortfolio("name")}>Name</th>
                  <th onClick={() => sortPortfolio("price")}>Price|Bid</th>
                  <th onClick={() => sortPortfolio("fee")}>Fee/Yr</th>
                  <th onClick={() => sortPortfolio("buffer")}>
                    Buffer Deposit
                  </th>
                  <th onClick={() => sortPortfolio("action")}>Action</th>
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
                      <td>{parcel.price}</td>
                      <td>{parcel.fee}</td>
                      <td>{parcel.buffer}</td>
                      <td>
                        <Button
                          variant={
                            parcel.action === PortfolioAction.VIEW
                              ? "primary"
                              : "danger"
                          }
                          className="w-100"
                          onClick={() => handlePortfolioAction(parcel.action)}
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
                  <td>{calcTotal(portfolio, "price").toFixed(1)}</td>
                  <td>{calcTotal(portfolio, "fee").toFixed(1)}</td>
                  <td>{calcTotal(portfolio, "buffer").toFixed(8)}</td>
                  <td></td>
                </tr>
              </tbody>
            </Table>
          ) : (
            <span
              style={{
                height: "256px",
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
