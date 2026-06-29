/**
 * SPXCutFxPanel.js
 * Full effects tree — rightmost panel.
 * SPX-190 + SPX-300 preset banks, 15 SPX LUT presets.
 * All video/audio effects categories. All video transitions.
 * Draggable to clips. Zero inline CSS.
 */
import React, { useState, useCallback, useMemo } from 'react';

// ── SPX-190 Presets ─────────────────────────────────────
const SPX190_PRESETS = [
  'Cinematic Warm','Cinematic Cool','Bleach Bypass','Cross Process','Vintage Film',
  'Kodak Vision','Fuji Velvia','Agfa Optima','Ilford HP5','Kodak Tri-X',
  'Neon Nights','Teal & Orange','Aqua & Orange','Magenta Push','Cyan Crush',
  'Soft Portrait','Beauty Glow','Skin Warmth','Dewy Skin','Golden Hour',
  'Sunset Drive','Desert Heat','Arctic Blue','Nordic Cold','Fog Lift',
  'Moody Noir','Silver Gelatin','Selenium Tone','Cyanotype','Albumen Print',
  'Polaroid Fade','Lomography','Holga Vignette','Diana Soft','Lomo Chrome',
  'Matte Film','Flat Matte','Faded Black','Crushed Blacks','Lifted Shadows',
  'High Contrast','Low Contrast','Clarity Boost','HDR Natural','HDR Intense',
  'Vivid Colors','Oversaturated','Pastel Dream','Washed Out','Bleached',
  'Sepia Classic','Brown Tones','Amber Wash','Rust & Iron','Copper Tone',
  'Forest Green','Emerald Deep','Jungle Haze','Moss & Bark','Pine Shadow',
  'Ocean Blue','Submarine','Aquamarine','Coral Reef','Tropical Water',
  'Purple Rain','Violet Haze','Lavender Mist','Indigo Deep','Electric Purple',
  'Warm Shadows','Cool Highlights','Split Tone WB','Color Grade A','Color Grade B',
  'S-Curve Natural','S-Curve Heavy','Faded S-Curve','Reverse Curve','Flat Curve',
  'Hyper Real','Ultra Sharp','Edge Enhance','Detail Boost','Texture Pull',
  'Soft Focus','Diffusion','Orton Effect','Glow Dreamy','Aura Soft',
  'Film Grain Fine','Film Grain Med','Film Grain Heavy','Digital Noise','Sensor Grain',
  'Halation Red','Halation Orange','Halation White','Light Leak A','Light Leak B',
  'Dust & Scratches','Aged Print','Deteriorate','Water Damage','Burn Edge',
  'Vignette Soft','Vignette Hard','Vignette Color','Letterbox 2.35','Letterbox 2.39',
  'Letterbox 1.85','Widescreen','Square Crop','Vertical Crop','Circle Mask',
  'Day For Night','Moonlight','Neon Sign','Street Lamp','Tungsten Shift',
  'Fluorescent','Mixed Lighting','Overcast','Open Shade','Direct Sun',
  'Dusk Blend','Dawn Colors','Blue Hour','Golden Hour 2','Magic Hour',
  'Action Hero','Sports Pop','Documentary','News Neutral','Interview Soft',
  'Music Video A','Music Video B','Fashion Editorial','Product Clean','Food Warm',
  'Architecture Cool','Real Estate Bright','Travel Vivid','Nature Rich','Wildlife Grit',
  'Horror Desaturate','Thriller Teal','Sci-Fi Blue','Fantasy Warm','Romance Soft',
  'Comedy Bright','Drama Deep','Indie Film','Art House','Experimental',
  'Instagram A','Instagram B','Instagram C','VSCO A','VSCO B',
  'VSCO C','VSCO D','Lightroom Pop','Capture One','RawTherapee',
  'Rec709 Match','Rec2020 Match','P3 Match','ACES Proxy','Log C Grade',
  'S-Log2 Grade','S-Log3 Grade','V-Log Grade','F-Log Grade','N-Log Grade',
  'BRAW Grade','ProRes RAW','CinemaDNG','R3D Grade','ARRIRAW',
  'Punch It','Burn It','Crush It','Fade It','Desaturate It',
  'Primary Grade A','Primary Grade B','Secondary Grade','Qualifier Grade','Mask Grade',
  'Power Window','Circular Vignette','Linear Grad','Radial Grad','Spot Color',
  'Skin Hue Protect','Sky Enhance','Foliage Pop','Selective Color R','Selective Color G',
  'Selective Color B','Hue Shift +30','Hue Shift -30','Hue Shift +60','Hue Shift -60',
  'Saturation +50','Saturation -50','Luminance Mask','Shadow Detail','Highlight Recover',
  'Black Point Set','White Point Set','Midtone Push','Balance Cool','Balance Warm',
];

