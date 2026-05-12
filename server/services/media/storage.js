const supabase = require('../../db/supabase');

const MEDIA_BUCKET    = 'postly-media';
const CAROUSEL_BUCKET = 'postly-carousels';

async function upload(bucket, path, buffer, mimeType, { upsert = false } = {}) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimeType, upsert });
  if (error) throw error;
  return data.path;
}

async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

async function remove(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

async function download(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

module.exports = { upload, getSignedUrl, remove, download, MEDIA_BUCKET, CAROUSEL_BUCKET };
