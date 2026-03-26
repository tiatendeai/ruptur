#!/bin/bash

# 🧹 Ruptur Infrastructure Cleanup & Migration script
# Purpose: Align KVM2 with canonical infrastructure standards and clean session ghosts.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CANONICAL_PATH="/opt/ruptur/current"
SHADOW_PATH="/tmp/ruptur-clone"
SESSIONS_DIR="$REPO_ROOT/sessions"

echo "🚀 Starting Ruptur Cleanup..."

# 1. Clean Baileys/Signal Session Ghosts
echo "🧹 Cleaning session ghosts..."
find "$SESSIONS_DIR" -maxdepth 1 -name "baileys-default*" -type f -delete
find "$SESSIONS_DIR" -maxdepth 1 -name "*signal*" -type f -delete
echo "✅ Session ghosts removed (UAZAPI designated as primary)."

# 2. Migration Path Check (Simulated for this script)
echo "📂 Verifying deployment path..."
if [ -d "$SHADOW_PATH" ]; then
    echo "⚠️  Shadow deployment found in $SHADOW_PATH"
    echo "📣 ACTION REQUIRED: Move stack to $CANONICAL_PATH and restart Docker Swarm."
else
    echo "✅ No shadow deployment detected in /tmp."
fi

# 3. Traefik Configuration Check
echo "🚦 Checking Traefik routing..."
if grep -q "warmup" "$CANONICAL_PATH/deploy/kvm2/traefik_dynamic.yml" 2>/dev/null; then
    echo "✅ Traefik warmup route found."
else
    echo "❌ Traefik warmup route missing in $CANONICAL_PATH."
fi

echo "✨ Cleanup & Audit finished."
