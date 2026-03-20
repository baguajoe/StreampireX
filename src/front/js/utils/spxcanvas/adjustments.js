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

export default { applyBrightnessContrast, applyHueSaturation, applyLevels, applyCurves,
  applyColorBalance, applyVibrance, applySharpening, applyNoiseReduction };
