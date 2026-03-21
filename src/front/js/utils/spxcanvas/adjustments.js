// src/front/js/utils/spxcanvas/adjustments.js
// SPX Canvas — Non-destructive pixel adjustments (Photoshop-style)

export function applyBrightnessContrast(imageData, brightness=0, contrast=1) {
  const d = imageData.data;
  for (let i=0; i<d.length; i+=4) {
    for (let c=0; c<3; c++) {
      let v = d[i+c]/255;
      v = (v - 0.5) * contrast + 0.5 + brightness;
      d[i+c] = Math.min(255,Math.max(0,v*255));
    }
  }
  return imageData;
}

export function applyHueSaturation(imageData, hue=0, saturation=1, lightness=0) {
  const d = imageData.data;
  for (let i=0; i<d.length; i+=4) {
    let [h,s,l] = rgbToHsl(d[i],d[i+1],d[i+2]);
    h = (h + hue/360 + 1) % 1;
    s = Math.min(1,Math.max(0, s*saturation));
    l = Math.min(1,Math.max(0, l + lightness));
    const [r,g,b] = hslToRgb(h,s,l);
    d[i]=r; d[i+1]=g; d[i+2]=b;
  }
  return imageData;
}

export function applyLevels(imageData, inBlack=0, inWhite=255, gamma=1, outBlack=0, outWhite=255) {
  const d = imageData.data;
  const inRange = inWhite-inBlack||1, outRange = outWhite-outBlack;
  for (let i=0; i<d.length; i+=4) {
    for (let c=0; c<3; c++) {
      let v = (d[i+c]-inBlack)/inRange;
      v = Math.max(0,Math.min(1,v));
      v = Math.pow(v,1/gamma);
      d[i+c] = outBlack + v*outRange;
    }
  }
  return imageData;
}

export function applyCurves(imageData, rCurve, gCurve, bCurve) {
  const d = imageData.data;
  const lookup = (curve, v) => {
    if (!curve||curve.length<2) return v;
    const sorted = [...curve].sort((a,b)=>a.x-b.x);
    if (v<=sorted[0].x) return sorted[0].y;
    if (v>=sorted[sorted.length-1].x) return sorted[sorted.length-1].y;
    for (let i=0; i<sorted.length-1; i++) {
      if (v>=sorted[i].x && v<=sorted[i+1].x) {
        const t=(v-sorted[i].x)/(sorted[i+1].x-sorted[i].x);
        return sorted[i].y+(sorted[i+1].y-sorted[i].y)*t;
      }
    }
    return v;
  };
  for (let i=0; i<d.length; i+=4) {
    d[i]   = lookup(rCurve, d[i]/255)*255;
    d[i+1] = lookup(gCurve, d[i+1]/255)*255;
    d[i+2] = lookup(bCurve, d[i+2]/255)*255;
  }
  return imageData;
}

export function applyColorBalance(imageData, shadows=[0,0,0], midtones=[0,0,0], highlights=[0,0,0]) {
  const d = imageData.data;
  for (let i=0; i<d.length; i+=4) {
    const lum = (d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114)/255;
    const sw = Math.max(0, 0.5-lum)*2, hw = Math.max(0,lum-0.5)*2, mw = 1-sw-hw;
    for (let c=0; c<3; c++) {
      d[i+c] = Math.min(255,Math.max(0,
        d[i+c] + shadows[c]*sw*128 + midtones[c]*mw*128 + highlights[c]*hw*128
      ));
    }
  }
  return imageData;
}

export function applyVibrance(imageData, vibrance=0) {
  const d = imageData.data;
  for (let i=0; i<d.length; i+=4) {
    const max = Math.max(d[i],d[i+1],d[i+2])/255;
    const avg = (d[i]+d[i+1]+d[i+2])/(3*255);
    const amt = vibrance * (1-max) * (max-avg);
    for (let c=0;c<3;c++) d[i+c]=Math.min(255,Math.max(0,d[i+c]+amt*255));
  }
  return imageData;
}

