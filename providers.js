//import Torus from "@toruslabs/torus-embed";
import Fortmatic from "fortmatic";
import WalletConnectProvider from "@walletconnect/web3-provider";

const providerOptions = {
    // torus: {
    //   package: Torus, // required
    //   options: {
    //     networkParams: {
    //       host: "https://localhost:8545", // optional
    //       chainId: 1337, // optional
    //       networkId: 1337 // optional
    //     },
    //     config: {
    //       buildEnv: "development" // optional
    //     }
    //   }
    // },
    fortmatic: {
        package: Fortmatic, // required
        options: {
          key: "pk_test_391E26A3B43A3350" // required
        }
    },
    walletconnect: {
        package: WalletConnectProvider, // required
        options: {
          infuraId: "8043bb2cf99347b1bfadfb233c5325c0" // required
        }
    }
};

export default {providerOptions};
