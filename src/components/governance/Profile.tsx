import { useState } from "react";
import { useAccount, useDisconnect, useContractRead } from "wagmi";
import { formatEther, Address } from "viem";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import Offcanvas from "react-bootstrap/Offcanvas";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import Spinner from "react-bootstrap/Spinner";
import PassportMintingInstructions from "./PassportMintingInstructions";
import CloseIcon from "../../assets/close.svg";
import CopyIcon from "../../assets/copy-light.svg";
import PassportIcon from "../../assets/passport.svg";
import ReloadIcon from "../../assets/reload.svg";
import LogoutIcon from "../../assets/logout.svg";
import ETHLogo from "../../assets/eth-white.svg";
import DAILogo from "../../assets/dai-white.svg";
import { sfSubgraph } from "../../redux/store";
import useFlowingAmount from "../../hooks/flowingAmount";
import { useMediaQuery } from "../../hooks/mediaQuery";
import { truncateStr } from "../../lib/truncate";
import { passportDecoderAbi } from "../../lib/abi/passportDecoder";
import { sqfStrategyAbi } from "../../lib/abi/sqfStrategy";
import {
  TimeInterval,
  unitOfTime,
  fromTimeUnitsToSeconds,
  roundWeiAmount,
  formatNumberWithCommas,
} from "../../lib/utils";
import {
  ETHX_ADDRESS,
  DAIX_ADDRESS,
  SQF_STRATEGY_ADDRESS,
  PASSPORT_DECODER_ADDRESS,
  NETWORK_ID,
} from "../../lib/constants";

type ProfileProps = {};

enum Token {
  ETHx,
  DAIx,
}

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

