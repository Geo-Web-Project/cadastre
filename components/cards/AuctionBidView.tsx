import { BigNumber } from "ethers";
import * as React from "react";
import { Card } from "react-bootstrap";
import { AssetContentManager } from "../../lib/AssetContentManager";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth, truncateStr } from "../../lib/truncate";
import { SidebarProps } from "../Sidebar";

type OutstandingBidViewProps = SidebarProps & {
  assetContentManager: AssetContentManager | null;
  newForSalePrice: BigNumber;
  licenseOwner: string;
};

function AuctionBidView({
  assetContentManager,
  newForSalePrice,
  selectedParcelId,
  licenseOwner,
}: OutstandingBidViewProps) {
  const [parcelIndexStreamId, setParcelIndexStreamId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    async function updateStreamId() {
      if (!assetContentManager) {
        setParcelIndexStreamId(null);
        return;
      }

      const doc = await assetContentManager.getIndex();
      setParcelIndexStreamId(doc.id.toString());
    }

    updateStreamId();
  }, [assetContentManager]);

  const newForSalePriceDisplay = truncateEth(
    formatBalance(newForSalePrice),
    18
  );

  return (
    <Card className="bg-dark mt-2">
      <Card.Header>
        <h3>{/* TODO: Parcel Name */}</h3>
        <h4>{/* TODO: URI */}</h4>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          For Sale Price: {newForSalePriceDisplay} {PAYMENT_TOKEN}
        </Card.Text>
        <Card.Text>Parcel ID: {selectedParcelId}</Card.Text>
        <Card.Text>License: {truncateStr(licenseOwner, 11)}</Card.Text>
        <Card.Text>
          Stream ID:{" "}
          <a
            href={`https://tiles.ceramic.community/document/${parcelIndexStreamId}`}
            target="_blank"
            rel="noreferrer"
            className="text-light"
          >{`ceramic://${parcelIndexStreamId}`}</a>
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default AuctionBidView;
