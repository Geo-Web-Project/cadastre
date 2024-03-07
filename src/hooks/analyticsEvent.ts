import { useEffect } from "react";
import { Step } from "../components/governance/EditStream";

function useDonationAnalyticsEvent(step: Step, isFundingMatchingPool: boolean) {
  useEffect(() => {
    let analyticsEvent = "";

    switch (step) {
      case Step.SELECT_AMOUNT:
        analyticsEvent = isFundingMatchingPool
          ? "Fund Matching Pool - Step 1"
          : "Fund Grantee - Step 1";
        break;
      case Step.WRAP:
        analyticsEvent = isFundingMatchingPool
          ? "Fund Matching Pool - Step 2"
          : "Fund Grantee - Step 2";
        break;
      case Step.TOP_UP:
        analyticsEvent = isFundingMatchingPool
          ? "Fund Matching Pool - Step 3"
          : "Fund Grantee - Step 3";
        break;
      case Step.MINT_PASSPORT:
        analyticsEvent = "Fund Grantee - Step 4";
        break;
      case Step.REVIEW:
        analyticsEvent = isFundingMatchingPool
          ? "Fund Matching Pool - Step 4"
          : "Fund Grantee - Step 5";
        break;
      case Step.SUCCESS:
        analyticsEvent = isFundingMatchingPool
          ? "Fund Matching Pool - Success"
          : "Fund Grantee - Success";
        break;
      default:
        break;
    }

    window.plausible(analyticsEvent);
  }, [step]);
}

export { useDonationAnalyticsEvent };
