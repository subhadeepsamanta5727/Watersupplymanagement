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

---

## Documentation References

* [`doc.txt`](doc.txt): Complete architectural overview, schemas, workflows, and testing guide.
* [`api.txt`](api.txt): Detailed documentation for all 43 REST API endpoints.
* [`endpoints.txt`](endpoints.txt): Master quick-reference table for all API routes, HTTP methods, and access roles.

---

## License
MIT License.
