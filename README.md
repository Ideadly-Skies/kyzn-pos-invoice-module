# KYZN POS – Invoice Module

This repository contains the implementation of the **Invoice Module Feature** for a Point of Sales (POS) System.  
It is a technical test for KYZN, focusing on building a **React.js frontend** and a **Node.js backend** to manage invoices with a modular, professional approach.

---

## 📌 Project Overview

The goal is to develop a **React-based Web Application** that enables users to:

1. **Add Invoices**  
   - Form with required fields: date, customer name, salesperson name, notes (optional).  
   - Autocomplete for products, showing name, image, stock, and price (hardcoded JSON for demo).  
   - Input validation: cannot submit when required fields are empty.  
   - Notifications on success and warnings for invalid inputs.  
   - Invoice saved through a `POST` API call to the backend.

2. **Invoice Cards**  
   - Paginated list of published invoices.  
   - Each card shows customer name, salesperson name, total, and notes.  
   - Data fetched from backend via `GET` API using lazy loading.

3. **Time-Series Graph**  
   - Revenue projection from invoices (daily, weekly, monthly).  
   - Supports pan & zoom for focused analysis.  
   - Auto-scrolls when new data arrives.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Redux Toolkit (state management), Axios (API calls), Recharts (graphs).  
- **Backend:** Node.js with Express (REST APIs).  
- **Database:** MySQL or PostgreSQL.  
- **Other:**  
  - Modular component architecture (reusable Autocomplete, Pagination, Toast, etc.).  
  - Excel seed file (`InvoiceImport.xlsx`) used to pre-populate data for testing.

---

## 📂 Project Structure

```
kyzn-pos-invoice-module/
├── apps/
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   │   ├── features/     # Redux slices & APIs (invoices, products)
│   │   │   ├── components/   # Generic reusable UI components
│   │   │   ├── pages/        # AddInvoice, Invoices, Analytics
│   │   │   └── assets/       # Sample product data, images
│   └── api/                  # Node.js backend
│       ├── routes/           # invoice, product, stats
│       ├── services/         # business logic
│       ├── db/               # migrations & seeds
│       └── utils/            # helpers (excel, pagination)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (>=18.x)
- MySQL or PostgreSQL
- npm or yarn

### Installation
```bash
# clone the repo
git clone https://github.com/<your-username>/kyzn-pos-invoice-module.git
cd kyzn-pos-invoice-module

# install dependencies
cd client && npm install
cd server && npm install
```

### Running the App
1. Start the database (ensure it’s running locally).  
2. Seed data from `InvoiceImport.xlsx` if needed.  
3. Run backend:
   ```bash
   cd server
   npm run dev
   ```
4. Run frontend:
   ```bash
   cd client
   npm run dev
   ```
---

## 📊 API Endpoints

- `POST /invoices` → create new invoice  
- `GET /invoices?cursor=&limit=` → list invoices (lazy loading)  
- `GET /stats/revenue?bucket=daily|weekly|monthly` → revenue timeseries  

---

## 🎨 UI / UX Considerations
- Validation feedback via labels/tooltips.  
- Success/error notifications using toast system.  
- Responsive layout and clean, modern design.  
- Modular, reusable components to avoid duplication.

---

## ✅ Future Improvements
- Authentication & user roles.  
- Export invoices to PDF/CSV.  
- Product stock management integration.  
- Advanced filtering & searching on invoice list.

---
