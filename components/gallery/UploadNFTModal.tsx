import { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
import { ParcelInfoProps } from "../cards/ParcelInfo";
import { Network, Alchemy, NftTokenType } from "alchemy-sdk";

import type { OwnedNft } from "alchemy-sdk";

const optimismSettings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.OPT_GOERLI, // Replace with OPT_MAINNET
};

const ethMainnetSettings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const optimismAlchemy = new Alchemy(optimismSettings);

const ethMainnetAlchemy = new Alchemy(ethMainnetSettings);

const initialOwnedNFT = {
  balance: 0,
  contract: {
    address: "",
    tokenType: NftTokenType.UNKNOWN,
  },
  tokenId: "",
  tokenType: NftTokenType.UNKNOWN,
  title: "",
  description: "",
  timeLastUpdated: "",
  metadataError: undefined,
  rawMetadata: undefined,
  tokenUri: undefined,
  media: [],
  spamInfo: undefined,
  acquiredAt: undefined,
};

export type UploadNFTModalProps = ParcelInfoProps & {
  showNFTModal: boolean;
  onClose: () => void;
  uploadNFT: (nft: OwnedNft) => void;
};

function GalleryModal(props: UploadNFTModalProps) {
  const { showNFTModal, onClose, uploadNFT, account } = props;

  const [nftsForOwner, setNftsForOwner] = useState<Array<OwnedNft>>([]);
  const [selectedNFT, setSelectedNFT] = useState<OwnedNft>(initialOwnedNFT);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </span>
  );

  const isLoading = false;

  const selectNFTFromWallet = async () => {
    uploadNFT(selectedNFT);
    setSelectedNFT(initialOwnedNFT);
  };

  const closeModal = async () => {
    setSelectedNFT(initialOwnedNFT);
    onClose();
  };

  useEffect(() => {
    async function getNftsForOwner() {
      try {
        const nfts = [];
        // Get the async iterable for the owner's NFTs.
        const nftsIterable =
          optimismAlchemy.nft.getNftsForOwnerIterator(account);

        // Iterate over the NFTs and add them to the nfts array.
        for await (const nft of nftsIterable) {
          nfts.push(nft);
        }

        // Get the async iterable for the owner's NFTs.
        const ethMainnetNftsIterable =
          ethMainnetAlchemy.nft.getNftsForOwnerIterator(account);

        // Iterate over the NFTs and add them to the nfts array.
        for await (const nft of ethMainnetNftsIterable) {
          nfts.push(nft);
        }

        // store NFTs in state
        setNftsForOwner(nfts);
      } catch (error) {
        console.error(error);
      }
    }

    getNftsForOwner();
  }, [account]);

  return (
    <Modal
      show={showNFTModal}
      backdrop="static"
      className="modal fade"
      centered
      keyboard={false}
      size="xl"
      onHide={closeModal}
      contentClassName="bg-dark"
    >
      <Modal.Header className="p-2 bg-dark border-0">
        <Container className="p-2">
          <Row>
            <Col xs="8" sm="11">
              <Modal.Title className="text-primary">
                NFTs Held by {account.slice(0, 6)}...
                {account.slice(-4)}
              </Modal.Title>
            </Col>
            <Col xs="4" sm="1" className="text-end">
              <Button variant="link" size="sm" onClick={onClose}>
                <Image src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      {isLoading ? (
        <Modal.Body className="bg-dark p-5 text-light text-center">
          {spinner}
        </Modal.Body>
      ) : (
        <>
          <Modal.Body className="bg-dark pt-0 px-3 px-sm-4 text-light">
            <p>
              Select NFT media from your wallet to add to your parcel's Media
              Gallery.
            </p>

            <Row
              style={{
                display: "flex",
                flexWrap: "wrap",
                marginBottom: "20px",
                overflow: "auto",
                height: "70vh",
              }}
            >
              {nftsForOwner.map((nft) => {
                return (
                  <Col key={nft.tokenId} xs="6" sm="4" lg="3">
                    <div
                      className={`${
                        selectedNFT === nft
                          ? "border border-secondary rounded"
                          : ""
                      }`}
                      style={{
                        cursor: "pointer",
                        flex: "1",
                        height: "90%",
                        marginBottom: "20px",
                        boxSizing: "border-box",
                      }}
                      onClick={() => setSelectedNFT(nft)}
                    >
                      <Card className="bg-dark p-2" style={{ height: "100%" }}>
                        <div
                          style={{
                            height: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Card.Img
                            src={nft?.media?.[0]?.gateway || "/file.png"}
                            className="px-4 pt-4"
                          />
                        </div>
                        <Card.Body>
                          <Card.Title
                            style={{
                              textAlign: "center",
                            }}
                          >
                            {nft?.title || ""}
                          </Card.Title>
                        </Card.Body>
                      </Card>
                    </div>
                  </Col>
                );
              })}
            </Row>
            <Row className="text-end justify-content-end">
              <Col xs="6" sm="2">
                <Button variant="danger" onClick={closeModal} className="w-100">
                  Cancel
                </Button>
              </Col>
              <Col xs="6" sm="2">
                <Button
                  variant="primary"
                  onClick={selectNFTFromWallet}
                  className="w-100"
                >
                  Select
                </Button>
              </Col>
            </Row>
          </Modal.Body>
        </>
      )}
    </Modal>
  );
}

export default GalleryModal;
