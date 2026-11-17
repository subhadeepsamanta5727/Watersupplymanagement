# Water Supply Management System

A production-ready, full-stack water delivery and distribution ERP platform built with Node.js, Express, MongoDB, and React 19. The system provides complete end-to-end logistics, inventory, billing, and role-based workflows for water purification plants, local distributors, field delivery agents, and retail customers.

---

## Key Portals & Features

### 1. Vendor / Distributor ERP Portal (`/vendor`)
* **Inventory & Product Catalog:** Real-time stock tracking for 20L water jars, dispenser taps, and bottled water cases with low-stock and out-of-stock indicators.
* **Customer Management & Digital Khata:** Track customer addresses, current bottle deposits/outstanding empties, and ledger balance.
* **Delivery Scheduling & Dispatch:** Order assignment to delivery agents, delivery slot filters (Morning, Afternoon, Evening), and one-click fulfillment.
* **Cash & Jar Shift Settlements:** Reconcile cash collections and returned empty jars handed over by delivery agents at the end of every shift.
* **Subscription Management:** Razorpay integration for distributor tiered subscription plans with customer capacity limits.
* **Automated PDF Statements:** Instant generation and streaming of customer monthly billing summaries and ledger statements via PDFKit.

### 2. Delivery Agent Mobile App (`/agent`)
* **Shared Delivery Board:** Real-time visibility into open vendor deliveries with atomic claim/release locks to prevent concurrent driver pickup races.
* **Doorstep Fulfillment:** Delivery confirmation with per-item delivered quantity adjustments, empty jar pickup logging, and cash collection recording.
* **Navigation & Calling:** Direct Google Maps turn-by-turn navigation deep-links and one-tap customer phone calling.
* **Field Remarks:** Ability to record delivery notes (e.g., gate codes, security handovers, customer absent notes).
* **Cash & Jar Ledgers:** Real-time visibility of cash in hand and empty jars awaiting evening warehouse handover.

### 3. Customer Storefront & Account (`/customer`)
* **Storefront:** Browse vendor products, pricing, and available delivery windows.
* **Flexible Ordering:** Request deliveries with custom drop-off addresses, delivery slot preferences, and declaration of empty jars ready for return.
* **Online Bill Payment:** Integrated Razorpay checkout to clear outstanding balances digitally or pay on delivery.
* **Order & Statement History:** Complete transparency on delivered jars, returned empties, and payment transaction receipts.

### 4. Platform Superadmin Console (`/admin`)
* **Platform Metrics:** Overview of registered vendors, total connected customers, and subscription revenue.
* **Plan Configuration:** Create and manage subscription tiers (pricing, user limits, validity).
* **Payment Gateway Config:** Manage platform Razorpay API credentials with AES-256-GCM secret encryption.
* **Vendor Moderation:** Activate, deactivate, or delete vendor tenants.

---

## Tech Stack

* **Backend:**
  * Node.js & Express 4
  * MongoDB & Mongoose (Transactions, replica set support, compound indexing)
  * Firebase Admin SDK (Phone OTP verification)
  * Razorpay SDK (Subscriptions & Customer invoices)
  * PDFKit (Custom tabular invoices and statements)
  * Crypto (AES-256-GCM authenticated encryption for vendor API keys)
* **Frontend:**
  * React 19 & Vite 8
  * Tailwind CSS v4
  * Lucide React (Icons)
  * React Router v7

---

## Getting Started

### Prerequisites
* Node.js v18+ or v20+
* MongoDB v5+ or MongoDB Atlas instance
* Firebase Project (for Phone Authentication)
* Razorpay Account (for online payments)

### 1. Clone Repository
```bash
git clone https://github.com/subhadeepsamanta5727/Watersupplymanagement.git
cd Watersupplymanagement
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your MONGO_URI, JWT_SECRET, RAZORPAY credentials, etc. in .env
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
# Fill in your VITE_API_URL and Firebase Web SDK credentials in .env
npm run dev
```

The frontend will run at `http://localhost:5173` and connect to the backend at `http://localhost:5000/api/v1`.

## Deploying on Render

This repository includes a Render Blueprint in [`render.yaml`](render.yaml) that creates an Express API and a static React frontend. Push the repository to GitHub, then in Render choose **New + → Blueprint** and select the repository. Render will prompt for the private values marked as unsynchronized in the Blueprint.

Before deploying, prepare:

* A MongoDB Atlas connection string for a database configured as a replica set (required for order/payment transactions).
* A strong, unique `JWT_SECRET`.
* A 64-character hexadecimal `RAZORPAY_SECRET_ENCRYPTION_KEY`, generated with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
* The initial admin's name, phone, email, and a strong password. These are used only when the production database has no admin yet.
* The frontend's Render URL for `FRONTEND_URL` (the Blueprint's static site is named `water-supply-web`; use its actual URL, typically `https://water-supply-web.onrender.com`).

After the Blueprint creates both services, configure these additional environment variables in the Render dashboard if those features are needed:

* **API service:** `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_CLIENT_X509_CERT_URL` for Firebase phone authentication; SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD`, `FROM_NAME`, and `FROM_EMAIL`) for password-reset email.
* **Static site:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` for Firebase phone authentication.

Use Render's environment-variable dashboard for credentials; do not commit `.env` files or Firebase service-account JSON. The Firebase web configuration is used by the browser, but the Firebase Admin private key must remain secret. Use a fresh production database, or remove/change any existing demo accounts before launch. Production no longer seeds the development demo vendor or fixed default credentials; create a vendor through the business registration page after deployment.

The API is configured on Render's free instance plan, which can spin down after inactivity and make the first request slow. Choose a paid plan in Render if you need an always-on API.

---

## Documentation References

* [`doc.txt`](doc.txt): Complete architectural overview, schemas, workflows, and testing guide.

---

## License
MIT License.
