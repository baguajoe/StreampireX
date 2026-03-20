export const SHADER_NODE_PRESETS = [
  {
    id: "basicColor",
    name: "Basic Color",
    fragment: `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        gl_FragColor = vec4(st.x, st.y, abs(sin(u_time)), 1.0);
      }
    `,
  },
  {
    id: "pulseGlow",
    name: "Pulse Glow",
    fragment: `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      void main() {
        vec2 st = (gl_FragCoord.xy / u_resolution.xy) - 0.5;
        float d = length(st) * 2.0;
        float glow = 0.2 / max(d, 0.02);
        float pulse = 0.5 + 0.5 * sin(u_time * 3.0);
        gl_FragColor = vec4(glow * pulse, glow * 0.7, glow, 1.0);
      }
    `,
  },
];
