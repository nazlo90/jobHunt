#!/usr/bin/env bash
# Oracle Cloud Always Free VM — one-time bootstrap script
# Tested on Ubuntu 22.04 (ARM Ampere A1)
# Run as root: sudo bash oracle-setup.sh
#
# After running this script, ALL future deploys happen automatically via GitHub Actions.
# You only need to run this script ONCE when setting up a new server.
set -euo pipefail

GITHUB_USERNAME="nazlo90"
APP_DIR="/opt/jobhunt"
DB_DIR="/opt/jobhunt/db"
DEPLOY_USER="deploy"
GHCR_IMAGE="ghcr.io/${GITHUB_USERNAME}/jobhunt:latest"

# ── 1. Install Docker ─────────────────────────────────────────────────────────
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

# ── 2. Create a locked-down deploy user ──────────────────────────────────────
echo "=== 2. Creating deploy user ==="
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
# docker group lets deploy user run docker commands without sudo
usermod -aG docker "$DEPLOY_USER"

# ── 3. Set up SSH key for deploy user ────────────────────────────────────────
# Generate an ed25519 key pair on your LOCAL machine (not here):
#
#   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/jobhunt_deploy
#
# Then paste the PUBLIC key content (jobhunt_deploy.pub) below and run this script.
# Add the PRIVATE key content (jobhunt_deploy) to GitHub Secret: SSH_PRIVATE_KEY
echo "=== 3. Setting up SSH for deploy user ==="
DEPLOY_HOME="/home/${DEPLOY_USER}"
mkdir -p "${DEPLOY_HOME}/.ssh"
chmod 700 "${DEPLOY_HOME}/.ssh"

# ─── PASTE YOUR PUBLIC KEY BELOW (between the EOF lines) ───────────────────
cat >> "${DEPLOY_HOME}/.ssh/authorized_keys" << 'EOF'
PASTE_YOUR_ED25519_PUBLIC_KEY_HERE
EOF
# ───────────────────────────────────────────────────────────────────────────

chmod 600 "${DEPLOY_HOME}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"

# ── 4. Create app directory and set permissions ───────────────────────────────
echo "=== 4. Creating app directories ==="
mkdir -p "$APP_DIR" "$DB_DIR"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR"

# ── 5. Copy docker-compose.yml to the server ─────────────────────────────────
# The CI/CD pipeline writes the .env file on every deploy.
# Only docker-compose.yml needs to exist on the server beforehand.
echo "=== 5. Creating docker-compose.yml ==="
cat > "${APP_DIR}/docker-compose.yml" << COMPOSE
services:
  jobhunt:
    image: \${DOCKER_IMAGE:-${GHCR_IMAGE}}
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - /opt/jobhunt/db:/data/db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/jobs/stats"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
COMPOSE

chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/docker-compose.yml"

# ── 6. Log in to GHCR so the deploy user can pull images ─────────────────────
# Create a GitHub Personal Access Token (PAT) with read:packages scope at:
#   https://github.com/settings/tokens → New token → read:packages
echo "=== 6. GHCR login ==="
echo ""
echo ">>> ACTION REQUIRED: log in to GHCR as the deploy user <<<"
echo ""
echo "  1. Create a PAT at: https://github.com/settings/tokens"
echo "     Scopes needed: read:packages"
echo ""
echo "  2. Run this on the server after this script finishes:"
echo "     su - ${DEPLOY_USER} -c 'echo YOUR_PAT | docker login ghcr.io -u ${GITHUB_USERNAME} --password-stdin'"
echo ""

# ── 7. Firewall: allow only GitHub Actions IPs + your own IP ─────────────────
echo "=== 7. Configuring UFW firewall ==="
apt-get install -y -q ufw

# Allow app port (or 80/443 if you add Nginx later)
ufw allow 3000/tcp

# Allow SSH only from GitHub Actions IP ranges
# Source: https://api.github.com/meta (check for updates periodically)
ufw allow from 192.30.252.0/22   to any port 22
ufw allow from 185.199.108.0/22  to any port 22
ufw allow from 140.82.112.0/20   to any port 22
ufw allow from 143.55.64.0/20    to any port 22

echo ""
echo ">>> ACTION REQUIRED: allow YOUR OWN IP for SSH access <<<"
echo ""
echo "  Run: ufw allow from YOUR.IP.ADDRESS to any port 22"
echo "  Then: ufw enable"
echo ""
echo "  Find your IP: curl ifconfig.me (on your local machine)"
echo ""

# ── 8. Copy existing SQLite DB (if migrating) ────────────────────────────────
echo "=== 8. Migrate existing DB (optional) ==="
echo "  If you have an existing database, copy it with:"
echo "  scp /path/to/jobhunt.db ${DEPLOY_USER}@<VM_IP>:${DB_DIR}/jobhunt.db"
echo ""

echo "================================================================"
echo " Setup complete. Next steps:"
echo "================================================================"
echo ""
echo "  1. Log in to GHCR (see step 6 above)"
echo "  2. Add your IP to UFW + enable it (see step 7 above)"
echo "  3. Migrate DB if needed (see step 8 above)"
echo ""
echo "  Then set up GitHub Actions:"
echo "  ┌─ Secrets (Settings → Secrets and variables → Actions)"
echo "  │   SSH_HOST          = $(curl -s ifconfig.me 2>/dev/null || echo '<VM_PUBLIC_IP>')"
echo "  │   SSH_USER          = ${DEPLOY_USER}"
echo "  │   SSH_PRIVATE_KEY   = <content of ~/.ssh/jobhunt_deploy on your machine>"
echo "  │   JWT_SECRET        = <openssl rand -hex 32>"
echo "  │   JWT_REFRESH_SECRET= <openssl rand -hex 32>"
echo "  │   GROQ_API_KEY      = <gsk_...>"
echo "  │   RESEND_API_KEY    = <re_...>"
echo "  │   EMAIL_FROM        = <noreply@yourdomain.com>"
echo "  │   GOOGLE_CLIENT_ID  = <...>"
echo "  │   GOOGLE_CLIENT_SECRET = <...>"
echo "  │"
echo "  └─ Variables (non-sensitive)"
echo "      FRONTEND_URL      = https://yourdomain.com"
echo "      GOOGLE_CALLBACK_URL = https://yourdomain.com/api/auth/google/callback"
echo ""
echo "  Push to main to trigger your first deploy."
echo ""
