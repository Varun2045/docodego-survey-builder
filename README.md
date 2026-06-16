# Custom Branded Survey Builder

A modern, serverless survey builder and response analyzer clone (similar to Typeform and Tally) built with React, Hono, and Cloudflare.

*   **Live App URL:** [https://3db5ca7d.docodego-survey.pages.dev](https://3db5ca7d.docodego-survey.pages.dev)
*   **Backend Worker API:** `https://survey-api.docodego-api.workers.dev`

---

## 🚀 Recommended Repository Name
*   `docodego-survey-builder`
*   `cloudflare-branded-surveys`

---

## ✨ Features Implemented

### 🛠️ Core MVP Requirements
1.  **User Authentication:** Complete Sign-in & Sign-up flow using secure **PBKDF2 password hashing** and **JWT sessions** stored locally.
2.  **Survey Builder Canvas:**
    *   Add, remove, and **drag-and-drop to reorder** questions using `@dnd-kit/core` and `@dnd-kit/sortable`.
    *   Supports multiple question types.
3.  **Survey Branding:** Customize the primary brand color, header logo, typography fonts, and form background style.
4.  **Anonymous Public Sharing:** Surveys can be filled out by anyone at a unique `/s/:id` URL, displaying the owner's exact brand settings without requiring login.
5.  **Owner Dashboard:**
    *   List created surveys with active response counts.
    *   Open and close surveys to stop/start accepting responses.
    *   View collected responses.

### 🌟 Advanced Stretch Goals
1.  **7 Rich Question Types:**
    *   Short Text, Long Text, Multiple Choice, Dropdown, Rating Scale (1-5), Date, and Matrix Grid (Multiple Choice Grid).
2.  **Branching / Conditional Questions:** Configurable logic rules (e.g. *Show Q2 only if Q1 equals 'Yes'*).
    *   Evaluated in real-time.
    *   Cascading answer clearing: if a parent choice changes, dependent responses downstream are automatically wiped.
    *   Omitted hidden inputs from final submission payload.
3.  **Base64 Logo uploads:** Images are read locally using `FileReader` and saved directly in SQLite (D1), bypassing Cloudflare R2's credit card billing activation requirement.
4.  **Summary Response Analytics:**
    *   Aggregated counts and average ratings.
    *   Progress bars showing option percentage splits.
    *    Tabular heatmap rendering for Matrix Grid selections.
5.  **CSV spreadsheet Export:**
    *   RFC 4180 compliant CSV exports.
    *   **CSV Injection Protection:** Sanitizes fields by escaping Excel-run formula characters (`=`, `+`, `-`, `@`) to protect survey owners from security exploits.

---

## 🛠️ Technology Stack

*   **Frontend:** React (v18), Vite, TypeScript, TanStack Router (Client Routing), TailwindCSS, Zustand, Dnd-Kit.
*   **Backend:** Hono API Framework on Cloudflare Workers.
*   **Database:** Cloudflare D1 (Serverless SQLite).
*   **Linter & Formatter:** Biome (Clean builds with zero errors).

---

## ⚙️ Local Development

To run the application locally on your machine:

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Start local dev servers (API on `:8787` & Frontend on `:5173`):**
    ```bash
    pnpm dev
    ```
3.  Open `http://localhost:5173` in your browser.

---

## ☁️ Cloudflare Deployment Instructions

This application is ready to deploy on Cloudflare's serverless free tier:

### Step 1: Initialize Database
```bash
# Create D1 instance in Cloudflare
npx wrangler d1 create survey-db

# Update api/wrangler.jsonc database_id with your new ID

# Create database tables
cd api
npx wrangler d1 execute survey-db --remote --file=schema.sql
```

### Step 2: Deploy Backend Worker
```bash
# Deploy to Workers (prints your Worker API URL)
npx wrangler deploy
```

### Step 3: Deploy Frontend Pages
1. Open `web/src/lib/api.ts` and set `API_BASE` to your deployed Worker URL (e.g. `https://your-api.workers.dev/api`).
2. Build and upload assets:
   ```bash
   cd ../web
   npm run build
   npx wrangler pages deploy dist/
   ```
