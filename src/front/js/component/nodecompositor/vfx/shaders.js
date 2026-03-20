export const fullscreenVS = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const passthroughFS = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_texture, v_uv);
}
`;

export const colorAdjustFS = `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_opacity;
varying vec2 v_uv;

vec3 applySaturation(vec3 color, float sat) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, sat);
}

void main() {
  vec4 c = texture2D(u_texture, v_uv);
  c.rgb *= u_brightness;
  c.rgb = ((c.rgb - 0.5) * u_contrast) + 0.5;
  c.rgb = applySaturation(c.rgb, u_saturation);
  c.a *= u_opacity;
  gl_FragColor = c;
}
`;

export const blurFS = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_texel;
uniform float u_amount;
uniform float u_opacity;
varying vec2 v_uv;

void main() {
  vec4 sum = vec4(0.0);
  sum += texture2D(u_texture, v_uv + u_texel * vec2(-2.0, 0.0)) * 0.1216;
  sum += texture2D(u_texture, v_uv + u_texel * vec2(-1.0, 0.0)) * 0.2333;
  sum += texture2D(u_texture, v_uv) * 0.2902;
  sum += texture2D(u_texture, v_uv + u_texel * vec2(1.0, 0.0)) * 0.2333;
  sum += texture2D(u_texture, v_uv + u_texel * vec2(2.0, 0.0)) * 0.1216;
  vec4 original = texture2D(u_texture, v_uv);
  gl_FragColor = mix(original, sum, clamp(u_amount, 0.0, 1.0)) * vec4(1.0, 1.0, 1.0, u_opacity);
}
`;

export const chromaKeyFS = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec3 u_keyColor;
uniform float u_threshold;
uniform float u_softness;
uniform float u_opacity;
varying vec2 v_uv;

void main() {
  vec4 c = texture2D(u_texture, v_uv);
  float dist = distance(c.rgb, u_keyColor);
  float alpha = smoothstep(u_threshold, u_threshold + max(0.0001, u_softness), dist);
  c.a *= alpha * u_opacity;
  gl_FragColor = c;
}
`;

export const mergeFS = `
precision mediump float;
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform float u_mix;
varying vec2 v_uv;
void main() {
  vec4 a = texture2D(u_a, v_uv);
  vec4 b = texture2D(u_b, v_uv);
  gl_FragColor = mix(a, b, clamp(u_mix, 0.0, 1.0));
}
`;
