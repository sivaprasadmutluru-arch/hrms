#!/usr/bin/env bash
set -euo pipefail

APP_NAME="cloudhrms"
APP_USER="cloudhrms"
APP_DIR="/opt/cloudhrms"
DB_NAME="cloudhrms_prod"
DB_USER="cloudhrms_user"

if [[ "$(id -u)" != "0" ]]; then
  echo "Run this script as root on the server."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update

if apt-cache show openjdk-21-jre-headless >/dev/null 2>&1; then
  apt-get install -y openjdk-21-jre-headless postgresql postgresql-client nginx openssl
elif apt-cache show openjdk-21-jdk-headless >/dev/null 2>&1; then
  apt-get install -y openjdk-21-jdk-headless postgresql postgresql-client nginx openssl
else
  echo "OpenJDK 21 is not available from apt on this server."
  echo "Install Java 21+ first, then rerun this script."
  exit 1
fi

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"/{releases,backups,media}
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

DB_PASSWORD="$(openssl rand -base64 32 | tr -d '\n')"
JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\\gexec
SQL

cat > "$APP_DIR/.env" <<EOF
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://localhost:5432/${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
DDL_AUTO=update
CORS_ALLOWED_ORIGINS=http://200.97.171.126,https://200.97.171.126,http://grecha.ai,https://grecha.ai,http://www.grecha.ai,https://www.grecha.ai
FILE_UPLOAD_DIR=${APP_DIR}/media
EOF
chmod 600 "$APP_DIR/.env"
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"

cat > /etc/systemd/system/cloudhrms.service <<EOF
[Unit]
Description=Cloud HRMS Spring Boot App
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/java -jar ${APP_DIR}/cloudhrms.jar
SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/sites-available/cloudhrms <<'EOF'
server {
    listen 80;
    server_name 200.97.171.126 grecha.ai www.grecha.ai;

    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/cloudhrms /etc/nginx/sites-enabled/cloudhrms
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable cloudhrms
systemctl enable nginx
systemctl reload nginx

java -version
echo "Server setup complete."
echo "Upload cloudhrms.jar, cloudhrms_local_20260715_1652.dump, and cloudhrms_media_20260715_1652.tar.gz to ${APP_DIR}/releases/"
