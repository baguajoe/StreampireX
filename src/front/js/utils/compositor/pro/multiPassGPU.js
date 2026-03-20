// src/front/js/utils/compositor/pro/multiPassGPU.js
// SPX GPU Multi-Pass — Canvas 2D simulation of multi-pass compositing
// Real WebGL passes are handled by ShaderPreviewCanvas

export const DEFAULT_PASSES = [
  { id: 'base',       enabled: true,  type: 'base',       label: 'Base Layer' },
  { id: 'blur',       enabled: true,  type: 'blur',       label: 'Blur Pass',       params: { radius: 4 } },
  { id: 'glow',       enabled: true,  type: 'glow',       label: 'Glow Pass',       params: { strength: 0.6 } },
  { id: 'vignette',   enabled: false, type: 'vignette',   label: 'Vignette',        params: { amount: 0.6 } },
  { id: 'grain',      enabled: false, type: 'grain',      label: 'Film Grain',      params: { amount: 12 } },
  { id: 'chromabb',   enabled: false, type: 'chromabb',   label: 'Chromatic Aberr', params: { shift: 3 } },
  { id: 'sharpen',    enabled: false, type: 'sharpen',    label: 'Sharpen',         params: { strength: 0.4 } },
  { id: 'colorgrade', enabled: true,  type: 'colorgrade', label: 'Color Grade',     params: { brightness: 0.05, contrast: 1.1, saturation: 1.1 } },
];

function drawBaseLayer(ctx, W, H, t) {
  // Animated gradient base
  const g = ctx.createLinearGradient(0, 0, W, H);
  const hue = (t * 20) % 360;
  g.addColorStop(0, `hsl(${hue}, 60%, 8%)`);
  g.addColorStop(0.5, `hsl(${(hue+40)%360}, 70%, 14%)`);
  g.addColorStop(1, `hsl(${(hue+80)%360}, 50%, 6%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // SPX logo text
  ctx.fillStyle = '#00ffc8';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPX COMPOSITOR', W/2, H/2 - 20);
  ctx.font = '20px Arial';
  ctx.fillStyle = '#ffffff88';
  ctx.fillText('Multi-Pass GPU Pipeline', W/2, H/2 + 30);

  // Animated particles
  ctx.fillStyle = '#00ffc8';
  for (let i = 0; i < 8; i++) {
    const px = W * 0.1 + (W * 0.8 / 8) * i;
    const py = H * 0.75 + Math.sin(t * 2 + i) * 20;
    ctx.beginPath();
    ctx.arc(px, py, 4 + Math.sin(t + i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderMultiPassGPU(canvas, passes = DEFAULT_PASSES, t = 0) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  for (const pass of passes) {
    if (!pass.enabled) continue;
    const p = pass.params || {};

    switch (pass.type) {
      case 'base':
        drawBaseLayer(ctx, W, H, t);
        break;

      case 'blur': {
        const snap = canvas.toDataURL();
        const img = new Image(); img.src = snap;
        ctx.filter = `blur(${p.radius || 4}px)`;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.3;
        if (img.complete) ctx.drawImage(img, 0, 0);
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        break;
      }

      case 'glow': {
        const strength = p.strength ?? 0.5;
        ctx.filter = `blur(12px) brightness(${1 + strength})`;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = strength * 0.4;
        ctx.fillStyle = '#00ffc822';
        ctx.fillRect(0, 0, W, H);
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        break;
      }

      case 'vignette': {
        const g = ctx.createRadialGradient(W/2, H/2, H * 0.2, W/2, H/2, H * 0.85);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${p.amount ?? 0.6})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        break;
      }

      case 'grain': {
        const imgData = ctx.getImageData(0, 0, W, H);
        const amt = p.amount ?? 12;
        for (let i = 0; i < imgData.data.length; i += 4) {
          const n = (Math.random() - 0.5) * amt;
          imgData.data[i]   = Math.min(255, Math.max(0, imgData.data[i]   + n));
          imgData.data[i+1] = Math.min(255, Math.max(0, imgData.data[i+1] + n));
          imgData.data[i+2] = Math.min(255, Math.max(0, imgData.data[i+2] + n));
        }
        ctx.putImageData(imgData, 0, 0);
        break;
      }

      case 'chromabb': {
        const shift = p.shift ?? 3;
        const imgData = ctx.getImageData(0, 0, W, H);
        const shifted = ctx.createImageData(W, H);
        shifted.data.set(imgData.data);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i  = (y * W + x) * 4;
            const ri = (y * W + Math.min(W-1, x + shift)) * 4;
            const bi = (y * W + Math.max(0, x - shift)) * 4;
            shifted.data[i]   = imgData.data[ri];
            shifted.data[i+2] = imgData.data[bi+2];
          }
        }
        ctx.putImageData(shifted, 0, 0);
        break;
      }

      case 'sharpen': {
        const strength = p.strength ?? 0.4;
        const imgData = ctx.getImageData(0, 0, W, H);
        const kernel = [0, -strength, 0, -strength, 1+4*strength, -strength, 0, -strength, 0];
        const out = ctx.createImageData(W, H);
        for (let y = 1; y < H-1; y++) {
          for (let x = 1; x < W-1; x++) {
            for (let c = 0; c < 3; c++) {
              let v = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const ki = ((y+ky)*W+(x+kx))*4+c;
                  v += imgData.data[ki] * kernel[(ky+1)*3+(kx+1)];
                }
              }
              out.data[(y*W+x)*4+c] = Math.min(255, Math.max(0, v));
            }
            out.data[(y*W+x)*4+3] = imgData.data[(y*W+x)*4+3];
          }
        }
        ctx.putImageData(out, 0, 0);
        break;
      }

      case 'colorgrade': {
        ctx.filter = [
          `brightness(${1 + (p.brightness ?? 0)})`,
          `contrast(${p.contrast ?? 1})`,
          `saturate(${p.saturation ?? 1})`,
          `hue-rotate(${p.hue ?? 0}deg)`,
        ].join(' ');
        const snap2 = document.createElement('canvas');
        snap2.width = W; snap2.height = H;
        snap2.getContext('2d').drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(snap2, 0, 0);
        ctx.filter = 'none';
        break;
      }

      default: break;
    }
  }
}

export default { DEFAULT_PASSES, renderMultiPassGPU };
