#!/usr/bin/env bash
set -euo pipefail

SERVER="root@200.97.171.126"
REMOTE_DIR="/opt/cloudhrms/releases"
BACKEND_DIR="/Users/berymobe4/Desktop/hrmsweb/hrms-backend"

ssh "$SERVER" "mkdir -p ${REMOTE_DIR}"
scp "${BACKEND_DIR}/target/hrms-0.0.1-SNAPSHOT.jar" "$SERVER:${REMOTE_DIR}/"
scp "/tmp/cloudhrms_local_20260715_1652.dump" "$SERVER:${REMOTE_DIR}/"
scp "/tmp/cloudhrms_media_20260715_1652.tar.gz" "$SERVER:${REMOTE_DIR}/"
scp "/Users/berymobe4/Desktop/hrmsweb/cloudhrms/deploy/server-restore-and-start.sh" "$SERVER:${REMOTE_DIR}/"

echo "Uploaded. In the server terminal, run:"
echo "bash ${REMOTE_DIR}/server-restore-and-start.sh"
