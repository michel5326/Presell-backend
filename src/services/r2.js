const AWS = require("aws-sdk");
const fs = require("fs");

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  signatureVersion: "v4",
  region: "auto",
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

async function uploadToR2(localPath, remoteKey) {
  const buffer = fs.readFileSync(localPath);

  await s3
    .putObject({
      Bucket: BUCKET,
      Key: remoteKey,
      Body: buffer,
      ContentType: "image/png",
    })
    .promise();

  return `${PUBLIC_BASE_URL}/${remoteKey}`;
}

module.exports = { uploadToR2 };
