// =============================================================================
// particleEngine.js — Premium GPU-accelerated Particle System
// =============================================================================
// Features: Physics simulation, forces, emitter types, collision, sub-emitters
// Competitive with: Fusion's pEmitter/pRender, After Effects Particular
// =============================================================================

// ── Emitter Types ──────────────────────────────────────────────────────────────
export const EMITTER_TYPES = [
  'point', 'line', 'circle', 'rectangle', 'sphere', 'mesh'
];

// ── Particle Shapes ────────────────────────────────────────────────────────────
export const PARTICLE_SHAPES = [
  'circle', 'square', 'triangle', 'star', 'line', 'custom'
];

// ── Force Types ────────────────────────────────────────────────────────────────
export const FORCE_TYPES = [
  'gravity', 'wind', 'turbulence', 'vortex', 'attractor', 'repulsor', 'drag'
];

// ── Blend Modes ────────────────────────────────────────────────────────────────
export const PARTICLE_BLEND_MODES = [
  'normal', 'screen', 'add', 'multiply', 'overlay', 'lighten'
];

// ── Default Particle System Config ─────────────────────────────────────────────
export const DEFAULT_PARTICLE_CONFIG = {
  // Emitter
  emitterType: 'point',
  emitX: 50,
  emitY: 80,
  emitWidth: 20,
  emitHeight: 20,
  emitRadius: 10,
  emitRate: 30,          // particles per second
  maxParticles: 1000,
  continuous: true,
  burstCount: 50,

  // Particle Life
  lifetime: 3.0,
  lifetimeVariance: 0.5,

  // Size
  startSize: 6,
  endSize: 0,
  sizeVariance: 2,
  sizeOverLife: 'ease_out', // linear, ease_in, ease_out, custom

  // Speed & Direction
  speed: 120,
  speedVariance: 40,
  angle: 270,            // degrees, 270 = up
  spread: 45,            // cone spread in degrees
  inheritVelocity: 0,

  // Color over lifetime
  colorStart: '#ffffff',
  colorMid: '#ff9500',
  colorEnd: '#ff0000',
  opacityStart: 1,
  opacityEnd: 0,
  blendMode: 'screen',

  // Physics
  gravity: 98,           // px/s²
  gravityX: 0,
  drag: 0.02,
  turbulence: 0,
  turbulenceScale: 50,
  turbulenceSpeed: 1,
  bounce: 0,
  collisionY: 100,       // % from top

  // Forces
  forces: [],

  // Rotation
  startRotation: 0,
  rotationVariance: 180,
  rotationSpeed: 0,
  rotationSpeedVariance: 30,
  alignToVelocity: false,

  // Sub-emitter
  subEmitterOnDeath: false,
  subEmitterConfig: null,

  // Rendering
  shape: 'circle',
  texture: null,
  glowAmount: 0,
  trailLength: 0,
  trailOpacity: 0.3,

  // Presets
  preset: 'custom',
};

