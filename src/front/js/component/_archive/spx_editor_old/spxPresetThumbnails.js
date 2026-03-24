const makeThumb = (id, label, group) => ({
  id,
  label,
  group,
  thumb: `/images/presets/${id}.png`,
  preview: `/images/presets/${id}.webp`
});

export const SPX_PRESET_THUMBNAILS = [
  makeThumb("cinematic_color_1", "Cinematic Color 1", "Color"),
  makeThumb("film_emulation_1", "Film Emulation 1", "Color"),
  makeThumb("standard_transition_1", "Standard Transition 1", "Transitions"),
  makeThumb("camera_move_1", "Camera Move 1", "Motion"),
  makeThumb("cinematic_title_1", "Cinematic Title 1", "Titles"),
  makeThumb("podcast_chain_1", "Podcast Chain 1", "Audio"),
  makeThumb("green_screen_composite", "Green Screen Composite", "Nodes"),
  makeThumb("lut_teal_orange_01", "Teal Orange 01", "LUT")
];

console.log("SPX preset thumbnails:", SPX_PRESET_THUMBNAILS.length);
