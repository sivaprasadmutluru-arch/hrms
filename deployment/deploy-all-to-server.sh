#!/bin/bash
set -euo pipefail

HOST="${1:-187.127.153.232}"

echo "========================================================"
echo " Deploying AccrueHR + Accrue Technologies Website to $HOST"
echo "========================================================"

echo ""
echo ">>> STEP 1: Deploying AccrueHR Application (hr.accruetechnologies.com)"
/Users/berymo/Desktop/hrms/deployment/deploy-to-server.sh "$HOST"

echo ""
echo ">>> STEP 2: Deploying Accrue Technologies Website (accruetechnologies.com)"
/Users/berymo/Desktop/accruetechnologies-website/scripts/deploy-website-to-server.sh "$HOST"

echo ""
echo "========================================================"
echo " All deployments completed successfully!"
echo " - AccrueHR: https://hr.accruetechnologies.com"
echo " - Website:  https://accruetechnologies.com/accruehr"
echo "========================================================"
