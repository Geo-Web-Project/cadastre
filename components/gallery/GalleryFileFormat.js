import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import FormFile from "react-bootstrap/FormFile";
import Image from "react-bootstrap/Image";

export function GalleryFileFormat({
  ipfs,
  isReadOnly,
  encodingObject,
  setEncodingObject,
}) {
  const [detectedFileFormat, setDetectedFileFormat] = React.useState(null);
  const [fileFormat, setFileFormat] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (isReadOnly) {
      setFileFormat(encodingObject.encodingFormat);
    }
  }, [isReadOnly, encodingObject]);

  const cid = encodingObject.contentUrl
    ? encodingObject.contentUrl.replace("ipfs://", "")
    : "";

  function updateEncodingObject(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setEncodingObject(_updateData(updatedValues)());
  }

  function updateContentUrl(event) {
    const cid = event.target.value;

    if (!cid || cid.length == 0) {
      updateEncodingObject({
        contentUrl: null,
      });

      setDetectedFileFormat(null);
      setFileFormat(null);

      return;
    }

    updateEncodingObject({
      contentUrl: `ipfs://${cid}`,
      encodingFormat: fileFormat,
    });
  }

  async function captureFile(event) {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    let format;
    if (file.name.endsWith(".glb")) {
      format = "model/gltf-binary";
    } else if (file.name.endsWith(".usdz")) {
      format = "model/vnd.usdz+zip";
    }

    setDetectedFileFormat(format);

    const added = await ipfs.add(file);

    updateEncodingObject({
      contentUrl: `ipfs://${added.cid.toV1().toBaseEncodedString("base32")}`,
      encodingFormat: format,
    });

    setIsUploading(false);
  }

  function onSelectFileFormat(event) {
    setFileFormat(event.target.value);

    updateEncodingObject({
      contentUrl: `ipfs://${cid}`,
      encodingFormat: event.target.value,
    });
  }

  const spinner = (
    <div
      className="spinner-border"
      role="status"
      style={{ height: "1.5em", width: "1.5em" }}
    >
      <span className="sr-only"></span>
    </div>
  );

  return (
    <Row className="px-3 d-flex align-items-end">
      <Col sm="1">
        <Button
          variant="link"
          size="sm"
          onClick={() => updateEncodingObject(null)}
        >
          <Image src="close.svg" />
        </Button>
      </Col>
      <Col sm="11" lg="5" className="mb-3">
        <InputGroup>
          <Form.Control
            style={{ backgroundColor: "#111320", border: "none" }}
            className="text-white"
            type="text"
            placeholder="Upload media or add an existing CID"
            readOnly={isUploading || isReadOnly}
            value={cid}
            onChange={updateContentUrl}
          />
          <InputGroup.Append>
            <FormFile.Input
              id="uploadCid"
              style={{ backgroundColor: "#111320", border: "none" }}
              accept=".glb, .usdz"
              disabled={isUploading || isReadOnly}
              onChange={captureFile}
              hidden
            ></FormFile.Input>
            <Button
              as="label"
              htmlFor="uploadCid"
              disabled={isUploading || isReadOnly}
            >
              {!isUploading ? "Upload" : spinner}
            </Button>
          </InputGroup.Append>
        </InputGroup>
      </Col>
      <Col sm="12" lg="6" className="mb-3">
        <div key="inline-radio">
          <Form.Text className="text-primary mb-1">File Format</Form.Text>
          <Form.Control
            as="select"
            className="text-white"
            style={{ backgroundColor: "#111320", border: "none" }}
            onChange={onSelectFileFormat}
            value={detectedFileFormat ?? fileFormat}
            disabled={detectedFileFormat != null}
            custom
          >
            <option selected>Select a File Format</option>
            <option value="model/gltf-binary">.glb (model/gltf-binary)</option>
            <option value="model/vnd.usdz+zip">
              .usdz (model/vnd.usdz+zip)
            </option>
          </Form.Control>
        </div>
      </Col>
    </Row>
  );
}

export default GalleryFileFormat;
