const DEMO_OTP = '123456';

// All standard platform test customer and agent numbers with default demo bypass
const DEFAULT_TEST_CUSTOMER_PHONES = new Set([
  '9111111111', // Ananya Roy
  '9222222222', // Deepak Sen
  '9333333333', // Sneha Mukherjee
  '9444444444', // Vikram Malhotra
  '9555555555', // Priyanka Das
  '7777777777', // Pooja Sharma
  '6291909839', // Victor Mandal
  '8111111111', // Rahul Verma (Agent)
  '8222222222', // Amit Patel (Agent)
  '8888888888', // Ramesh Kumar (Agent)
  '2222222222', // Mannan (Agent)
  '3333333333', // Sam Maity (Agent)
  '9999999999'  // System Admin
]);

const isDemoOtpEnabled = (phone, env = process.env) => {
  if (typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
    return false;
  }

  // 1. Explicit global demo OTP bypass toggle (DEMO_OTP_ENABLED=true or DEMO_OTP_PHONES=*)
  if (env.DEMO_OTP_ENABLED === 'true' || env.DEMO_OTP_ENABLED === true) {
    return true;
  }

  const rawAllowed = env.DEMO_OTP_PHONES || '';
  const allowedList = rawAllowed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowedList.includes('*') || allowedList.includes('all')) {
    return true;
  }

  const allowedPhones = allowedList.filter((allowedPhone) => /^\d{10}$/.test(allowedPhone));
  if (allowedPhones.length > 0) {
    return allowedPhones.includes(phone);
  }

  // 2. All platform test customers and demo delivery agents have demo OTP bypass enabled by default
  // when no custom phone filter is explicitly active
  if (DEFAULT_TEST_CUSTOMER_PHONES.has(phone)) {
    return true;
  }

  // 3. Local development and test environments
  const isLocalEnvironment = ['development', 'test'].includes(env.NODE_ENV);
  const smtpIsConfigured = Boolean(
    env.SMTP_EMAIL &&
    env.SMTP_PASSWORD &&
    env.SMTP_EMAIL !== 'dummy_user' &&
    env.SMTP_PASSWORD !== 'dummy_pass'
  );

  if (isLocalEnvironment) {
    return !smtpIsConfigured;
  }

  return false;
};

const getDemoOtpPhone = (idToken) => {
  if (typeof idToken !== 'string') return null;
  const match = /^DEV_TOKEN_(\d{10})_(\d{6})$/.exec(idToken);
  return match && match[2] === DEMO_OTP ? match[1] : null;
};

module.exports = {
  DEMO_OTP,
  DEFAULT_TEST_CUSTOMER_PHONES,
  isDemoOtpEnabled,
  getDemoOtpPhone
};
