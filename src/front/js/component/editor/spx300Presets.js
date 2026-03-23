const makeSeries = (prefix, count, category, start = 1) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}_${i + start}`,
    name: `${prefix}_${i + start}`,
    category,
    source: "SPX"
  }));

export const SPX_300_PRESETS = {
  COLOR: [
    ...makeSeries("cinematic_color", 20, "Color"),
    ...makeSeries("film_emulation", 15, "Color"),
    ...makeSeries("social_grade", 10, "Color"),
    ...makeSeries("vintage_grade", 10, "Color"),
    ...makeSeries("stylized_grade", 10, "Color"),
    ...makeSeries("correction_grade", 10, "Color"),
    ...makeSeries("lut_look", 15, "Color"),
  ],
  VIDEO_FX: [
    ...makeSeries("cinematic_fx", 15, "Video FX"),
    ...makeSeries("lighting_fx", 10, "Video FX"),
    ...makeSeries("stylized_fx", 10, "Video FX"),
    ...makeSeries("glitch_fx", 10, "Video FX"),
    ...makeSeries("clarity_fx", 15, "Video FX"),
  ],
  TRANSITIONS: [
    ...makeSeries("standard_transition", 10, "Transitions"),
    ...makeSeries("movement_transition", 10, "Transitions"),
    ...makeSeries("cinematic_transition", 10, "Transitions"),
    ...makeSeries("social_transition", 10, "Transitions"),
    ...makeSeries("glitch_transition", 10, "Transitions"),
    ...makeSeries("creative_transition", 10, "Transitions"),
  ],
  MOTION: [
    ...makeSeries("camera_move", 15, "Motion"),
    ...makeSeries("text_motion", 15, "Motion"),
    ...makeSeries("social_motion", 10, "Motion"),
    ...makeSeries("dynamic_motion", 10, "Motion"),
  ],
  TITLES: [
    ...makeSeries("cinematic_title", 10, "Titles"),
    ...makeSeries("modern_title", 10, "Titles"),
    ...makeSeries("social_title", 10, "Titles"),
    ...makeSeries("creative_title", 10, "Titles"),
  ],
  AUDIO: [
    ...makeSeries("podcast_chain", 10, "Audio"),
    ...makeSeries("music_chain", 10, "Audio"),
    ...makeSeries("cinematic_voice", 10, "Audio"),
    ...makeSeries("creative_voice", 10, "Audio"),
  ]
};

export const SPX_300_PRESET_LIBRARY = Object.values(SPX_300_PRESETS).flat();

console.log("SPX 300 presets:", SPX_300_PRESET_LIBRARY.length);
