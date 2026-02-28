/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-b3ca1ef5'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "/4geeks.ico",
    "revision": "237f7c1f99594328ff566ac79e98d5e0"
  }, {
    "url": "/ChillHopCafe.png",
    "revision": "302312b54fe91f48225b0ff9ddc6a128"
  }, {
    "url": "/CosmicJazz.png",
    "revision": "170239bba6aa37f655d1d6f997122914"
  }, {
    "url": "/DJNova.png",
    "revision": "5eb7c88f0273cc0236226d9aa664e9aa"
  }, {
    "url": "/IndigoRain.png",
    "revision": "834cc92a484d3e0fbda71529bf9ec92d"
  }, {
    "url": "/LofiDreams.png",
    "revision": "e9ae11051b81308f6196f23c26af640c"
  }, {
    "url": "/LofiTemple.png",
    "revision": "d1377e7f6f1638fc693da6333fd1d718"
  }, {
    "url": "/MorningClassical.png",
    "revision": "6a6cbf02a6b9c07e341d5d25f27037ae"
  }, {
    "url": "/PopPulse.png",
    "revision": "d2b71ed322b970ab2585cedfbc090645"
  }, {
    "url": "/ReggaeRootz.png",
    "revision": "5fe5bb1e5f9f1027eb01f58aabfd94e4"
  }, {
    "url": "/RockRumble.png",
    "revision": "bf3a95500d090e0e05d22923feca934d"
  }, {
    "url": "/StreampireX.png",
    "revision": "d14ff822350d9c204177d13401c37f54"
  }, {
    "url": "/TheGrooveMechanics.png",
    "revision": "654793f6e3d598cea81f131a7b579778"
  }, {
    "url": "/TheSynthLords.png",
    "revision": "715d47958fd1ff43e17e6972e5c46353"
  }, {
    "url": "/UrbanSoul.png",
    "revision": "af83260e498a17937b930a64f0b51a5d"
  }, {
    "url": "/VelvetEcho.png",
    "revision": "eefdad09ae693507278536df100a0cb1"
  }, {
    "url": "/ZaraMoonlight.png",
    "revision": "35a0fd0401daf03a7e80ba61f0b11574"
  }, {
    "url": "/blueuser.jpg",
    "revision": "864bdf934a9490559583dc12cc408f54"
  }, {
    "url": "/chicast.png",
    "revision": "bbe1df069934bf8cd04bc93d9e3a91d3"
  }, {
    "url": "/energy_reset.png",
    "revision": "52ba4bf2ef98ceb608b56739177d24e7"
  }, {
    "url": "/env-file.png",
    "revision": "dc1a2a70461a41089343755fc835c86f"
  }, {
    "url": "/fit_jay.png",
    "revision": "a21fcb2388fe4bbc23d82262cf8f0aef"
  }, {
    "url": "/index.html",
    "revision": "138fbe6ad5de49644ac0acf718d11232"
  }, {
    "url": "/jazzhub.png",
    "revision": "a5eef9f12eb01a4eda1649d3bd67eb7d"
  }, {
    "url": "/lofi_lounge.png",
    "revision": "1a38df8bf8e7aaa520d1e8d8cc1f9745"
  }, {
    "url": "/podcast1.png",
    "revision": "83cdee25d2426150f59cf3ba9289e9ad"
  }, {
    "url": "/podcast2.png",
    "revision": "a7cb975d3fea691c4af8edbd47b21ad7"
  }, {
    "url": "/podcast3.png",
    "revision": "ab2db4ea3a6341f186cb99677641feea"
  }, {
    "url": "/podcast4.png",
    "revision": "4f4c4cd2c2487c608b28ad0510e795e9"
  }, {
    "url": "/podcast5.png",
    "revision": "45a630d59e0c6ae2955ada8e9f104c22"
  }, {
    "url": "/podcast6.png",
    "revision": "886e8c74c2b815ef4cf84875a7f685f3"
  }, {
    "url": "/src_front_js_component_audio_worklets_compressorWorkletSource_js.bundle.js",
    "revision": "4afc597373fa0a6e0abc6ae9be1e2b13"
  }, {
    "url": "/src_front_js_pages_PodcastStudioPhase1_js.bundle.js",
    "revision": "dc034033d01837cfa3951582fe2bacc3"
  }, {
    "url": "/zenmaster.png",
    "revision": "5c0301826d1fd719203b3d85441c97af"
  }], {});

}));
