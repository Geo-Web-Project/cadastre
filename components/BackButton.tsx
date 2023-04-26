import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { STATE } from "./Map";

type BackButtonProps = {
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
};

function BackButton(props: BackButtonProps) {
  const { interactionState, setInteractionState } = props;

  const handleClick = () => {
    if (interactionState === STATE.CLAIM_SELECTED) {
      setInteractionState(STATE.CLAIM_SELECTING);
    } else {
      setInteractionState(STATE.PARCEL_SELECTED);
    }
  };

  return (
    <Button
      variant="link"
      className="d-flex justify-content-start align-items-center w-25 p-0"
      onClick={handleClick}
    >
      <Image src="arrow-back.svg" alt="back" width={16} />
      <span>Back</span>
    </Button>
  );
}

export default BackButton;
