# Hisab-Book (Purnima Construction) 🏗️

A premium, full-stack, and mobile-friendly responsive web application designed for civil construction contractors to manage worker attendance, log wages, track advance payments, and export detailed payroll ledger reports.

Built with **Next.js (App Router)**, **Vanilla CSS**, **MongoDB** (with automatic zero-setup JSON fallback), **SheetJS (xlsx)**, and **jsPDF**.

---

## ✨ Key Features

- **📱 Mobile-First Responsive Design:** Clean, warm-construction themed interface tailored for on-site mobile usage with large touch-targets, sliding drawers, a persistent bottom navigation shell, and a seamless light/dark mode switch.
- **👷 Worker Directory:** Manage worker status (Active/Inactive), daily wage rates, default site assignments, and roles (e.g., Mistri, Labor, Supervisor).
- **📅 Touch-Friendly Attendance Sheet:** Log daily worker presence (Present / Half Day / Absent) with site-specific tracking and custom notes.
- **💸 Advance & Salary Tracker:** 
  - Log payment records categorized as *Salary Paid* or *Advance Paid*.
  - View live outstanding balances.
  - Automatically calculate wages: 
    $$\text{Earnings} = (\text{Present Days} \times \text{Daily Wage}) + (\text{Half Days} \times \text{Daily Wage} \times 0.5)$$
    $$\text{Net Balance} = \text{Earnings} - \text{Salaries Paid} - \text{Advances Paid}$$
- **💬 WhatsApp Receipt Link Generator:** Directly generate pre-filled payment confirmation links to message workers with their transaction details in one click.
- **📊 Interactive Dashboard:** Responsive SVG charts showing weekly payout distributions and labor role statistics.
- **📥 Robust PDF & Excel Ledger Downloads:** Includes options to download custom PDF reports (with company branding and formatted tables) or Excel sheets (multi-sheet payroll, daily grids, and transaction logs). Uses a custom server-side reflector to ensure download managers (like IDM) correctly save files with proper extensions rather than extensionless browser IDs.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Custom Vanilla CSS variables (No Tailwind required, supporting absolute theme modularity)
- **Database:** MongoDB / Mongoose *or* Local JSON database (file system fallback)
- **Libraries:**
  - `xlsx` (SheetJS) for compiling reports
  - `jspdf` & `jspdf-autotable` for PDF layout rendering
  - `lucide-react` for high-quality SVG icons
  - `jsonwebtoken` & `bcryptjs` for session authentication and security

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js (v18+)** installed.

### 2. Clone & Installation
```bash
git clone https://github.com/YOUR_USERNAME/Hisab-Book.git
cd Hisab-Book
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
JWT_SECRET=your_super_secret_jwt_passphrase_here
# Optional: Add MongoDB connection string to switch to cloud database mode.
# If omitted, the app will write directly to local JSON files under data/ for zero-setup ease.
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hisab-book
```

### 4. Running the App
Start the Next.js local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- **First-time Onboarding:** On first run, the app will automatically prompt you to create an administrator profile (Username, Password, and Construction Contractor Brand Name).

---

## 🗄️ Database Storage Modes

1. **Zero-Setup Local Mode (Default):**
   If no `MONGODB_URI` is present in `.env.local`, Hisab-Book automatically stores and updates collections inside `data/*.json` files on the server's disk space. This is ideal for instant offline runs and local deployments.
2. **Cloud MongoDB Mode:**
   Providing a connection string dynamically shifts all models and hooks to MongoDB Atlas.

---

## 📦 How to Upload to GitHub

If you want to upload this project to your own GitHub profile, run the following commands in your terminal:

```bash
# Initialize git repository (if not already done)
git init

# Add all files to stage (respects .gitignore, excluding node_modules, .next, and local .env files)
git add .

# Create the first initial commit
git commit -m "feat: initial commit of Hisab-Book application"

# Rename your primary branch to main
git branch -M main

# Add your GitHub repository link as remote origin
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

# Push the code to GitHub
git push -u origin main
```

*(Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub details).*
