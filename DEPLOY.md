# Deploying AI Phone Order

You'll end up with two Cloud Run URLs (one frontend, one backend) and a
Supabase Postgres. The frontend URL is the link you share with people.

```
[customer] → frontend.run.app (React/Nginx, Cloud Run)
                ↓ fetch /api/* on
backend.run.app (Spring Boot, Cloud Run)
                ↓ JDBC (TLS)
Supabase Postgres (db.xxx.supabase.co:5432)
```

Total time: ~30 minutes if it's your first time, ~10 minutes if you've done it before.

Free-tier covers everything: Supabase free, Cloud Run free tier (2M requests/month),
Cloud Build first 120 build-minutes/day free. Google Cloud also gives new accounts
$300 credit.

---

## 0. One-time prerequisites

### Install gcloud (mac)

```bash
brew install --cask google-cloud-sdk
gcloud init                       # log in, pick a project (create one if needed)
gcloud auth application-default login
```

If you don't have a Google Cloud project yet:
```bash
gcloud projects create ai-phone-order-$(date +%s) --set-as-default
# Billing must be enabled on the project for Cloud Run; add a card at
# https://console.cloud.google.com/billing  (free tier still applies)
```

Pick a region you'll keep consistent. I'll use `us-west1` in this guide:
```bash
gcloud config set run/region us-west1
gcloud config set compute/region us-west1
```

### Enable the required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 1. Create the Supabase database

1. Sign up at https://supabase.com (free).
2. **New project** → name `ai-phone-order`, region close to your Cloud Run region (e.g. `West US (North California)`). Pick a strong DB password and save it.
3. Wait ~2 min for provisioning.
4. Project → **Settings** → **Database** → **Connection string** → tab **Session pooler** (works well with Cloud Run's scale-to-zero).
   - You'll see something like:
     ```
     postgresql://postgres.abcdef:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
     ```
5. Convert to a JDBC URL and split out the parts:
   ```
   DATABASE_URL=jdbc:postgresql://aws-0-us-west-1.pooler.supabase.com:5432/postgres
   DATABASE_USER=postgres.abcdef          # the bit before the colon in the userinfo
   DATABASE_PASSWORD=YOUR-PASSWORD
   ```
   (Hibernate will create tables on first boot because `ddl-auto: update`.)

---

## 2. Deploy the backend

From the project root:

```bash
cd backend

# Generate a real JWT secret (don't use the dev one)
JWT_SECRET=$(openssl rand -base64 48)

gcloud run deploy ai-phone-order-backend \
  --source . \
  --region us-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --timeout 60 \
  --set-env-vars "SPRING_PROFILES_ACTIVE=prod" \
  --set-env-vars "DATABASE_URL=jdbc:postgresql://aws-0-us-west-1.pooler.supabase.com:5432/postgres" \
  --set-env-vars "DATABASE_USER=postgres.abcdef" \
  --set-env-vars "DATABASE_PASSWORD=YOUR-SUPABASE-PASSWORD" \
  --set-env-vars "GROQ_API_KEY=gsk_…" \
  --set-env-vars "JWT_SECRET=$JWT_SECRET" \
  --set-env-vars "CORS_ORIGINS=*"   # will lock down after frontend is deployed
```

After ~3-5 minutes Cloud Build finishes and prints:

```
Service URL: https://ai-phone-order-backend-abcd1234-uw.a.run.app
```

**Save that URL.** Sanity check:
```bash
BACKEND=https://ai-phone-order-backend-abcd1234-uw.a.run.app
curl -X POST $BACKEND/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"customer","password":"customer123"}'
# should return a JWT
```

If you see `relation "menu_item" does not exist`, give it 10 seconds and try
again — Hibernate creates tables and `MenuSeeder` populates them on first boot.

---

## 3. Deploy the frontend

```bash
cd ../frontend

gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_API_BASE=https://ai-phone-order-backend-abcd1234-uw.a.run.app,_REGION=us-west1
```

After ~3 min you'll get another URL:

```
Service URL: https://ai-phone-order-frontend-wxyz5678-uw.a.run.app
```

That's the link you share. Open it in a browser — login page should appear.

---

## 4. Lock down CORS to the real frontend

Now that the frontend URL exists, replace the `*` from step 2:

```bash
FRONTEND=https://ai-phone-order-frontend-wxyz5678-uw.a.run.app

gcloud run services update ai-phone-order-backend \
  --region us-west1 \
  --update-env-vars "CORS_ORIGINS=$FRONTEND"
```

(One-line `gcloud run services update` will trigger a new revision without rebuilding.)

---

## 5. Verify end-to-end

1. Open the frontend URL on phone or desktop.
2. Login as `customer / customer123`.
3. Chat tab → "什么辣的菜推荐一下". AI should call the menu and suggest dishes.
4. Place an order.
5. Open the same URL in incognito, login as `staff / staff123` — the order shows in the kitchen view, you can advance its status.

---

## Updating

Code changes:

```bash
# Backend
cd backend && gcloud run deploy ai-phone-order-backend --source . --region us-west1

# Frontend (re-run cloudbuild with same substitutions)
cd frontend && gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_API_BASE=$BACKEND,_REGION=us-west1
```

Env var changes (no rebuild):

```bash
gcloud run services update ai-phone-order-backend \
  --region us-west1 \
  --update-env-vars KEY=value
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Permission denied` on first build | `gcloud auth login` and `gcloud auth application-default login` |
| Backend 503 on first request | Cold start — first request after idle takes ~5s. Subsequent requests are fast. |
| `relation "menu_item" does not exist` | DB hasn't initialized yet; wait 10s and retry. |
| Login returns 401/403 from frontend | CORS_ORIGINS doesn't match the frontend URL (no trailing slash). |
| AI chat returns "unreachable" | GROQ_API_KEY missing or expired. Rotate at https://console.groq.com/keys. |
| `IpAddressNotInWhitelist` from Supabase | Project → Settings → Network → ensure "Restrict to project" isn't on (or add Cloud Run egress IPs). |

---

## Costs (typical)

- **Supabase**: free up to 500 MB storage, 50k MAUs.
- **Cloud Run**: free up to 2M requests / 360k vCPU-seconds per month. This demo will be $0 unless you go viral.
- **Cloud Build**: 120 build-minutes/day free. Each deploy uses ~3 min.
- **Groq**: free tier with rate limits (sufficient for a demo).

Idle cost = $0. Both Cloud Run services scale to zero when nobody's using them.
