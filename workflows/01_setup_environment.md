# Workflow: 01 — Setup Environment

## Objective
Bootstrap the full project: GitHub repository, Supabase project, local `.env`, and folder structure so all subsequent workflows can run without friction.

## Inputs Required
- GitHub account with repo creation rights
- Supabase account (free tier is sufficient)
- Node.js ≥ 18 installed locally
- `.env` file created at project root

## Steps

### Step 1 — Create GitHub Repository
```bash
gh repo create b2b2c-employee-benefits --public --description "B2B2C Employee Benefits Portal" --clone
cd b2b2c-employee-benefits
```
Add a `.gitignore` for Node and a base `README.md`.

### Step 2 — Initialize Project Structure
```
b2b2c-employee-benefits/
├── workflows/          # WAT SOPs (this folder)
├── tools/              # Python utility scripts
├── src/
│   ├── index.html      # App shell (mobile-first SPA)
│   ├── app.js          # Main app logic
│   ├── auth.js         # Employee code login
│   ├── offers.js       # Offers catalog rendering
│   ├── simulator.js    # EMI calculator logic
│   └── styles.css      # Mobile-first CSS
├── public/
│   └── assets/         # Logos: Adira, Home Credit, Zurich
├── supabase/
│   └── migrations/     # SQL schema files
├── .env                # Local secrets (gitignored)
├── .env.example        # Template for team members
└── package.json
```

Run:
```bash
python tools/setup_supabase.py
```
This creates the Supabase tables (see tool for details).

### Step 3 — Configure `.env`
```dotenv
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
Never commit `.env`. Always commit `.env.example`.

### Step 4 — Seed Initial Data
```bash
python tools/seed_offers.py
```
This populates `employee_codes`, `offers`, and `providers` tables with demo data.

### Step 5 — Install Dependencies & Verify
```bash
npm install
npm run dev
```
Confirm the app loads at `http://localhost:5173` on mobile viewport (375px).

## Expected Output
- GitHub repo with initial commit
- Supabase project with tables created and seeded
- Local dev server running successfully

## Edge Cases
- **Supabase free tier limit**: 2 active projects max — archive any unused projects first
- **Port conflict on 5173**: Use `npm run dev -- --port 3000`
- **Missing `gh` CLI**: Install via `brew install gh` or download from cli.github.com

## Tools Used
- `tools/setup_supabase.py`
- `tools/seed_offers.py`
