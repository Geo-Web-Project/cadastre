import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import {
  TransactionsBundleConfig,
  TopUpDropDownSelection,
} from "../lib/transactionsBundleConfig";
import { useMediaQuery } from "../lib/mediaQuery";

function TransactionsBundleConfigView(props: {
  direction?: string;
  transactionsBundleConfig: TransactionsBundleConfig;
  showTopUpTotalDropDown: boolean;
  setShowTopUpTotalDropDown: React.Dispatch<React.SetStateAction<boolean>>;
  showTopUpSingleDropDown: boolean;
  setShowTopUpSingleDropDown: React.Dispatch<React.SetStateAction<boolean>>;
  updateWrapAmount: (
    strategy: string,
    dropdownSelection: string,
    digit: number
  ) => void;
  saveTransactionsBundleConfig: (
    transactionsBundleConfig: TransactionsBundleConfig
  ) => void;
  handleTopUpChange: (e: any, strategy: string) => void;
}) {
  const {
    direction,
    transactionsBundleConfig,
    showTopUpTotalDropDown,
    setShowTopUpTotalDropDown,
    showTopUpSingleDropDown,
    setShowTopUpSingleDropDown,
    updateWrapAmount,
    saveTransactionsBundleConfig,
    handleTopUpChange,
  } = props;

  const { isMobile, isTablet, isDesktop } = useMediaQuery();

  return (
    <>
      <div className="form-check d-flex align-items-center gap-2 ms-2 ms-sm-1">
        <input
          defaultChecked={transactionsBundleConfig.isSponsored}
          aria-label="Checkbox to choose if payment denominated in ETHx or ETH"
          className="form-check-input"
          type="checkbox"
          style={{ width: 24, height: 24 }}
          onClick={() => {
            saveTransactionsBundleConfig({
              ...transactionsBundleConfig,
              isSponsored: !transactionsBundleConfig.isSponsored,
              wrapAll: !transactionsBundleConfig.isSponsored,
              noWrap: transactionsBundleConfig.isSponsored ? true : false,
              topUpStrategy: "",
            });
          }}
        />
        <label className="form-check-label" htmlFor="flexCheckDefault">
          Enable transaction sponsoring + refunding
        </label>
      </div>
      <Card
        border="secondary"
        className={`bg-dark mt-4 mb-2 p-2 p-sm-3 ${
          isMobile ? "" : "rounded-4"
        }`}
      >
        <small
          className="position-absolute bg-dark px-1 text-secondary"
          style={{ left: 25, top: -12 }}
        >
          {" "}
          Auto-Wrapping
        </small>
        <Card.Header>
          <span>
            Select a strategy for auto-balancing your ETH:ETHx with each
            Cadastre transaction. This setting is saved in your browser.{" "}
          </span>
        </Card.Header>
        <Card.Body className="pb-1">
          <div
            className={`d-flex ${
              direction === "column" || isMobile || isTablet
                ? "flex-column"
                : "flex-row gap-4"
            }`}
          >
            <Button
              variant={
                transactionsBundleConfig.wrapAll
                  ? "outline-primary"
                  : transactionsBundleConfig.isSponsored
                  ? "outline-light"
                  : "outline-info"
              }
              disabled={!transactionsBundleConfig.isSponsored}
              className="w-100 p-2 rounded-3 mb-3 shadow-none btn-wrap-strategy"
              onClick={() => {
                saveTransactionsBundleConfig({
                  ...transactionsBundleConfig,
                  wrapAll: true,
                  noWrap: false,
                  wrapAmount: "0",
                  topUpStrategy: "",
                });
              }}
            >
              <span
                className={
                  transactionsBundleConfig.wrapAll
                    ? "text-primary"
                    : transactionsBundleConfig.isSponsored
                    ? "text-light"
                    : "text-info"
                }
              >
                Auto-wrap all ETH to ETHx
              </span>
            </Button>
            <Button
              variant={
                transactionsBundleConfig.noWrap &&
                transactionsBundleConfig.isSponsored
                  ? "outline-primary"
                  : transactionsBundleConfig.isSponsored
                  ? "outline-light"
                  : "outline-info"
              }
              disabled={!transactionsBundleConfig.isSponsored}
              className="w-100 p-2 rounded-3 mb-3 shadow-none btn-wrap-strategy"
              onClick={() => {
                saveTransactionsBundleConfig({
                  ...transactionsBundleConfig,
                  noWrap: true,
                  wrapAll: false,
                  wrapAmount: "0",
                  topUpStrategy: "",
                });
              }}
            >
              <span
                className={
                  transactionsBundleConfig.noWrap &&
                  transactionsBundleConfig.isSponsored
                    ? "text-primary"
                    : transactionsBundleConfig.isSponsored
                    ? "text-light"
                    : "text-info"
                }
              >
                Don't auto-wrap any ETH to ETHx
              </span>
            </Button>
          </div>
          <div
            className={`d-flex ${
              direction === "column" || isMobile || isTablet
                ? "flex-column"
                : "flex-row gap-4"
            }`}
          >
            <div className="d-flex flex-column gap-1">
              <span
                className={
                  !transactionsBundleConfig.isSponsored
                    ? "text-info"
                    : transactionsBundleConfig.topUpStrategy === "total"
                    ? "text-primary"
                    : "text-light"
                }
              >
                Total Balance Top-up
              </span>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-0">
                <InputGroup className="mb-2 mt-1 rounded-3">
                  <Form.Control
                    disabled={!transactionsBundleConfig.isSponsored}
                    type="text"
                    inputMode="numeric"
                    className={`bg-dark ${
                      !transactionsBundleConfig.isSponsored
                        ? "border-info"
                        : transactionsBundleConfig.topUpStrategy === "total"
                        ? "border-primary"
                        : "border-light"
                    } ${
                      !transactionsBundleConfig.isSponsored
                        ? "text-info"
                        : transactionsBundleConfig.topUpStrategy === "total"
                        ? "text-primary"
                        : "text-light"
                    }`}
                    value={
                      transactionsBundleConfig.topUpStrategy === "total"
                        ? transactionsBundleConfig.topUpTotalDigitsSelection
                        : ""
                    }
                    placeholder="0"
                    onChange={(e) => handleTopUpChange(e, "total")}
                    onBlur={() => {
                      if (
                        !transactionsBundleConfig.topUpTotalDigitsSelection ||
                        transactionsBundleConfig.topUpTotalDigitsSelection == 0
                      ) {
                        saveTransactionsBundleConfig({
                          ...transactionsBundleConfig,
                          wrapAll: true,
                          topUpStrategy: "",
                        });
                      }
                    }}
                  />
                </InputGroup>
                <Button
                  disabled={!transactionsBundleConfig.isSponsored}
                  variant={
                    !transactionsBundleConfig.isSponsored
                      ? "outline-info"
                      : transactionsBundleConfig.topUpStrategy === "total"
                      ? "outline-primary"
                      : "outline-light"
                  }
                  className="d-flex justify-content-center align-items-end mb-1 px-5 w-25 shadow-none btn-wrap-strategy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopUpTotalDropDown(!showTopUpTotalDropDown);

                    setShowTopUpSingleDropDown(false);
                  }}
                >
                  <span
                    className={
                      !transactionsBundleConfig.isSponsored
                        ? "text-info"
                        : transactionsBundleConfig.topUpStrategy === "total"
                        ? "text-primary"
                        : "text-light"
                    }
                  >
                    {transactionsBundleConfig.topUpTotalSelection}
                  </span>
                  <Image
                    src={`${
                      !transactionsBundleConfig.isSponsored
                        ? "expand-more-info.svg"
                        : transactionsBundleConfig.topUpStrategy === "total"
                        ? "expand-more-primary.svg"
                        : "expand-more-light.svg"
                    }`}
                    alt="expand"
                    width={18}
                  />
                </Button>
                {showTopUpTotalDropDown && (
                  <div
                    className="d-flex flex-column gap-1 position-absolute px-2 py-2 bg-light rounded-2"
                    style={{
                      right:
                        direction === "row" && isDesktop
                          ? 420
                          : isMobile
                          ? 24
                          : 30,
                      top:
                        direction === "row" && isDesktop
                          ? 226
                          : isMobile
                          ? 325
                          : 309,
                    }}
                  >
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "total",
                          TopUpDropDownSelection.DAYS,
                          transactionsBundleConfig.topUpTotalDigitsSelection
                        )
                      }
                    >
                      Days
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "total",
                          TopUpDropDownSelection.WEEKS,
                          transactionsBundleConfig.topUpTotalDigitsSelection
                        )
                      }
                    >
                      Weeks
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "total",
                          TopUpDropDownSelection.MONTHS,
                          transactionsBundleConfig.topUpTotalDigitsSelection
                        )
                      }
                    >
                      Months
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "total",
                          TopUpDropDownSelection.YEARS,
                          transactionsBundleConfig.topUpTotalDigitsSelection
                        )
                      }
                    >
                      Years
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex flex-column gap-1">
              <span
                className={
                  !transactionsBundleConfig.isSponsored
                    ? "text-info"
                    : transactionsBundleConfig.topUpStrategy === "single"
                    ? "text-primary"
                    : "text-light"
                }
              >
                Per Parcel Top-Up
              </span>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                <InputGroup className="mb-2 mt-1 rounded-3">
                  <Form.Control
                    disabled={!transactionsBundleConfig.isSponsored}
                    type="text"
                    inputMode="numeric"
                    className={`bg-dark ${
                      !transactionsBundleConfig.isSponsored
                        ? "border-info"
                        : transactionsBundleConfig.topUpStrategy === "single"
                        ? "border-primary"
                        : "border-light"
                    } ${
                      !transactionsBundleConfig.isSponsored
                        ? "text-info"
                        : transactionsBundleConfig.topUpStrategy === "single"
                        ? "text-primary"
                        : "text-light"
                    }`}
                    value={
                      transactionsBundleConfig.topUpStrategy === "single"
                        ? transactionsBundleConfig.topUpSingleDigitsSelection
                        : ""
                    }
                    onChange={(e) => handleTopUpChange(e, "single")}
                    placeholder="0"
                    onBlur={() => {
                      if (
                        !transactionsBundleConfig.topUpSingleDigitsSelection ||
                        transactionsBundleConfig.topUpSingleDigitsSelection == 0
                      ) {
                        saveTransactionsBundleConfig({
                          ...transactionsBundleConfig,
                          wrapAll: true,
                          topUpStrategy: "",
                        });
                      }
                    }}
                  />
                </InputGroup>
                <Button
                  variant={
                    !transactionsBundleConfig.isSponsored
                      ? "outline-info"
                      : transactionsBundleConfig.topUpStrategy === "single"
                      ? "outline-primary"
                      : "outline-light"
                  }
                  disabled={!transactionsBundleConfig.isSponsored}
                  title={`Days`}
                  className="d-flex justify-content-center align-items-end mb-1 px-5 w-25 shadow-none btn-wrap-strategy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopUpSingleDropDown(!showTopUpSingleDropDown);
                    setShowTopUpTotalDropDown(false);
                  }}
                >
                  <span
                    className={
                      !transactionsBundleConfig.isSponsored
                        ? "text-info"
                        : transactionsBundleConfig.topUpStrategy === "single"
                        ? "text-primary"
                        : "text-light"
                    }
                  >
                    {transactionsBundleConfig.topUpSingleSelection}
                  </span>
                  <Image
                    src={`${
                      !transactionsBundleConfig.isSponsored
                        ? "expand-more-info.svg"
                        : transactionsBundleConfig.topUpStrategy === "single"
                        ? "expand-more-primary.svg"
                        : "expand-more-light.svg"
                    }`}
                    alt="expand"
                    width={18}
                  />
                </Button>
                {showTopUpSingleDropDown && (
                  <div
                    className="d-flex flex-column gap-1 position-absolute px-2 py-1 bg-light rounded-2"
                    style={{
                      right:
                        direction === "row" && isDesktop
                          ? 30
                          : isMobile
                          ? 24
                          : 30,
                      top:
                        direction === "row" && isDesktop
                          ? 226
                          : isMobile
                          ? 402
                          : 386,
                    }}
                  >
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "single",
                          TopUpDropDownSelection.DAYS,
                          transactionsBundleConfig.topUpSingleDigitsSelection
                        )
                      }
                    >
                      Days
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "single",
                          TopUpDropDownSelection.WEEKS,
                          transactionsBundleConfig.topUpSingleDigitsSelection
                        )
                      }
                    >
                      Weeks
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "single",
                          TopUpDropDownSelection.MONTHS,
                          transactionsBundleConfig.topUpSingleDigitsSelection
                        )
                      }
                    >
                      Months
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        updateWrapAmount(
                          "single",
                          TopUpDropDownSelection.YEARS,
                          transactionsBundleConfig.topUpSingleDigitsSelection
                        )
                      }
                    >
                      Years
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <span
            className={!transactionsBundleConfig.isSponsored ? "text-info" : ""}
            style={{ fontSize: "0.7rem" }}
          >
            Note: If you don't have enough ETH for your chosen strategy with a
            proposed transaction, we'll wrap your full balance and show a
            warning.
          </span>
        </Card.Body>
      </Card>
    </>
  );
}

export default TransactionsBundleConfigView;
