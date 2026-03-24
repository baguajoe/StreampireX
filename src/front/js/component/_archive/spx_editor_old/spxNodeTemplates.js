export const SPX_NODE_TEMPLATES = [
  {
    id: "green_screen_composite",
    name: "Green Screen Composite",
    category: "Compositing",
    nodes: ["MediaIn", "Keyer", "LightWrap", "ColorCorrect", "Merge", "MediaOut"]
  },
  {
    id: "cinematic_grade_stack",
    name: "Cinematic Grade Stack",
    category: "Color",
    nodes: ["MediaIn", "PrimaryGrade", "Curves", "Bloom", "Grain", "MediaOut"]
  },
  {
    id: "split_screen_duo",
    name: "Split Screen Duo",
    category: "Layout",
    nodes: ["MediaInA", "TransformA", "MediaInB", "TransformB", "Merge", "MediaOut"]
  },
  {
    id: "picture_in_picture",
    name: "Picture in Picture",
    category: "Layout",
    nodes: ["Background", "Foreground", "Scale", "Position", "Shadow", "Merge", "MediaOut"]
  },
  {
    id: "social_reel_stack",
    name: "Social Reel Stack",
    category: "Social",
    nodes: ["MediaIn", "SafeCrop", "Sharpen", "Subtitle", "BrandBug", "MediaOut"]
  },
  {
    id: "anime_line_art",
    name: "Anime Line Art",
    category: "Stylized",
    nodes: ["MediaIn", "EdgeDetect", "Posterize", "Halation", "MediaOut"]
  },
  {
    id: "music_video_glitch",
    name: "Music Video Glitch",
    category: "Stylized",
    nodes: ["MediaIn", "RGBSplit", "Displace", "Noise", "Flash", "MediaOut"]
  },
  {
    id: "broadcast_lower_third",
    name: "Broadcast Lower Third",
    category: "Titles",
    nodes: ["Background", "Shape", "Text", "Shadow", "Merge", "MediaOut"]
  },
  {
    id: "trailer_title_stack",
    name: "Trailer Title Stack",
    category: "Titles",
    nodes: ["Background", "Text3D", "Glow", "LensFlare", "MediaOut"]
  },
  {
    id: "podcast_video_pack",
    name: "Podcast Video Pack",
    category: "Podcast",
    nodes: ["CameraIn", "Waveform", "LowerThird", "LogoBug", "MediaOut"]
  }
];

console.log("SPX node templates:", SPX_NODE_TEMPLATES.length);
