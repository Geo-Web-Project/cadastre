import { useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

export type InfoTooltipProps = {
  content: JSX.Element;
  target: JSX.Element;
  top?: boolean;
};

function InfoTooltip(props: InfoTooltipProps) {
  const { content, target } = props;

  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);
  const handleTouchEnd = () => setShowTooltip(!showTooltip);

  return (
    <OverlayTrigger
      trigger={["hover", "focus"]}
      show={showTooltip}
      placement={top ? "top" : "right-end"}
      overlay={
        <Tooltip
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </Tooltip>
      }
    >
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleTouchEnd}
      >
        {target}
      </span>
    </OverlayTrigger>
  );
}

export default InfoTooltip;
