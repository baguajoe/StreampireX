import { createGPUContext, createProgram, BASIC_VERTEX_SHADER } from "../../component/nodecompositor/vfx/gpuPipeline";

export const DEFAULT_PASSES = [
  { id: "base", enabled: true },
  { id: "glow", enabled: true },
  { id: "grade", enabled: true },
];

const PASS_FRAGMENTS = {
  base: `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      gl_FragColor = vec4(st.x * 0.5, st.y * 0.4, 0.25 + 0.2 * abs(sin(u_time)), 1.0);
    }
  `,
  glow: `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    void main() {
      vec2 st = (gl_FragCoord.xy / u_resolution.xy) - 0.5;
      float d = length(st) * 2.0;
      float glow = 0.1 / max(d, 0.03);
      float pulse = 0.5 + 0.5 * sin(u_time * 2.0);
      gl_FragColor = vec4(glow * pulse, glow * 0.7, glow, 0.65);
    }
  `,
  grade: `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      gl_FragColor = vec4(0.06 + st.x * 0.04, 0.12 + st.y * 0.03, 0.18, 0.18);
    }
  `,
};

function drawFullscreen(gl, program) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1,  1, 1, -1,  1, 1,
    ]),
    gl.STATIC_DRAW
  );

  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function renderMultiPassGPU(canvas, passes = DEFAULT_PASSES, time = 0) {
  const gl = createGPUContext(canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.03, 0.06, 0.11, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  passes.filter((p) => p.enabled).forEach((pass, idx) => {
    const frag = PASS_FRAGMENTS[pass.id];
    if (!frag) return;
    const program = createProgram(gl, BASIC_VERTEX_SHADER, frag);
    gl.useProgram(program);

    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    if (resLoc) gl.uniform2f(resLoc, gl.canvas.width, gl.canvas.height);
    if (timeLoc) gl.uniform1f(timeLoc, time + idx * 0.15);

    if (idx > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    drawFullscreen(gl, program);
  });

  return gl;
}
