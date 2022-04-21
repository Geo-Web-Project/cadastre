const galleryFileFormats = [
    { extension: ".gif", encoding: "image/gif", type: "ImageObject" },
    { extension: ".glb", encoding: "model/gltf-binary", type: "3DModel" },
    { extension: ".jpeg", encoding: "image/jpeg", type: "ImageObject" },
    { extension: ".mp3", encoding: "audio/mpeg", type: "AudioObject" },
    { extension: ".mp4", encoding: "audio/mp4", type: "AudioObject" },
    { extension: ".mp4", encoding: "video/mp4", type: "VideoObject" },
    { extension: ".mpeg", encoding: "video/mpeg", type: "VideoObject" },
    { extension: ".png", encoding: "image/png", type: "ImageObject" },
    { extension: ".svg", encoding: "image/svg+xml", type: "ImageObject" },
    { extension: ".usdz", encoding: "model/vnd.usdz+zip", type: "3DModel" }
]
 
const getFormat = (_filename) => {
    
    let _extension = "." + _filename.split(".").pop();
    let _format = {};

    galleryFileFormats.forEach((e)=>{
        if(e.extension === _extension){
            _format.encoding = e.encoding;
            _format.type = e.type;
        }
    })

    return _format;
}

const getFormatCS = () => {

    let _formats = galleryFileFormats.map(f => {return f.extension} )
    return _formats.toString()
}

const getFormatType = (encoding) => {
    
    let _type = galleryFileFormats.filter(f => {return f.encoding === encoding });
    return _type[0]["type"]
}

export { galleryFileFormats, getFormat, getFormatCS, getFormatType }