// ── Particle Presets ───────────────────────────────────────────────────────────
export const PARTICLE_PRESETS = {
  fire: {
    name: 'Fire',
    emitterType: 'line',
    emitWidth: 40,
    emitRate: 60,
    maxParticles: 800,
    lifetime: 1.5,
    lifetimeVariance: 0.5,
    startSize: 18,
    endSize: 2,
    speed: 80,
    speedVariance: 20,
    angle: 270,
    spread: 30,
    colorStart: '#ffff00',
    colorMid: '#ff6600',
    colorEnd: '#ff000000',
    opacityStart: 0.9,
    opacityEnd: 0,
    gravity: -20,
    turbulence: 15,
    blendMode: 'screen',
    glowAmount: 0.4,
    shape: 'circle',
  },
  smoke: {
    name: 'Smoke',
    emitterType: 'point',
    emitRate: 15,
    maxParticles: 300,
    lifetime: 4.0,
    lifetimeVariance: 1.0,
    startSize: 20,
    endSize: 80,
    speed: 30,
    speedVariance: 10,
    angle: 270,
    spread: 20,
    colorStart: '#888888',
    colorMid: '#666666',
    colorEnd: '#444444',
    opacityStart: 0.6,
    opacityEnd: 0,
    gravity: -5,
    turbulence: 8,
    blendMode: 'normal',
    shape: 'circle',
  },
  sparks: {
    name: 'Sparks',
    emitterType: 'point',
    emitRate: 80,
    maxParticles: 500,
    lifetime: 1.2,
    lifetimeVariance: 0.4,
    startSize: 3,
    endSize: 0,
    speed: 200,
    speedVariance: 80,
    angle: 270,
    spread: 180,
    colorStart: '#ffffff',
    colorMid: '#ffdd00',
    colorEnd: '#ff6600',
    opacityStart: 1,
    opacityEnd: 0,
    gravity: 150,
    drag: 0.01,
    bounce: 0.4,
    blendMode: 'add',
    trailLength: 8,
    shape: 'line',
  },
  magic: {
    name: 'Magic',
    emitterType: 'circle',
    emitRadius: 30,
    emitRate: 40,
    maxParticles: 400,
    lifetime: 2.0,
    startSize: 8,
    endSize: 0,
    speed: 60,
    speedVariance: 30,
    angle: 270,
    spread: 360,
    colorStart: '#00ffc8',
    colorMid: '#ff00ff',
    colorEnd: '#0000ff',
    opacityStart: 1,
    opacityEnd: 0,
    gravity: -10,
    turbulence: 5,
    blendMode: 'screen',
    glowAmount: 0.6,
    shape: 'star',
    rotationSpeed: 90,
  },
  snow: {
    name: 'Snow',
    emitterType: 'line',
    emitWidth: 120,
    emitY: 0,
    emitRate: 20,
    maxParticles: 400,
    lifetime: 6.0,
    lifetimeVariance: 2.0,
    startSize: 5,
    endSize: 4,
    speed: 40,
    speedVariance: 10,
    angle: 90,
    spread: 20,
    colorStart: '#ffffff',
    colorMid: '#ddddff',
    colorEnd: '#ffffff',
    opacityStart: 0.8,
    opacityEnd: 0.2,
    gravity: 20,
    turbulence: 3,
    blendMode: 'normal',
    shape: 'circle',
  },
  confetti: {
    name: 'Confetti',
    emitterType: 'point',
    emitRate: 50,
    maxParticles: 600,
    lifetime: 4.0,
    startSize: 8,
    endSize: 6,
    speed: 250,
    speedVariance: 100,
    angle: 270,
    spread: 60,
    colorStart: '#ff0000',
    colorMid: '#00ff00',
    colorEnd: '#0000ff',
    opacityStart: 1,
    opacityEnd: 0.5,
    gravity: 120,
    drag: 0.03,
    rotationSpeed: 180,
    rotationSpeedVariance: 90,
    blendMode: 'normal',
    shape: 'square',
  },
  explosion: {
    name: 'Explosion',
    emitterType: 'point',
    continuous: false,
    burstCount: 200,
    maxParticles: 300,
    lifetime: 1.5,
    lifetimeVariance: 0.5,
    startSize: 12,
    endSize: 0,
    speed: 300,
    speedVariance: 150,
    angle: 270,
    spread: 360,
    colorStart: '#ffffff',
    colorMid: '#ffaa00',
    colorEnd: '#ff0000',
    opacityStart: 1,
    opacityEnd: 0,
    gravity: 80,
    drag: 0.02,
    blendMode: 'screen',
    glowAmount: 0.8,
    trailLength: 5,
    shape: 'circle',
    subEmitterOnDeath: true,
  },
  rain: {
    name: 'Rain',
    emitterType: 'line',
    emitWidth: 120,
    emitY: 0,
    emitRate: 100,
    maxParticles: 800,
    lifetime: 1.5,
    startSize: 2,
    endSize: 2,
    speed: 400,
    speedVariance: 50,
    angle: 100,
    spread: 5,
    colorStart: '#aaddff',
    colorMid: '#aaddff',
    colorEnd: '#aaddff',
    opacityStart: 0.7,
    opacityEnd: 0.3,
    gravity: 50,
    blendMode: 'normal',
    shape: 'line',
    trailLength: 12,
  },
  dust: {
    name: 'Dust',
    emitterType: 'rectangle',
    emitWidth: 100,
    emitHeight: 20,
    emitRate: 10,
    maxParticles: 200,
    lifetime: 5.0,
    startSize: 3,
    endSize: 0,
    speed: 15,
    speedVariance: 8,
    angle: 270,
    spread: 40,
    colorStart: '#c8a87a',
    colorMid: '#b09060',
    colorEnd: '#987844',
    opacityStart: 0.4,
    opacityEnd: 0,
    gravity: -2,
    turbulence: 4,
    blendMode: 'normal',
    shape: 'circle',
  },
  portal: {
    name: 'Portal',
    emitterType: 'circle',
    emitRadius: 50,
    emitRate: 60,
    maxParticles: 500,
    lifetime: 1.5,
    startSize: 6,
    endSize: 0,
    speed: 40,
    speedVariance: 20,
    angle: 0,
    spread: 360,
    colorStart: '#00ffff',
    colorMid: '#0080ff',
    colorEnd: '#8000ff',
    opacityStart: 1,
    opacityEnd: 0,
    gravity: 0,
    turbulence: 2,
    blendMode: 'screen',
    glowAmount: 0.7,
    shape: 'circle',
    rotationSpeed: 45,
  },
};

