const test = require('node:test');
const assert = require('node:assert/strict');

process.env.RAZORPAY_SECRET_ENCRYPTION_KEY = 'ab'.repeat(32);

const User = require('../models/User');
const RazorpayConfig = require('../models/RazorpayConfig');
const { decryptSecret, encryptSecret, isEncrypted } = require('../utils/secretEncryption');

test('encrypts and decrypts secrets while keeping them out of JSON output', () => {
  const user = new User({
    name: 'Test Vendor',
    phone: '1234567890',
    razorpayKeySecret: 'vendor-secret'
  });
  const encryptedUserSecret = user.get('razorpayKeySecret', null, { getters: false });

  assert.ok(isEncrypted(encryptedUserSecret));
  assert.equal(user.razorpayKeySecret, 'vendor-secret');
  assert.equal(decryptSecret(encryptedUserSecret), 'vendor-secret');
  assert.equal(JSON.stringify(user).includes('vendor-secret'), false);

  const config = new RazorpayConfig({ keyId: 'key-id', keySecret: 'admin-secret' });
  assert.equal(config.keySecret, 'admin-secret');
  assert.equal(JSON.stringify(config).includes('admin-secret'), false);
});

test('rejects ciphertext modified without the encryption key', () => {
  const encrypted = encryptSecret('secret');
  const parts = encrypted.split(':');
  const ciphertext = parts[parts.length - 1];
  parts[parts.length - 1] = `${ciphertext.slice(0, -1)}${ciphertext.endsWith('0') ? '1' : '0'}`;
  assert.throws(() => decryptSecret(parts.join(':')));
});
