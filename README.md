<div align="center">

<h1 align="center">📊 DoCoDeGo — Branded Survey Builder</h1>

<p><i>Build, brand, and deploy responsive surveys with smart branching logic in seconds. Everything runs serverless on Cloudflare.</i></p>

<br/>

![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)
![Hono](https://img.shields.io/badge/Hono-API_Framework-orange?style=flat-square&logo=hono&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Serverless-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![D1 Database](https://img.shields.io/badge/Cloudflare_D1-SQLite_Database-blue?style=flat-square&logo=sqlite&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-Linter_&_Formatter-red?style=flat-square&logo=biome&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Stars](https://img.shields.io/github/stars/Varun2045/docodego-survey-builder?style=flat-square&color=yellow)

<br/>

<!-- 🎬 Main Demo Screen -->
<img src="assets/builder.png" alt="DoCoDeGo Survey Builder Canvas" width="800" style="border-radius: 10px; border: 1px solid #e2e8f0;"/>

</div>

---

<h3 align="center">🧠 What is DoCoDeGo Survey Builder?</h3>

<div align="center">

DoCoDeGo Survey Builder is a **fully responsive, serverless Typeform/Tally clone** built to run on Cloudflare's serverless free tier. It allows signed-in users to build custom surveys with interactive drag-and-drop ordering, select custom brand identities, publish live shareable forms that collect anonymous responses, and view detailed summary analytics with heatmaps and averages.

It features **Base64 local logo uploader** (bypassing credit card billing restrictions for R2 storage) and **smart conditional branching visibility logic** that evaluates on-device in real-time.

<p><b>Create Survey → Add Branching → Brand & Share → View Analytics. That's it.</b></p>

</div>

---

<h3 align="center">🚀 Live Demo</h3>

<div align="center">

You can access and test the hosted application live in your browser:

<p><b>👉 <a href="https://3db5ca7d.docodego-survey.pages.dev">https://3db5ca7d.docodego-survey.pages.dev</a></b></p>

*Feel free to register a new account, build surveys, configure branding styles, and test submissions.*

</div>

---

<h3 align="center">✨ Features</h3>

<div align="center">

| Feature | Description |
| :--- | :--- |
| 🔒 **Secure Authentication** | Auth system using PBKDF2 password hashing & secure JWT session states |
| 🛠️ **Visual Builder Canvas** | Drag-and-drop question cards to reorder, add, or delete items instantly |
| 🌿 **Smart Branching Logic** | Hide/show questions based on preceding answers with automatic downstream state pruning |
| 🎨 **Theme Branding** | Pick primary colors, custom typography fonts (6 options), and background styles |
| 🖼️ **Base64 Logo Uploader** | Upload banners/logos processed fully client-side and saved into SQLite (D1) |
| 📊 **Summary Analytics** | Real-time dashboards displaying rating averages, bar charts, and matrix heatmaps |
| 📥 **Sanitized CSV Exports** | Protects survey owners against CSV injection (formula injection) exploits |

</div>

---

<h3 align="center">🛠️ Tech Stack</h3>

<div align="center">

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + TailwindCSS | Crisp dashboard styled using Tailwind CSS and Recharts |
| **Routing** | TanStack Router | Client-side routing engine (no heavy SSR framework required) |
| **Backend** | Hono API Framework | Ultra-fast worker framework running on Cloudflare Workers |
| **Database** | Cloudflare D1 | Serverless SQL SQLite database persisting surveys and responses |
| **Linter / Formatter** | Biome | High-speed code styling and checking matching clean build targets |

</div>

---

<h3 align="center">📷 Demos</h3>

<div align="center">

<h4>📈 Summary Analytics & Matrix Heatmaps</h4>
<img src="assets/analytics.png" alt="Response Analytics" width="750" style="border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;"/>

<h4>🛠️ Builder UI & Conditional Branching Rules</h4>
<img src="assets/builder.png" alt="Survey Builder" width="750" style="border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;"/>

<h4>📋 Creator Dashboard Overview</h4>
<img src="assets/dashboard.png" alt="Owner Dashboard" width="750" style="border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;"/>

</div>

---

<h3 align="center">⚙️ Setup & Running Guide</h3>

<h4 align="center">📋 Prerequisites</h4>

<div align="center">

Make sure you have installed:
- **Node.js LTS** — [nodejs.org](https://nodejs.org/)
- **pnpm package manager** — `npm install -g pnpm`

</div>

---

<h4 align="center">⚡ Local Development Launch</h4>

1. **Install dependencies at root workspace:**
   ```bash
   pnpm install
   ```
2. **Launch backend API (:8787) and frontend (:5173) in parallel:**
   ```bash
   pnpm dev
   ```
3. Open **`http://localhost:5173/`** in your browser and start building surveys!

---

<h4 align="center">☁️ Cloudflare Remote Deployment Guide</h4>

**Step 1 — Setup Cloud Database:**
```bash
# Create D1 instance in Cloudflare
npx wrangler d1 create survey-db

# Copy database_id from terminal and paste it inside api/wrangler.jsonc

# Run database setup scripts
cd api
npx wrangler d1 execute survey-db --remote --file=schema.sql
```

**Step 2 — Deploy API Worker:**
```bash
npx wrangler deploy
# Copy the deployed Worker URL (e.g. https://survey-api.username.workers.dev)
```

**Step 3 — Deploy Frontend Pages:**
1. Open `web/src/lib/api.ts` in your editor.
2. Edit **line 9** to match your deployed Worker URL:
   ```typescript
   const API_BASE = "https://survey-api.your-username.workers.dev/api";
   ```
3. Compile and deploy static assets:
   ```bash
   cd ../web
   npm run build
   npx wrangler pages deploy dist/
   ```

---

<h3 align="center">📂 App Workspaces</h3>

<div align="center">

| Section | Description |
|:---:|:---|
| **`api/`** | Hono endpoints serving Auth, Surveys, Questions, and Responses |
| **`web/`** | React views for Landing pages, survey builder, public form taking, and analytics |
| **`packages/types/`** | Shared type interfaces linking database structures to frontend properties |

</div>

---

<h3 align="center">🔍 Troubleshooting & Common Errors</h3>

<div align="center"><img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif"/></div>

<div align="center">

| Error / Problem | Cause | How to Fix |
| :--- | :--- | :--- |
| **`Command "build" not found`** | You ran `pnpm build` or `npx pnpm build` on a machine without global pnpm configurations. | Run **`npm run build`** inside the `web/` folder instead. |
| **`Please verify your email address [code: 10034]`** | Cloudflare Workers require verification before worker script execution. | Click on **User Profile** -> **Email Address** in Cloudflare, click verify, and run `npx wrangler logout` then `login` to refresh. |
| **`No configuration file found`** | You ran D1 commands in the project root folder instead of the project subdirectory. | Make sure to run D1 and deploy commands from inside the **`api/`** directory. |

</div>

<div align="center"><img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif"/></div>

<h3 align="center">📄 License</h3>

<div align="center">

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

</div>

---

<div align="center">

**If this Survey Builder saved you time, please consider giving it a ⭐ — it helps!**

</div>