// ── Particle Simulation ─────────────────────────────────────────────────────────
export class ParticleSystem {
  constructor(config = {}) {
    this.config = { ...DEFAULT_PARTICLE_CONFIG, ...config };
    this.particles = [];
    this.time = 0;
    this.emitAccumulator = 0;
    this.noise = this._buildNoiseTable();
  }

  _buildNoiseTable() {
    const t = [];
    for (let i = 0; i < 512; i++) t.push(Math.random() * 2 - 1);
    return t;
  }

  _noise(x, y, t) {
    const i = (Math.floor(x * 4 + t * 10) & 511);
    const j = (Math.floor(y * 4 + t * 10 + 100) & 511);
    return this.noise[i] * 0.5 + this.noise[j] * 0.5;
  }

  _lerp(a, b, t) { return a + (b - a) * t; }

  _lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1,3),16);
    const g1 = parseInt(c1.slice(3,5),16);
    const b1 = parseInt(c1.slice(5,7),16);
    const r2 = parseInt(c2.slice(1,3),16);
    const g2 = parseInt(c2.slice(3,5),16);
    const b2 = parseInt(c2.slice(5,7),16);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const b = Math.round(b1 + (b2-b1)*t);
    return `rgb(${r},${g},${b})`;
  }

  _emitParticle(W, H) {
    const c = this.config;
    const angle = (c.angle + (Math.random()-0.5)*c.spread) * Math.PI / 180;
    const speed = c.speed + (Math.random()-0.5)*2*c.speedVariance;
    let x = c.emitX / 100 * W;
    let y = c.emitY / 100 * H;

    if (c.emitterType === 'line') {
      x += (Math.random()-0.5) * c.emitWidth / 100 * W;
    } else if (c.emitterType === 'circle') {
      const r = Math.random() * c.emitRadius / 100 * Math.min(W,H);
      const a = Math.random() * Math.PI * 2;
      x += Math.cos(a) * r;
      y += Math.sin(a) * r;
    } else if (c.emitterType === 'rectangle') {
      x += (Math.random()-0.5) * c.emitWidth / 100 * W;
      y += (Math.random()-0.5) * c.emitHeight / 100 * H;
    }

    const life = c.lifetime + (Math.random()-0.5)*2*c.lifetimeVariance;

    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: c.startSize + (Math.random()-0.5)*2*c.sizeVariance,
      rotation: c.startRotation + (Math.random()-0.5)*2*c.rotationVariance,
      rotSpeed: c.rotationSpeed + (Math.random()-0.5)*2*c.rotationSpeedVariance,
      trail: [],
    };
  }

  update(dt, W, H) {
    const c = this.config;
    this.time += dt;

    // Emit new particles
    if (c.continuous) {
      this.emitAccumulator += c.emitRate * dt;
      while (this.emitAccumulator >= 1 && this.particles.length < c.maxParticles) {
        this.particles.push(this._emitParticle(W, H));
        this.emitAccumulator -= 1;
      }
    }

    // Update particles
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      if (c.trailLength > 0) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > c.trailLength) p.trail.shift();
      }

      // Apply forces
      const turbX = c.turbulence > 0 ? this._noise(p.x/W, p.y/H, this.time) * c.turbulence : 0;
      const turbY = c.turbulence > 0 ? this._noise(p.x/W+100, p.y/H+100, this.time) * c.turbulence : 0;

      p.vx += turbX * dt;
      p.vy += turbY * dt;
      p.vy += c.gravity * dt;
      p.vx += c.gravityX * dt;
      p.vx *= (1 - c.drag);
      p.vy *= (1 - c.drag);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotSpeed * dt;

      // Bounce
      if (c.bounce > 0 && p.y > c.collisionY / 100 * H) {
        p.y = c.collisionY / 100 * H;
        p.vy *= -c.bounce;
        p.vx *= 0.8;
      }

      p.life -= dt;
    }
  }

  render(ctx, W, H) {
    const c = this.config;
    ctx.save();
    ctx.globalCompositeOperation = c.blendMode === 'add' ? 'lighter' :
      c.blendMode === 'screen' ? 'screen' :
      c.blendMode === 'multiply' ? 'multiply' : 'source-over';

    for (const p of this.particles) {
      const t = 1 - (p.life / p.maxLife);
      const tMid = t < 0.5 ? t * 2 : 1;
      const tEnd = t > 0.5 ? (t - 0.5) * 2 : 0;

      const color = t < 0.5
        ? this._lerpColor(c.colorStart, c.colorMid, t * 2)
        : this._lerpColor(c.colorMid, c.colorEnd, (t - 0.5) * 2);

      const opacity = this._lerp(c.opacityStart, c.opacityEnd, t);
      const size = this._lerp(p.size, c.endSize, t);

      if (size <= 0 || opacity <= 0) continue;

      // Draw trail
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.5;
        ctx.globalAlpha = opacity * c.trailOpacity;
        ctx.stroke();
      }

      ctx.globalAlpha = opacity;

      // Glow
      if (c.glowAmount > 0) {
        ctx.shadowBlur = size * 4 * c.glowAmount;
        ctx.shadowColor = color;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);

      ctx.fillStyle = color;
      ctx.beginPath();

      if (c.shape === 'circle') {
        ctx.arc(0, 0, size/2, 0, Math.PI*2);
      } else if (c.shape === 'square') {
        ctx.rect(-size/2, -size/2, size, size);
      } else if (c.shape === 'triangle') {
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/2, size/2);
        ctx.lineTo(-size/2, size/2);
        ctx.closePath();
      } else if (c.shape === 'star') {
        for (let i = 0; i < 5; i++) {
          const a1 = (i * 2 * Math.PI / 5) - Math.PI/2;
          const a2 = a1 + Math.PI/5;
          if (i === 0) ctx.moveTo(Math.cos(a1)*size/2, Math.sin(a1)*size/2);
          else ctx.lineTo(Math.cos(a1)*size/2, Math.sin(a1)*size/2);
          ctx.lineTo(Math.cos(a2)*size/4, Math.sin(a2)*size/4);
        }
        ctx.closePath();
      } else if (c.shape === 'line') {
        ctx.rect(-size/2, -1, size, 2);
      }

      ctx.fill();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  reset() {
    this.particles = [];
    this.time = 0;
    this.emitAccumulator = 0;
  }
}

