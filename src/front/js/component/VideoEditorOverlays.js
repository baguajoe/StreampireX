// =============================================================================
// VideoEditorOverlays.js — Text, Captions, Stickers, Watermark, PIP, Templates
// =============================================================================
// Location: src/front/js/component/VideoEditorOverlays.js
// =============================================================================

import React from 'react';
import { EASING, interpolateKeyframes, keyframesToCSS, TEXT_PRESETS, LOWER_THIRD_TEMPLATES } from './VideoEditorMotion';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TEXT OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════

export const createTextOverlay = ({
  text='Title', subtitle='', x=50, y=80, fontSize=24, fontFamily='Inter',
  fontWeight=700, color='#ffffff', background='transparent', textAlign='center',
  animation='fade_in', lowerThird=null, startTime=0, duration=5,
  shadow=true, outline=false, outlineColor='#000000', outlineWidth=2,
}={}) => ({
  id: `txt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type:'text', text, subtitle, x, y, fontSize, fontFamily, fontWeight, color,
  background, textAlign, animation, lowerThird, startTime, duration,
  shadow, outline, outlineColor, outlineWidth, keyframes:[],
});

export const TextOverlayRenderer = ({ overlay, currentTime }) => {
  if (!overlay || currentTime < overlay.startTime || currentTime > overlay.startTime + overlay.duration) return null;
  const elapsed = currentTime - overlay.startTime;
  const preset = TEXT_PRESETS.find(p => p.id === overlay.animation);
  const lt = overlay.lowerThird ? LOWER_THIRD_TEMPLATES.find(t => t.id === overlay.lowerThird) : null;

  let animStyle = {};
  if (preset) {
    const values = {};
    for (const anim of preset.enter) {
      if (elapsed < anim.duration) {
        const progress = elapsed / anim.duration;
        const easingFn = EASING[anim.easing] || EASING.linear;
        values[anim.property] = anim.from + (anim.to - anim.from) * easingFn(progress);
      } else {
        values[anim.property] = anim.to;
      }
    }
    animStyle = keyframesToCSS(values);
  }
  if (overlay.keyframes?.length > 0) {
    const kfStyle = keyframesToCSS(interpolateKeyframes(overlay.keyframes, elapsed));
    animStyle = { ...animStyle, ...kfStyle };
  }
  const remaining = overlay.duration - elapsed;
  if (remaining < 0.5) animStyle.opacity = (animStyle.opacity ?? 1) * (remaining / 0.5);

  const baseStyle = {
    position:'absolute', left:`${overlay.x}%`, top:`${overlay.y}%`,
    transform: `translate(-50%,-50%) ${animStyle.transform||''}`,
    fontSize:overlay.fontSize, fontFamily:overlay.fontFamily, fontWeight:overlay.fontWeight,
    color:overlay.color, textAlign:overlay.textAlign, whiteSpace:'nowrap', pointerEvents:'none',
    textShadow: overlay.shadow ? '0 2px 8px rgba(0,0,0,0.6)' : 'none',
    WebkitTextStroke: overlay.outline ? `${overlay.outlineWidth}px ${overlay.outlineColor}` : 'none',
    ...animStyle,
  };

  if (lt) return (
    <div style={{...baseStyle,...lt.style}}>
      <div style={lt.nameStyle}>{overlay.text}</div>
      {overlay.subtitle && <div style={lt.titleStyle}>{overlay.subtitle}</div>}
    </div>
  );

  return (
    <div style={baseStyle}>
      <div>{overlay.text}</div>
      {overlay.subtitle && <div style={{fontSize:overlay.fontSize*0.5,color:`${overlay.color}aa`,marginTop:4}}>{overlay.subtitle}</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ANIMATED CAPTIONS (CapCut-style word-by-word)
// ═══════════════════════════════════════════════════════════════════════════════

export const CAPTION_STYLES = [
  { id:'default', name:'Default', wordStyle:{color:'#fff',fontWeight:700}, activeStyle:{color:'#00ffc8'} },
  { id:'highlight', name:'Highlight', wordStyle:{color:'#fff'}, activeStyle:{color:'#000',background:'#00ffc8',padding:'2px 6px',borderRadius:4} },
  { id:'bounce', name:'Bounce', wordStyle:{color:'#fff'}, activeStyle:{color:'#ffcc00',transform:'scale(1.3) translateY(-4px)',display:'inline-block'} },
  { id:'glow', name:'Glow', wordStyle:{color:'#fff'}, activeStyle:{color:'#00ffc8',textShadow:'0 0 10px #00ffc8, 0 0 20px #00ffc888'} },
  { id:'underline', name:'Underline', wordStyle:{color:'#fff'}, activeStyle:{color:'#ff9500',borderBottom:'3px solid #ff9500'} },
  { id:'karaoke', name:'Karaoke', wordStyle:{color:'#ffffff60'}, activeStyle:{color:'#fff'} },
  { id:'pop', name:'Pop', wordStyle:{color:'#fff',transform:'scale(1)'}, activeStyle:{color:'#ff3b30',transform:'scale(1.5)',display:'inline-block',transition:'all 0.1s'} },
  { id:'neon', name:'Neon', wordStyle:{color:'#fff'}, activeStyle:{color:'#ff2d55',textShadow:'0 0 5px #ff2d55, 0 0 10px #ff2d55, 0 0 20px #ff2d55'} },
  { id:'shadow_pop', name:'Shadow Pop', wordStyle:{color:'#fff'}, activeStyle:{color:'#fff',textShadow:'4px 4px 0 #00ffc8',transform:'scale(1.1)',display:'inline-block'} },
  { id:'gradient_fill', name:'Gradient', wordStyle:{color:'#aaa'}, activeStyle:{background:'linear-gradient(90deg,#00ffc8,#007aff)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'} },
];

export const createCaptionSegment = ({ words=[], style='default', fontSize=28, position='bottom', startTime=0 }) => ({
  id: `cap_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type:'caption', words, style, fontSize, position, startTime,
  duration: words.length > 0 ? words[words.length-1].end - words[0].start : 0,
});

