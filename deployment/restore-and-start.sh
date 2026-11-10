#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
shared=/opt/accruehr/shared
[ "$(cat "$shared/build.status")" = 0 ]
[ ! -e "$shared/database-restored" ] || { echo 'Database was already restored; refusing to overwrite it.'; exit 1; }
python3 - <<'PY'
from pathlib import Path
p=Path('/opt/accruehr/shared/backend.env')
s=p.read_text()
if not any(line.startswith('TZ=') for line in s.splitlines()):p.write_text(s+'TZ=Asia/Kolkata\n')
PY
docker compose up -d --wait --wait-timeout 180 postgres
for attempt in $(seq 1 30); do
 if docker compose exec -T postgres sh -c 'PGPASSWORD="$APP_DB_PASSWORD" psql -U accruehr -d accruehr -Atc "SELECT 1"' >/dev/null 2>&1; then break; fi
 sleep 2
done
count=$(docker compose exec -T postgres sh -c 'PGPASSWORD="$APP_DB_PASSWORD" psql -U accruehr -d accruehr -Atc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('\''pg_catalog'\'','\''information_schema'\'')"')
[ "$count" = 0 ] || { echo 'Target database is not empty; refusing to overwrite it.'; exit 1; }
docker compose exec -T postgres sh -c 'PGPASSWORD="$APP_DB_PASSWORD" pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error -U accruehr -d accruehr' < "$shared/incoming/database.dump"
date -u +%FT%TZ > "$shared/database-restored"
docker compose exec -T postgres sh -c 'PGPASSWORD="$APP_DB_PASSWORD" psql -U accruehr -d accruehr -Atc "SELECT count(*) FROM public.organizations; SELECT count(*) FROM public.users; SELECT count(*) FROM accrue_technologies.employees;"' > "$shared/restored-counts.txt"
docker compose up -d --wait --wait-timeout 600 backend frontend
ln -sfn "$(pwd)" /opt/accruehr/current
printf 'AccrueHR database restored and containers healthy.\n'