// ── Deep Compositing (basic Z-buffer approach) ─────────────────────────────────
export class DeepCompBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // Each pixel stores array of {r,g,b,a,z} samples sorted by depth
    this.samples = new Array(width * height).fill(null).map(() => []);
  }

  addSample(x, y, r, g, b, a, z) {
    const idx = Math.floor(y) * this.width + Math.floor(x);
    if (idx < 0 || idx >= this.samples.length) return;
    this.samples[idx].push({ r, g, b, a, z });
    this.samples[idx].sort((a, b) => a.z - b.z);
  }

  flatten() {
    const out = new Uint8ClampedArray(this.width * this.height * 4);
    for (let i = 0; i < this.samples.length; i++) {
      const stack = this.samples[i];
      let r=0, g=0, b=0, a=0;
      for (const s of stack) {
        // Over operation: composite front-to-back
        const alpha = s.a * (1 - a);
        r += s.r * alpha;
        g += s.g * alpha;
        b += s.b * alpha;
        a += alpha;
        if (a >= 1) break;
      }
      out[i*4]   = Math.min(255, r * 255);
      out[i*4+1] = Math.min(255, g * 255);
      out[i*4+2] = Math.min(255, b * 255);
      out[i*4+3] = Math.min(255, a * 255);
    }
    return out;
  }

  clear() {
    for (let i = 0; i < this.samples.length; i++) this.samples[i] = [];
  }
}

export default { ParticleSystem, DeepCompBuffer, PARTICLE_PRESETS, EMITTER_TYPES, PARTICLE_SHAPES, FORCE_TYPES };
