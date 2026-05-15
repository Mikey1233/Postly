const supabase = require('../../db/supabase');

const MEDIA_BUCKET    = 'postly-media';
const CAROUSEL_BUCKET = 'postly-carousels';

async function upload(bucket, path, buffer, mimeType, { upsert = false } = {}) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimeType, upsert });
  if (error) {
    const err = new Error(`Storage upload failed [${bucket}/${path}]: ${error.message}`);
    err.cause = error;
    throw err;
  }
  return data.path;
}

async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) {
    const err = new Error(`Storage sign failed [${bucket}/${path}]: ${error.message}`);
    err.cause = error;
    err.status = error.status;
    throw err;
  }
  return data.signedUrl;
}

async function remove(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    const err = new Error(`Storage remove failed [${bucket}/${path}]: ${error.message}`);
    err.cause = error;
    throw err;
  }
}

async function download(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) {
    const err = new Error(`Storage download failed [${bucket}/${path}]: ${error.message}`);
    err.cause = error;
    err.status = error.status;
    throw err;
  }
  return Buffer.from(await data.arrayBuffer());
}

module.exports = { upload, getSignedUrl, remove, download, MEDIA_BUCKET, CAROUSEL_BUCKET };
