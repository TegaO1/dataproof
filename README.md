# DataProof — Vercel Deployment

Full-stack verifiable crypto AI dataset marketplace on Shelby + Aptos.

## Project Structure

```
dataproof-vercel/
├── api/
│   └── index.js          ← Single serverless function (handles ALL /api/* routes)
├── public/
│   └── index.html        ← Frontend (served as static)
├── lib/
│   ├── middleware/auth.js
│   ├── services/shelby.js
│   ├── services/aptos.js
│   └── routes/           ← auth, datasets, upload, access, proofs, stats
├── prisma/schema.prisma
├── vercel.json            ← Routes /api/* → serverless, /* → index.html
└── package.json
```

## How Vercel Serves It

```
Browser → vercel.app/          → public/index.html  (static)
Browser → vercel.app/api/*     → api/index.js       (serverless Express)
```

---

## Deploy Steps

### Step 1 — Get a free Postgres database

Go to **https://neon.tech** → New Project → copy the connection string.  
It looks like: `postgresql://user:pass@ep-xxx.neon.tech/dataproof?sslmode=require`

### Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/dataproof.git
git push -u origin main
```

### Step 3 — Deploy on Vercel

```bash
npm install -g vercel
vercel login
vercel
# Answer the prompts:
#   Set up and deploy? Y
#   Which scope? (your account)
#   Link to existing project? N
#   Project name: dataproof
#   Directory: ./
#   Override settings? N
```

Or connect via the Vercel dashboard: vercel.com/new → Import Git Repository.

### Step 4 — Add Environment Variables

In your Vercel dashboard → Project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | your Neon/Supabase connection string |
| `JWT_SECRET` | any random 64-char string |
| `SHELBY_ENDPOINT` | `https://s3.shelby.xyz` |
| `SHELBY_ACCESS_KEY` | from Shelby Early Access |
| `SHELBY_SECRET_KEY` | from Shelby Early Access |
| `SHELBY_BUCKET` | `dataproof-datasets` |
| `SHELBY_REGION` | `global` |
| `APTOS_NODE_URL` | `https://api.testnet.aptoslabs.com/v1` |
| `APTOS_INDEXER_URL` | `https://api.testnet.aptoslabs.com/v1/graphql` |
| `APTOS_MODULE_ADDRESS` | your deployed module address |
| `APTOS_PRIVATE_KEY` | your Aptos account private key |

### Step 5 — Push DB schema

```bash
# Set DATABASE_URL locally first (from .env)
cp .env.example .env
# edit .env with your Neon URL
npm run db:push
```

### Step 6 — Redeploy

```bash
vercel --prod
```

Your app is live at `https://dataproof.vercel.app` (or your custom domain).

---

## Local Dev

```bash
npm install
cp .env.example .env   # fill in creds
npm run db:push
vercel dev             # runs both frontend + API locally on port 3000
```

---

## Notes

- Vercel serverless functions have a **4.5 MB body limit** — for large dataset uploads, the UI will need to upload directly to Shelby using a pre-signed URL instead of routing through the API. This is a standard pattern for large file uploads on serverless.
- The frontend has **demo data fallback** — the UI shows data even if the DB isn't connected yet.
- Free Neon and Supabase both work with Prisma out of the box.