// ── SPX-300 Presets ─────────────────────────────────────
const SPX300_PRESETS = [
  // Cinematic (30)
  'Epic Blockbuster','Summer Blockbuster','Winter Epic','War Epic','Space Opera',
  'Western Classic','Film Noir Deluxe','Neo Noir','Retro 70s','Retro 80s',
  'Retro 90s','Grunge Era','New Wave','Mumblecore','Found Footage',
  'Mockumentary','Road Movie','Heist Film','Spy Thriller','Romantic Drama',
  'Coming Of Age','Period Drama','Biopic Clean','Docudrama','True Crime',
  'Concert Film','Dance Film','Animation Grade','Stop Motion','Claymation',
  // Portrait (30)
  'Studio Portrait','Natural Light','Window Light','Rembrandt Light','Butterfly Light',
  'Loop Light','Split Light','Broad Light','Short Light','Clamshell',
  'Catchlight Pop','Eye Enhance','Skin Smooth A','Skin Smooth B','Teeth Brighten',
  'Contour Shade','Highlight Cheek','Soften Wrinkle','Youth Glow','Senior Soft',
  'Newborn Warm','Child Bright','Teen Pop','Adult Natural','Corporate Clean',
  'Headshot Sharp','Actor Reel','Model Test','Boudoir Soft','Fine Art Portrait',
  // Landscape (30)
  'Sunrise Bloom','Noon Harsh','Afternoon Gold','Sunset Fire','Twilight Blue',
  'Midnight Dark','Overcast Flat','Stormy Drama','After Rain','Fog Morning',
  'Snow Bright','Desert Dry','Jungle Lush','Mountain Cool','Valley Haze',
  'Coastal Vivid','Ocean Deep','Lake Reflection','River Flow','Waterfall Mist',
  'Forest Floor','Canopy Light','Autumn Blaze','Spring Bloom','Winter Bare',
  'Urban Landscape','City Glow','Industrial','Rural Farm','Abstract Land',
  // Wedding (30)
  'Wedding Classic','Wedding Modern','Wedding Bright','Wedding Dark','Wedding Film',
  'Wedding Matte','Bridal Glow','Groom Sharp','Ceremony Warm','Reception Cool',
  'First Dance','Bouquet Toss','Getting Ready','Detail Shot','Ring Close',
  'Venue Ambient','Church Light','Garden Outdoor','Beach Wedding','Mountain Wedding',
  'City Hall','Destination','Elopement','Micro Wedding','Rehearsal Dinner',
  'Anniversary','Engagement A','Engagement B','Save The Date','After Party',
  // Commercial (30)
  'Product White','Product Black','Product Grey','Food Warm A','Food Cool',
  'Food Overhead','Beverage Cold','Beverage Hot','Fashion Bright','Fashion Dark',
  'Jewelry Sparkle','Watch Detail','Car Exterior','Car Interior','Real Estate Day',
  'Real Estate Dusk','Architectural','Industrial Product','Tech Clean','Cosmetic Glow',
  'Pharmaceutical','Medical Clean','Sports Product','Outdoor Gear','Luxury Brand',
  'Budget Bright','Catalog Clean','E-Commerce','Social Ad','Banner Ad',
  // Music Video (30)
  'Hip Hop Gritty','R&B Smooth','Pop Bright','EDM Neon','Rock Harsh',
  'Metal Dark','Country Warm','Folk Natural','Jazz Cool','Blues Deep',
  'Soul Warm','Gospel Bright','Reggae Vivid','Latin Hot','K-Pop Clean',
  'J-Pop Cute','Indie Moody','Alt Rock','Punk Raw','Post-Rock Cinematic',
  'Electronic Dark','Synthwave','Retrowave','Vaporwave','Lo-Fi',
  'Trap Dark','Drill Cold','Afrobeats Warm','Dancehall Vivid','Reggaeton Hot',
  // Documentary (30)
  'News Clean','Breaking News','Interview Natural','B-Roll Grade','Archive Look',
  'Super 8 Emu','16mm Emu','VHS Emu','Betamax Emu','Hi8 Emu',
  'Digital 2000s','Mobile Look','GoPro Correct','Drone Aerial','Underwater',
  'Night Vision','Infrared Look','Thermal Look','Satellite View','Time Lapse',
  'Slow Motion','High Speed','Macro Detail','Medical Scope','Security Cam',
  'Body Cam','Dash Cam','CCTV Look','News Archive','Vintage Newsreel',
  // Social Media (30)
  'TikTok Pop','TikTok Dark','Instagram Story','Instagram Feed','YouTube Thumb',
  'YouTube Vlog','Twitch Stream','Facebook Video','Twitter Clip','LinkedIn Pro',
  'Pinterest Bright','Snapchat Fun','BeReal Natural','Pinterest Muted','Behance Art',
  'Dribbble Clean','Vimeo Film','Dailymotion','Rumble Bold','Odysee Dark',
  'Short Form A','Short Form B','Long Form A','Long Form B','Live Stream',
  'Tutorial Clean','Review Bright','Unboxing Pop','Haul Bright','Reaction Fun',
  // Horror/Thriller (20)
  'Horror Drain','Slasher Red','Psychological','Body Horror','Paranormal',
  'Jump Scare','Gore Desaturate','Cult Dark','Stalker Blue','Monster Film',
  'Thriller Shadow','Neo Thriller','Tech Thriller','Political Dark','Conspiracy',
  'Heist Cold','Chase Warm','Action Dark','Explosive Orange','End Times',
  // Experimental (30)
  'Glitch Art','Pixel Sort','Databend','Circuit Bend','CRT Emulate',
  'Scanline Heavy','Interlace Emu','Compression Art','Packet Loss','Analog Warmth',
  'Double Exposure','Ghost Frame','Echo Trail','Mirror Split','Kaleidoscope',
  'Prism Split','Chromatic Shift','Color Invert','Posterize Hard','Solarize',
  'Bitcrush Visual','Quantize Color','Palette Reduce','Dithering Art','Stipple',
  'Crosshatch','Engraving','Woodblock','Linocut','Risograph',
];

