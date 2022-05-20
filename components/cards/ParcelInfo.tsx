import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import { STATE } from "../Map";
import { useEffect } from "react";
import Button from "react-bootstrap/Button";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { truncateStr } from "../../lib/truncate";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import CID from "cids";
import { SidebarProps } from "../Sidebar";
import { DIDDataStore } from "@glazed/did-datastore";
import { formatBalance } from "../../lib/formatBalance";

const parcelQuery = gql`
  query LandParcel($id: String) {
    landParcel(id: $id) {
      id
      license {
        owner
        contributionRate
        perSecondFeeNumerator
        perSecondFeeDenominator
        forSalePrice
      }
    }
  }
`;

export type ParcelInfoProps = SidebarProps & {
  dataStore: DIDDataStore | null;
  didNFT: string | null;
  basicProfileStreamManager: any;
  pinningManager: any;
  licenseAddress: string;
};

function ParcelInfo(props: ParcelInfoProps) {
  const {
    account,
    interactionState,
    setInteractionState,
    selectedParcelId,
    dataStore,
    didNFT,
    basicProfileStreamManager,
  } = props;
  const { loading, data } = useQuery(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
  });

  const [parcelIndexStreamId, setParcelIndexStreamId] = React.useState<
    string | null
  >(null);

  const parcelContent = basicProfileStreamManager
    ? basicProfileStreamManager.getStreamContent()
    : null;

  useEffect(() => {
    async function updateStreamId() {
      if (!dataStore || !didNFT) {
        setParcelIndexStreamId(null);
        return;
      }

      const doc = await dataStore._createIDXDoc(didNFT);
      setParcelIndexStreamId(doc.id.toString());
    }

    updateStreamId();
  }, [data, dataStore, didNFT]);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );

  let forSalePrice;
  let licenseOwner;
  if (data && data.landParcel && data.landParcel.license) {
    forSalePrice = (
      <>
        {formatBalance(data.landParcel.license.forSalePrice)} {PAYMENT_TOKEN}{" "}
      </>
    );
    licenseOwner = data.landParcel.license.owner;
  }

  const isLoading = loading || data == null || licenseOwner == null;

  let hrefWebContent;
  // Translate ipfs:// to case-insensitive base
  if (
    parcelContent &&
    parcelContent.url &&
    parcelContent.url.startsWith("ipfs://")
  ) {
    const cid = new CID(parcelContent.url.split("ipfs://")[1]);
    hrefWebContent = `ipfs://${cid.toV1().toBaseEncodedString("base32")}`;
  } else if (parcelContent) {
    hrefWebContent = parcelContent.url;
  }

  const cancelButton = (
    <Button
      variant="danger"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE.PARCEL_SELECTED);
      }}
    >
      Cancel
    </Button>
  );

  const editButton = (
    <Button
      variant="primary"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE.PARCEL_EDITING);
      }}
    >
      Edit Parcel
    </Button>
  );

  const editGalleryButton = (
    <Button
      variant="secondary"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE.EDITING_GALLERY);
      }}
    >
      Edit Media Gallery
    </Button>
  );

  // const initiateTransferButton = (
  //   <Button
  //     variant="primary"
  //     className="w-100"
  //     onClick={() => {
  //       setInteractionState(STATE.PARCEL_PURCHASING);
  //     }}
  //   >
  //     {isExpired ? "Auction Claim" : "Initiate Transfer"}
  //   </Button>
  // );

  let title;
  if (
    interactionState == STATE.CLAIM_SELECTING ||
    interactionState == STATE.CLAIM_SELECTED
  ) {
    title = (
      <>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Claim a Parcel</h1>
      </>
    );
  } else {
    title = (
      <>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          {!basicProfileStreamManager
            ? spinner
            : parcelContent
            ? parcelContent.name
            : "[No Name Found]"}
        </h1>
      </>
    );
  }

  let buttons;
  if (interactionState != STATE.PARCEL_SELECTED) {
    buttons = cancelButton;
  } else if (!isLoading) {
    if (account.toLowerCase() == licenseOwner.toLowerCase()) {
      buttons = (
        <>
          <div className="mb-2">{editButton}</div>
          {editGalleryButton}
        </>
      );
    } else {
      // buttons = initiateTransferButton;
    }
  }

  return (
    <>
      <Row className="mb-3">
        <Col sm="10">{title}</Col>
        <Col sm="2" className="text-right">
          <Button
            variant="link"
            size="sm"
            onClick={() => setInteractionState(STATE.VIEWING)}
          >
            <Image src="close.svg" />
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          {interactionState == STATE.PARCEL_SELECTED ||
          interactionState == STATE.PARCEL_EDITING ||
          interactionState == STATE.PARCEL_PURCHASING ||
          interactionState == STATE.EDITING_GALLERY ? (
            <>
              <p className="font-weight-bold text-truncate">
                {!parcelContent ? null : hrefWebContent ? (
                  <a
                    href={hrefWebContent}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`[${hrefWebContent}]`}</a>
                ) : null}
              </p>
              <p>
                <span className="font-weight-bold">For Sale Price:</span>{" "}
                {isLoading ? spinner : forSalePrice}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Parcel ID:</span>{" "}
                {isLoading ? spinner : selectedParcelId}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Licensee:</span>{" "}
                {isLoading ? spinner : truncateStr(licenseOwner, 11)}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Stream ID:</span>{" "}
                {parcelIndexStreamId == null ? (
                  spinner
                ) : (
                  <a
                    href={`https://tiles.ceramic.community/document/${parcelIndexStreamId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`ceramic://${parcelIndexStreamId}`}</a>
                )}
              </p>
              <br />
              {buttons}
            </>
          ) : (
            <p>Unclaimed Coordinates</p>
          )}
          {/* {interactionState == STATE.PARCEL_EDITING ? (
            <EditAction
              collectorContract={collectorContract}
              account={account}
              setInteractionState={setInteractionState}
              setSelectedParcelId={setSelectedParcelId}
              perSecondFeeNumerator={perSecondFeeNumerator}
              perSecondFeeDenominator={perSecondFeeDenominator}
              parcelData={data}
              refetchParcelData={refetch}
              basicProfileStreamManager={basicProfileStreamManager}
              licenseAddress={licenseAddress}
            />
          ) : null}
          {interactionState == STATE.PARCEL_PURCHASING ? (
            <PurchaseAction
              purchaserContract={purchaserContract}
              collectorContract={collectorContract}
              account={account}
              setInteractionState={setInteractionState}
              setSelectedParcelId={setSelectedParcelId}
              perSecondFeeNumerator={perSecondFeeNumerator}
              perSecondFeeDenominator={perSecondFeeDenominator}
              parcelData={data}
              refetchParcelData={refetch}
              auctionValue={auctionValue}
              basicProfileStreamManager={basicProfileStreamManager}
              existingNetworkFeeBalance={networkFeeBalance}
              licenseAddress={licenseAddress}
            />
          ) : null} */}
        </Col>
      </Row>
      {/* <GalleryModal
        ipfs={ipfs}
        show={interactionState == STATE_EDITING_GALLERY}
        setInteractionState={setInteractionState}
        dataStore={dataStore}
        ceramic={ceramic}
        didNFT={didNFT}
        pinningManager={pinningManager}
      ></GalleryModal> */}
    </>
  );
}

export default ParcelInfo;
