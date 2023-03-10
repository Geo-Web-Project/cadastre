import { ethers } from "ethers";
import { NetworkStatus } from "@apollo/client";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";
import Button from "react-bootstrap/Button";
import { Parcel } from "./ParcelList";
import { truncateEth } from "../../lib/truncate";

type ParcelTableProps = {
  parcels: Parcel[] | null;
  networkStatus: NetworkStatus;
  handleAction: (parcel: Parcel) => void;
};

function ParcelTable(props: ParcelTableProps) {
  const { parcels, networkStatus, handleAction } = props;

  return (
    <Container>
      <Row className="scrollable-table">
        {!parcels || networkStatus < NetworkStatus.ready ? (
          <span className="d-flex justify-content-center fs-4 my-4 py-4">
            <Spinner animation="border" role="status"></Spinner>
          </span>
        ) : parcels.length > 0 ? (
          <Table
            bordered
            className="m-3 mt-0 text-light border border-purple flex-shrink-1"
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody style={{ maxHeight: 512 }}>
              {parcels.map((parcel, i) => {
                return (
                  <tr key={i}>
                    <td>{parcel.name}</td>
                    <td>{parcel.parcelId}</td>
                    <td>
                      {truncateEth(ethers.utils.formatEther(parcel.price), 8)}
                    </td>
                    <td
                      className={
                        parcel.status === "Valid" ||
                        parcel.status === "Outgoing Bid"
                          ? ""
                          : "text-danger"
                      }
                    >
                      {parcel.status}
                    </td>
                    <td>
                      <Button
                        variant={"primary"}
                        className="w-100"
                        onClick={() => handleAction(parcel)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <span className="d-flex justify-content-center fs-4 my-4 py-4">
            None found
          </span>
        )}
      </Row>
    </Container>
  );
}

export default ParcelTable;
