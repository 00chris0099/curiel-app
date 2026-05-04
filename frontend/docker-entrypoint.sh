#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/runtime-env.js
window.__APP_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-http://localhost:4000/api/v1}"
};
EOF
