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
