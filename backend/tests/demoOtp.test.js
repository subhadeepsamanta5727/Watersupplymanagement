const test = require('node:test');
const assert = require('node:assert/strict');
const { DEMO_OTP, getDemoOtpPhone, isDemoOtpEnabled } = require('../utils/demoOtp');

test('enables demo OTP for any phone in development or test when SMTP credentials are missing', () => {
  assert.equal(isDemoOtpEnabled('1234567890', { NODE_ENV: 'development' }), true);
  assert.equal(isDemoOtpEnabled('1234567890', { NODE_ENV: 'test', SMTP_EMAIL: 'dummy_user', SMTP_PASSWORD: 'dummy_pass' }), true);
  assert.equal(isDemoOtpEnabled('1234567890', { NODE_ENV: 'development', SMTP_EMAIL: 'mailer', SMTP_PASSWORD: 'secret' }), false);
  assert.equal(isDemoOtpEnabled('1234567890', { NODE_ENV: 'production' }), false);
  assert.equal(isDemoOtpEnabled('1234567890', {}), false);
});

test('enables production demo OTP only for explicitly allowlisted test phones', () => {
  const env = {
    NODE_ENV: 'production',
    DEMO_OTP_PHONES: '1234567890, 9876543210'
  };

  assert.equal(isDemoOtpEnabled('1234567890', env), true);
  assert.equal(isDemoOtpEnabled('9876543210', env), true);
  assert.equal(isDemoOtpEnabled('1111111111', env), false);
  assert.equal(isDemoOtpEnabled(undefined, env), false);
  assert.equal(isDemoOtpEnabled('1234567890', { NODE_ENV: 'production', DEMO_OTP_PHONES: 'not-a-phone' }), false);
});

test('accepts a demo token only with the fixed OTP and a ten-digit phone', () => {
  assert.equal(DEMO_OTP, '123456');
  assert.equal(getDemoOtpPhone('DEV_TOKEN_1234567890_123456'), '1234567890');
  assert.equal(getDemoOtpPhone('DEV_TOKEN_1234567890_000000'), null);
  assert.equal(getDemoOtpPhone('DEV_TOKEN_123456789_123456'), null);
  assert.equal(getDemoOtpPhone(null), null);
});
