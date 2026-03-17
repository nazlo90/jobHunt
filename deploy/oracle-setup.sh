#!/usr/bin/env bash
# Oracle Cloud Always Free VM — one-time bootstrap script
# Tested on Ubuntu 22.04 (ARM Ampere A1)
# Run as root: sudo bash oracle-setup.sh
set -euo pipefail

REPO_URL="https://github.com/nazlo90/jobHunt.git"
APP_DIR="/opt/jobhunt/repo"
DB_DIR="/opt/jobhunt/db"

echo "=== 1. Installing Docker ==="
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "=== 2. Opening firewall (port 3000) ==="
ufw allow 3000/tcp || true
# Also open port 80/443 if you add Nginx later:
# ufw allow 80/tcp && ufw allow 443/tcp

echo "=== 3. Creating data directory ==="
mkdir -p "$DB_DIR"

echo "=== 4. Cloning repo ==="
if [ -d "$APP_DIR" ]; then
  echo "Repo already cloned, pulling latest..."
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "=== 5. Creating .env ==="
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo ""
  echo ">>> ACTION REQUIRED: edit $APP_DIR/.env and fill in your secrets <<<"
  echo "    nano $APP_DIR/.env"
  echo ""
fi

echo "=== 6. Copy existing SQLite DB (if you have one) ==="
echo "    If migrating an existing DB, run:"
echo "    scp /path/to/jobhunt.db ubuntu@<VM_IP>:$DB_DIR/jobhunt.db"
echo ""

echo "=== Done with setup. Next steps ==="
echo "  1. Edit secrets:  nano $APP_DIR/.env"
echo "  2. Copy DB (if migrating): see above"
echo "  3. Build & start: cd $APP_DIR && docker compose up -d --build"
echo "  4. Tail logs:     docker compose logs -f"
echo ""
echo "  App will be available at http://<VM_PUBLIC_IP>:3000"
echo ""
echo "  Optional: add Nginx + Certbot for HTTPS:"
echo "    apt-get install -y nginx certbot python3-certbot-nginx"
