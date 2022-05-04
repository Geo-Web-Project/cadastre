import * as React from "react";
import Card from "react-bootstrap/Card";

function ClaimInfo() {
  return (
    <Card className="bg-purple text-light">
      <Card.Header>Claim Instructions</Card.Header>
      <Card.Body>
        <Card.Text>
          Resize your land parcel claim by moving your mouse.
          Your claim can not overlap with an existing claim.
        </Card.Text>
        <Card.Text>
          Click once to lock in the shape of your claim. You will complete
          your claim details in a form shown in this panel.
        </Card.Text>
        <Card.Text>Hit ESC to exit claim mode.</Card.Text>
      </Card.Body>
    </Card>
  );
}

export default ClaimInfo;
