#!/usr/bin/env bash
# Create the Android signing key ONCE and keep it safe (losing it means you must
# uninstall the app before installing a newer build). Requires a JDK (keytool).
set -euo pipefail
OUT="${1:-xuexi-release.jks}"
ALIAS="xuexi"
read -r -s -p "设置签名密码（至少 6 位）: " PASS; echo
keytool -genkeypair -keystore "$OUT" -storepass "$PASS" -keypass "$PASS" \
  -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=xuexi family app"
echo
echo "已生成 $OUT（请备份到安全的地方，不要提交到 git）。"
echo "在 GitHub 仓库 Settings → Secrets and variables → Actions 添加："
echo "  ANDROID_KEY_ALIAS        = $ALIAS"
echo "  ANDROID_KEYSTORE_PASSWORD = （你刚才设置的密码）"
echo "  ANDROID_KEYSTORE_BASE64  = 下面这一长串："
base64 < "$OUT" | tr -d '\n'; echo
