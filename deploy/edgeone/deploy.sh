#!/usr/bin/env bash
# Deploy the built site + sync API to EdgeOne Pages (EdgeOne Makers), free plan.
#
#   bash deploy/edgeone/deploy.sh <siteDir>
#
# 1. bundles the sync API into <siteDir>/edge-functions/api/[[default]].js
#    (+ package.json and edgeone.json in <siteDir> if missing)
# 2. runs: edgeone makers deploy <siteDir> -n $EDGEONE_PROJECT -t $EDGEONE_API_TOKEN -e <env> -a <area>
#
# Env:
#   EDGEONE_API_TOKEN     required, API token from the EdgeOne Pages console ("API Token" tab)
#   EDGEONE_PROJECT       required, project name (created on first deploy if it does not exist)
#   EDGEONE_ENV           optional, production (default) | preview
#   EDGEONE_AREA          optional, only used when the CLI creates the project:
#                         overseas (default; 不含中国大陆, custom domain needs no ICP 备案)
#                         | global (含中国大陆; custom domain must have ICP 备案)
#   EDGEONE_CLI_VERSION   optional, npm version/range of the `edgeone` CLI (default: 1)
#   EDGEONE_BIN           optional, use this edgeone executable instead of npx
#
# FAMILY_CODE / TOKEN_SECRET and the KV binding XUEXI_KV are configured once in the
# EdgeOne console (see deploy/edgeone/README.md); they are not sent from here.
set -euo pipefail

if [ $# -ne 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

SITE_DIR="$(cd "$1" && pwd)"
: "${EDGEONE_API_TOKEN:?set EDGEONE_API_TOKEN (EdgeOne Pages console -> API Token)}"
: "${EDGEONE_PROJECT:?set EDGEONE_PROJECT (the Pages project name)}"
ENV_NAME="${EDGEONE_ENV:-production}"
AREA="${EDGEONE_AREA:-overseas}"
case "$ENV_NAME" in production | preview) ;; *) echo "EDGEONE_ENV must be production or preview" >&2; exit 2 ;; esac
case "$AREA" in overseas | global) ;; *) echo "EDGEONE_AREA must be overseas or global" >&2; exit 2 ;; esac
[ -f "$SITE_DIR/index.html" ] || { echo "error: $SITE_DIR/index.html not found (not a built site?)" >&2; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"

echo "==> bundling sync API into $SITE_DIR/edge-functions/"
node "$REPO_ROOT/apps/sync/scripts/build-edgeone.mjs" "$SITE_DIR"

# Upload size sanity check (free plan limits apply to the whole project).
if command -v du >/dev/null; then
  echo "==> site size: $(du -sh "$SITE_DIR" | cut -f1)"
fi

if [ -n "${EDGEONE_BIN:-}" ]; then
  EO=("$EDGEONE_BIN")
else
  EO=(npx --yes "edgeone@${EDGEONE_CLI_VERSION:-1}")
fi

echo "==> edgeone makers deploy (project: $EDGEONE_PROJECT, env: $ENV_NAME)"
# Deploying an explicit folder uploads it as-is and the platform builds
# edge-functions/ from it. We deliberately never build locally: with CLI
# 1.6.41, a local `edgeone makers build` without a .env file inlines the build
# machine's whole environment into the compiled function bundle.
"${EO[@]}" makers deploy "$SITE_DIR" \
  -n "$EDGEONE_PROJECT" \
  -t "$EDGEONE_API_TOKEN" \
  -e "$ENV_NAME" \
  -a "$AREA"
