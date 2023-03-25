import { useState } from "react";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import Button from "react-bootstrap/Button";
import AddFundsModal from "./AddFundsModal";
import { SmartAccount } from "../../pages/index";

interface AddFundsButton {
  paymentToken: NativeAssetSuperToken;
  smartAccount: SmartAccount | null;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
}

function AddFundsButton(props: AddFundsButton) {
  const [showModal, setShowModal] = useState<boolean>(false);

  return (
    <>
      <Button
        variant="secondary"
        className="w-100 mb-3"
        onClick={() => setShowModal(true)}
      >
        Add Funds
      </Button>
      <AddFundsModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        {...props}
      />
    </>
  );
}

export default AddFundsButton;
