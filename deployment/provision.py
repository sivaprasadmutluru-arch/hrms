#!/usr/bin/env python3
"""Prepare private settings on the deployment host; never print secret values."""
from pathlib import Path
import os, secrets, shutil
root=Path('/opt/accruehr'); shared=root/'shared'
for name in ['config','incoming','data','data/media','data/backups','postgres']:
 p=shared/name;p.mkdir(parents=True,exist_ok=True);p.chmod(0o700)
def write_private(path,text):
 if not path.exists():path.write_text(text);path.chmod(0o600)
write_private(shared/'database.env',f'POSTGRES_DB=accruehr\nPOSTGRES_USER=postgres\nPOSTGRES_PASSWORD={secrets.token_hex(32)}\nAPP_DB_PASSWORD={secrets.token_hex(32)}\n')
db=dict(line.split('=',1) for line in (shared/'database.env').read_text().splitlines() if '=' in line)
settings={
 'SPRING_PROFILES_ACTIVE':'prod','SERVER_PORT':'8080','TZ':'Asia/Kolkata',
 'SPRING_DATASOURCE_URL':'jdbc:postgresql://postgres:5432/accruehr',
 'SPRING_DATASOURCE_USERNAME':'accruehr','SPRING_DATASOURCE_PASSWORD':db['APP_DB_PASSWORD'],
 'JWT_SECRET':secrets.token_hex(48),'DDL_AUTO':'validate','APP_SEED_ENABLED':'false',
 'APP_TENANTS_SCHEMA_SYNC_ENABLED':'true','BILLING_MANUAL_ENABLED':'true',
 'BILLING_NOTICES_ENABLED':'true','BILLING_FRONTEND_URL':'https://hr.accruetechnologies.com',
 'APP_FRONTEND_URL':'https://hr.accruetechnologies.com','CORS_ALLOWED_ORIGINS':'https://hr.accruetechnologies.com',
 'SPRING_CONFIG_ADDITIONAL_LOCATION':'optional:file:/run/config/smtp.properties,optional:file:/run/config/website-integration.properties',
 'FILE_UPLOAD_DIR':'/data/media','BACKUP_DIRECTORY':'/data/backups','BACKUP_ENCRYPTION_KEY_FILE':'/data/backup-encryption.key',
 'BACKUP_PG_DUMP':'/usr/bin/pg_dump','BACKUP_PG_RESTORE':'/usr/bin/pg_restore',
 'SPRING_DATASOURCE_HIKARI_MAXIMUMPOOLSIZE':'20','SPRING_DATASOURCE_HIKARI_MINIMUMIDLE':'5',
 'SPRING_DATASOURCE_HIKARI_CONNECTIONTIMEOUT':'10000','SERVER_TOMCAT_THREADS_MAX':'80','SERVER_TOMCAT_THREADS_MINSPARE':'5',
 'SERVER_TOMCAT_ACCEPTCOUNT':'100','SERVER_SHUTDOWN':'graceful',
 'SPRINGDOC_API_DOCS_ENABLED':'false','SPRINGDOC_SWAGGER_UI_ENABLED':'false',
 'JAVA_TOOL_OPTIONS':'-Xms256m -Xmx1024m -XX:ActiveProcessorCount=2 -XX:+ExitOnOutOfMemoryError',
}
write_private(shared/'backend.env',''.join(f'{k}={v}\n' for k,v in settings.items()))
write_private(shared/'init-database.sh',r'''#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 -U postgres -d "$POSTGRES_DB" -v app_password="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE accruehr LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'app_password') \gexec
ALTER DATABASE accruehr OWNER TO accruehr;
GRANT ALL ON SCHEMA public TO accruehr;
SQL
''')
(shared/'init-database.sh').chmod(0o755)
# Restored files/configuration are readable by the unprivileged application only.
for name in ['smtp.properties','website-integration.properties']:
 p=shared/'config'/name
 if p.exists():os.chown(p,0,10001);p.chmod(0o640)
os.chown(shared/'config',0,10001);(shared/'config').chmod(0o750)
for base,dirs,files in os.walk(shared/'data'):
 os.chown(base,10001,10001);os.chmod(base,0o700)
 for f in files:os.chown(Path(base)/f,10001,10001);os.chmod(Path(base)/f,0o600)
print('AccrueHR private configuration prepared.')
