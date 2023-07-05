import { useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

export type InfoTooltipProps = {
  content: JSX.Element;
  target: JSX.Element;
  position?: { top?: boolean; bottom?: boolean; right?: boolean };
};

function InfoTooltip(props: InfoTooltipProps) {
  const { content, target, position } = props;

  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);
  const handleTouchEnd = () => {
    setShowTooltip(true);
    document.addEventListener("touchstart", () => setShowTooltip(false), {
      once: true,
    });
  };

  return (
    <OverlayTrigger
      trigger={["hover", "focus"]}
      show={showTooltip}
      placement={
        position?.top
          ? "top"
          : position?.bottom
          ? "bottom"
          : position?.right
          ? "right"
          : "right-end"
      }
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
