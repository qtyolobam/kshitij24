const sharp = require("sharp");
const { randomBytes } = require("crypto");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

// S3 Client Configuration
const bucketName = process.env.BUCKET_NAME;
exports.bucketName = bucketName;
const bucketRegion = process.env.BUCKET_REGION;
const s3AccessKey = process.env.S3_ACCESS_KEY;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretAccessKey,
  },
  region: bucketRegion,
});
exports.s3 = s3;

exports.s3Upload = async (idProof) => {
  try {
    if (
      idProof.mimetype === "image/jpeg" ||
      idProof.mimetype === "image/jpg" ||
      idProof.mimetype === "image/png" ||
      idProof.mimetype === "image/webp"
    ) {
      // Compressing the image
      let fullImageName = idProof.originalname.split(".");
      let fileExtension = fullImageName[1];
      if (
        fileExtension !== "jpg" &&
        fileExtension !== "jpeg" &&
        fileExtension !== "png" &&
        fileExtension !== "webp"
      ) {
        throw new Error("Only .jpg, .jpeg, .png and .webp files are accepted.");
      }
      let fileName = fullImageName[0];
      const compressedBuffer = await sharp(idProof.buffer)
        .withMetadata() // preserve original metadata
        .toFormat(fileExtension, {
          quality: 60,
          mozjpeg: true, // better JPEG compression
          compressionLevel: 9, // max compression for PNG
          effort: 6, // higher compression effort for WebP
          adaptiveFiltering: true,
          palette: true,
        })
        .toBuffer();
      const modifiedIdProofName =
        fileName + randomBytes(10).toString("hex") + "." + fileExtension;
      // Uploading idProof to S3
      const putObjectParams = {
        Bucket: bucketName,
        Key: modifiedIdProofName,
        Body: compressedBuffer,
        ContentType: idProof.mimetype,
      };
      const putCommand = new PutObjectCommand(putObjectParams);
      await s3.send(putCommand);

      return modifiedIdProofName;
    } else {
      // Uploading pdf to S3
      let fullPdfName = idProof.originalname.split(".");
      let pdfExtension = fullPdfName[1];
      const modifiedIdProofName =
        fullPdfName[0] + randomBytes(10).toString("hex") + "." + pdfExtension;
      // Uploading pdf to S3
      const putObjectParams = {
        Bucket: bucketName,
        Key: modifiedIdProofName,
        Body: idProof.buffer,
        ContentType: idProof.mimetype,
      };
      const putCommand = new PutObjectCommand(putObjectParams);
      await s3.send(putCommand);
      return modifiedIdProofName;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.s3SignedUrl = async (imageKey) => {
  try {
    let signedUrl;
    const getObjectParams = {
      Bucket: bucketName,
      Key: imageKey,
    };
    const getCommand = new GetObjectCommand(getObjectParams);
    signedUrl = await getSignedUrl(s3, getCommand, {
      expiresIn: 600000, // 7 days in seconds
    });
    return signedUrl;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
