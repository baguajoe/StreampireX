#!/bin/bash
set -e

# Load .env
if [ -f "/workspaces/SpectraSphere/.env" ]; then
  set -a; source /workspaces/SpectraSphere/.env; set +a
  echo "✓ Loaded .env"
fi

if [ -z "$R2_ENDPOINT" ]; then echo "❌ R2_ENDPOINT missing from .env"; exit 1; fi

R2_BUCKET="${R2_BUCKET_NAME:-streampirex-media}"
R2_PUBLIC_URL="${R2_PUBLIC_URL:-https://media.streampirex.sonosuite.com}"
SDK_PUBLIC_URL="${R2_PUBLIC_URL}/wam-sdk/wam-sdk.js"

echo "🔧 Self-hosting WAM SDK..."
echo "   URL: $SDK_PUBLIC_URL"

# Build
BUILD_DIR="/tmp/wam_sdk_build"
rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR" && cd "$BUILD_DIR"
npm init -y > /dev/null 2>&1
npm install @webaudiomodules/sdk @webaudiomodules/api --save > /dev/null 2>&1
echo "✓ Packages installed"

printf "export { addFunctionModule, initializeWamEnv, initializeWamGroup } from '@webaudiomodules/sdk';\nexport { VERSION } from '@webaudiomodules/api';\n" > bundle_entry.js

npx --yes esbuild bundle_entry.js --bundle --format=esm --outfile=wam-sdk.js --platform=browser --target=es2020 --minify 2>/dev/null || cp node_modules/@webaudiomodules/sdk/src/index.js wam-sdk.js
echo "✓ Bundle ready"

# Upload via Python
cd /workspaces/SpectraSphere
python3 /tmp/wam_upload.py "$R2_ENDPOINT" "$R2_ACCESS_KEY_ID" "$R2_SECRET_ACCESS_KEY" "$R2_BUCKET" "$BUILD_DIR/wam-sdk.js" "$SDK_PUBLIC_URL"

rm -rf "$BUILD_DIR"
echo "✅ Done! Run: git add -A && git commit -m 'Self-host WAM SDK on R2' && git push"
