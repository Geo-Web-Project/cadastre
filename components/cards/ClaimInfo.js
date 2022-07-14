import * as React from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { STATE } from "../Map";
import { MAX_PARCEL_CLAIM } from "../../lib/constants";

function ClaimInfo({ parcelClaimSize, setInteractionState }) {
  return (
    <Card className="bg-purple text-light">
      <Card.Body>
        <Card.Text className="d-flex align-items-center">
          <Image
            style={{
              width: "2rem",
            }}
            src="grid.svg"
          />
          <span
            className={`text-${
              parcelClaimSize > MAX_PARCEL_CLAIM ? "danger" : "primary"
            }`}
          >
            {parcelClaimSize}/{MAX_PARCEL_CLAIM} Maximum Coordinates
          </span>
        </Card.Text>
        <Card.Text>Single click again to set your parcel shape.</Card.Text>
        <Card.Text>Click and drag the map to pan, if needed.</Card.Text>
        <Button
          variant="danger"
          className="w-100 mb-2"
          onClick={() => setInteractionState(STATE.VIEWING)}
        >
          Cancel
        </Button>
      </Card.Body>
    </Card>
  );
}

export default ClaimInfo;
