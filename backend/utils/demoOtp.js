const DEMO_OTP = '123456';

const isDemoOtpEnabled = (env = process.env) => {
  const isAllowedEnvironment = ['development', 'test'].includes(env.NODE_ENV);
  const smtpIsConfigured = Boolean(
    env.SMTP_EMAIL &&
    env.SMTP_PASSWORD &&
    env.SMTP_EMAIL !== 'dummy_user' &&
    env.SMTP_PASSWORD !== 'dummy_pass'
  );
  return isAllowedEnvironment && !smtpIsConfigured;
};

const getDemoOtpPhone = (idToken) => {
  if (typeof idToken !== 'string') return null;
  const match = /^DEV_TOKEN_(\d{10})_(\d{6})$/.exec(idToken);
  return match && match[2] === DEMO_OTP ? match[1] : null;
};

module.exports = {
  DEMO_OTP,
  isDemoOtpEnabled,
  getDemoOtpPhone
};
