import {
  createGL,
  createProgram,
  createTexture,
  updateTextureFromCanvas,
  createFramebuffer,
  createFullscreenQuad,
  resizeCanvasToDisplaySize,
} from "./glUtils";
import {
  fullscreenVS,
  passthroughFS,
  colorAdjustFS,
  blurFS,
  chromaKeyFS,
  mergeFS,
} from "./shaders";

function setUniform1f(gl, program, name, value) {
  const loc = gl.getUniformLocation(program, name);
  if (loc) gl.uniform1f(loc, value);
}
function setUniform2f(gl, program, name, a, b) {
  const loc = gl.getUniformLocation(program, name);
  if (loc) gl.uniform2f(loc, a, b);
}
function setUniform3f(gl, program, name, a, b, c) {
  const loc = gl.getUniformLocation(program, name);
  if (loc) gl.uniform3f(loc, a, b, c);
}
function bindTextureUnit(gl, program, uniformName, texture, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const loc = gl.getUniformLocation(program, uniformName);
  if (loc) gl.uniform1i(loc, unit);
}

export class CompositorRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = createGL(canvas);
    this.quad = createFullscreenQuad(this.gl);
    this.programs = {
      passthrough: createProgram(this.gl, fullscreenVS, passthroughFS),
      color: createProgram(this.gl, fullscreenVS, colorAdjustFS),
      blur: createProgram(this.gl, fullscreenVS, blurFS),
      chroma: createProgram(this.gl, fullscreenVS, chromaKeyFS),
      merge: createProgram(this.gl, fullscreenVS, mergeFS),
    };
    this.resources = new Map();
    this.dynamicTextures = new Map();
  }

  resize() {
    resizeCanvasToDisplaySize(this.canvas);
  }

  ensureTarget(width, height, key = "default") {
    const gl = this.gl;
    const existing = this.resources.get(key);
    if (existing && existing.width === width && existing.height === height) return existing;
    const texture = createTexture(gl, width, height);
    const fbo = createFramebuffer(gl, texture);
    const target = { width, height, texture, fbo };
    this.resources.set(key, target);
    return target;
  }

  ensureCanvasTexture(key, canvasLike) {
    const gl = this.gl;
    let tex = this.dynamicTextures.get(key);
    if (!tex) {
      tex = createTexture(gl, canvasLike.width, canvasLike.height);
      this.dynamicTextures.set(key, tex);
    }
    updateTextureFromCanvas(gl, tex, canvasLike);
    return tex;
  }

  begin(program, target = null) {
    const gl = this.gl;
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo || null);
    gl.viewport(0, 0, target?.width || this.canvas.width, target?.height || this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const pos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  }

  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  renderTextureToScreen(texture) {
    this.resize();
    const gl = this.gl;
    this.begin(this.programs.passthrough, null);
    bindTextureUnit(gl, this.programs.passthrough, "u_texture", texture, 0);
    this.draw();
  }

  renderColorAdjust(inputTexture, params, outKey = "color") {
    const gl = this.gl;
    const target = this.ensureTarget(this.canvas.width, this.canvas.height, outKey);
    this.begin(this.programs.color, target);
    bindTextureUnit(gl, this.programs.color, "u_texture", inputTexture, 0);
    setUniform1f(gl, this.programs.color, "u_brightness", params.brightness ?? 1);
    setUniform1f(gl, this.programs.color, "u_contrast", params.contrast ?? 1);
    setUniform1f(gl, this.programs.color, "u_saturation", params.saturation ?? 1);
    setUniform1f(gl, this.programs.color, "u_opacity", params.opacity ?? 1);
    this.draw();
    return target.texture;
  }

  renderBlur(inputTexture, params, outKey = "blur") {
    const gl = this.gl;
    const target = this.ensureTarget(this.canvas.width, this.canvas.height, outKey);
    this.begin(this.programs.blur, target);
    bindTextureUnit(gl, this.programs.blur, "u_texture", inputTexture, 0);
    setUniform2f(gl, this.programs.blur, "u_texel", 1 / this.canvas.width, 1 / this.canvas.height);
    setUniform1f(gl, this.programs.blur, "u_amount", params.amount ?? 0.5);
    setUniform1f(gl, this.programs.blur, "u_opacity", params.opacity ?? 1);
    this.draw();
    return target.texture;
  }

  renderChromaKey(inputTexture, params, outKey = "chroma") {
    const gl = this.gl;
    const target = this.ensureTarget(this.canvas.width, this.canvas.height, outKey);
    this.begin(this.programs.chroma, target);
    bindTextureUnit(gl, this.programs.chroma, "u_texture", inputTexture, 0);
    const key = params.keyColor || [0, 1, 0];
    setUniform3f(gl, this.programs.chroma, "u_keyColor", key[0], key[1], key[2]);
    setUniform1f(gl, this.programs.chroma, "u_threshold", params.threshold ?? 0.35);
    setUniform1f(gl, this.programs.chroma, "u_softness", params.softness ?? 0.15);
    setUniform1f(gl, this.programs.chroma, "u_opacity", params.opacity ?? 1);
    this.draw();
    return target.texture;
  }

  renderMerge(texA, texB, params = {}, outKey = "merge") {
    const gl = this.gl;
    const target = this.ensureTarget(this.canvas.width, this.canvas.height, outKey);
    this.begin(this.programs.merge, target);
    bindTextureUnit(gl, this.programs.merge, "u_a", texA, 0);
    bindTextureUnit(gl, this.programs.merge, "u_b", texB, 1);
    setUniform1f(gl, this.programs.merge, "u_mix", params.mix ?? 0.5);
    this.draw();
    return target.texture;
  }
}