export function applySharpening(imageData, W, H, strength=0.5) {
  const d = new Uint8ClampedArray(imageData.data);
  const k = [0,-strength,0,-strength,1+4*strength,-strength,0,-strength,0];
  const out = imageData;
  for (let y=1;y<H-1;y++) {
    for (let x=1;x<W-1;x++) {
      for (let c=0;c<3;c++) {
        let v=0;
        for (let ky=-1;ky<=1;ky++) for (let kx=-1;kx<=1;kx++)
          v+=d[((y+ky)*W+(x+kx))*4+c]*k[(ky+1)*3+(kx+1)];
        out.data[(y*W+x)*4+c]=Math.min(255,Math.max(0,v));
      }
      out.data[(y*W+x)*4+3]=d[(y*W+x)*4+3];
    }
  }
  return out;
}

export function applyNoiseReduction(imageData, W, H, strength=3) {
  const d = new Uint8ClampedArray(imageData.data);
  const out = imageData;
  const r = Math.ceil(strength/2);
  for (let y=r;y<H-r;y++) {
    for (let x=r;x<W-r;x++) {
      for (let c=0;c<3;c++) {
        let sum=0,count=0;
        for (let ky=-r;ky<=r;ky++) for (let kx=-r;kx<=r;kx++) {
          sum+=d[((y+ky)*W+(x+kx))*4+c]; count++;
        }
        out.data[(y*W+x)*4+c]=sum/count;
      }
    }
  }
  return out;
}

// ─── Color conversion helpers ─────────────────────────────────────────────────
function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}
  else{
    const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}
    h/=6;
  }
  return[h,s,l];
}

function hslToRgb(h,s,l){
  if(s===0)return[l*255,l*255,l*255];
  const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;
  const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  return[hue2rgb(p,q,h+1/3)*255,hue2rgb(p,q,h)*255,hue2rgb(p,q,h-1/3)*255];
}


// ─── Exposure ─────────────────────────────────────────────────────────────────
export function applyExposure(imageData, exposure=0, offset=0, gamma=1) {
  const d = imageData.data;
  const exp = Math.pow(2, exposure);
  for (let i=0; i<d.length; i+=4) {
    for (let c=0; c<3; c++) {
      let v = (d[i+c]/255) * exp + offset;
      v = Math.pow(Math.max(0,v), 1/gamma);
      d[i+c] = Math.min(255, Math.max(0, v*255));
    }
  }
  return imageData;
}

// ─── Photo Filters ────────────────────────────────────────────────────────────
export function applyPhotoFilter(imageData, filterType='warming', density=0.25) {
  const FILTERS = {
    warming:   [255, 138, 0],
    cooling:   [0,   138, 255],
    sepia:     [112, 66,  20],
    magenta:   [255, 0,   255],
    green:     [0,   255, 0],
    red:       [255, 0,   0],
  };
  const [fr,fg,fb] = FILTERS[filterType] || FILTERS.warming;
  const d = imageData.data;
  for (let i=0; i<d.length; i+=4) {
    d[i]   = Math.min(255, d[i]   + (fr - d[i])   * density);
    d[i+1] = Math.min(255, d[i+1] + (fg - d[i+1]) * density);
    d[i+2] = Math.min(255, d[i+2] + (fb - d[i+2]) * density);
  }
  return imageData;
}

// ─── Dodge (lighten) ─────────────────────────────────────────────────────────
export function applyDodge(imageData, x, y, radius, strength=0.3, W) {
  const d = imageData.data;
  for (let py=Math.max(0,y-radius); py<Math.min(imageData.height||9999,y+radius); py++) {
    for (let px=Math.max(0,x-radius); px<Math.min(W,x+radius); px++) {
      const dist = Math.sqrt((px-x)**2+(py-y)**2);
      if (dist > radius) continue;
      const falloff = (1 - dist/radius) * strength;
      const idx = (py*W+px)*4;
      for (let c=0; c<3; c++)
        d[idx+c] = Math.min(255, d[idx+c] + (255-d[idx+c]) * falloff);
    }
  }
  return imageData;
}

// ─── Burn (darken) ───────────────────────────────────────────────────────────
export function applyBurn(imageData, x, y, radius, strength=0.3, W) {
  const d = imageData.data;
  for (let py=Math.max(0,y-radius); py<Math.min(imageData.height||9999,y+radius); py++) {
    for (let px=Math.max(0,x-radius); px<Math.min(W,x+radius); px++) {
      const dist = Math.sqrt((px-x)**2+(py-y)**2);
      if (dist > radius) continue;
      const falloff = (1 - dist/radius) * strength;
      const idx = (py*W+px)*4;
      for (let c=0; c<3; c++)
        d[idx+c] = Math.max(0, d[idx+c] - d[idx+c] * falloff);
    }
  }
  return imageData;
}

