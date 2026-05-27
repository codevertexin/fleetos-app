# FleetOS — Phase 5b Operational Identity Sync Report



**Date:** 2026-05-27 (revised — secure Edge path)  

**Scope:** Link CodeVertex identity to FleetOS operational tenant layer **without** anon-callable `SECURITY DEFINER` RPC writes.  

**Explicitly out of scope:** Billing, Stripe, operational mock data replacement, tenant RLS rewrite, git push.



---



## Summary (current)



The initial Phase 5b used PostgREST RPCs granted to **`anon`**, which was **rejected** as a **BLOCKER** (see `FLEETOS_PHASE5B_SECURITY_REVIEW.md`).



The **current** design:



1. **Migration** `20260527130000_phase5b_operational_identity_sync.sql` only **`DROP FUNCTION IF EXISTS`** for the unsafe RPCs (safe to apply; removes bad grants if those functions were ever applied).

2. **Edge Functions** (skeleton): `fleetos-sync-identity`, `fleetos-list-tenants` — validate `app_code=FLEETOS`, require `X-Auth-Core-Access-Token`, return **501** until Auth Core verification is implemented (no insecure success).

3. **Frontend** calls the sync Edge URL when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set (or optional `VITE_FLEETOS_SYNC_IDENTITY_URL`); on **501** / error, **skips** DB sync safely.

4. **`TenantProvider`** uses a **single** mock tenant until secure tenant listing exists; **does not** call anon list RPC; **does not** silently pick `tenants[0]` when multiple tenants would be ambiguous.



Operational DB writes (`profiles`, `tenant_users`) are **deferred** to Edge + `service_role` **after** Auth Core contract (JWKS / introspection / assertion) — see `FLEETOS_PHASE5B_SECURE_DESIGN.md`.



---



## Database migration



| File | Purpose |

|------|---------|

| `supabase/migrations/20260527130000_phase5b_operational_identity_sync.sql` | **Safe:** drops `fleetos_sync_operational_identity_after_sso` and `fleetos_list_operational_tenants` if present. **Does not** create anon-callable writers. |



---



## Supabase Edge



| Function | Path |

|----------|------|

| `fleetos-sync-identity` | `supabase/functions/fleetos-sync-identity/index.ts` |

| `fleetos-list-tenants` | `supabase/functions/fleetos-list-tenants/index.ts` |



`supabase/config.toml`: `verify_jwt = false` for both (Auth Core token is not a Supabase JWT).



---



## Frontend / libraries



| Area | Change |

|------|--------|

| `package.json` | `@supabase/supabase-js` (retained for `supabase.service` / future use) |

| `src/lib/services/supabase.service.ts` | Anon client (no identity RPC writes from Phase 5b) |

| `src/lib/auth-core-jwt.ts` | Helpers retained for future / consume envelope checks |

| `src/lib/services/fleetos-identity-sync.service.ts` | `fetch` → Edge `fleetos-sync-identity`; no direct RPC |

| `src/contexts/AuthProvider.tsx` | `completeSsoLogin(result, operational?)` unchanged contract |

| `src/contexts/TenantProvider.tsx` | Mock-only tenant list; explicit multi-tenant resolution rules |

| `src/app/pages/auth/SsoCallback.tsx` | Calls `syncOperationalIdentityAfterSso` (Edge path) |

| `src/lib/services/auth.service.ts` | Dev mock UUID profile; optional `VITE_FLEETOS_DEV_MOCK_TENANT_ID` |

| `.env.example` | `VITE_FLEETOS_SYNC_IDENTITY_URL`, Supabase keys, dev mock tenant |



---



## Flow



```txt

SSO consume (active)

  → POST fleetos-sync-identity (X-Auth-Core-Access-Token, body app_code only)

  → 501 until verification implemented → skip DB sync (safe)

  → completeSsoLogin

  → TenantProvider → single mock tenant (until fleetos-list-tenants is ready)

```



---



## Build / lint



| Check | Resultado (local) |

|-------|-------------------|

| `npm run build` | Pass |

| `npm run lint` | Pass (0 erros; 35 avisos pré-existentes no `src/`) |



---



## Next steps



1. Agree Auth Core verification contract; implement JWT verify / introspect inside `fleetos-sync-identity`.

2. Use `SUPABASE_SERVICE_ROLE_KEY` **only** inside Edge to upsert `profiles` / `tenant_users`.

3. Implement `fleetos-list-tenants` + wire `TenantProvider` (no arbitrary UUID from client).

4. Tighten CORS on Edge to production origins.

5. Phase 6: RLS + optional Supabase Auth linkage.


