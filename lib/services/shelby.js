import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  endpoint:         process.env.SHELBY_ENDPOINT,
  accessKeyId:      process.env.SHELBY_ACCESS_KEY,
  secretAccessKey:  process.env.SHELBY_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region:           process.env.SHELBY_REGION || 'global',
});

const BUCKET = process.env.SHELBY_BUCKET || 'dataproof-datasets';

export async function uploadToShelby({ key, buffer, contentType, metadata = {} }) {
  const result = await s3.upload({
    Bucket: BUCKET, Key: key, Body: buffer,
    ContentType: contentType, Metadata: metadata,
  }).promise();
  return { shelbyKey: key, etag: result.ETag, location: result.Location };
}

export async function getPresignedReadUrl({ shelbyKey, expiresSeconds = 300 }) {
  return s3.getSignedUrlPromise('getObject', {
    Bucket: BUCKET, Key: shelbyKey, Expires: expiresSeconds,
  });
}

export async function deleteFromShelby({ shelbyKey }) {
  await s3.deleteObject({ Bucket: BUCKET, Key: shelbyKey }).promise();
  return { deleted: true };
}
