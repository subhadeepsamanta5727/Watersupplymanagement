const crypto = require('crypto');

const PREFIX = 'enc:v1:';

const isEncryptionKeyConfigured = () => /^[a-f0-9]{64}$/i.test(
  process.env.RAZORPAY_SECRET_ENCRYPTION_KEY || ''
);

const getEncryptionKey = () => {
  const key = process.env.RAZORPAY_SECRET_ENCRYPTION_KEY;
  if (!isEncryptionKeyConfigured()) {
    throw new Error('RAZORPAY_SECRET_ENCRYPTION_KEY must be configured as 64 hexadecimal characters');
  }
  return Buffer.from(key, 'hex');
};

const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

const encryptSecret = (value) => {
  if (!value) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptSecret = (value) => {
  if (!value || !isEncrypted(value)) return value;

  const [ivHex, tagHex, encryptedHex] = value.slice(PREFIX.length).split(':');
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Stored Razorpay secret has an invalid encrypted format');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]).toString('utf8');
};

module.exports = { decryptSecret, encryptSecret, isEncrypted, isEncryptionKeyConfigured };
