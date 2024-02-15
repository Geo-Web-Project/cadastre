import transakSDK from "@transak/transak-sdk";
import { TRANSAK_API_KEY } from "../../lib/constants";

export default function OnRampWidget(props: {
  target: JSX.Element;
  accountAddress?: string;
}) {
  const { target, accountAddress } = props;

  return (
    <div
      className="w-100"
      onClick={() => {
        const transak = new transakSDK({
          apiKey: TRANSAK_API_KEY,
          environment: "PRODUCTION",
          widgetHeight: "570px",
          network: "optimism",
          defaultFiatAmount: 30,
          fiatCurrency: "USD",
          countryCode: "US",
          walletAddress: accountAddress,
        });
        transak.init();
      }}
    >
      {target}
    </div>
  );
}