// ─── Smudge ──────────────────────────────────────────────────────────────────
export function applySmudge(imageData, x, y, dx, dy, radius, strength=0.5, W) {
  const d = imageData.data;
  const src = new Uint8ClampedArray(d);
  for (let py=Math.max(0,y-radius); py<y+radius; py++) {
    for (let px=Math.max(0,x-radius); px<x+radius; px++) {
      const dist = Math.sqrt((px-x)**2+(py-y)**2);
      if (dist > radius) continue;
      const falloff = (1 - dist/radius) * strength;
      const sx = Math.min(W-1, Math.max(0, px-Math.round(dx*falloff)));
      const sy = Math.max(0, py-Math.round(dy*falloff));
      const dstIdx = (py*W+px)*4;
      const srcIdx = (sy*W+sx)*4;
      for (let c=0; c<4; c++)
        d[dstIdx+c] = src[dstIdx+c]*(1-falloff) + src[srcIdx+c]*falloff;
    }
  }
  return imageData;
}

// ─── Clone Stamp ─────────────────────────────────────────────────────────────
export function applyCloneStamp(imageData, srcX, srcY, dstX, dstY, radius, W) {
  const d = imageData.data;
  const src = new Uint8ClampedArray(d);
  for (let py=-radius; py<=radius; py++) {
    for (let px=-radius; px<=radius; px++) {
      if (px**2+py**2 > radius**2) continue;
      const sx = srcX+px, sy = srcY+py;
      const dx2 = dstX+px, dy2 = dstY+py;
      if (sx<0||sy<0||dx2<0||dy2<0) continue;
      const srcIdx = (sy*W+sx)*4;
      const dstIdx = (dy2*W+dx2)*4;
      for (let c=0; c<4; c++) d[dstIdx+c] = src[srcIdx+c];
    }
  }
  return imageData;
}

// ─── Healing (simple average-based) ─────────────────────────────────────────
export function applyHealing(imageData, x, y, radius, W, H) {
  const d = imageData.data;
  // Sample surrounding area average
  const margin = Math.floor(radius * 1.5);
  let rSum=0,gSum=0,bSum=0,count=0;
  for (let py=Math.max(0,y-margin); py<Math.min(H,y+margin); py++) {
    for (let px=Math.max(0,x-margin); px<Math.min(W,x+margin); px++) {
      const dist = Math.sqrt((px-x)**2+(py-y)**2);
      if (dist <= radius) continue; // skip center, use surroundings
      if (dist > margin) continue;
      const idx = (py*W+px)*4;
      rSum+=d[idx]; gSum+=d[idx+1]; bSum+=d[idx+2]; count++;
    }
  }
  if (!count) return imageData;
  const rAvg=rSum/count, gAvg=gSum/count, bAvg=bSum/count;
  for (let py=Math.max(0,y-radius); py<Math.min(H,y+radius); py++) {
    for (let px=Math.max(0,x-radius); px<Math.min(W,x+radius); px++) {
      const dist = Math.sqrt((px-x)**2+(py-y)**2);
      if (dist > radius) continue;
      const falloff = 1 - dist/radius;
      const idx = (py*W+px)*4;
      d[idx]   = d[idx]   * (1-falloff) + rAvg * falloff;
      d[idx+1] = d[idx+1] * (1-falloff) + gAvg * falloff;
      d[idx+2] = d[idx+2] * (1-falloff) + bAvg * falloff;
    }
  }
  return imageData;
}

// ─── Layer Mask (apply alpha mask from grayscale data) ───────────────────────
export function applyLayerMask(imageData, maskData) {
  const d = imageData.data;
  const m = maskData.data;
  for (let i=0; i<d.length; i+=4) {
    const maskAlpha = (m[i]*0.299 + m[i+1]*0.587 + m[i+2]*0.114) / 255;
    d[i+3] = Math.round(d[i+3] * maskAlpha);
  }
  return imageData;
}

export default { applyBrightnessContrast, applyHueSaturation, applyLevels, applyCurves,
  applyColorBalance, applyVibrance, applySharpening, applyNoiseReduction };