// ── LUT Pack (15) ────────────────────────────────────────────
const LUT_PACK = [
  { name: 'SPX Film Emulsion',    desc: 'Organic film stock warmth' },
  { name: 'SPX Teal Tension',     desc: 'Cinematic teal-orange split' },
  { name: 'SPX Chrome Dust',      desc: 'Metallic desaturated shadows' },
  { name: 'SPX Neon Pulse',       desc: 'Cyberpunk neon atmosphere' },
  { name: 'SPX Arctic Drift',     desc: 'Cool blue winter isolation' },
  { name: 'SPX Amber Road',       desc: 'Warm amber road-movie feel' },
  { name: 'SPX Velvet Night',     desc: 'Rich night scene depth' },
  { name: 'SPX Bleached Sun',     desc: 'Overexposed summer bleed' },
  { name: 'SPX Copper Wire',      desc: 'Analog copper tone' },
  { name: 'SPX Jade Forest',      desc: 'Lush green environment' },
  { name: 'SPX Blood Moon',       desc: 'Horror red-shift' },
  { name: 'SPX Silver Screen',    desc: 'Classic black & white base' },
  { name: 'SPX Haze Layer',       desc: 'Atmospheric haze diffusion' },
  { name: 'SPX Infrared Burn',    desc: 'False-color infrared look' },
  { name: 'SPX Golden Ratio',     desc: 'Perfect balance warmth' },
];

