import * as React from "react";
import Card from "react-bootstrap/Card";

function ClaimInfo() {
  return (
    <Card className="bg-purple text-light">
      <Card.Header>Claim Instructions</Card.Header>
      <Card.Body>
        <Card.Text>
          Single-click again to set your claim shape.
        </Card.Text>
        <Card.Text>
          Click and drag the map to pan, if needed.
        </Card.Text>
        <Card.Text>Hit ESC to exit claim mode.</Card.Text>
      </Card.Body>
    </Card>
  );
}

export default ClaimInfo;
