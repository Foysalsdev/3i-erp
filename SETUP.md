# 3i Logistics ERP — Phase 1 Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free tier)
- A Vercel account (free tier)
- A GitHub account

---

## Step 1: Clone & Install

```bash
git clone https://github.com/foysalsharkar1998-art/3i-erp.git
cd 3i-erp
npm install
```

---

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `3i-logistics-erp`
3. Database Password: save this somewhere safe
4. Region: closest to Bangladesh (Singapore)

---

## Step 3: Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

Get these from: **Supabase Dashboard → Settings → API**

---

## Step 4: Run Database Migrations

Go to **Supabase Dashboard → SQL Editor** and run each file **in order**:

| Order | File | Description |
|-------|------|-------------|
| 1 | `supabase/migrations/001_core_tables.sql` | Auth, roles, notifications, audit |
| 2 | `supabase/migrations/002_warehouse_tables.sql` | Items, GRN, SO, DC, stock |
| 3 | `supabase/migrations/003_finance_hr_tables.sql` | Finance, HR, Transport, Promo |
| 4 | `supabase/migrations/004_indexes.sql` | Performance indexes |
| 5 | `supabase/migrations/005_rls_policies.sql` | Security policies |
| 6 | `supabase/migrations/006_functions_triggers.sql` | DB functions & stock triggers |
| 7 | `supabase/migrations/007_seed_data.sql` | Initial clients, warehouse, roles |

> **Important:** Run them one by one. If any file fails, check the error before continuing.

---

## Step 5: Create Your Super Admin Account

1. **Supabase Dashboard → Authentication → Users → Invite User**
2. Enter your email → Send invite
3. Check email, accept invite, set password

Then run this SQL in **Supabase SQL Editor** (replace email):

```sql
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
  (SELECT id FROM auth.users WHERE email = 'your@email.com'),
  (SELECT id FROM roles WHERE name = 'Super Admin'),
  (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

---

## Step 6: Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Login with your Super Admin email and password.

---

## Step 7: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select your repo
4. Framework: **Vite** (auto-detected)
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy

Every `git push` to `main` auto-redeploys.

---

## Step 8: Set Up GitHub Actions Secrets

Go to your GitHub repo → **Settings → Secrets → Actions** → Add:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (from Supabase Dashboard → Settings → API) |

> ⚠️ `SUPABASE_SERVICE_KEY` is the `service_role` key — **never expose this in frontend code**

---

## Step 9: Deploy Supabase Edge Functions (Optional for Phase 1)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set Edge Function secrets
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
supabase secrets set GOOGLE_DRIVE_FOLDER_ID=your-folder-id

# Deploy functions
supabase functions deploy daily-alerts
supabase functions deploy upload-to-drive
supabase functions deploy delete-from-drive
supabase functions deploy monthly-cleanup
```

> Edge Functions are only needed for file uploads and daily alerts. Phase 1 works without them.

---

## Phase 1 Complete ✅

After setup, you should have:
- ✅ App running at localhost:5173
- ✅ Login page working
- ✅ SAP Horizon UI shell visible
- ✅ Dashboard loaded after login
- ✅ Sidebar navigation to all 47 module placeholders
- ✅ Client switcher (WH/RB/GD/3I)
- ✅ Notification bell
- ✅ DB tables created with RLS
- ✅ Stock triggers active
- ✅ Super Admin role assigned

## Next: Phase 2 — Masters

Start a new chat with:
> "Phase 1 complete. এখন Phase 2: Masters build করো. Blueprint থেকে Modules 2-6 implement করো."

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Alt+H` | Dashboard |
| `Alt+B` | Go back |
| `g` then `g` | Go to GRN |
| `g` then `s` | Go to Sales Orders |
| `g` then `t` | Go to Transport |
| `g` then `e` | Go to Expenses |
| `g` then `r` | Go to Reports |
| `Escape` | Close modal |
| `F5` | Soft refresh data |

---

## Troubleshooting

**Login fails:** Check Supabase URL and Anon Key in `.env.local`

**RLS errors:** Make sure you ran `005_rls_policies.sql` and assigned Super Admin role via SQL

**"Cannot find module":** Run `npm install` again

**Blank page:** Open browser console — likely missing `.env.local` variables