// ── Video Effects ─────────────────────────────────────────────
const VIDEO_EFFECTS = [
  {
    category: 'Color', icon: '🎨',
    effects: [
      { name: 'Brightness/Contrast', icon: '☀️', defaultParams: { brightness: 0, contrast: 0 } },
      { name: 'Hue/Saturation',      icon: '🌈', defaultParams: { hue: 0, saturation: 0, lightness: 0 } },
      { name: 'Color Balance',       icon: '⚖️', defaultParams: { shadowR: 0, shadowG: 0, shadowB: 0, midR: 0, midG: 0, midB: 0, hiR: 0, hiG: 0, hiB: 0 } },
      { name: 'Vibrance',            icon: '✨', defaultParams: { vibrance: 0, saturation: 0 } },
      { name: 'Selective Color',     icon: '🔵', defaultParams: { targetHue: 0, range: 30, satShift: 0, lumShift: 0 } },
      { name: 'Gradient Map',        icon: '🌅', defaultParams: { colorA: '#000000', colorB: '#ffffff' } },
      { name: 'Photo Filter',        icon: '📷', defaultParams: { hue: 0, density: 25 } },
      { name: 'Channel Mixer',       icon: '🎛️', defaultParams: { rr: 100, rg: 0, rb: 0, gr: 0, gg: 100, gb: 0, br: 0, bg: 0, bb: 100 } },
    ],
  },
  {
    category: 'Blur', icon: '💫',
    effects: [
      { name: 'Gaussian Blur',   icon: '🌀', defaultParams: { radius: 5 } },
      { name: 'Motion Blur',     icon: '💨', defaultParams: { angle: 0, distance: 10 } },
      { name: 'Radial Blur',     icon: '🔄', defaultParams: { amount: 10, centerX: 0.5, centerY: 0.5 } },
      { name: 'Lens Blur',       icon: '🔭', defaultParams: { radius: 15, blades: 6 } },
      { name: 'Smart Blur',      icon: '🧠', defaultParams: { radius: 5, threshold: 15 } },
      { name: 'Box Blur',        icon: '⬛', defaultParams: { radiusX: 5, radiusY: 5 } },
      { name: 'Directional Blur',icon: '➡️', defaultParams: { angle: 0, blur: 10 } },
    ],
  },
  {
    category: 'Distort', icon: '🌊',
    effects: [
      { name: 'Warp',          icon: '🌀', defaultParams: { strength: 0.1, frequency: 5 } },
      { name: 'Ripple',        icon: '🌊', defaultParams: { amplitude: 10, wavelength: 20 } },
      { name: 'Twirl',         icon: '🌪️', defaultParams: { angle: 90, radius: 100 } },
      { name: 'Pinch',         icon: '🤏', defaultParams: { amount: 0.5 } },
      { name: 'Spherize',      icon: '🌐', defaultParams: { amount: 50 } },
      { name: 'Displace',      icon: '↔️', defaultParams: { scaleX: 10, scaleY: 10 } },
      { name: 'Shear',         icon: '📐', defaultParams: { x: 0, y: 0 } },
      { name: 'Perspective',   icon: '🔷', defaultParams: { topLeft: [0,0], topRight: [1,0], botLeft: [0,1], botRight: [1,1] } },
      { name: 'Corner Pin',    icon: '📌', defaultParams: { ul: [0,0], ur: [1,0], ll: [0,1], lr: [1,1] } },
      { name: 'Lens Distort',  icon: '🔍', defaultParams: { k1: 0, k2: 0 } },
    ],
  },
  {
    category: 'Stylize', icon: '🎭',
    effects: [
      { name: 'Glow',          icon: '💡', defaultParams: { threshold: 50, radius: 5, intensity: 1 } },
      { name: 'Bloom',         icon: '🌸', defaultParams: { threshold: 0.7, intensity: 0.5, size: 10 } },
      { name: 'Emboss',        icon: '🗿', defaultParams: { angle: 135, height: 3 } },
      { name: 'Posterize',     icon: '🎨', defaultParams: { levels: 4 } },
      { name: 'Solarize',      icon: '☀️', defaultParams: { threshold: 128 } },
      { name: 'Find Edges',    icon: '🔲', defaultParams: { strength: 1 } },
      { name: 'Sketch',        icon: '✏️', defaultParams: { detail: 5, darkness: 2 } },
      { name: 'Oil Paint',     icon: '🖌️', defaultParams: { brushSize: 4, sharpness: 2 } },
      { name: 'Cartoon',       icon: '🎠', defaultParams: { numColors: 6, edgeStrength: 1 } },
    ],
  },
  {
    category: 'Sharpen', icon: '🔪',
    effects: [
      { name: 'Unsharp Mask',   icon: '🔪', defaultParams: { amount: 50, radius: 1, threshold: 0 } },
      { name: 'Smart Sharpen',  icon: '🧪', defaultParams: { amount: 50, radius: 1 } },
      { name: 'High Pass',      icon: '📡', defaultParams: { radius: 3 } },
      { name: 'Clarity',        icon: '💎', defaultParams: { amount: 0 } },
    ],
  },
  {
    category: 'Noise', icon: '📡',
    effects: [
      { name: 'Film Grain',     icon: '🎞️', defaultParams: { amount: 20, size: 1.5, roughness: 0.5 } },
      { name: 'Add Noise',      icon: '📢', defaultParams: { amount: 5, monochromatic: false } },
      { name: 'Reduce Noise',   icon: '🤫', defaultParams: { strength: 50, detail: 25, smooth: 0 } },
      { name: 'Dust & Scratches',icon:'🌑', defaultParams: { radius: 2, threshold: 0 } },
      { name: 'Median',         icon: '➕', defaultParams: { radius: 2 } },
    ],
  },
  {
    category: 'Cinematic', icon: '🎬',
    effects: [
      { name: 'Vignette',       icon: '⭕', defaultParams: { amount: 0.5, size: 0.5, roundness: 1, feather: 0.5 } },
      { name: 'Letterbox',      icon: '🎞️', defaultParams: { ratio: '2.35:1', color: '#000000' } },
      { name: 'Anamorphic Flare',icon:'✨',  defaultParams: { intensity: 0.5, color: '#aaddff', angle: 0 } },
      { name: 'Chromatic Aberration',icon:'🌈',defaultParams: { amount: 3, angle: 0 } },
      { name: 'Halation',       icon: '🔴', defaultParams: { radius: 10, intensity: 0.3, color: '#ff4400' } },
      { name: 'Film Weave',     icon: '〰️', defaultParams: { amount: 1, speed: 1 } },
      { name: 'Gate Weave',     icon: '↕️', defaultParams: { horizontal: 1, vertical: 0.5 } },
    ],
  },
  {
    category: 'Keying', icon: '🟩',
    effects: [
      { name: 'Chroma Key',     icon: '🟩', defaultParams: { color: '#00ff00', similarity: 0.3, smoothness: 0.1 } },
      { name: 'Luma Key',       icon: '⬛', defaultParams: { threshold: 0.1, softness: 0.05, invert: false } },
      { name: 'Difference Matte',icon:'🔀', defaultParams: { softness: 0.1 } },
      { name: 'Color Range',    icon: '🎨', defaultParams: { hueMin: 0, hueMax: 360, satMin: 0, lumMin: 0 } },
    ],
  },
  {
    category: 'Transform', icon: '↔️',
    effects: [
      { name: 'Crop',           icon: '✂️', defaultParams: { top: 0, bottom: 0, left: 0, right: 0 } },
      { name: 'Scale',          icon: '🔍', defaultParams: { x: 1, y: 1, uniform: true } },
      { name: 'Rotate',         icon: '🔄', defaultParams: { angle: 0 } },
      { name: 'Flip H',         icon: '↔️', defaultParams: {} },
      { name: 'Flip V',         icon: '↕️', defaultParams: {} },
      { name: 'Mirror',         icon: '🪞', defaultParams: { axis: 'horizontal' } },
      { name: 'Offset',         icon: '↗️', defaultParams: { x: 0, y: 0 } },
    ],
  },
];

