#!/usr/bin/env python3
"""
Fix: Move MASTER channel name inside the master-channel div.
The daw-ch-name block is currently outside the closing </div> of master-channel.
"""

filepath = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'

with open(filepath, 'r') as f:
    content = f.read()

# Current broken structure:
#   </div>          ← closes master-channel too early
#   <div className="daw-ch-name">   ← orphaned outside
#     ...MASTER...
#   </div>

old = """              </div>
              <div className="daw-ch-name">
                <div style={{ fontWeight: 700, fontSize: "0.62rem", color: "#ddeeff" }}>MASTER</div>
                <div className="daw-ch-number">Stereo Out</div>
              </div>"""

# Fixed: name block INSIDE master-channel, then close master-channel after
new = """              <div className="daw-ch-name">
                <div style={{ fontWeight: 700, fontSize: "0.62rem", color: "#ddeeff" }}>MASTER</div>
                <div className="daw-ch-number">Stereo Out</div>
              </div>
              </div>"""

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w') as f:
        f.write(content)
    print("Fixed! MASTER name is now inside the master-channel div.")
else:
    print("Could not find the exact block. Checking...")
    if 'daw-ch-name' in content and 'MASTER' in content:
        print("The elements exist but the pattern doesn't match exactly.")
    else:
        print("MASTER channel name block not found.")
