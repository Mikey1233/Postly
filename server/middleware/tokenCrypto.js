const crypto = require('crypto');

const ALGO = 'aes-256-cbc';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  return Buffer.from(hex, 'hex');
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(encrypted) {
  const [ivHex, dataHex] = encrypted.split(':');
  if (!ivHex || !dataHex) throw new Error('Invalid encrypted token format');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