// ── Audio Effects ────────────────────────────────────────────
const AUDIO_EFFECTS = [
  {
    category: 'Dynamics', icon: '📊',
    effects: [
      { name: 'SPX Compressor',   icon: '📊', defaultParams: { threshold: -12, ratio: 4, attack: 10, release: 100, knee: 6, makeupGain: 0 } },
      { name: 'SPX Limiter',      icon: '🔒', defaultParams: { ceiling: -1, lookahead: 5, release: 50 } },
      { name: 'SPX Expander',     icon: '📈', defaultParams: { threshold: -40, ratio: 2, attack: 10, release: 100 } },
      { name: 'SPX Gate',         icon: '🚪', defaultParams: { threshold: -50, attack: 1, hold: 100, release: 200 } },
      { name: 'SPX DeEsser',      icon: '🦷', defaultParams: { frequency: 7500, threshold: -20, reduction: 6 } },
      { name: 'SPX Multiband',    icon: '🎚️', defaultParams: { band1: 0, band2: 0, band3: 0, band4: 0 } },
    ],
  },
  {
    category: 'EQ', icon: '🎛️',
    effects: [
      { name: 'SPX Parametric EQ', icon: '🎛️', defaultParams: { lowGain: 0, lowMid: 0, highMid: 0, highGain: 0, lowFreq: 80, highFreq: 8000 } },
      { name: 'SPX Graphic EQ',    icon: '📊', defaultParams: { band31: 0, band62: 0, band125: 0, band250: 0, band500: 0, band1k: 0, band2k: 0, band4k: 0, band8k: 0, band16k: 0 } },
      { name: 'SPX High Pass',     icon: '⬆️', defaultParams: { cutoff: 80, slope: 12 } },
      { name: 'SPX Low Pass',      icon: '⬇️', defaultParams: { cutoff: 18000, slope: 12 } },
    ],
  },
  {
    category: 'Reverb & Delay', icon: '🏛️',
    effects: [
      { name: 'SPX Reverb',       icon: '🏛️', defaultParams: { roomSize: 0.5, damping: 0.5, wet: 0.3, pre: 20 } },
      { name: 'SPX Plate Reverb', icon: '🪨', defaultParams: { decay: 1.5, diffusion: 0.8, wet: 0.25 } },
      { name: 'SPX Convolution',  icon: '🌊', defaultParams: { wet: 0.3, irType: 'hall' } },
      { name: 'SPX Delay',        icon: '⏱️', defaultParams: { time: 250, feedback: 0.3, wet: 0.3, sync: true } },
      { name: 'SPX Ping Pong',    icon: '🏓', defaultParams: { time: 250, feedback: 0.3, spread: 0.8 } },
      { name: 'SPX Tape Echo',    icon: '📼', defaultParams: { time: 300, feedback: 0.4, wow: 0.1, flutter: 0.05 } },
    ],
  },
  {
    category: 'Modulation', icon: '〰️',
    effects: [
      { name: 'SPX Chorus',       icon: '👥', defaultParams: { rate: 1.5, depth: 0.5, wet: 0.3 } },
      { name: 'SPX Flanger',      icon: '〰️', defaultParams: { rate: 0.5, depth: 0.5, feedback: 0.3 } },
      { name: 'SPX Phaser',       icon: '🌀', defaultParams: { rate: 0.5, depth: 1, stages: 8 } },
      { name: 'SPX Tremolo',      icon: '🎸', defaultParams: { rate: 4, depth: 0.5, shape: 'sine' } },
      { name: 'SPX Vibrato',      icon: '〰️', defaultParams: { rate: 5, depth: 0.1 } },
      { name: 'SPX Ring Mod',     icon: '💍', defaultParams: { frequency: 50, wet: 0.5 } },
    ],
  },
  {
    category: 'Repair', icon: '🔧',
    effects: [
      { name: 'SPX Noise Reduce', icon: '🔇', defaultParams: { threshold: -30, reduction: 12 } },
      { name: 'SPX DeHum',        icon: '🎵', defaultParams: { frequency: 60, harmonics: 3, reduction: 40 } },
      { name: 'SPX DeClick',      icon: '🖱️', defaultParams: { sensitivity: 5, maxWidth: 128 } },
      { name: 'SPX DeBreath',     icon: '💨', defaultParams: { threshold: -30, reduction: 6 } },
      { name: 'SPX DeReverb',     icon: '🏠', defaultParams: { reduction: 6 } },
    ],
  },
  {
    category: 'Special', icon: '⚡',
    effects: [
      { name: 'SPX Saturator',    icon: '🔥', defaultParams: { drive: 0.5, type: 'soft', wet: 1 } },
      { name: 'SPX Bitcrusher',   icon: '💢', defaultParams: { bits: 16, sampleRate: 44100 } },
      { name: 'SPX Exciter',      icon: '✨', defaultParams: { frequency: 3000, amount: 0.3 } },
      { name: 'SPX Transient',    icon: '⚡', defaultParams: { attack: 0, sustain: 0 } },
      { name: 'SPX Stereo Width', icon: '↔️', defaultParams: { width: 1 } },
      { name: 'SPX Auto-Tune',    icon: '🎵', defaultParams: { scale: 'chromatic', speed: 0.5 } },
    ],
  },
];

