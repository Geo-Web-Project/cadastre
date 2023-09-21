import { MediaObjectEncodingFormat } from "../../lib/geo-web-content/mediaGallery";

const galleryFileFormats: Format[] = [
  {
    extension: ".gif",
    encoding: MediaObjectEncodingFormat.Gif,
    type: "ImageObject",
  },
  {
    extension: ".glb",
    encoding: MediaObjectEncodingFormat.Glb,
    type: "3DModel",
  },
  {
    extension: ".jpeg",
    encoding: MediaObjectEncodingFormat.Jpeg,
    type: "ImageObject",
  },
  {
    extension: ".png",
    encoding: MediaObjectEncodingFormat.Png,
    type: "ImageObject",
  },
  {
    extension: ".svg",
    encoding: MediaObjectEncodingFormat.Svg,
    type: "ImageObject",
  },
  {
    extension: ".usdz",
    encoding: MediaObjectEncodingFormat.Usdz,
    type: "3DModel",
  },
];

type Format = {
  encoding?: MediaObjectEncodingFormat;
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

const getFormatType = (encoding: MediaObjectEncodingFormat | undefined) => {
  const _type = galleryFileFormats.filter((f) => {
    return f.encoding === encoding;
  });
  if (_type.length === 0) return undefined;

  return _type[0]["type"];
};

export { galleryFileFormats, getFormat, getFormatCS, getFormatType };
