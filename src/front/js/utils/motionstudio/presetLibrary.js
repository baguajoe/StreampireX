export const MOTION_TEXT_PRESETS = [
  {
    id: "fade_in_title",
    name: "Fade In Title",
    category: "Text",
    patch: {
      animation: "fade_in",
      fontSize: 56,
      fontWeight: 800,
      shadow: true,
      outline: false,
      color: "#ffffff",
      keyframes: {
        positionX: [],
        positionY: [],
        scale: [
          { time: 0, value: 0.85, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.8, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        rotation: [],
        opacity: [
          { time: 0, value: 0, easing: "easeOutQuad", curveStrength: 0.33 },
          { time: 0.7, value: 1, easing: "easeOutQuad", curveStrength: 0.33 },
        ],
      },
    },
  },
  {
    id: "pop_in",
    name: "Pop In",
    category: "Text",
    patch: {
      animation: "pop_in",
      fontSize: 48,
      fontWeight: 800,
      shadow: true,
      outline: true,
      color: "#00ffc8",
      keyframes: {
        positionX: [],
        positionY: [],
        scale: [
          { time: 0, value: 0.2, easing: "easeOutBack", curveStrength: 0.5 },
          { time: 0.35, value: 1.15, easing: "easeOutBack", curveStrength: 0.5 },
          { time: 0.65, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        rotation: [],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.2, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  {
    id: "slide_up_lowerthird",
    name: "Slide Up Lower Third",
    category: "Lower Third",
    patch: {
      type: "lowerThird",
      y: 82,
      fontSize: 30,
      fontWeight: 700,
      shadow: true,
      color: "#ffffff",
      keyframes: {
        positionX: [],
        positionY: [
          { time: 0, value: 108, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.6, value: 82, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        scale: [],
        rotation: [],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.25, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Typewriter ──
  {
    id: "typewriter",
    name: "Typewriter",
    category: "Text",
    patch: {
      animation: "typewriter",
      fontSize: 48, fontWeight: 700, color: "#ffffff", shadow: true,
      keyframes: {
        positionX: [], positionY: [], rotation: [],
        scale: [{ time: 0, value: 1, easing: "linear", curveStrength: 0.33 }],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.05, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Glitch ──
  {
    id: "glitch",
    name: "Glitch",
    category: "Text",
    patch: {
      animation: "glitch",
      fontSize: 52, fontWeight: 900, color: "#00ffc8", outline: true,
      keyframes: {
        positionX: [
          { time: 0, value: 50, easing: "linear", curveStrength: 0.33 },
          { time: 0.1, value: 52, easing: "linear", curveStrength: 0.33 },
          { time: 0.15, value: 48, easing: "linear", curveStrength: 0.33 },
          { time: 0.2, value: 50, easing: "linear", curveStrength: 0.33 },
        ],
        positionY: [], rotation: [],
        scale: [{ time: 0, value: 1, easing: "linear", curveStrength: 0.33 }],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.08, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Slide In Left ──
  {
    id: "slide_in_left",
    name: "Slide In Left",
    category: "Text",
    patch: {
      animation: "slide_in_left",
      fontSize: 48, fontWeight: 700, color: "#ffffff", shadow: true,
      keyframes: {
        positionX: [
          { time: 0, value: -20, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.6, value: 50, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        positionY: [], scale: [], rotation: [],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.3, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Slide In Right ──
  {
    id: "slide_in_right",
    name: "Slide In Right",
    category: "Text",
    patch: {
      animation: "slide_in_right",
      fontSize: 48, fontWeight: 700, color: "#ffffff", shadow: true,
      keyframes: {
        positionX: [
          { time: 0, value: 120, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.6, value: 50, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        positionY: [], scale: [], rotation: [],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.3, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Bounce In ──
  {
    id: "bounce_in",
    name: "Bounce In",
    category: "Text",
    patch: {
      animation: "bounce_in",
      fontSize: 52, fontWeight: 800, color: "#ff6600", shadow: true,
      keyframes: {
        positionX: [], positionY: [], rotation: [],
        scale: [
          { time: 0, value: 0, easing: "easeOutBack", curveStrength: 0.6 },
          { time: 0.4, value: 1.3, easing: "easeOutBack", curveStrength: 0.6 },
          { time: 0.6, value: 0.9, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.8, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.15, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Spin In ──
  {
    id: "spin_in",
    name: "Spin In",
    category: "Text",
    patch: {
      animation: "spin_in",
      fontSize: 48, fontWeight: 700, color: "#ffffff",
      keyframes: {
        positionX: [], positionY: [],
        rotation: [
          { time: 0, value: -180, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.7, value: 0, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        scale: [
          { time: 0, value: 0.3, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.7, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.2, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Zoom In ──
  {
    id: "zoom_in",
    name: "Zoom In",
    category: "Text",
    patch: {
      animation: "zoom_in",
      fontSize: 64, fontWeight: 900, color: "#ffffff", shadow: true,
      keyframes: {
        positionX: [], positionY: [], rotation: [],
        scale: [
          { time: 0, value: 2.5, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.7, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.2, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Wiggle ──
  {
    id: "wiggle",
    name: "Wiggle",
    category: "Text",
    patch: {
      animation: "wiggle",
      fontSize: 48, fontWeight: 800, color: "#ff9500",
      keyframes: {
        positionX: [], positionY: [],
        rotation: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.1, value: -8, easing: "linear", curveStrength: 0.33 },
          { time: 0.2, value: 8, easing: "linear", curveStrength: 0.33 },
          { time: 0.3, value: -6, easing: "linear", curveStrength: 0.33 },
          { time: 0.4, value: 6, easing: "linear", curveStrength: 0.33 },
          { time: 0.5, value: 0, easing: "linear", curveStrength: 0.33 },
        ],
        scale: [{ time: 0, value: 1, easing: "linear", curveStrength: 0.33 }],
        opacity: [{ time: 0, value: 1, easing: "linear", curveStrength: 0.33 }],
      },
    },
  },
  // ── Elastic ──
  {
    id: "elastic",
    name: "Elastic",
    category: "Text",
    patch: {
      animation: "elastic",
      fontSize: 52, fontWeight: 800, color: "#00ffc8",
      keyframes: {
        positionX: [], positionY: [], rotation: [],
        scale: [
          { time: 0, value: 0, easing: "easeOutElastic", curveStrength: 0.8 },
          { time: 0.5, value: 1.2, easing: "easeOutElastic", curveStrength: 0.8 },
          { time: 0.7, value: 0.95, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.9, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        opacity: [
          { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
          { time: 0.1, value: 1, easing: "linear", curveStrength: 0.33 },
        ],
      },
    },
  },
  // ── Wipe Reveal ──
  {
    id: "wipe_reveal",
    name: "Wipe Reveal",
    category: "Text",
    patch: {
      animation: "wipe_reveal",
      fontSize: 48, fontWeight: 700, color: "#ffffff", shadow: true,
      keyframes: {
        positionX: [
          { time: 0, value: -50, easing: "easeOutCubic", curveStrength: 0.33 },
          { time: 0.5, value: 50, easing: "easeOutCubic", curveStrength: 0.33 },
        ],
        positionY: [], scale: [], rotation: [],
        opacity: [{ time: 0, value: 1, easing: "linear", curveStrength: 0.33 }],
      },
    },
  },


  // ── YouTube Intro ──
  {
    id: "youtube_intro",
    name: "YouTube Intro",
    category: "Scenes",
    layers: [
      {
        type: "text", name: "Channel Name", text: "CHANNEL NAME",
        x: 50, y: 35, fontSize: 72, fontWeight: 900, color: "#ff6600",
        outline: true, shadow: true, duration: 6,
        keyframes: {
          positionX: [], positionY: [], rotation: [],
          scale: [
            { time: 0, value: 0.3, easing: "easeOutBack", curveStrength: 0.5 },
            { time: 0.5, value: 1.1, easing: "easeOutBack", curveStrength: 0.5 },
            { time: 0.8, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.15, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
      {
        type: "lowerThird", name: "Tagline", text: "Subscribe for more",
        subtitle: "New videos every week",
        x: 50, y: 82, fontSize: 28, fontWeight: 700, color: "#ffffff",
        shadow: true, duration: 6,
        keyframes: {
          positionX: [], positionY: [
            { time: 0, value: 108, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.6, value: 82, easing: "easeOutCubic", curveStrength: 0.33 },
          ], scale: [], rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.3, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
    ],
  },
  // ── Stream Overlay ──
  {
    id: "stream_overlay",
    name: "Stream Overlay",
    category: "Scenes",
    layers: [
      {
        type: "text", name: "Stream Title", text: "LIVE NOW",
        x: 50, y: 20, fontSize: 48, fontWeight: 900, color: "#ff0000",
        outline: true, shadow: true, duration: 10,
        keyframes: {
          positionX: [], positionY: [], rotation: [],
          scale: [
            { time: 0, value: 0.8, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.4, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.2, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
      {
        type: "lowerThird", name: "Streamer Name", text: "YourUsername",
        subtitle: "Follow • Subscribe • Like",
        x: 50, y: 88, fontSize: 26, fontWeight: 700, color: "#00ffc8",
        shadow: true, duration: 10,
        keyframes: {
          positionX: [], positionY: [
            { time: 0, value: 110, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.5, value: 88, easing: "easeOutCubic", curveStrength: 0.33 },
          ], scale: [], rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.25, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
    ],
  },
  // ── Beat Drop ──
  {
    id: "beat_drop",
    name: "Beat Drop",
    category: "Scenes",
    layers: [
      {
        type: "text", name: "Beat Title", text: "NEW BEAT",
        x: 50, y: 40, fontSize: 80, fontWeight: 900, color: "#00ffc8",
        outline: true, shadow: true, duration: 5,
        keyframes: {
          positionX: [], positionY: [], rotation: [],
          scale: [
            { time: 0, value: 3.0, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.4, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.1, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
      {
        type: "lowerThird", name: "Producer Tag", text: "Prod. by Artist",
        subtitle: "Available on BeatStore",
        x: 50, y: 82, fontSize: 26, fontWeight: 700, color: "#ff6600",
        shadow: true, duration: 5,
        keyframes: {
          positionX: [
            { time: 0, value: 120, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.5, value: 50, easing: "easeOutCubic", curveStrength: 0.33 },
          ], positionY: [], scale: [], rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.2, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
    ],
  },
  // ── Podcast Quote ──
  {
    id: "podcast_quote",
    name: "Podcast Quote",
    category: "Scenes",
    layers: [
      {
        type: "text", name: "Quote", text: '"Your quote here"',
        x: 50, y: 42, fontSize: 38, fontWeight: 600, color: "#ffffff",
        shadow: true, duration: 8,
        keyframes: {
          positionX: [], positionY: [], rotation: [],
          scale: [
            { time: 0, value: 0.9, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.6, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          opacity: [
            { time: 0, value: 0, easing: "easeOutQuad", curveStrength: 0.33 },
            { time: 0.5, value: 1, easing: "easeOutQuad", curveStrength: 0.33 },
          ],
        },
      },
      {
        type: "lowerThird", name: "Speaker", text: "Speaker Name",
        subtitle: "Episode Title",
        x: 50, y: 82, fontSize: 26, fontWeight: 700, color: "#00ffc8",
        shadow: true, duration: 8,
        keyframes: {
          positionX: [], positionY: [
            { time: 0, value: 105, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.5, value: 82, easing: "easeOutCubic", curveStrength: 0.33 },
          ], scale: [], rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.3, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
    ],
  },
];

export const MOTION_SCENE_TEMPLATES = [
  {
    id: "podcast_intro",
    name: "Podcast Intro",
    category: "Scenes",
    layers: [
      {
        type: "text",
        name: "Podcast Title",
        text: "Your Podcast",
        x: 50,
        y: 38,
        fontSize: 58,
        fontWeight: 800,
        color: "#ffffff",
        shadow: true,
        duration: 6,
        keyframes: {
          positionX: [],
          positionY: [],
          scale: [
            { time: 0, value: 0.9, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.8, value: 1, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.7, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
      {
        type: "lowerThird",
        name: "Episode Tag",
        text: "Episode 001",
        subtitle: "New conversation starts now",
        x: 50,
        y: 82,
        fontSize: 30,
        fontWeight: 700,
        color: "#00ffc8",
        shadow: true,
        duration: 6,
        keyframes: {
          positionX: [],
          positionY: [
            { time: 0, value: 110, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.6, value: 82, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          scale: [],
          rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.25, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
    ],
  },
  {
    id: "music_promo",
    name: "Music Promo",
    category: "Scenes",
    layers: [
      {
        type: "text",
        name: "Artist Name",
        text: "ARTIST NAME",
        x: 50,
        y: 34,
        fontSize: 64,
        fontWeight: 900,
        color: "#ff8a00",
        outline: true,
        shadow: true,
        duration: 5,
        keyframes: {
          positionX: [],
          positionY: [],
          scale: [
            { time: 0, value: 0.4, easing: "easeOutBack", curveStrength: 0.5 },
            { time: 0.45, value: 1.08, easing: "easeOutBack", curveStrength: 0.5 },
            { time: 0.8, value: 1.0, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.18, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
      {
        type: "lowerThird",
        name: "Track Plug",
        text: "NEW SINGLE OUT NOW",
        subtitle: "Streaming on all platforms",
        x: 50,
        y: 82,
        fontSize: 28,
        fontWeight: 700,
        color: "#ffffff",
        shadow: true,
        duration: 5,
        keyframes: {
          positionX: [],
          positionY: [
            { time: 0, value: 106, easing: "easeOutCubic", curveStrength: 0.33 },
            { time: 0.6, value: 82, easing: "easeOutCubic", curveStrength: 0.33 },
          ],
          scale: [],
          rotation: [],
          opacity: [
            { time: 0, value: 0, easing: "linear", curveStrength: 0.33 },
            { time: 0.22, value: 1, easing: "linear", curveStrength: 0.33 },
          ],
        },
      },
    ],
  },
];