// ── Video Transitions ─────────────────────────────────────────
const VIDEO_TRANSITIONS = [
  {
    category: 'Dissolve', icon: '🌫️',
    items: ['Cross Dissolve','Dip to Black','Dip to White','Dip to Color','Additive Dissolve','Non-Additive Dissolve','Film Dissolve'],
  },
  {
    category: 'Wipe', icon: '➡️',
    items: ['Linear Wipe','Radial Wipe','Barn Door','Box Wipe','Clock Wipe','Iris Round','Iris Star','Checkerboard','Venetian Blind','Random Wipe'],
  },
  {
    category: 'Slide', icon: '↔️',
    items: ['Push Left','Push Right','Push Up','Push Down','Slide Left','Slide Right','Slide Up','Slide Down','Band Slide','Swap'],
  },
  {
    category: 'Zoom', icon: '🔍',
    items: ['Zoom In','Zoom Out','Cross Zoom','Zoom & Pan','Whip Zoom','Smash Zoom'],
  },
  {
    category: 'Cinematic', icon: '🎬',
    items: ['Whip Pan L-R','Whip Pan R-L','Flash White','Flash Black','Glitch Transition','Light Leak Transition','Film Burn','Luma Fade','Color Matte'],
  },
  {
    category: 'Motion', icon: '💨',
    items: ['Spin CW','Spin CCW','Flip H','Flip V','Cube Spin','Page Turn','Fold','Ripple','Wave','Stretch'],
  },
];

