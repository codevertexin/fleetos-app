# FleetOS P1.2B — Admin BFF smoke tests

Server-side proxy at `/api/admin/*` (Vercel). **Never** call Supabase admin Edge from the browser.

**Contract:** `docs/architecture/FLEETOS_ADMIN_UI_P1_2_CONTRACT.md`

---

## Prerequisites

1. `.env.local` (gitignored) with server vars from `.env.example` (no `VITE_` on secrets).
2. Supabase Edge P1.1 deployed + `FLEETOS_ADMIN_SECRET` set on Supabase.
3. Two terminals:
   - `npm run dev:api` → BFF on `http://127.0.0.1:3000`
   - `npm run dev` → Vite on `http://localhost:4200` (proxies `/api` → 3000)

Or test BFF directly on port 3000.

---

## PowerShell

```powershell
$Base = "http://127.0.0.1:3000"
$OperatorToken = "<FLEETOS_ADMIN_UI_OPERATOR_TOKEN>"
$CookieJar = "$env:TEMP\fleetos-admin-cookies.txt"

# 1) Session — not authenticated
Invoke-RestMethod -Uri "$Base/api/admin/session" -Method GET

# 2) Login
$loginBody = @{ token = $OperatorToken; reviewer_label = "ops@local" } | ConvertTo-Json
Invoke-WebRequest -Uri "$Base/api/admin/session" -Method POST `
  -ContentType "application/json" -Body $loginBody `
  -SessionVariable session | Out-Null

# 3) Session — authenticated (reuse session)
Invoke-RestMethod -Uri "$Base/api/admin/session" -Method GET -WebSession $session

# 4) List applications
$listBody = @{ status = "pending_review"; limit = 10 } | ConvertTo-Json
Invoke-RestMethod -Uri "$Base/api/admin/applications" -Method POST `
  -ContentType "application/json" -Body $listBody -WebSession $session

# 5) Review (replace tenant id)
$reviewBody = @{
  tenant_id = "<tenant-uuid>"
  decision = "approve"
  review_notes = "BFF smoke"
} | ConvertTo-Json
Invoke-RestMethod -Uri "$Base/api/admin/review-tenant" -Method POST `
  -ContentType "application/json" -Body $reviewBody -WebSession $session

# 6) Logout
Invoke-WebRequest -Uri "$Base/api/admin/session" -Method DELETE -WebSession $session | Out-Null
```

### curl (Git Bash / WSL)

```bash
BASE="http://127.0.0.1:3000"
TOKEN="<FLEETOS_ADMIN_UI_OPERATOR_TOKEN>"
JAR="$(mktemp)"

curl -sS "$BASE/api/admin/session"
curl -sS -c "$JAR" -X POST "$BASE/api/admin/session" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"reviewer_label\":\"ops@local\"}"

curl -sS -b "$JAR" "$BASE/api/admin/session"

curl -sS -b "$JAR" -X POST "$BASE/api/admin/applications" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending_review","limit":10}'

curl -sS -b "$JAR" -X POST "$BASE/api/admin/review-tenant" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"<tenant-uuid>","decision":"approve","review_notes":"BFF smoke"}'

curl -sS -b "$JAR" -X DELETE "$BASE/api/admin/session"
```

---

## Expected responses

| Step | Status | Notes |
|------|--------|-------|
| GET session (logged out) | 200 | `{ "ok": true, "authenticated": false }` |
| POST session | 200 | `Set-Cookie: fleetos_admin_session=...` HttpOnly |
| GET session (logged in) | 200 | `authenticated: true` |
| POST applications | 200 | Edge list passthrough |
| POST review-tenant | 200 / 409 | Edge passthrough |
| DELETE session | 204 | Cookie cleared |

---

## Security checks

| Check | How |
|-------|-----|
| No secret in browser | `FLEETOS_ADMIN_SECRET` only in server env |
| POST without cookie | `401 admin_session_required` on applications/review |
| POST without JSON | `415 unsupported_media_type` |
| Wrong operator token | `401 operator_unauthorized` |
| GET applications | `405 method_not_allowed` |

---

## Vercel production

Set env in Vercel project (Production + Preview as needed):

- `FLEETOS_ADMIN_SECRET`
- `FLEETOS_ADMIN_UI_OPERATOR_TOKEN`
- `SUPABASE_URL` / `SUPABASE_ANON_KEY`
- `FLEETOS_EDGE_ALLOWED_ORIGIN` (canonical app URL)
- `ADMIN_UI_SESSION_SIGNING_SECRET` (recommended, separate from operator token)

Deploy: `vercel --prod` — `/api/*` is served by serverless functions before SPA rewrite.
