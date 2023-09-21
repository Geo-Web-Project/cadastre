const galleryFileFormats: Format[] = [
  { extension: ".gif", encoding: "image/gif", type: "ImageObject" },
  { extension: ".glb", encoding: "model/gltf-binary", type: "3DModel" },
  { extension: ".jpeg", encoding: "image/jpeg", type: "ImageObject" },
  { extension: ".png", encoding: "image/png", type: "ImageObject" },
  { extension: ".svg", encoding: "image/svg+xml", type: "ImageObject" },
  { extension: ".usdz", encoding: "model/vnd.usdz+zip", type: "3DModel" },
];

type Format = {
  encoding?: string;
  type?: string;
  extension?: string;
};

const getFormat = (_filename: string) => {
  const _extension = "." + _filename.split(".").pop();
  const _format: Format = {};

  galleryFileFormats.forEach((e) => {
    if (e.extension === _extension) {
      _format.encoding = e.encoding;
      _format.type = e.type;
    }
  });

  return _format;
};

const getFormatCS = () => {
  const _formats = galleryFileFormats.map((f) => {
    return f.extension;
  });
  return _formats.toString();
};

const getFormatType = (encoding: string) => {
  const _type = galleryFileFormats.filter((f) => {
    return f.encoding === encoding;
  });
  return _type[0]["type"];
};

export { galleryFileFormats, getFormat, getFormatCS, getFormatType };
