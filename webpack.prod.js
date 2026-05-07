const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const Dotenv = require('dotenv-webpack');
const { GenerateSW } = require('workbox-webpack-plugin');
module.exports = merge(common, {
    mode: 'production',
    output: {
        publicPath: '/'
    },
    plugins: [
        new Dotenv({
            safe: false,
            systemvars: true,
            silent: true
        }),
        // PWA service worker — prod-only. Generates public/service-worker.js
        // plus workbox-*.js runtime files. Excluded from dev to keep edits
        // from being shadowed by a stale cached bundle in the browser.
        new GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            exclude: [/animations\//]
        })
    ]
});
