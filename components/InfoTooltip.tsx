import { useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

export type InfoTooltipProps = {
  content: JSX.Element;
  target: JSX.Element;
  top?: boolean;
};

function InfoTooltip(props: InfoTooltipProps) {
  const { content, target, top } = props;
  const [showTooltip, setShowTooltip] = useState(false);

  const handleOnMouseEnter = () => setShowTooltip(true);
  const handleOnMouseLeave = () => setShowTooltip(false);

  return (
    <OverlayTrigger
      trigger={["hover", "focus"]}
      show={showTooltip}
      placement={top ? "top" : "right-end"}
      overlay={
        <Tooltip
          onMouseEnter={handleOnMouseEnter}
          onMouseLeave={handleOnMouseLeave}
        >
          {content}
        </Tooltip>
      }
    >
      <span onMouseEnter={handleOnMouseEnter} onMouseLeave={handleOnMouseLeave}>
        {target}
      </span>
    </OverlayTrigger>
  );
}

export default InfoTooltip;
