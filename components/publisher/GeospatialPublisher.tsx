import { useState } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

export default function GeospatialPublisher() {
  return (
    <>
      <p>Add augments to your parcel.</p>
      <Button variant="secondary" className="d-flex align-items-center px-5">
        <span>
          <Image src="plus-sign.svg" />
        </span>
        <span>New</span>
      </Button>
    </>
  );
}
