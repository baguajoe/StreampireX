#!/bin/bash
echo "starting build process"
NODE_OPTIONS="--max-old-space-size=4096" npx webpack --mode development --config webpack.dev.js --output-path /workspaces/SpectraSphere/dist_manual
echo "starting application"
serve -s dist_manual -l 3000
