#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/cloudhrms"
DB_NAME="cloudhrms_prod"
DB_USER="cloudhrms_user"
RELEASE_DIR="${APP_DIR}/releases"
JAR="${RELEASE_DIR}/hrms-0.0.1-SNAPSHOT.jar"
DB_DUMP="${RELEASE_DIR}/cloudhrms_local_20260715_1652.dump"
MEDIA_ARCHIVE="${RELEASE_DIR}/cloudhrms_media_20260715_1652.tar.gz"

if [[ "$(id -u)" != "0" ]]; then
  echo "Run this script as root on the server."
  exit 1
fi

test -f "$JAR"
test -f "$DB_DUMP"
test -f "$MEDIA_ARCHIVE"

systemctl stop cloudhrms || true

cp "$JAR" "${APP_DIR}/cloudhrms.jar"
chown cloudhrms:cloudhrms "${APP_DIR}/cloudhrms.jar"

sudo -u postgres pg_restore --clean --if-exists --no-owner --role="$DB_USER" -d "$DB_NAME" "$DB_DUMP"

tar -xzf "$MEDIA_ARCHIVE" -C "$APP_DIR"
chown -R cloudhrms:cloudhrms "$APP_DIR/media"

systemctl start cloudhrms
sleep 8
systemctl --no-pager --full status cloudhrms
