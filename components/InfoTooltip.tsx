import { useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

export type TooltipInfoProps = {
  content: JSX.Element;
  target: JSX.Element;
};

function TooltipInfo(props: TooltipInfoProps) {
  const { content, target } = props;
  const [showTooltip, setShowTooltip] = useState(false);

  const handleOnMouseEnter = () => setShowTooltip(true);
  const handleOnMouseLeave = () => setShowTooltip(false);

  return (
    <OverlayTrigger
      trigger={["hover", "focus"]}
      show={showTooltip}
      placement="top-start"
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

export default TooltipInfo;
