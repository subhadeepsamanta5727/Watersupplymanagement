const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let loadPromise;

export const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => {
      const loaded = Boolean(window.Razorpay);
      if (!loaded) loadPromise = undefined;
      resolve(loaded);
    };
    script.onerror = () => {
      loadPromise = undefined;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loadPromise;
};
