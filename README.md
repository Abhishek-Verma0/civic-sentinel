# CivicSentinel 🛡️

An autonomous, full-stack civic AI agent platform designed to perceive, decide, act, and dispatch municipal services for citizen-reported infrastructure issues. Built with React, Express, Firebase (Auth & Firestore), and the Google Gemini API.

---

## 🌟 Key Features

### 1. Secure Authentication & Role-Based Workspaces
CivicSentinel features fully integrated persistent authentication powered by **Firebase Auth** and secure **Firestore** profiles:
- **Citizen Portal**:
  - **Autonomous Dispatch Intake**: Submit geo-referenced photo reports of local damage (potholes, traffic failures, water leaks).
  - **Live Civic Map**: Track ongoing reports and status changes dynamically.
  - **Civic Impact Metrics**: See aggregated local response data, resolution counts, and response performance.
- **Authority Control Room**:
  - **AI Triage Agent**: Automated severity rankings, category classification, agency routing, and target SLA time estimates.
  - **Duplicate Mitigation**: Intelligent cross-referencing that identifies similar issues nearby and allows manual or automatic ticket merging.
  - **Work Order Generation**: Drafted work details ready for review and municipal action.

### 2. Autonomous Triaging (Sense & Decide)
When a citizen uploads an image, the underlying Gemini vision agent parses the scene to:
1. Estimate latitude/longitude and physical address details.
2. Determine infrastructure category and potential structural hazards.
3. Classify urgency levels and allocate appropriate target response times.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express
- **Database & Identity**: Firebase Firestore & Firebase Authentication
- **AI Engine**: Google Gemini API via server-side routing
- **Map & Metrics**: Responsive custom mapping interfaces and Recharts metric components

---

## 🚀 Quick Start for Developers

### Prerequisites
Make sure you have Node.js installed in your workspace environment.

### 1. Environment Configuration
Ensure your `.env` contains the required credentials:
```env
# Required for autonomous municipal triages
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Local Setup
Install the dependencies:
```bash
npm install
```

### 3. Run Development Server
Launches both the Express API and the Vite development hot reload server on port `3000`:
```bash
npm run dev
```

### 4. Build for Production
Compiles frontend static assets and bundles the backend server into `dist/`:
```bash
npm run build
```

---

## 🔑 Demo Access & Interactive Accounts
For evaluating role permissions without manual registration, CivicSentinel includes fast autofill credentials on the sign-in page:

| Role Profile | Demo Email | Demo Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civicsentinel.com` | `citizen123` | Report issues, view live maps, personal impact |
| **Authority** | `admin@civicsentinel.com` | `admin123` | View dispatcher dashboards, handle triage reviews, merge duplicates |
