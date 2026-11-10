#!/bin/bash
set -euo pipefail

HOST="${1:-187.127.153.232}"
RELEASE="20261106-082000"
ARCHIVE="/Users/berymo/Desktop/hrms/dist-release/release-20261106.tar.gz"

echo "=== Deploying AccrueHR release $RELEASE to $HOST ==="

# 1. Upload release archive to server
echo "Uploading release bundle..."
scp "$ARCHIVE" "root@$HOST:/tmp/release-$RELEASE.tar.gz"

# 2. Extract and build on server
echo "Unpacking and starting release on server..."
ssh "root@$HOST" bash -s <<EOF
set -euo pipefail

TARGET_DIR="/opt/accruehr/releases/$RELEASE"
mkdir -p "\$TARGET_DIR"

echo "Extracting release..."
tar -xzf "/tmp/release-$RELEASE.tar.gz" -C "/opt/accruehr/releases"
rm -f "/tmp/release-$RELEASE.tar.gz"
mv "/opt/accruehr/releases/release-20261106"/* "\$TARGET_DIR/"
rmdir "/opt/accruehr/releases/release-20261106"

cd "\$TARGET_DIR"

echo "Building release Docker images..."
docker compose build

echo "Updating services..."
docker compose up -d --wait --wait-timeout 600 backend frontend

echo "Switching current release symlink..."
ln -sfn "\$TARGET_DIR" /opt/accruehr/current

echo "Verifying health..."
curl -fsS -o /dev/null http://127.0.0.1:4184/healthz && echo "Frontend healthy!"

echo "Deployment of $RELEASE completed successfully!"
EOF
