# Optional: apply Phase 3 via Supabase CLI/psql (development project kjiwzqysjassakvrojun only)
#
# Primary apply path (current): paste supabase/migrations/20260524140000_phase3_tenant_layer.sql
# into Supabase SQL Editor — see docs/database/FLEETOS_PHASE3_APPLIED_REPORT.md
#
# This script is an alternative when SUPABASE_DB_PASSWORD is available locally:
#   $env:SUPABASE_DB_PASSWORD = '<from Supabase Dashboard > Database > password>'
#   .\scripts\apply-phase3.ps1

$ErrorActionPreference = 'Stop'
$ProjectRef = 'kjiwzqysjassakvrojun'
$Region = 'eu-west-1'
$Root = Split-Path -Parent $PSScriptRoot

$pw = $env:SUPABASE_DB_PASSWORD
if (-not $pw -and (Test-Path "$Root\.env.local")) {
  $line = Get-Content "$Root\.env.local" | Where-Object { $_ -match '^SUPABASE_DB_PASSWORD=' } | Select-Object -First 1
  if ($line) { $pw = $line -replace '^SUPABASE_DB_PASSWORD=', '' }
}
if (-not $pw) {
  Write-Error 'SUPABASE_DB_PASSWORD is required (env var or .env.local line). Get it from Supabase Dashboard > Project Settings > Database.'
}

$encoded = [uri]::EscapeDataString($pw)
$dbUrl = "postgresql://postgres.${ProjectRef}:${encoded}@aws-0-${Region}.pooler.supabase.com:6543/postgres"
$migration = "$Root\supabase\migrations\20260524140000_phase3_tenant_layer.sql"

Write-Host "Applying Phase 3 to dev project $ProjectRef (region $Region)..."
Push-Location $Root
try {
  supabase db push --db-url $dbUrl --yes 2>&1 | Tee-Object -Variable pushOut
  $pushExit = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($pushExit -ne 0) { exit $pushExit }

Write-Host "Running post-apply validation via psql..."
$env:PGPASSWORD = $pw
$validateSql = @'
SELECT 'tenants' AS check, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants') AS ok
UNION ALL SELECT 'tenant_domains', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenant_domains')
UNION ALL SELECT 'tenant_settings', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenant_settings')
UNION ALL SELECT 'tenant_users', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenant_users')
UNION ALL SELECT 'profiles.codevertex_user_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='codevertex_user_id');
'@
$orphanSql = @'
SELECT 'vehicles' AS tbl, count(*)::bigint AS orphan_tenant_id FROM public.vehicles WHERE tenant_id IS NULL
UNION ALL SELECT 'drivers', count(*) FROM public.drivers WHERE tenant_id IS NULL
UNION ALL SELECT 'booking_requests', count(*) FROM public.booking_requests WHERE tenant_id IS NULL
UNION ALL SELECT 'assignments', count(*) FROM public.assignments WHERE tenant_id IS NULL
UNION ALL SELECT 'driver_payouts', count(*) FROM public.driver_payouts WHERE tenant_id IS NULL
UNION ALL SELECT 'driver_contracts', count(*) FROM public.driver_contracts WHERE tenant_id IS NULL
UNION ALL SELECT 'rental_contracts', count(*) FROM public.rental_contracts WHERE tenant_id IS NULL;
'@

psql "host=aws-0-${Region}.pooler.supabase.com port=6543 dbname=postgres user=postgres.${ProjectRef} sslmode=require" -c $validateSql
psql "host=aws-0-${Region}.pooler.supabase.com port=6543 dbname=postgres user=postgres.${ProjectRef} sslmode=require" -c $orphanSql

Write-Host "Done. Update docs/database/FLEETOS_PHASE3_APPLIED_REPORT.md from output above."