export const CaptionRenderer = ({ segment, currentTime }) => {
  if (!segment?.words?.length) return null;
  const style = CAPTION_STYLES.find(s => s.id === segment.style) || CAPTION_STYLES[0];
  const posY = segment.position==='top'?'10%':segment.position==='center'?'50%':'85%';
  const segStart = segment.startTime + (segment.words[0]?.start||0);
  const segEnd = segment.startTime + (segment.words[segment.words.length-1]?.end||0);
  if (currentTime < segStart || currentTime > segEnd + 0.5) return null;

  return (
    <div style={{position:'absolute',left:'50%',top:posY,transform:'translate(-50%,-50%)',fontSize:segment.fontSize,fontFamily:"'Inter',sans-serif",fontWeight:700,textAlign:'center',maxWidth:'80%',lineHeight:1.4,textShadow:'0 2px 8px rgba(0,0,0,0.8)',pointerEvents:'none'}}>
      {segment.words.map((word,i) => {
        const wt = segment.startTime + word.start, we = segment.startTime + word.end;
        const isActive = currentTime >= wt && currentTime <= we;
        const isPast = currentTime > we;
        return (
          <span key={i} style={{...(style.wordStyle||{}), ...(isActive?(style.activeStyle||{}):(isPast?{opacity:0.7}:{})), marginRight:6, transition:'all 0.1s ease', display:'inline-block'}}>
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STICKERS & ANNOTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const STICKER_LIBRARY = [
  // Emojis
  {id:'fire',category:'emoji',content:'🔥',label:'Fire'},
  {id:'heart',category:'emoji',content:'❤️',label:'Heart'},
  {id:'star',category:'emoji',content:'⭐',label:'Star'},
  {id:'thumbsup',category:'emoji',content:'👍',label:'Thumbs Up'},
  {id:'clap',category:'emoji',content:'👏',label:'Clap'},
  {id:'eyes',category:'emoji',content:'👀',label:'Eyes'},
  {id:'rocket',category:'emoji',content:'🚀',label:'Rocket'},
  {id:'sparkle',category:'emoji',content:'✨',label:'Sparkle'},
  {id:'check',category:'emoji',content:'✅',label:'Check'},
  {id:'cross',category:'emoji',content:'❌',label:'Cross'},
  {id:'trophy',category:'emoji',content:'🏆',label:'Trophy'},
  {id:'money',category:'emoji',content:'💰',label:'Money'},
  {id:'mic',category:'emoji',content:'🎤',label:'Mic'},
  {id:'headphones',category:'emoji',content:'🎧',label:'Headphones'},
  {id:'camera',category:'emoji',content:'📸',label:'Camera'},
  {id:'100',category:'emoji',content:'💯',label:'100'},
  // Shapes
  {id:'arrow_right',category:'shape',content:'→',label:'Arrow Right',fontSize:48},
  {id:'arrow_left',category:'shape',content:'←',label:'Arrow Left',fontSize:48},
  {id:'arrow_up',category:'shape',content:'↑',label:'Arrow Up',fontSize:48},
  {id:'arrow_down',category:'shape',content:'↓',label:'Arrow Down',fontSize:48},
  {id:'circle',category:'shape',content:'●',label:'Circle',fontSize:60},
  {id:'square',category:'shape',content:'■',label:'Square',fontSize:50},
  {id:'diamond',category:'shape',content:'◆',label:'Diamond',fontSize:50},
  // Annotations
  {id:'subscribe',category:'annotation',content:'SUBSCRIBE',label:'Subscribe',isText:true,style:{background:'#ff0000',color:'#fff',padding:'6px 16px',borderRadius:4,fontWeight:800,fontSize:16}},
  {id:'like',category:'annotation',content:'👍 LIKE',label:'Like',isText:true,style:{background:'#007aff',color:'#fff',padding:'6px 16px',borderRadius:4,fontWeight:700,fontSize:14}},
  {id:'follow',category:'annotation',content:'FOLLOW',label:'Follow',isText:true,style:{background:'#af52de',color:'#fff',padding:'6px 16px',borderRadius:4,fontWeight:700,fontSize:14}},
  {id:'link_bio',category:'annotation',content:'🔗 Link in Bio',label:'Link',isText:true,style:{background:'#21262d',color:'#fff',padding:'6px 12px',borderRadius:20,fontSize:13,border:'1px solid #30363d'}},
  {id:'new_badge',category:'annotation',content:'NEW',label:'New',isText:true,style:{background:'#ff3b30',color:'#fff',padding:'4px 10px',borderRadius:4,fontWeight:900,fontSize:12,letterSpacing:1}},
  {id:'sale_badge',category:'annotation',content:'SALE',label:'Sale',isText:true,style:{background:'#ff9500',color:'#000',padding:'4px 10px',borderRadius:4,fontWeight:900,fontSize:14}},
  {id:'swipe_up',category:'annotation',content:'↑ SWIPE UP',label:'Swipe Up',isText:true,style:{background:'transparent',color:'#fff',padding:'6px 12px',borderBottom:'2px solid #fff',fontSize:13,fontWeight:600}},
];

export const createStickerOverlay = ({ stickerId, x=50, y=50, scale=1, rotation=0, startTime=0, duration=5, animation='bounce_in' }) => {
  const sticker = STICKER_LIBRARY.find(s => s.id === stickerId);
  return {
    id:`stk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    type:'sticker', stickerId, content:sticker?.content||'⭐', style:sticker?.style||null,
    isText:sticker?.isText||false, x, y, scale, rotation, startTime, duration, animation, keyframes:[],
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. WATERMARK
// ═══════════════════════════════════════════════════════════════════════════════

export const WATERMARK_POSITIONS = {
  'top-left':{x:5,y:5},'top-center':{x:50,y:5},'top-right':{x:95,y:5},
  'center':{x:50,y:50},
  'bottom-left':{x:5,y:95},'bottom-center':{x:50,y:95},'bottom-right':{x:95,y:95},
};

export const createWatermark = ({ text='StreamPireX', imageUrl=null, position='bottom-right', opacity=0.5, fontSize=14, color='#ffffff', scale=1, rotation=0 }={}) => ({
  id:`wm_${Date.now()}`, type:'watermark', text, imageUrl, position, opacity, fontSize, color, scale, rotation,
});

export const WatermarkRenderer = ({ watermark }) => {
  if (!watermark) return null;
  const pos = WATERMARK_POSITIONS[watermark.position] || WATERMARK_POSITIONS['bottom-right'];
  return (
    <div style={{position:'absolute',left:`${pos.x}%`,top:`${pos.y}%`,transform:`translate(-50%,-50%) scale(${watermark.scale}) rotate(${watermark.rotation}deg)`,opacity:watermark.opacity,pointerEvents:'none',zIndex:1000}}>
      {watermark.imageUrl
        ? <img src={watermark.imageUrl} alt="watermark" style={{maxHeight:40,maxWidth:120}} />
        : <span style={{fontSize:watermark.fontSize,color:watermark.color,fontWeight:600,fontFamily:"'Inter',sans-serif",textShadow:'0 1px 4px rgba(0,0,0,0.5)'}}>{watermark.text}</span>
      }
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PICTURE-IN-PICTURE
// ═══════════════════════════════════════════════════════════════════════════════

export const PIP_POSITIONS = {
  'top-left':{x:5,y:5},'top-right':{x:95,y:5},
  'bottom-left':{x:5,y:95},'bottom-right':{x:95,y:95},
  'center':{x:50,y:50},
};
export const PIP_SHAPES = ['rectangle','circle','rounded'];

export const createPIP = ({ clipId=null, position='bottom-right', width=25, shape='rounded', borderWidth=2, borderColor='#00ffc8', shadow=true, startTime=0, duration=10 }={}) => ({
  id:`pip_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type:'pip', clipId, position, width, shape, borderWidth, borderColor, shadow, startTime, duration, keyframes:[],
});

export const PIPRenderer = ({ pip, children }) => {
  if (!pip) return null;
  const pos = PIP_POSITIONS[pip.position] || PIP_POSITIONS['bottom-right'];
  const borderRadius = pip.shape==='circle'?'50%':pip.shape==='rounded'?'12px':'0';
  return (
    <div style={{
      position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`,
      transform:`translate(${pos.x>50?'-100%':'0'},${pos.y>50?'-100%':'0'})`,
      width:`${pip.width}%`, aspectRatio:'16/9', overflow:'hidden',
      borderRadius, border:`${pip.borderWidth}px solid ${pip.borderColor}`,
      boxShadow: pip.shadow ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
      zIndex:100,
    }}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SOCIAL MEDIA TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const SOCIAL_TEMPLATES = [
  {
    id:'yt_intro', name:'YouTube Intro', platform:'YouTube', aspectRatio:'16:9', duration:5,
    layers:[
      {type:'text',text:'YOUR CHANNEL NAME',x:50,y:40,fontSize:48,fontWeight:900,color:'#fff',animation:'bounce_in'},
      {type:'text',text:'Subscribe & Hit the Bell 🔔',x:50,y:60,fontSize:20,color:'#ff0000',animation:'slide_up'},
    ],
  },
  {
    id:'yt_outro', name:'YouTube Outro', platform:'YouTube', aspectRatio:'16:9', duration:10,
    layers:[
      {type:'text',text:'Thanks for Watching!',x:50,y:30,fontSize:42,fontWeight:800,color:'#fff',animation:'fade_in'},
      {type:'sticker',stickerId:'subscribe',x:50,y:55},
      {type:'text',text:'More Videos →',x:75,y:75,fontSize:18,color:'#00ffc8',animation:'slide_left'},
    ],
  },
  {
    id:'tiktok_hook', name:'TikTok Hook', platform:'TikTok', aspectRatio:'9:16', duration:3,
    layers:[
      {type:'text',text:'WAIT FOR IT...',x:50,y:30,fontSize:36,fontWeight:900,color:'#fff',animation:'bounce_in'},
      {type:'sticker',stickerId:'eyes',x:50,y:50,scale:3},
    ],
  },
  {
    id:'ig_story', name:'Instagram Story', platform:'Instagram', aspectRatio:'9:16', duration:5,
    layers:[
      {type:'text',text:'New Post!',x:50,y:25,fontSize:32,fontWeight:800,color:'#fff',animation:'zoom_in'},
      {type:'sticker',stickerId:'fire',x:70,y:25,scale:2},
      {type:'sticker',stickerId:'swipe_up',x:50,y:90},
    ],
  },
  {
    id:'podcast_intro', name:'Podcast Intro', platform:'Podcast', aspectRatio:'16:9', duration:5,
    layers:[
      {type:'text',text:'PODCAST NAME',x:50,y:35,fontSize:40,fontWeight:900,color:'#fff',animation:'fade_in',lowerThird:null},
      {type:'text',text:'Episode 1: Topic Here',x:50,y:50,fontSize:18,color:'#00ffc8',animation:'slide_up'},
      {type:'sticker',stickerId:'mic',x:50,y:70,scale:2},
    ],
  },
  {
    id:'product_promo', name:'Product Promo', platform:'Any', aspectRatio:'1:1', duration:8,
    layers:[
      {type:'text',text:'NEW PRODUCT',x:50,y:20,fontSize:36,fontWeight:900,color:'#fff',animation:'zoom_in'},
      {type:'sticker',stickerId:'sale_badge',x:80,y:15},
      {type:'text',text:'Shop Now →',x:50,y:80,fontSize:20,color:'#00ffc8',animation:'slide_up'},
    ],
  },
  {
    id:'music_promo', name:'Music Release', platform:'Any', aspectRatio:'1:1', duration:6,
    layers:[
      {type:'text',text:'OUT NOW',x:50,y:25,fontSize:42,fontWeight:900,color:'#fff',animation:'bounce_in'},
      {type:'text',text:'Artist — Song Title',x:50,y:45,fontSize:18,color:'#00ffc8',animation:'fade_in'},
      {type:'sticker',stickerId:'headphones',x:50,y:65,scale:2.5},
      {type:'text',text:'Stream everywhere 🎵',x:50,y:85,fontSize:14,color:'#aaa',animation:'slide_up'},
    ],
  },
  {
    id:'lower_third_name', name:'Name Lower Third', platform:'Any', aspectRatio:'16:9', duration:5,
    layers:[
      {type:'text',text:'John Smith',subtitle:'Creative Director',x:15,y:85,fontSize:24,lowerThird:'clean',animation:'slide_right'},
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ANIMATED MASKS (SVG Path Masking with Keyframes)
// ═══════════════════════════════════════════════════════════════════════════════

export const MASK_SHAPES = [
  { id:'rectangle', name:'Rectangle', build:(x=0,y=0,w=100,h=100)=>`M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z` },
  { id:'ellipse', name:'Ellipse', build:(cx=50,cy=50,rx=50,ry=50)=>{
    return `M${cx-rx},${cy} A${rx},${ry} 0 1,0 ${cx+rx},${cy} A${rx},${ry} 0 1,0 ${cx-rx},${cy} Z`;
  }},
  { id:'triangle', name:'Triangle', build:(cx=50,cy=0,w=100,h=100)=>`M${cx},${cy} L${cx+w/2},${cy+h} L${cx-w/2},${cy+h} Z` },
  { id:'star', name:'Star', build:(cx=50,cy=50,r=50,points=5)=>{
    let d='';
    for(let i=0;i<points*2;i++){
      const a=(Math.PI*2*i)/(points*2)-Math.PI/2;
      const rad=i%2===0?r:r*0.4;
      d+=(i===0?'M':'L')+(cx+Math.cos(a)*rad)+','+(cy+Math.sin(a)*rad);
    }
    return d+'Z';
  }},
  { id:'diamond', name:'Diamond', build:(cx=50,cy=50,w=50,h=70)=>`M${cx},${cy-h} L${cx+w},${cy} L${cx},${cy+h} L${cx-w},${cy} Z` },
  { id:'heart', name:'Heart', build:(cx=50,cy=50,s=40)=>{
    return `M${cx},${cy+s*0.6} C${cx-s*0.8},${cy-s*0.2} ${cx-s*0.5},${cy-s*0.8} ${cx},${cy-s*0.3} C${cx+s*0.5},${cy-s*0.8} ${cx+s*0.8},${cy-s*0.2} ${cx},${cy+s*0.6} Z`;
  }},
];

/**
 * Create an animated mask
 */
export const createAnimatedMask = ({
  shape = 'rectangle',
  path = null, // custom SVG path string, or null to use shape
  x = 0, y = 0, width = 100, height = 100,
  feather = 0, // edge softness in px
  invert = false,
  expansion = 0, // grow/shrink mask
  opacity = 1,
  startTime = 0,
  duration = 10,
} = {}) => ({
  id: `mask_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type: 'animated_mask',
  shape,
  path: path || MASK_SHAPES.find(s=>s.id===shape)?.build(x,y,width,height) || '',
  x, y, width, height,
  feather, invert, expansion, opacity,
  startTime, duration,
  keyframes: [], // [{time, path, x, y, width, height, feather, opacity}]
});

/**
 * Interpolate mask keyframes at a given time.
 * For path morphing, we interpolate individual path numbers.
 */
export const interpolateMaskPath = (path1, path2, t) => {
  // Extract all numbers from both paths
  const nums1 = path1.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  const nums2 = path2.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  const letters1 = path1.match(/[A-Za-z]/g) || [];

  if (nums1.length !== nums2.length) return t < 0.5 ? path1 : path2;

  // Interpolate numbers
  const interp = nums1.map((n, i) => n + (nums2[i] - n) * t);

  // Reconstruct path
  let result = '', numIdx = 0;
  for (let i = 0; i < path1.length; i++) {
    if (/[A-Za-z]/.test(path1[i])) {
      result += path1[i];
    } else if (/[-\d.]/.test(path1[i])) {
      // Find the full number
      const match = path1.slice(i).match(/^-?\d+\.?\d*/);
      if (match) {
        result += interp[numIdx]?.toFixed(1) ?? match[0];
        numIdx++;
        i += match[0].length - 1;
      }
    } else {
      result += path1[i];
    }
  }
  return result;
};

/**
 * Evaluate mask at time → returns CSS clip-path + filter
 */
export const evaluateMask = (mask, currentTime) => {
  if (!mask || currentTime < mask.startTime || currentTime > mask.startTime + mask.duration) return null;

  const elapsed = currentTime - mask.startTime;
  let currentPath = mask.path;
  let currentFeather = mask.feather;
  let currentOpacity = mask.opacity;
  let currentX = mask.x, currentY = mask.y;

  // Apply keyframes
  if (mask.keyframes && mask.keyframes.length > 0) {
    const sorted = [...mask.keyframes].sort((a,b) => a.time - b.time);

    for (let i = 0; i < sorted.length - 1; i++) {
      if (elapsed >= sorted[i].time && elapsed <= sorted[i+1].time) {
        const t = (elapsed - sorted[i].time) / (sorted[i+1].time - sorted[i].time);
        if (sorted[i].path && sorted[i+1].path) {
          currentPath = interpolateMaskPath(sorted[i].path, sorted[i+1].path, t);
        }
        if (sorted[i].feather !== undefined) currentFeather = sorted[i].feather + (sorted[i+1].feather - sorted[i].feather) * t;
        if (sorted[i].opacity !== undefined) currentOpacity = sorted[i].opacity + (sorted[i+1].opacity - sorted[i].opacity) * t;
        if (sorted[i].x !== undefined) currentX = sorted[i].x + (sorted[i+1].x - sorted[i].x) * t;
        if (sorted[i].y !== undefined) currentY = sorted[i].y + (sorted[i+1].y - sorted[i].y) * t;
        break;
      }
    }
  }

  // Build SVG clip-path URL or CSS
  return {
    clipPath: `path('${currentPath}')`,
    filter: currentFeather > 0 ? `blur(${currentFeather}px)` : 'none',
    opacity: currentOpacity,
    transform: `translate(${currentX}px, ${currentY}px)`,
    WebkitClipPath: `path('${currentPath}')`,
  };
};

// ── Mask Renderer Component ──
export const MaskRenderer = ({ mask, currentTime, children }) => {
  if (!mask) return children || null;
  const styles = evaluateMask(mask, currentTime);
  if (!styles) return children || null;

  return React.createElement('div', {
    style: {
      position: 'relative',
      width: '100%',
      height: '100%',
      ...styles,
    }
  }, children);
};

// ── Mask Transition Presets ──
export const MASK_TRANSITIONS = [
  { id:'circle_reveal', name:'Circle Reveal', build:(cx=50,cy=50,duration=1)=>({
    shape:'ellipse', startTime:0, duration,
    keyframes:[
      {time:0, path:MASK_SHAPES[1].build(cx,cy,0,0)},
      {time:duration, path:MASK_SHAPES[1].build(cx,cy,120,120)},
    ],
  })},
  { id:'wipe_left', name:'Wipe Left', build:(w=100,h=100,duration=1)=>({
    shape:'rectangle', startTime:0, duration,
    keyframes:[
      {time:0, path:`M0,0 L0,0 L0,${h} L0,${h} Z`},
      {time:duration, path:`M0,0 L${w},0 L${w},${h} L0,${h} Z`},
    ],
  })},
  { id:'wipe_down', name:'Wipe Down', build:(w=100,h=100,duration=1)=>({
    shape:'rectangle', startTime:0, duration,
    keyframes:[
      {time:0, path:`M0,0 L${w},0 L${w},0 L0,0 Z`},
      {time:duration, path:`M0,0 L${w},0 L${w},${h} L0,${h} Z`},
    ],
  })},
  { id:'star_reveal', name:'Star Reveal', build:(cx=50,cy=50,duration=1)=>({
    shape:'star', startTime:0, duration,
    keyframes:[
      {time:0, path:MASK_SHAPES[3].build(cx,cy,0,5)},
      {time:duration, path:MASK_SHAPES[3].build(cx,cy,120,5)},
    ],
  })},
];

export default {
  createTextOverlay, TextOverlayRenderer,
  CAPTION_STYLES, createCaptionSegment, CaptionRenderer,
  STICKER_LIBRARY, createStickerOverlay,
  createWatermark, WatermarkRenderer, WATERMARK_POSITIONS,
  createPIP, PIPRenderer, PIP_POSITIONS, PIP_SHAPES,
  SOCIAL_TEMPLATES,
  // Animated Masks
  MASK_SHAPES, createAnimatedMask, interpolateMaskPath, evaluateMask,
  MaskRenderer, MASK_TRANSITIONS,
};