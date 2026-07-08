#!/usr/bin/env bash

# ------------------------------------------------------------
# Gitea Runner automatic setup for repository rilen.lima/consulta360
# ------------------------------------------------------------
# Requirements on the Ubuntu server:
#   - curl, tar, Docker (engine) installed
#   - User has sudo privileges (or run as root)
#   - Access to the Gitea instance at http://10.0.0.88:3001
#   - Runner registration token (provided by the user)
# ------------------------------------------------------------

set -euo pipefail

# ==== CONFIGURATION ==================================================
GITEA_URL="http://10.0.0.88:3001"
REPO="rilen.lima/consulta360"
RUNNER_NAME="consulta360-runner"
# Token you received from Gitea (replace if you edit the script manually)
RUNNER_TOKEN="fEbOsKgsKzJ0nSTpJMxn5eGyM5VOFhiTVkD21deC"
# ---------------------------------------------------------------

# ==== STEP 1 – Create working directory =============================
WORKDIR="/opt/gitea-runner"
sudo mkdir -p "$WORKDIR"
sudo chown "$(whoami)":"$(whoami)" "$WORKDIR"
cd "$WORKDIR"

# ==== STEP 2 – Download latest act_runner binary ======================
RUNNER_BIN="act_runner"
if [ ! -f "$RUNNER_BIN" ]; then
  echo "Downloading act_runner..."
  # Use a known stable version of act_runner
  curl -L -o "$RUNNER_BIN" "https://gitea.com/gitea/act_runner/releases/download/v0.2.10/act_runner-0.2.10-linux-amd64"
  chmod +x "$RUNNER_BIN"
fi

# ==== STEP 3 – Register the runner with Gitea =====================
./"$RUNNER_BIN" register \
  --instance "$GITEA_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --no-interactive

# ==== STEP 4 – Ensure Docker socket is accessible =================
# The runner will need to run Docker commands (docker exec, cp, etc.).
if groups $(whoami) | grep -q docker; then
  echo "User already in docker group."
else
  echo "Adding user $(whoami) to docker group..."
  sudo usermod -aG docker $(whoami) || true
fi

# ==== STEP 5 – Create a systemd service to keep the runner alive =====
SERVICE_FILE="/etc/systemd/system/gitea-runner.service"
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Gitea Actions Runner for $REPO
After=network.target docker.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$WORKDIR
ExecStart=$WORKDIR/$RUNNER_BIN daemon
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable gitea-runner.service
sudo systemctl start gitea-runner.service

# ==== STEP 6 – Verify the runner is online =========================
# Give it a few seconds and then query Gitea for the runner status.
echo "Waiting a few seconds for the runner to register..."
sleep 5

# Simple check – list runners via API (requires curl). Adjust if you have auth.
# This step is optional, it just shows that the runner appears.
echo "Runners for $REPO (you should see $RUNNER_NAME listed):"
curl -s "$GITEA_URL/api/v1/repos/$REPO/actions/runners" | jq '.' || echo "(API request failed – you may need to add authentication)"

echo "Setup completed. The runner should now be ONLINE in Gitea UI."

# ------------------------------------------------------------
# After the runner is ONLINE, push a new empty commit to trigger the workflow:
#   git commit --allow-empty -m "Trigger CI/CD"
#   git push
# ------------------------------------------------------------
