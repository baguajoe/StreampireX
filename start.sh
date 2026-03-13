#!/bin/bash
NODE_OPTIONS="--max-old-space-size=4096" npx webpack --mode development --config webpack.dev.js --output-path /workspaces/SpectraSphere/dist_manual
serve -s dist_manual -l 3000