function Profile(props: ProfileProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showMintingInstructions, setShowMintingInstructions] = useState(false);
  const [token, setToken] = useState(Token.DAIx);

  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { isMobile, isTablet } = useMediaQuery();
  const { data: passportScore, refetch: refetchPassportScore } =
    useContractRead({
      abi: passportDecoderAbi,
      address: PASSPORT_DECODER_ADDRESS,
      functionName: "getScore",
      args: [address as Address],
      enabled: address ? true : false,
      watch: false,
    });
  const { data: minPassportScore } = useContractRead({
    abi: sqfStrategyAbi,
    address: SQF_STRATEGY_ADDRESS,
    functionName: "minPassportScore",
    watch: false,
  });
  const { data: accountInfoNative } = sfSubgraph.useAccountTokenSnapshotsQuery(
    {
      chainId: NETWORK_ID,
      filter: {
        account: address,
        token: ETHX_ADDRESS,
      },
    },
    { pollingInterval: 10000 }
  );
  const { isLoading: isLoadingAccountInfoWrapper, data: accountInfoWrapper } =
    sfSubgraph.useAccountTokenSnapshotsQuery(
      {
        chainId: NETWORK_ID,
        filter: {
          account: address,
          token: DAIX_ADDRESS,
        },
      },
      { pollingInterval: 10000 }
    );
  const superTokenBalanceWrapper = useFlowingAmount(
    BigInt(accountInfoWrapper?.data[0]?.balanceUntilUpdatedAt ?? 0),
    accountInfoWrapper?.data[0]?.updatedAtTimestamp ?? 0,
    BigInt(accountInfoWrapper?.data[0]?.totalNetFlowRate ?? 0)
  );
  const superTokenBalanceNative = useFlowingAmount(
    BigInt(accountInfoNative?.data[0]?.balanceUntilUpdatedAt ?? 0),
    accountInfoNative?.data[0]?.updatedAtTimestamp ?? 0,
    BigInt(accountInfoNative?.data[0]?.totalNetFlowRate ?? 0)
  );

  const handleCloseProfile = () => setShowProfile(false);
  const handleShowProfile = () => setShowProfile(true);

  return (
    <>
      <ButtonGroup className="d-flex align-items-center bg-dark border-secondary">
        <Button
          variant="secondary"
          disabled={showProfile}
          onClick={handleShowProfile}
          className="d-none d-xl-block text-light rounded-start"
        >
          {isLoadingAccountInfoWrapper || accountInfoWrapper == null ? (
            <Spinner size="sm" animation="border" role="status"></Spinner>
          ) : (
            <Card.Text className="m-0">
              {formatEther(superTokenBalanceWrapper).slice(0, 8)} DAIx
            </Card.Text>
          )}
        </Button>
        <Button
          variant="outline-secondary"
          disabled={showProfile}
          onClick={handleShowProfile}
          className="d-none d-xl-flex align-items-center gap-1 text-light bg-dark rounded-end"
        >
          <Card.Text className="m-0">
            {truncateStr(address ?? "0x", 14)}{" "}
          </Card.Text>
        </Button>
        <Button
          variant="link"
          disabled={showProfile}
          onClick={handleShowProfile}
          className="ms-3 d-xl-none"
        ></Button>
        <Button
          variant="link"
          disabled={showProfile}
          onClick={handleShowProfile}
          className="d-xl-none"
        >
          <Image width={46} src="account-circle.svg" />
        </Button>
      </ButtonGroup>
      <Offcanvas
        show={showProfile}
        scroll
        onHide={handleCloseProfile}
        placement="end"
        backdrop={true}
        className="bg-dark overflow-auto border-0"
        style={{ width: isMobile ? "100vw" : isTablet ? "50vw" : "" }}
      >
        <Stack
          direction="horizontal"
          className="justify-content-end align-items-center"
        >
          <Button
            variant="transparent"
            className="float-end"
            onClick={handleCloseProfile}
          >
            <Image src={CloseIcon} alt="close" width={28} />
          </Button>
        </Stack>
        <Stack
          direction="horizontal"
          className="justify-content-between align-items-center p-3 text-white"
        >
          <Stack direction="horizontal" className="align-items-center">
            <Card.Text className="m-0">
              {truncateStr(address ?? "0x", 14)}{" "}
            </Card.Text>
            <Button
              variant="transparent"
              className="d-flex align-items-center px-2"
              onClick={() => navigator.clipboard.writeText(address ?? "0x")}
            >
              <Image src={CopyIcon} alt="copy" width={18} />{" "}
            </Button>
          </Stack>
          <Button
            variant="blue"
            className="d-flex gap-2 align-items-center rounded-4 px-3 py-2"
            onClick={() => {
              disconnect();
              handleCloseProfile();
            }}
          >
            <Card.Text className="m-0">Disconnect</Card.Text>
            <Image src={LogoutIcon} alt="copy" width={18} />{" "}
          </Button>
        </Stack>
        <Card className="bg-purple mx-3 p-2 rounded-4 text-secondary">
          <Card.Header className="border-bottom border-secondary mx-2 p-0 py-1 fs-5">
            Current Gitcoin Passport Score
          </Card.Header>
          <Card.Body className="p-2">
            {minPassportScore ? (
              <>
                <Stack
                  direction="horizontal"
                  gap={3}
                  className={`${
                    passportScore && passportScore > minPassportScore
                      ? "text-success"
                      : passportScore
                      ? "text-danger"
                      : "text-yellow"
                  }`}
                >
                  <Image src={PassportIcon} alt="passport" width={36} />
                  <Card.Text className="m-0 fs-1 fw-bold">
                    {passportScore
                      ? parseFloat((Number(passportScore) / 10000).toFixed(3))
                      : "N/A"}
                  </Card.Text>
                  <Card.Text className="w-50 m-0 fs-5" style={{ width: 80 }}>
                    min. {Number(minPassportScore) / 10000} required for
                    matching
                  </Card.Text>
                  <Button
                    variant="transparent"
                    className="p-0"
                    onClick={() =>
                      refetchPassportScore({ throwOnError: false })
                    }
                  >
                    <Image
                      src={ReloadIcon}
                      alt="reload"
                      width={28}
                      style={{
                        filter:
                          passportScore && passportScore > minPassportScore
                            ? "invert(65%) sepia(44%) saturate(6263%) hue-rotate(103deg) brightness(95%) contrast(97%)"
                            : passportScore
                            ? "invert(27%) sepia(47%) saturate(3471%) hue-rotate(336deg) brightness(93%) contrast(85%)"
                            : "invert(88%) sepia(26%) saturate(4705%) hue-rotate(2deg) brightness(109%) contrast(102%)",
                      }}
                    />
                  </Button>
                </Stack>
                <Button
                  variant="success"
                  className="w-100 mt-2 rounded-3 rounded-3"
                  onClick={() => setShowMintingInstructions(true)}
                >
                  Update stamps and mint
                </Button>
              </>
            ) : (
              <Spinner
                animation="border"
                role="status"
                className="mx-auto mt-5 p-3"
              >
                <Card.Text className="text-center">
                  Waiting for passport details...
                </Card.Text>
              </Spinner>
            )}
          </Card.Body>
        </Card>
        <Stack
          direction="horizontal"
          gap={1}
          className="bg-purple rounded-top-4 mt-3 mx-3 p-3 fs-3"
        >
          <Badge
            className={`cursor-pointer rounded-3 ${
              token === Token.DAIx
                ? "bg-success text-success"
                : "bg-purple text-gray"
            }`}
            style={{
              background:
                token === Token.DAIx
                  ? "linear-gradient(rgba(0,0,0,.50),rgba(0,0,0,.50))"
                  : "",
            }}
            onClick={() => setToken(Token.DAIx)}
          >
            DAIx
          </Badge>
          <Badge
            className={`cursor-pointer rounded-3 ${
              token === Token.ETHx
                ? "bg-success text-success"
                : "bg-purple text-gray"
            }`}
            style={{
              background:
                token === Token.ETHx
                  ? "linear-gradient(rgba(0,0,0,.50),rgba(0,0,0,.50))"
                  : "",
            }}
            onClick={() => setToken(Token.ETHx)}
          >
            ETHx
          </Badge>
        </Stack>
        <Stack
          direction="horizontal"
          className="bg-purple mx-3 p-2 pb-3 fs-3 border-bottom border-dark"
        >
          <Card.Text className="m-0 text-gray px-2 w-50">Balance</Card.Text>
          <Stack direction="horizontal" gap={2} className="align-items-center">
            <Image
              src={token === Token.ETHx ? ETHLogo : DAILogo}
              alt="token logo"
              width={token === Token.ETHx ? 15 : 22}
            />
            <Card.Text className="m-0 text-white w-33 overflow-hidden text-truncate">
              {token === Token.ETHx
                ? formatNumberWithCommas(
                    parseFloat(formatEther(superTokenBalanceNative).slice(0, 8))
                  )
                : formatNumberWithCommas(
                    parseFloat(
                      formatEther(superTokenBalanceWrapper).slice(0, 8)
                    )
                  )}
            </Card.Text>
          </Stack>
        </Stack>
        <Stack
          direction="horizontal"
          className="bg-purple mx-3 px-2 py-3 fs-3 border-bottom border-dark"
        >
          <Card.Text className="m-0 text-gray px-2 w-50">
            Total Stream Value
          </Card.Text>
          <Stack
            direction="horizontal"
            gap={2}
            className="align-items-center w-50"
          >
            <Image
              src={token === Token.ETHx ? ETHLogo : DAILogo}
              alt="close"
              width={token === Token.ETHx ? 15 : 22}
            />
            <Card.Text className="m-0 text-white w33 overflow-hidden text-truncate">
              {formatNumberWithCommas(
                parseFloat(
                  roundWeiAmount(
                    BigInt(
                      token === Token.ETHx
                        ? accountInfoNative?.data[0]?.totalOutflowRate ?? 0
                        : accountInfoWrapper?.data[0]?.totalOutflowRate ?? 0
                    ) *
                      BigInt(
                        fromTimeUnitsToSeconds(
                          1,
                          unitOfTime[TimeInterval.MONTH]
                        )
                      ),
                    6
                  )
                )
              )}
            </Card.Text>
            <Card.Text className="m-0 text-gray fs-6">monthly</Card.Text>
          </Stack>
        </Stack>
        <Stack
          direction="horizontal"
          className="bg-purple mx-3 rounded-bottom-4 px-2 py-3 fs-3 border-bottom border-dark"
        >
          <Card.Text className="m-0 text-gray px-2 w-50">
            Liquidation Date
          </Card.Text>
          <Card.Text className="m-0 text-gray w-33 overflow-hidden text-truncate fs-4">
            {token === Token.ETHx &&
            accountInfoNative?.data[0]?.maybeCriticalAtTimestamp
              ? dayjs
                  .unix(accountInfoNative.data[0].maybeCriticalAtTimestamp)
                  .format("MMM D, YYYY")
              : token === Token.DAIx &&
                accountInfoWrapper?.data[0]?.maybeCriticalAtTimestamp
              ? dayjs
                  .unix(accountInfoWrapper?.data[0].maybeCriticalAtTimestamp)
                  .format("MMM D, YYYY")
              : "N/A"}
          </Card.Text>
        </Stack>
        <Card.Link
          href="https://app.superfluid.finance"
          target="_blank"
          className="mx-3 p-3 text-center text-decoration-underline cursor-pointer"
        >
          Visit the Superfluid App for advanced management of your Super Token
          balances
        </Card.Link>
      </Offcanvas>
      <PassportMintingInstructions
        show={showMintingInstructions}
        hide={() => setShowMintingInstructions(false)}
      />
    </>
  );
}

export default Profile;
