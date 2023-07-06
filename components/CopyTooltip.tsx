import { forwardRef, useEffect, useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";

type CopyTooltipProps = {
  contentClick: string;
  contentHover: string;
  target: JSX.Element;
  handleCopy: () => void;
};

const UpdatingTooltip = forwardRef(function UpdatingTooltip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { popper, children, showTooltip, ...props }: any,
  ref
) {
  useEffect(() => {
    popper.scheduleUpdate();
  }, [children, popper]);

  if (!showTooltip) {
    return null;
  }

  return (
    <Tooltip ref={ref} {...props}>
      {children}
    </Tooltip>
  );
});

function CopyTooltip(props: CopyTooltipProps) {
  const { contentClick, contentHover, target, handleCopy } = props;

  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => {
    if (!copied) {
      setShowTooltip(false);
    }
  };
  const handleClick = () => {
    if (copied) {
      return;
    }

    handleCopy();

    setCopied(true);

    setTimeout(() => {
      setShowTooltip(false);
      setCopied(false);
    }, 4000);
  };

  return (
    <OverlayTrigger
      show={showTooltip}
      overlay={
        <UpdatingTooltip
          key="top"
          placement="top"
          id="tooltip-key"
          showTooltip={showTooltip}
        >
          {copied ? contentClick : contentHover}
        </UpdatingTooltip>
      }
    >
      <Button
        className="d-flex align-items-center p-0 bg-transparent border-0 shadow-none"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {target}
      </Button>
    </OverlayTrigger>
  );
}

export default CopyTooltip;