// ── Category Component ────────────────────────────────────────
function FxCategory({ cat, onApply, drag, searchQuery }) {
  const [open, setOpen] = useState(false);
  const items = cat.effects || cat.items || [];
  const filtered = searchQuery
    ? items.filter(e => {
        const name = typeof e === 'string' ? e : e.name;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : items;
  const isOpen = searchQuery && filtered.length > 0 ? true : open;
  if (searchQuery && filtered.length === 0) return null;
  return (
    <div className="spxcut-fx-category">
      <button className="spxcut-fx-cat-header" onClick={() => setOpen(o => !o)}>
        <span className="spxcut-fx-cat-arrow">{isOpen ? '▼' : '▶'}</span>
        <span className="spxcut-fx-cat-icon-spacer">{cat.icon}</span>
        <span className="spxcut-fx-cat-name">{cat.category}</span>
        <span className="spxcut-fx-cat-count">{filtered.length}</span>
      </button>
      {isOpen && (
        <div className="spxcut-fx-items">
          {filtered.map((effect, i) => {
            const name   = typeof effect === 'string' ? effect : effect.name;
            const icon   = typeof effect === 'string' ? '⚡' : (effect.icon || '⚡');
            const params = typeof effect === 'string' ? {} : (effect.defaultParams || {});
            const fxObj  = { name, icon, defaultParams: params };
            return (
              <div
                key={i}
                className="spxcut-fx-item"
                draggable
                onDragStart={(e) => drag.startFxDrag(e, fxObj)}
              >
                <span className="spxcut-fx-item-icon">{icon}</span>
                <span className="spxcut-fx-item-name">{name}</span>
                <button
                  className="spxcut-fx-item-apply"
                  onClick={(e) => { e.stopPropagation(); onApply(fxObj); }}
                >Apply</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Preset Chip List ──────────────────────────────────────────
function PresetChipList({ presets, onApply }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="spxcut-fx-category">
      <button className="spxcut-fx-cat-header" onClick={() => setOpen(o => !o)}>
        <span className="spxcut-fx-cat-arrow">{open ? '▼' : '▶'}</span>
        <span className="spxcut-fx-cat-name">{presets.name}</span>
        <span className="spxcut-fx-cat-count">{presets.items.length}</span>
      </button>
      {open && (
        <div className="spxcut-preset-wrap">
          <div className="spxcut-preset-grid">
            {presets.items.map((p, i) => {
              const name = typeof p === 'string' ? p : p.name;
              return (
                <button
                  key={i}
                  className="spxcut-preset-chip"
                  onClick={() => onApply({ name, type: 'preset', category: presets.name, defaultParams: {} })}
                  title={typeof p === 'object' && p.desc ? p.desc : name}
                  draggable
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transition List ───────────────────────────────────────────
function TransitionGroup({ group, onApply, drag, searchQuery }) {
  const [open, setOpen] = useState(false);
  const filtered = searchQuery
    ? group.items.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()))
    : group.items;
  const isOpen = searchQuery && filtered.length > 0 ? true : open;
  if (searchQuery && filtered.length === 0) return null;
  return (
    <div className="spxcut-fx-category">
      <button className="spxcut-fx-cat-header" onClick={() => setOpen(o => !o)}>
        <span className="spxcut-fx-cat-arrow">{isOpen ? '▼' : '▶'}</span>
        <span className="spxcut-fx-cat-icon-spacer">{group.icon}</span>
        <span className="spxcut-fx-cat-name">{group.category}</span>
        <span className="spxcut-fx-cat-count">{filtered.length}</span>
      </button>
      {isOpen && (
        <div className="spxcut-fx-items">
          {filtered.map((name, i) => {
            const fxObj = { name, type: 'transition', icon: group.icon, defaultParams: { duration: 0.5 } };
            return (
              <div
                key={i}
                className="spxcut-fx-item"
                draggable
                onDragStart={(e) => drag.startFxDrag(e, fxObj)}
              >
                <span className="spxcut-fx-item-icon">{group.icon}</span>
                <span className="spxcut-fx-item-name">{name}</span>
                <button
                  className="spxcut-fx-item-apply"
                  onClick={(e) => { e.stopPropagation(); onApply(fxObj); }}
                >Apply</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────
function SPXCutFxPanel({ state, actions, selectors, drag }) {
  const [search, setSearch] = useState('');
  const [sectionOpen, setSectionOpen] = useState({
    spx190: false, spx300: false, luts: false,
    videoFx: true, audioFx: false, transitions: false,
  });

  const activeClip = selectors.getActiveClip();

  const applyEffect = useCallback((fxObj) => {
    if (!activeClip) return;
    actions.addEffect(activeClip.id, fxObj);
  }, [activeClip, actions]);

  const toggleSection = useCallback((key) => {
    setSectionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Filter by search
  const filteredSPX190 = useMemo(() => {
    if (!search) return SPX190_PRESETS;
    return SPX190_PRESETS.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const filteredSPX300 = useMemo(() => {
    if (!search) return SPX300_PRESETS;
    return SPX300_PRESETS.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const searchActive = !!search;
  const videoFxMatches = useMemo(() => {
    if (!searchActive) return false;
    const q = search.toLowerCase();
    return VIDEO_EFFECTS.some(cat => cat.effects.some(e => e.name.toLowerCase().includes(q)));
  }, [search, searchActive]);
  const audioFxMatches = useMemo(() => {
    if (!searchActive) return false;
    const q = search.toLowerCase();
    return AUDIO_EFFECTS.some(cat => cat.effects.some(e => e.name.toLowerCase().includes(q)));
  }, [search, searchActive]);
  const transitionsMatches = useMemo(() => {
    if (!searchActive) return false;
    const q = search.toLowerCase();
    return VIDEO_TRANSITIONS.some(g => g.items.some(n => n.toLowerCase().includes(q)));
  }, [search, searchActive]);
  const lutMatches = useMemo(() => {
    if (!searchActive) return false;
    const q = search.toLowerCase();
    return LUT_PACK.some(l => l.name.toLowerCase().includes(q));
  }, [search, searchActive]);
  const effOpen = {
    spx190:      searchActive ? filteredSPX190.length > 0 : sectionOpen.spx190,
    spx300:      searchActive ? filteredSPX300.length > 0 : sectionOpen.spx300,
    luts:        searchActive ? lutMatches : sectionOpen.luts,
    videoFx:     searchActive ? videoFxMatches : sectionOpen.videoFx,
    audioFx:     searchActive ? audioFxMatches : sectionOpen.audioFx,
    transitions: searchActive ? transitionsMatches : sectionOpen.transitions,
  };

  return (
    <div className="spxcut-fx-panel">
      <div className="spxcut-fx-panel-header">
        <span className="spxcut-panel-title">FX Library</span>
        {activeClip && <span className="spxcut-text-teal spxcut-fx-active-clip-hint">→ {activeClip.name.slice(0, 16)}</span>}
      </div>

      <div className="spxcut-fx-search">
        <input
          className="spxcut-search-input"
          placeholder="Search effects & presets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="spxcut-fx-tree">

        {/* SPX-190 Presets */}
        <div className="spxcut-fx-category">
          <button className="spxcut-fx-cat-header" onClick={() => toggleSection('spx190')}>
            <span className="spxcut-fx-cat-arrow">{effOpen.spx190 ? '▼' : '▶'}</span>
            <span>🎞️</span>
            <span className="spxcut-fx-cat-name">SPX-190 Presets</span>
            <span className="spxcut-fx-cat-count">{filteredSPX190.length}</span>
          </button>
          {effOpen.spx190 && (
            <div className="spxcut-preset-wrap">
              <div className="spxcut-preset-grid">
                {filteredSPX190.map((name, i) => (
                  <button
                    key={i}
                    className="spxcut-preset-chip"
                    draggable
                    onDragStart={(e) => drag.startFxDrag(e, { name, type: 'preset', category: 'SPX-190', defaultParams: {} })}
                    onClick={() => applyEffect({ name, type: 'preset', category: 'SPX-190', defaultParams: {} })}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SPX-300 Presets */}
        <div className="spxcut-fx-category">
          <button className="spxcut-fx-cat-header" onClick={() => toggleSection('spx300')}>
            <span className="spxcut-fx-cat-arrow">{effOpen.spx300 ? '▼' : '▶'}</span>
            <span>🎬</span>
            <span className="spxcut-fx-cat-name">SPX-300 Presets</span>
            <span className="spxcut-fx-cat-count">{filteredSPX300.length}</span>
          </button>
          {effOpen.spx300 && (
            <div className="spxcut-preset-wrap">
              <div className="spxcut-preset-grid">
                {filteredSPX300.map((name, i) => (
                  <button
                    key={i}
                    className="spxcut-preset-chip"
                    draggable
                    onDragStart={(e) => drag.startFxDrag(e, { name, type: 'preset', category: 'SPX-300', defaultParams: {} })}
                    onClick={() => applyEffect({ name, type: 'preset', category: 'SPX-300', defaultParams: {} })}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LUT Pack */}
        <div className="spxcut-fx-category">
          <button className="spxcut-fx-cat-header" onClick={() => toggleSection('luts')}>
            <span className="spxcut-fx-cat-arrow">{effOpen.luts ? '▼' : '▶'}</span>
            <span>🎨</span>
            <span className="spxcut-fx-cat-name">SPX LUT Pack</span>
            <span className="spxcut-fx-cat-count">{LUT_PACK.length}</span>
          </button>
          {effOpen.luts && (
            <div className="spxcut-fx-items">
              {LUT_PACK.map((lut, i) => {
                const fxObj = { name: lut.name, type: 'lut', icon: '🎨', defaultParams: { intensity: 100 }, desc: lut.desc };
                return (
                  <div
                    key={i}
                    className="spxcut-fx-item"
                    draggable
                    onDragStart={(e) => drag.startFxDrag(e, fxObj)}
                    title={lut.desc}
                  >
                    <span className="spxcut-fx-item-icon">🎨</span>
                    <span className="spxcut-fx-item-name">{lut.name}</span>
                    <button
                      className="spxcut-fx-item-apply"
                      onClick={(e) => { e.stopPropagation(); applyEffect(fxObj); }}
                    >Apply</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="spxcut-separator" />

        {/* Video Effects */}
        <div className="spxcut-fx-category">
          <button className="spxcut-fx-cat-header" onClick={() => toggleSection('videoFx')}>
            <span className="spxcut-fx-cat-arrow">{effOpen.videoFx ? '▼' : '▶'}</span>
            <span>🎥</span>
            <span className="spxcut-fx-cat-name">Video Effects</span>
            <span className="spxcut-fx-cat-count">{VIDEO_EFFECTS.reduce((s, c) => s + c.effects.length, 0)}</span>
          </button>
          {effOpen.videoFx && VIDEO_EFFECTS.map((cat, i) => (
            <div key={i} className="spxcut-fx-sub-category">
              <FxCategory cat={cat} onApply={applyEffect} drag={drag} searchQuery={search} />
            </div>
          ))}
        </div>

        {/* Audio Effects */}
        <div className="spxcut-fx-category">
          <button className="spxcut-fx-cat-header" onClick={() => toggleSection('audioFx')}>
            <span className="spxcut-fx-cat-arrow">{effOpen.audioFx ? '▼' : '▶'}</span>
            <span>🎵</span>
            <span className="spxcut-fx-cat-name">Audio Effects</span>
            <span className="spxcut-fx-cat-count">{AUDIO_EFFECTS.reduce((s, c) => s + c.effects.length, 0)}</span>
          </button>
          {effOpen.audioFx && AUDIO_EFFECTS.map((cat, i) => (
            <div key={i} className="spxcut-fx-sub-category">
              <FxCategory cat={cat} onApply={applyEffect} drag={drag} searchQuery={search} />
            </div>
          ))}
        </div>

        {/* Video Transitions */}
        <div className="spxcut-fx-category">
          <button className="spxcut-fx-cat-header" onClick={() => toggleSection('transitions')}>
            <span className="spxcut-fx-cat-arrow">{effOpen.transitions ? '▼' : '▶'}</span>
            <span>🔀</span>
            <span className="spxcut-fx-cat-name">Video Transitions</span>
            <span className="spxcut-fx-cat-count">{VIDEO_TRANSITIONS.reduce((s, g) => s + g.items.length, 0)}</span>
          </button>
          {effOpen.transitions && VIDEO_TRANSITIONS.map((group, i) => (
            <div key={i} className="spxcut-fx-sub-category">
              <TransitionGroup group={group} onApply={applyEffect} drag={drag} searchQuery={search} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default SPXCutFxPanel;
