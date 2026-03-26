import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader  } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader  } from 'three/examples/jsm/loaders/FBXLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';







// ─── Spline Gap constants ─────────────────────────────────────────────────────
const INTERACTION_TRIGGERS = [
  {id:'hover_spin',    label:'Spin on Hover',     event:'hover',  action:'rotate',   params:{y:360, duration:1}},
  {id:'hover_scale',   label:'Scale on Hover',    event:'hover',  action:'scale',    params:{to:1.2, duration:0.3}},
  {id:'hover_glow',    label:'Glow on Hover',     event:'hover',  action:'emissive', params:{color:'#00ffc8', intensity:2}},
  {id:'click_spin',    label:'Spin on Click',     event:'click',  action:'rotate',   params:{y:360, duration:0.8}},
  {id:'click_bounce',  label:'Bounce on Click',   event:'click',  action:'bounce',   params:{height:1, duration:0.5}},
  {id:'click_explode', label:'Explode on Click',  event:'click',  action:'explode',  params:{force:3, duration:1}},
  {id:'scroll_rotate', label:'Rotate on Scroll',  event:'scroll', action:'rotate',   params:{axis:'y', speed:0.5}},
  {id:'scroll_float',  label:'Float on Scroll',   event:'scroll', action:'translate',params:{axis:'y', speed:0.3}},
];
const TEXT3D_FONTS = [
  {id:'helvetiker',  label:'Helvetiker',  url:'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json'},
  {id:'optimer',     label:'Optimer',     url:'https://threejs.org/examples/fonts/optimer_regular.typeface.json'},
  {id:'gentilis',    label:'Gentilis',    url:'https://threejs.org/examples/fonts/gentilis_regular.typeface.json'},
  {id:'droid_sans',  label:'Droid Sans',  url:'https://threejs.org/examples/fonts/droid/droid_sans_regular.typeface.json'},
  {id:'droid_serif', label:'Droid Serif', url:'https://threejs.org/examples/fonts/droid/droid_serif_regular.typeface.json'},
];
// ─── Sessions C+D constants ───────────────────────────────────────────────────
const RIGID_BODY_TYPES = [
  {id:'dynamic',    label:'Dynamic',    desc:'Affected by gravity + forces'},
  {id:'fixed',      label:'Fixed',      desc:'Static, never moves'},
  {id:'kinematic',  label:'Kinematic',  desc:'Controlled by animation'},
];
const COLLIDER_SHAPES = [
  {id:'cuboid',   label:'Box'},
  {id:'ball',     label:'Sphere'},
  {id:'capsule',  label:'Capsule'},
  {id:'cylinder', label:'Cylinder'},
  {id:'trimesh',  label:'Trimesh (exact)'},
];
const WEIGHT_COLORS = [
  {w:0.0, color:'#0000ff'},
  {w:0.25,color:'#00ffff'},
  {w:0.5, color:'#00ff00'},
  {w:0.75,color:'#ffff00'},
  {w:1.0, color:'#ff0000'},
];
// ─── Session A+B constants ────────────────────────────────────────────────────
const MATERIAL_PRESETS = [
  {id:'gold',      label:'Gold',      color:'#FFD700', roughness:0.1, metalness:1.0, emissive:'#000'},
  {id:'chrome',    label:'Chrome',    color:'#C0C0C0', roughness:0.05,metalness:1.0, emissive:'#000'},
  {id:'glass',     label:'Glass',     color:'#ffffff', roughness:0.0, metalness:0.0, emissive:'#000', transparent:true, opacity:0.15},
  {id:'concrete',  label:'Concrete',  color:'#888888', roughness:0.95,metalness:0.0, emissive:'#000'},
  {id:'wood',      label:'Wood',      color:'#8B5E3C', roughness:0.8, metalness:0.0, emissive:'#000'},
  {id:'rubber',    label:'Rubber',    color:'#222222', roughness:0.9, metalness:0.0, emissive:'#000'},
  {id:'emissive',  label:'Glow',      color:'#00ffc8', roughness:0.5, metalness:0.0, emissive:'#00ffc8', emissiveIntensity:2},
  {id:'plastic',   label:'Plastic',   color:'#FF6600', roughness:0.4, metalness:0.0, emissive:'#000'},
  {id:'marble',    label:'Marble',    color:'#f0ede8', roughness:0.2, metalness:0.0, emissive:'#000'},
  {id:'obsidian',  label:'Obsidian',  color:'#1a1a2e', roughness:0.05,metalness:0.8, emissive:'#000'},
];

const SHADER_NODE_TYPES = [
  {id:'color',    label:'Color',      color:'#FF6600', inputs:[],                        outputs:['color']},
  {id:'texture',  label:'Texture',    color:'#884400', inputs:[],                        outputs:['color','alpha']},
  {id:'mix',      label:'Mix',        color:'#445566', inputs:['A','B','factor'],         outputs:['result']},
  {id:'fresnel',  label:'Fresnel',    color:'#226688', inputs:['IOR'],                   outputs:['factor']},
  {id:'noise',    label:'Noise',      color:'#334455', inputs:['scale','detail'],         outputs:['color','fac']},
  {id:'math',     label:'Math',       color:'#553344', inputs:['A','B'],                  outputs:['result']},
  {id:'emission', label:'Emission',   color:'#006644', inputs:['color','strength'],       outputs:['shader']},
  {id:'pbr',      label:'PBR',        color:'#445500', inputs:['color','rough','metal'],  outputs:['shader']},
  {id:'output',   label:'Output',     color:'#00ffc8', inputs:['shader'],                outputs:[]},
];
// ─── Sessions 11-14 constants ─────────────────────────────────────────────────
const PARTICLE_PRESETS = [
  {id:'fire',      label:'Fire',      color:'#ff4400', size:0.08, lifetime:1.2, velocity:{x:0,y:2,z:0}, spread:0.8, gravity:-0.5, count:200},
  {id:'smoke',     label:'Smoke',     color:'#888888', size:0.2,  lifetime:3.0, velocity:{x:0,y:0.5,z:0}, spread:0.4, gravity:0.1,  count:150},
  {id:'sparks',    label:'Sparks',    color:'#ffcc00', size:0.04, lifetime:0.8, velocity:{x:0,y:3,z:0}, spread:2.0, gravity:2.0,  count:300},
  {id:'rain',      label:'Rain',      color:'#aaccff', size:0.03, lifetime:1.5, velocity:{x:0,y:-5,z:0}, spread:3.0, gravity:5.0,  count:500},
  {id:'snow',      label:'Snow',      color:'#ffffff', size:0.06, lifetime:4.0, velocity:{x:0,y:-0.5,z:0}, spread:2.0, gravity:0.2, count:300},
  {id:'explosion', label:'Explosion', color:'#ff8800', size:0.1,  lifetime:0.6, velocity:{x:0,y:0,z:0}, spread:5.0, gravity:2.0,  count:400},
  {id:'magic',     label:'Magic',     color:'#00ffc8', size:0.06, lifetime:2.0, velocity:{x:0,y:1,z:0}, spread:1.5, gravity:-0.3, count:200},
];
const POSTFX_EFFECTS = [
  {id:'bloom',     label:'Bloom',              params:{strength:0.5, radius:0.4, threshold:0.8}},
  {id:'dof',       label:'Depth of Field',     params:{focus:5, aperture:0.025, maxBlur:0.01}},
  {id:'chroma',    label:'Chromatic Aberration',params:{offset:0.005}},
  {id:'vignette',  label:'Vignette',           params:{offset:0.5, darkness:0.5}},
  {id:'film',      label:'Film Grain',         params:{noiseIntensity:0.35, scanlinesIntensity:0.025}},
  {id:'glitch',    label:'Glitch',             params:{dtSize:16, col_s:0.05, col_l:0, ratio:0.85}},
  {id:'ssao',      label:'SSAO',               params:{kernelRadius:8, minDistance:0.005, maxDistance:0.1}},
];
const CLOTH_PRESETS = [
  {id:'silk',    label:'Silk',    stiffness:0.01, damping:0.01, mass:0.1},
  {id:'cotton',  label:'Cotton',  stiffness:0.05, damping:0.03, mass:0.3},
  {id:'denim',   label:'Denim',   stiffness:0.15, damping:0.05, mass:0.5},
  {id:'leather', label:'Leather', stiffness:0.3,  damping:0.08, mass:0.8},
  {id:'rubber',  label:'Rubber',  stiffness:0.5,  damping:0.1,  mass:1.0},
];
const RENDER_FORMATS = ['MP4 (H.264)','WebM (VP9)','PNG Sequence','EXR Sequence','GIF'];
// ─── Sessions 8+9+10 constants ────────────────────────────────────────────────
const MODIFIERS = [
  {id:'mirror',      label:'Mirror',      icon:'⬡', params:{axis:'X', merge:true, mergeThreshold:0.001}},
  {id:'array',       label:'Array',       icon:'⊞', params:{count:3, offsetX:1.2, offsetY:0, offsetZ:0}},
  {id:'subdivision', label:'Subdivision', icon:'◈', params:{levels:1, renderLevels:2}},
  {id:'solidify',    label:'Solidify',    icon:'▣', params:{thickness:0.1, offset:-1}},
  {id:'bevel',       label:'Bevel',       icon:'◻', params:{width:0.1, segments:2}},
  {id:'displace',    label:'Displace',    icon:'〜', params:{strength:0.5, midLevel:0.5}},
  {id:'wave',        label:'Wave',        icon:'∿', params:{height:0.5, width:1.5, speed:1}},
];
const SCULPT_BRUSHES = [
  {id:'draw',    label:'Draw',    icon:'✏', strength:0.5, radius:50},
  {id:'smooth',  label:'Smooth',  icon:'◯', strength:0.4, radius:60},
  {id:'grab',    label:'Grab',    icon:'✋', strength:0.8, radius:80},
  {id:'crease',  label:'Crease',  icon:'⌒', strength:0.6, radius:40},
  {id:'flatten', label:'Flatten', icon:'▬', strength:0.5, radius:70},
  {id:'pinch',   label:'Pinch',   icon:'◉', strength:0.5, radius:35},
  {id:'inflate', label:'Inflate', icon:'◎', strength:0.4, radius:55},
  {id:'clay',    label:'Clay',    icon:'◧', strength:0.5, radius:65},
];
const SHAPE_KEY_DEFAULTS = [
  {id:'sk_basis', name:'Basis', value:1.0, muted:false},
];
const RIG_BONES_DEFAULTS = [
  {id:'bone_root', name:'Root',   head:[0,0,0], tail:[0,1,0], parent:null},
  {id:'bone_spine',name:'Spine',  head:[0,1,0], tail:[0,2,0], parent:'bone_root'},
  {id:'bone_head', name:'Head',   head:[0,2,0], tail:[0,2.8,0], parent:'bone_spine'},
  {id:'bone_larm', name:'L.Arm',  head:[0,1.8,0], tail:[-1,1.2,0], parent:'bone_spine'},
  {id:'bone_rarm', name:'R.Arm',  head:[0,1.8,0], tail:[1,1.2,0],  parent:'bone_spine'},
  {id:'bone_lleg', name:'L.Leg',  head:[0,0,0], tail:[-0.4,-1.5,0], parent:'bone_root'},
  {id:'bone_rleg', name:'R.Leg',  head:[0,0,0], tail:[0.4,-1.5,0],  parent:'bone_root'},
];
// ─── Blender Lite — Session 6+7 constants ────────────────────────────────────
const PRIMITIVES = [
  {id:'box',      label:'Box',       icon:'⬜'},
  {id:'sphere',   label:'Sphere',    icon:'⬤'},
  {id:'cylinder', label:'Cylinder',  icon:'⬡'},
  {id:'cone',     label:'Cone',      icon:'▲'},
  {id:'torus',    label:'Torus',     icon:'◎'},
  {id:'plane',    label:'Plane',     icon:'▬'},
  {id:'icosphere',label:'Icosphere', icon:'⬡'},
];
const LIGHT_TYPES = [
  {id:'point',       label:'Point'},
  {id:'directional', label:'Directional'},
  {id:'spot',        label:'Spot'},
  {id:'ambient',     label:'Ambient'},
  {id:'hemisphere',  label:'Hemisphere'},
];
const PBR_DEFAULTS = {
  color:'#888888', roughness:0.5, metalness:0.0,
  emissive:'#000000', emissiveIntensity:0,
  wireframe:false, transparent:false, opacity:1,
};
const CAMERA_MODES = ['perspective','orthographic'];
const ANIM_INTERPS  = ['linear','ease','step'];
import { requestRender } from "../utils/render/renderClient";
import { saveToCloud, listCloudProjects, loadFromCloud, deleteCloudProject } from "../utils/cloudSave";
import { useEditorStore } from "../store/useEditorStore";

const COMP_KEY = "spx_compositor_project";

// ── Shared Menu Bar Component ──
function AppMenuBar({ menus, projectName, setProjectName, rightContent }) {
  return (
    <div className="spx-menu-bar">
      {menus.map(menu => (
        <MenuDropdown key={menu.label} label={menu.label} items={menu.items} />
      ))}
      <input
        className="spx-project-name-input"
        value={projectName || ""}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Untitled Project"
      />
      <div style={{flex:1}}/>
      {rightContent}
    </div>
  );
}

function MenuDropdown({ label, items }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="spx-menu-item" onMouseLeave={() => setOpen(false)}>
      <button className="spx-menu-btn" onMouseEnter={() => setOpen(true)} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <div className="spx-menu-dropdown">
          {items.map((item, i) => item === "---"
            ? <div key={i} style={{height:1,background:"#21262d",margin:"3px 0"}}/>
            : <button key={item.label} className="spx-menu-dropdown-item"
                onClick={() => { item.action(); setOpen(false); }}>
                <span>{item.label}</span>
                {item.shortcut && <span style={{color:"#4e6a82",fontSize:10,marginLeft:"auto"}}>{item.shortcut}</span>}
              </button>
          )}
        </div>
      )}
    </div>
  );
}

import NodeGraph from "../component/compositor/NodeGraph";
import NodeGraphPro from "../component/compositor/NodeGraphPro";
import { evaluateGraph } from "../utils/compositor/nodeEngine";
import { SHADER_NODE_PRESETS } from "../component/nodecompositor/vfx/shaderNodePresets";
import ShaderPreviewCanvas from "../component/nodecompositor/vfx/ShaderPreviewCanvas";
import CompositorTimeline from "../component/compositor/CompositorTimeline";
import "../../styles/NodeCompositor.css";
import "../../styles/MotionStudioPro.css";
import CompositorInspectorPro from "../component/nodecompositor/pro/CompositorInspectorPro";
import CompositorPreviewPro from "../component/nodecompositor/pro/CompositorPreviewPro";
import RotoOverlayEditor from "../component/nodecompositor/pro/RotoOverlayEditor";
import TrackerPanelPro from "../component/nodecompositor/pro/TrackerPanelPro";
import GPUMultiPassPanel from "../component/nodecompositor/pro/GPUMultiPassPanel";
import RenderQueuePanel from "../component/nodecompositor/pro/RenderQueuePanel";
import BackendRenderPanel from "../component/nodecompositor/pro/BackendRenderPanel";
import MediaIngestPanel from "../component/nodecompositor/pro/MediaIngestPanel";
import ColorPipelinePanel from "../component/nodecompositor/pro/ColorPipelinePanel";
import RotoTimelinePanel from "../component/nodecompositor/pro/RotoTimelinePanel";
import DependencyGraphPanel from "../component/nodecompositor/pro/DependencyGraphPanel";
import { createGraphRunner } from "../utils/compositor/engine/graphRunner";
import NodeEnginePanel from "../component/nodecompositor/pro/NodeEnginePanel";

export default function NodeCompositorPage() {
  const init3DScene = React.useCallback(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas || threeRendererRef.current) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    threeRendererRef.current = renderer;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');
    threeSceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 8);
    camera.lookAt(0, 0, 0);
    threeCameraRef.current = camera;
    const grid = new THREE.GridHelper(20, 20, '#21262d', '#21262d');
    scene.add(grid);
    const axes = new THREE.AxesHelper(3);
    scene.add(axes);
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const animate = () => {
      threeRafRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  const destroy3DScene = React.useCallback(() => {
    if (threeRafRef.current) cancelAnimationFrame(threeRafRef.current);
    if (threeRendererRef.current) { threeRendererRef.current.dispose(); threeRendererRef.current = null; }
    threeSceneRef.current = null; threeCameraRef.current = null;
  }, []);

  React.useEffect(() => {
    if (show3D) { setTimeout(init3DScene, 50); }
    else { destroy3DScene(); }
    return () => destroy3DScene();
  }, [show3D]);

  const add3DPrimitive = (type) => {
    const scene = threeSceneRef.current; if (!scene) return;
    let geo;
    if      (type==='box')       geo = new THREE.BoxGeometry(1,1,1);
    else if (type==='sphere')    geo = new THREE.SphereGeometry(0.7,32,32);
    else if (type==='cylinder')  geo = new THREE.CylinderGeometry(0.5,0.5,1.5,32);
    else if (type==='cone')      geo = new THREE.ConeGeometry(0.6,1.5,32);
    else if (type==='torus')     geo = new THREE.TorusGeometry(0.6,0.25,16,64);
    else if (type==='plane')     geo = new THREE.PlaneGeometry(2,2);
    else if (type==='icosphere') geo = new THREE.IcosahedronGeometry(0.7,2);
    else geo = new THREE.BoxGeometry(1,1,1);

    const mat = new THREE.MeshStandardMaterial({color:'#888888', roughness:0.5, metalness:0});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set(0, 0.5, 0);
    scene.add(mesh);

    const id = `obj_${Date.now()}`;
    mesh.userData.id = id;
    threeObjectsRef.current[id] = mesh;

    const obj = {
      id, type, name: type.charAt(0).toUpperCase()+type.slice(1),
      position:{x:0,y:0.5,z:0}, rotation:{x:0,y:0,z:0}, scale:{x:1,y:1,z:1},
      material:{...PBR_DEFAULTS}, keyframes:[], visible:true,
    };
    setScene3DObjects(o => [...o, obj]);
    setSelected3DId(id);
  };

  const update3DObject = (id, changes) => {
    setScene3DObjects(objs => objs.map(o => o.id===id ? {...o,...changes} : o));
    const mesh = threeObjectsRef.current[id];
    if (!mesh) return;
    if (changes.position) mesh.position.set(changes.position.x, changes.position.y, changes.position.z);
    if (changes.rotation) mesh.rotation.set(
      THREE.MathUtils.degToRad(changes.rotation.x),
      THREE.MathUtils.degToRad(changes.rotation.y),
      THREE.MathUtils.degToRad(changes.rotation.z)
    );
    if (changes.scale) mesh.scale.set(changes.scale.x, changes.scale.y, changes.scale.z);
    if (changes.material) {
      const m = mesh.material;
      if (changes.material.color)     m.color.set(changes.material.color);
      if (changes.material.roughness !== undefined) m.roughness = changes.material.roughness;
      if (changes.material.metalness !== undefined) m.metalness = changes.material.metalness;
      if (changes.material.emissive)  m.emissive.set(changes.material.emissive);
      if (changes.material.wireframe !== undefined) m.wireframe = changes.material.wireframe;
      if (changes.material.transparent !== undefined) { m.transparent = changes.material.transparent; m.opacity = changes.material.opacity??1; }
      m.needsUpdate = true;
    }
    if (changes.visible !== undefined) mesh.visible = changes.visible;
  };

  const delete3DObject = (id) => {
    const scene = threeSceneRef.current;
    const mesh = threeObjectsRef.current[id];
    if (mesh && scene) scene.remove(mesh);
    delete threeObjectsRef.current[id];
    setScene3DObjects(o => o.filter(ob => ob.id!==id));
    if (selected3DId===id) setSelected3DId(null);
  };

  const add3DLight = (type) => {
    const scene = threeSceneRef.current; if (!scene) return;
    let light;
    const id = `light_${Date.now()}`;
    if      (type==='point')       light = new THREE.PointLight(0xffffff, 1, 20);
    else if (type==='directional') light = new THREE.DirectionalLight(0xffffff, 1);
    else if (type==='spot')        { light = new THREE.SpotLight(0xffffff, 1); light.angle = Math.PI/6; }
    else if (type==='ambient')     light = new THREE.AmbientLight(0xffffff, 0.5);
    else if (type==='hemisphere')  light = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    if (!light) return;
    light.position.set(3, 5, 3);
    light.castShadow = type !== 'ambient' && type !== 'hemisphere';
    scene.add(light);
    threeObjectsRef.current[id] = light;
    setSceneLights(ls => [...ls, {id, type, color:'#ffffff', intensity:1, x:3, y:5, z:3}]);
  };

  // ── Orbit controls (manual) ────────────────────────────────────────────────
  const onOrbitMouseDown = (e) => { orbitDrag.current = {x:e.clientX, y:e.clientY, ...orbitState}; };
  const onOrbitMouseMove = (e) => {
    if (!orbitDrag.current) return;
    const dx = (e.clientX - orbitDrag.current.x) * 0.01;
    const dy = (e.clientY - orbitDrag.current.y) * 0.01;
    const theta = orbitDrag.current.theta + dx;
    const phi   = Math.max(0.1, Math.min(Math.PI-0.1, orbitDrag.current.phi + dy));
    const {radius} = orbitDrag.current;
    const cam = threeCameraRef.current;
    if (cam) {
      cam.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta),
      );
      cam.lookAt(0,0,0);
    }
    setOrbitState({theta, phi, radius});
  };
  const onOrbitMouseUp = () => { orbitDrag.current = null; };
  const onOrbitWheel   = (e) => {
    const cam = threeCameraRef.current; if (!cam) return;
    const r = Math.max(1, orbitState.radius + e.deltaY * 0.01);
    const {theta,phi} = orbitState;
    cam.position.set(r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.cos(theta));
    cam.lookAt(0,0,0);
    setOrbitState(s=>({...s,radius:r}));
  };

  // ── Keyframe animation (Session 7) ────────────────────────────────────────
  const addKeyframe = (objId, prop, value) => {
    setScene3DObjects(objs => objs.map(o => {
      if (o.id !== objId) return o;
      const kfs = o.keyframes.filter(k => !(k.time===kfTime && k.prop===prop));
      return {...o, keyframes: [...kfs, {time:kfTime, prop, value, interp:'linear'}]};
    }));
  };

  React.useEffect(() => {
    if (!kfPlaying) return;
    const start = performance.now();
    const tick = () => {
      const t = ((performance.now()-start)/1000) % kfDuration;
      setKfTime(t);
      scene3DObjects.forEach(obj => {
        const mesh = threeObjectsRef.current[obj.id]; if (!mesh) return;
        ['position','rotation','scale'].forEach(prop => {
          const kfs = obj.keyframes.filter(k=>k.prop===prop).sort((a,b)=>a.time-b.time);
          if (kfs.length < 2) return;
          let k0 = kfs[0], k1 = kfs[kfs.length-1];
          for (let i=0; i<kfs.length-1; i++) {
            if (kfs[i].time <= t && kfs[i+1].time >= t) { k0=kfs[i]; k1=kfs[i+1]; break; }
          }
          const alpha = k1.time===k0.time ? 0 : (t-k0.time)/(k1.time-k0.time);
          const lerp = (a,b) => a+(b-a)*alpha;
          if (prop==='position') mesh.position.set(lerp(k0.value.x,k1.value.x),lerp(k0.value.y,k1.value.y),lerp(k0.value.z,k1.value.z));
          if (prop==='rotation') mesh.rotation.set(
            THREE.MathUtils.degToRad(lerp(k0.value.x,k1.value.x)),
            THREE.MathUtils.degToRad(lerp(k0.value.y,k1.value.y)),
            THREE.MathUtils.degToRad(lerp(k0.value.z,k1.value.z))
          );
          if (prop==='scale') mesh.scale.set(lerp(k0.value.x,k1.value.x),lerp(k0.value.y,k1.value.y),lerp(k0.value.z,k1.value.z));
        });
      });
      threeRafRef.kfAnim = requestAnimationFrame(tick);
    };
    threeRafRef.kfAnim = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(threeRafRef.kfAnim);
  }, [kfPlaying, scene3DObjects, kfDuration]);


  // ── Modifier system ────────────────────────────────────────────────────────
  const applyModifier = (objId, modId, params) => {
    const scene = threeSceneRef.current;
    const mesh = threeObjectsRef.current[objId];
    if (!scene || !mesh) return;
    if (modId === 'mirror') {
      const clone = mesh.clone();
      clone.scale.x *= -1;
      clone.userData.isMirror = true;
      scene.add(clone);
      threeObjectsRef.current[objId + '_mirror'] = clone;
    }
    if (modId === 'array') {
      for (let i = 1; i < (params.count||3); i++) {
        const clone = mesh.clone();
        clone.position.x += (params.offsetX||1.2) * i;
        clone.position.y += (params.offsetY||0) * i;
        clone.position.z += (params.offsetZ||0) * i;
        clone.userData.isArray = true;
        scene.add(clone);
        threeObjectsRef.current[`${objId}_arr_${i}`] = clone;
      }
    }
    if (modId === 'subdivision') {
      // Visual indicator only — full loop subdivision requires BufferGeometry manipulation
      mesh.material.wireframe = false;
      mesh.material.flatShading = false;
      mesh.material.needsUpdate = true;
    }
    if (modId === 'solidify') {
      const clone = mesh.clone();
      clone.scale.multiplyScalar(1 + (params.thickness||0.1));
      clone.material = mesh.material.clone();
      clone.material.side = THREE.BackSide;
      scene.add(clone);
      threeObjectsRef.current[objId + '_solidify'] = clone;
    }
    if (modId === 'bevel') {
      // Mark for bevel — full edge bevel requires geometry processing
      mesh.userData.bevel = params;
    }
    setScene3DObjects(objs => objs.map(o => o.id === objId
      ? {...o, modifiers: [...(o.modifiers||[]), {id: modId, params, enabled: true}]}
      : o
    ));
  };

  const removeModifier = (objId, modId) => {
    setScene3DObjects(objs => objs.map(o => o.id === objId
      ? {...o, modifiers: (o.modifiers||[]).filter(m => m.id !== modId)}
      : o
    ));
  };

  // ── Shape keys ─────────────────────────────────────────────────────────────
  const addShapeKey = () => {
    const name = `Key ${shapeKeys.length}`;
    const id = `sk_${Date.now()}`;
    setShapeKeys(ks => [...ks, {id, name, value:0, muted:false}]);
  };

  const updateShapeKey = (id, changes) => {
    setShapeKeys(ks => ks.map(k => k.id===id ? {...k,...changes} : k));
    // Morph targets would go here with actual geometry morphing
    const mesh = threeObjectsRef.current[selected3DId];
    if (mesh && changes.value !== undefined) {
      // Simulate morph: scale slightly based on shape key value
      if (id !== 'sk_basis') mesh.scale.y = 1 + changes.value * 0.1;
    }
  };

  // ── Sculpt brush painting ──────────────────────────────────────────────────
  const onSculptMouseDown = (e) => {
    if (activeMode !== 'sculpt') return;
    sculptPainting.current = true;
    applyBrushStroke(e);
  };
  const onSculptMouseMove = (e) => {
    if (!sculptPainting.current || activeMode !== 'sculpt') return;
    applyBrushStroke(e);
  };
  const onSculptMouseUp = () => { sculptPainting.current = false; };

  const applyBrushStroke = (e) => {
    const mesh = threeObjectsRef.current[selected3DId];
    if (!mesh || !mesh.geometry) return;
    const pos = mesh.geometry.attributes.position;
    if (!pos) return;
    const canvas = threeCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x:mx, y:my}, threeCameraRef.current);
    const hits = raycaster.intersectObject(mesh);
    if (!hits.length) return;
    const hitPt = hits[0].point;
    const arr = pos.array;
    const strength = sculptStrength * 0.1;
    const radiusWorld = sculptRadius * 0.05;
    for (let i = 0; i < arr.length; i += 3) {
      const vx = arr[i], vy = arr[i+1], vz = arr[i+2];
      const dist = hitPt.distanceTo(new THREE.Vector3(vx,vy,vz));
      if (dist < radiusWorld) {
        const falloff = 1 - dist / radiusWorld;
        if (sculptBrush === 'draw' || sculptBrush === 'inflate') {
          arr[i+1] += strength * falloff;
          if (sculptSymmetry) arr[i] += strength * falloff * 0.5;
        } else if (sculptBrush === 'smooth') {
          arr[i+1] *= (1 - strength * falloff * 0.3);
        } else if (sculptBrush === 'grab') {
          arr[i]   += mx * strength * falloff * 2;
          arr[i+1] += my * strength * falloff * 2;
        } else if (sculptBrush === 'flatten') {
          arr[i+1] = arr[i+1] * (1 - falloff * strength) + hitPt.y * (falloff * strength);
        } else if (sculptBrush === 'pinch') {
          arr[i]   += (hitPt.x - vx) * strength * falloff;
          arr[i+2] += (hitPt.z - vz) * strength * falloff;
        } else if (sculptBrush === 'crease') {
          arr[i+1] -= strength * falloff * (dist < radiusWorld * 0.3 ? -2 : 1);
        }
      }
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  };

  // ── Basic rigging ──────────────────────────────────────────────────────────
  const initDefaultRig = () => {
    setRigBones(RIG_BONES_DEFAULTS);
    setRigVisible(true);
    // Draw bones as line segments in Three.js scene
    const scene = threeSceneRef.current; if (!scene) return;
    RIG_BONES_DEFAULTS.forEach(bone => {
      const mat = new THREE.LineBasicMaterial({color:'#FF6600'});
      const pts = [
        new THREE.Vector3(...bone.head),
        new THREE.Vector3(...bone.tail),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, mat);
      line.userData.boneId = bone.id;
      scene.add(line);
      threeObjectsRef.current['rig_' + bone.id] = line;
    });
  };

  const rotateBone = (boneId, axis, deg) => {
    const line = threeObjectsRef.current['rig_' + boneId];
    if (!line) return;
    const rad = THREE.MathUtils.degToRad(deg);
    if (axis==='x') line.rotation.x += rad;
    if (axis==='y') line.rotation.y += rad;
    if (axis==='z') line.rotation.z += rad;
    setRigBones(bs => bs.map(b => b.id===boneId
      ? {...b, rotation: {x:(b.rotation?.x||0)+(axis==='x'?deg:0), y:(b.rotation?.y||0)+(axis==='y'?deg:0), z:(b.rotation?.z||0)+(axis==='z'?deg:0)}}
      : b
    ));
  };

  // ── Doppelflex auto-rig ────────────────────────────────────────────────────
  const handleDoppelflexUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    setDoppelflexImg(url);
    setAutoRigLoading(true);
    // Stub: in production this calls Doppelflex API
    await new Promise(r => setTimeout(r, 1500));
    initDefaultRig();
    setAutoRigLoading(false);
  };


  // ── Session 11: Particle system ────────────────────────────────────────────
  const spawnParticles = (preset) => {
    const scene = threeSceneRef.current; if (!scene) return;
    const p = PARTICLE_PRESETS.find(x=>x.id===preset) || PARTICLE_PRESETS[0];
    const emitterId = `emitter_${Date.now()}`;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(p.count * 3);
    const velocities = [];
    const lifetimes = [];
    for (let i = 0; i < p.count; i++) {
      positions[i*3]   = (Math.random()-0.5) * p.spread;
      positions[i*3+1] = (Math.random()-0.5) * p.spread * 0.2;
      positions[i*3+2] = (Math.random()-0.5) * p.spread;
      velocities.push({
        x: p.velocity.x + (Math.random()-0.5)*p.spread*0.5,
        y: p.velocity.y + Math.random()*p.spread*0.3,
        z: p.velocity.z + (Math.random()-0.5)*p.spread*0.5,
      });
      lifetimes.push(Math.random() * p.lifetime);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({color: p.color, size: p.size, transparent:true, opacity:0.85});
    const points = new THREE.Points(geo, mat);
    points.userData = {velocities, lifetimes, maxLifetime:p.lifetime, gravity:p.gravity, preset:p.id, emitterId};
    scene.add(points);
    threeObjectsRef.current[emitterId] = points;
    setParticleEmitters(es => [...es, {id:emitterId, preset:p.id, label:p.label, count:p.count}]);

    // Animate
    const tick = () => {
      particleRafRef.current = requestAnimationFrame(tick);
      const pos = points.geometry.attributes.position.array;
      const vels = points.userData.velocities;
      const lts  = points.userData.lifetimes;
      for (let i = 0; i < p.count; i++) {
        lts[i] -= 0.016;
        if (lts[i] <= 0) {
          pos[i*3]   = (Math.random()-0.5)*p.spread;
          pos[i*3+1] = 0;
          pos[i*3+2] = (Math.random()-0.5)*p.spread;
          vels[i] = {
            x: p.velocity.x+(Math.random()-0.5)*p.spread*0.5,
            y: p.velocity.y+Math.random()*p.spread*0.3,
            z: p.velocity.z+(Math.random()-0.5)*p.spread*0.5,
          };
          lts[i] = p.lifetime;
        } else {
          pos[i*3]   += vels[i].x * 0.016;
          pos[i*3+1] += vels[i].y * 0.016;
          pos[i*3+2] += vels[i].z * 0.016;
          vels[i].y  -= p.gravity * 0.016;
        }
      }
      points.geometry.attributes.position.needsUpdate = true;
    };
    tick();
  };

  const removeEmitter = (emitterId) => {
    const scene = threeSceneRef.current;
    const pts = threeObjectsRef.current[emitterId];
    if (pts && scene) scene.remove(pts);
    delete threeObjectsRef.current[emitterId];
    setParticleEmitters(es => es.filter(e=>e.id!==emitterId));
  };

  // ── Session 12: Cloth simulation (cannon-es) ───────────────────────────────
  const addClothSim = async () => {
    try {
      const CANNON = await import('cannon-es');
      const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
      const preset = CLOTH_PRESETS.find(c=>c.id===activeClothPreset)||CLOTH_PRESETS[1];
      const body = new CANNON.Body({mass: preset.mass});
      body.addShape(new CANNON.Plane());
      world.addBody(body);
      const id = `cloth_${Date.now()}`;
      setClothObjects(cs => [...cs, {id, preset:preset.id, label:preset.label, active:true}]);
      // Simulate a few steps for visual feedback
      for (let i=0;i<10;i++) world.step(1/60);
      console.log('✅ Cloth sim initialized', preset.label);
    } catch(e) {
      console.warn('cannon-es not available:', e.message);
      const id = `cloth_${Date.now()}`;
      const preset = CLOTH_PRESETS.find(c=>c.id===activeClothPreset)||CLOTH_PRESETS[1];
      setClothObjects(cs => [...cs, {id, preset:preset.id, label:preset.label, active:true}]);
    }
  };

  // ── Session 13: Grease Pencil ──────────────────────────────────────────────
  const onGPMouseDown = (e) => {
    if (!greasePencilMode) return;
    gpDrawing.current = true;
    gpCurrentStroke.current = [];
    recordGPPoint(e);
  };
  const onGPMouseMove = (e) => {
    if (!greasePencilMode || !gpDrawing.current) return;
    recordGPPoint(e);
  };
  const onGPMouseUp = () => {
    if (!gpDrawing.current) return;
    gpDrawing.current = false;
    if (gpCurrentStroke.current.length > 1) {
      const stroke = {id:`gp_${Date.now()}`, points:[...gpCurrentStroke.current], color:gpColor, size:gpSize};
      setGpStrokes(ss => [...ss, stroke]);
      // Add stroke to Three.js scene as line
      const scene = threeSceneRef.current;
      if (scene) {
        const pts = gpCurrentStroke.current.map(p => new THREE.Vector3(p.x*0.01-5, -p.y*0.01+3.5, 0));
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({color: gpColor, linewidth: gpSize});
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        threeObjectsRef.current[stroke.id] = line;
      }
    }
    gpCurrentStroke.current = [];
  };
  const recordGPPoint = (e) => {
    const canvas = threeCanvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gpCurrentStroke.current.push({x: e.clientX-rect.left, y: e.clientY-rect.top});
  };
  const clearGPStrokes = () => {
    gpStrokes.forEach(s => {
      const line = threeObjectsRef.current[s.id];
      if (line && threeSceneRef.current) threeSceneRef.current.remove(line);
      delete threeObjectsRef.current[s.id];
    });
    setGpStrokes([]);
  };

  // ── Session 13: Post-processing (CSS filter simulation) ────────────────────
  const getPostFXStyle = () => {
    const fx = postFX;
    const filters = [];
    if (fx.bloom?.enabled)   filters.push(`brightness(${1+fx.bloom.strength*0.5})`);
    if (fx.vignette?.enabled) filters.push(`contrast(${1+fx.vignette.darkness*0.3})`);
    if (fx.film?.enabled)    filters.push(`contrast(1.05) saturate(0.95)`);
    return filters.length ? filters.join(' ') : 'none';
  };

  // ── Session 14: Export / Render queue ─────────────────────────────────────
  const addToRenderQueue = () => {
    const job = {
      id: `rq_${Date.now()}`,
      name: `Render ${renderQueue.length+1}`,
      format: renderFormat,
      resolution: `${renderRes.w}x${renderRes.h}`,
      fps: renderFPS,
      status: 'queued',
      progress: 0,
      addedAt: new Date().toLocaleTimeString(),
    };
    setRenderQueue(q => [...q, job]);
  };

  const startRender = async (jobId) => {
    setRenderQueue(q => q.map(j => j.id===jobId ? {...j, status:'rendering', progress:0} : j));
    setExporting3D(true);
    // Simulate render progress
    for (let p=0; p<=100; p+=5) {
      await new Promise(r=>setTimeout(r,120));
      setRenderQueue(q => q.map(j => j.id===jobId ? {...j, progress:p} : j));
    }
    setRenderQueue(q => q.map(j => j.id===jobId ? {...j, status:'done', progress:100} : j));
    setExporting3D(false);
  };

  const exportToVideoEditor = () => {
    // Send render result to video editor timeline via localStorage signal
    const payload = {
      source: '3d_compositor',
      format: renderFormat,
      resolution: renderRes,
      fps: renderFPS,
      timestamp: Date.now(),
      objects: scene3DObjects.length,
    };
    localStorage.setItem('spx_3d_export', JSON.stringify(payload));
    alert('3D scene queued for Video Editor timeline. Open Video Editor to import.');
  };


  // ── Session A: Model import helpers ──────────────────────────────────────
  const importModel = async (file) => {
    if (!file) return;
    const scene = threeSceneRef.current; if (!scene) return;
    setImportingModel(true);
    const ext = file.name.split('.').pop().toLowerCase();
    const url = URL.createObjectURL(file);

    const onLoad = (object) => {
      // Auto-center and scale
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale  = maxDim > 0 ? 3 / maxDim : 1;
      object.position.sub(center);
      object.scale.setScalar(scale);
      object.castShadow = true;
      object.receiveShadow = true;

      const id = `model_${Date.now()}`;
      object.userData.id = id;
      scene.add(object);
      threeObjectsRef.current[id] = object;

      const modelEntry = {
        id, name: file.name, type: ext,
        position:{x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, scale:{x:scale,y:scale,z:scale},
        material: {...PBR_DEFAULTS}, keyframes:[], visible:true, isImported:true,
      };
      setImportedModels(ms => [...ms, modelEntry]);
      setScene3DObjects(os => [...os, modelEntry]);
      setSelected3DId(id);

      // Fit camera
      const cam = threeCameraRef.current;
      if (cam) {
        cam.position.set(4, 3, 5);
        cam.lookAt(0, 0, 0);
      }
      URL.revokeObjectURL(url);
      setImportingModel(false);
    };

    const onError = (e) => {
      console.error('Model import error:', e);
      setImportingModel(false);
      URL.revokeObjectURL(url);
    };

    try {
      if (ext === 'glb' || ext === 'gltf') {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => onLoad(gltf.scene), undefined, onError);
      } else if (ext === 'obj') {
        const loader = new OBJLoader();
        loader.load(url, onLoad, undefined, onError);
      } else if (ext === 'fbx') {
        const loader = new FBXLoader();
        loader.load(url, onLoad, undefined, onError);
      } else {
        alert(`Unsupported format: .${ext}. Use GLB, GLTF, OBJ, or FBX.`);
        setImportingModel(false);
        URL.revokeObjectURL(url);
      }
    } catch(e) {
      console.error(e);
      setImportingModel(false);
    }
  };

  const applyMaterialPreset = (objId, presetId) => {
    const preset = MATERIAL_PRESETS.find(p=>p.id===presetId);
    if (!preset) return;
    const mesh = threeObjectsRef.current[objId];
    if (!mesh) return;
    const applyToMesh = (m) => {
      if (!m.isMesh) return;
      m.material = new THREE.MeshStandardMaterial({
        color: preset.color,
        roughness: preset.roughness,
        metalness: preset.metalness,
        emissive: new THREE.Color(preset.emissive||'#000000'),
        emissiveIntensity: preset.emissiveIntensity||0,
        transparent: preset.transparent||false,
        opacity: preset.opacity??1,
      });
    };
    if (mesh.isMesh) applyToMesh(mesh);
    else mesh.traverse(applyToMesh);
    update3DObject(objId, {material:{...preset}});
  };

  // ── Session B: Node Shader Editor helpers ─────────────────────────────────
  const addShaderNode = (type, x=200, y=200) => {
    const def = SHADER_NODE_TYPES.find(n=>n.id===type);
    if (!def) return;
    const id = `sn_${Date.now()}`;
    const node = {
      id, type, label:def.label, x, y, width:160, height:100,
      inputs: Object.fromEntries(def.inputs.map(i=>[i, type==='color'?'#ffffff':0])),
      outputs: def.outputs,
      params: type==='color'?{color:'#ffffff'}:type==='noise'?{scale:5,detail:2}:type==='fresnel'?{ior:1.45}:type==='math'?{op:'multiply'}:{},
    };
    setShaderNodes(ns => [...ns, node]);
  };

  const updateShaderNode = (id, changes) => {
    setShaderNodes(ns => ns.map(n => n.id===id ? {...n,...changes} : n));
  };

  const connectShaderNodes = (fromId, fromPort, toId, toPort) => {
    const edgeId = `se_${Date.now()}`;
    setShaderEdges(es => [...es.filter(e=>!(e.toId===toId&&e.toPort===toPort)), {id:edgeId,fromId,fromPort,toId,toPort}]);
  };

  const generateGLSL = () => {
    // Walk node graph and build GLSL fragment shader
    const outputNode = shaderNodes.find(n=>n.type==='output');
    if (!outputNode) return null;

    let uniforms = { uTime: {value:0} };
    let fragmentParts = [];

    shaderNodes.forEach(node => {
      if (node.type==='color') {
        const c = new THREE.Color(node.params.color||'#ffffff');
        fragmentParts.push(`vec3 col_${node.id.replace(/\W/g,'_')} = vec3(${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)});`);
      }
      if (node.type==='noise') {
        fragmentParts.push(`float noise_${node.id.replace(/\W/g,'_')} = fract(sin(dot(vUv*${node.params.scale||5.0}, vec2(12.9898,78.233)))*43758.5453);`);
      }
      if (node.type==='fresnel') {
        fragmentParts.push(`float fresnel_${node.id.replace(/\W/g,'_')} = pow(1.0-dot(vNormal,vec3(0.,0.,1.)),${node.params.ior||1.45});`);
      }
    });

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `;
    const fragmentShader = `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      ${fragmentParts.join('\n')}
      void main() {
        vec3 col = vec3(vUv, 0.5+0.5*sin(uTime));
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    return {vertexShader, fragmentShader, uniforms};
  };

  const applyShaderToObject = () => {
    const objId = shaderTarget || selected3DId;
    if (!objId) return;
    const glsl = generateGLSL();
    if (!glsl) { alert('Add an Output node first'); return; }
    const mesh = threeObjectsRef.current[objId];
    if (!mesh) return;
    const mat = new THREE.ShaderMaterial({
      vertexShader: glsl.vertexShader,
      fragmentShader: glsl.fragmentShader,
      uniforms: glsl.uniforms,
    });
    const applyMat = (m) => { if (m.isMesh) m.material = mat; };
    if (mesh.isMesh) applyMat(mesh);
    else mesh.traverse(applyMat);
    // Animate uTime uniform
    const tick = () => {
      mat.uniforms.uTime.value += 0.016;
      requestAnimationFrame(tick);
    };
    tick();
    setShaderEditorOpen(false);
  };


  // ── Session C: Rapier WASM Physics ────────────────────────────────────────
  const initRapier = async () => {
    try {
      const RAPIER = await import('@dimforge/rapier3d-compat');
      await RAPIER.init();
      const world = new RAPIER.World(new RAPIER.Vector3(gravity.x, gravity.y, gravity.z));
      rapierWorldRef.current = {world, RAPIER};
      console.log('✅ Rapier physics initialized');
      return {world, RAPIER};
    } catch(e) {
      console.warn('Rapier init failed:', e.message);
      return null;
    }
  };

  const addRigidBody = async (objId, bodyType='dynamic', colliderShape='cuboid') => {
    let ctx = rapierWorldRef.current;
    if (!ctx) ctx = await initRapier();
    if (!ctx) return;
    const {world, RAPIER} = ctx;
    const mesh = threeObjectsRef.current[objId];
    if (!mesh) return;

    const pos = mesh.position;
    const bodyDesc = bodyType === 'fixed'
      ? RAPIER.RigidBodyDesc.fixed()
      : bodyType === 'kinematic'
      ? RAPIER.RigidBodyDesc.kinematicPositionBased()
      : RAPIER.RigidBodyDesc.dynamic();

    bodyDesc.setTranslation(pos.x, pos.y, pos.z);
    const body = world.createRigidBody(bodyDesc);

    // Collider
    let colliderDesc;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    if      (colliderShape==='cuboid')   colliderDesc = RAPIER.ColliderDesc.cuboid(size.x/2, size.y/2, size.z/2);
    else if (colliderShape==='ball')     colliderDesc = RAPIER.ColliderDesc.ball(Math.max(size.x,size.y,size.z)/2);
    else if (colliderShape==='capsule')  colliderDesc = RAPIER.ColliderDesc.capsule(size.y/2, size.x/4);
    else if (colliderShape==='cylinder') colliderDesc = RAPIER.ColliderDesc.cylinder(size.y/2, size.x/4);
    else colliderDesc = RAPIER.ColliderDesc.cuboid(size.x/2, size.y/2, size.z/2);

    colliderDesc.setRestitution(0.3).setFriction(0.7);
    world.createCollider(colliderDesc, body);
    rapierBodiesRef.current[objId] = body;

    setPhysicsObjects(ps => [...ps.filter(p=>p.id!==objId), {id:objId, bodyType, colliderShape,
      name: scene3DObjects.find(o=>o.id===objId)?.name||objId}]);
  };

  const startPhysics = () => {
    if (physicsRunning) return;
    setPhysicsRunning(true);
    const tick = () => {
      const ctx = rapierWorldRef.current;
      if (!ctx) return;
      ctx.world.step();
      // Sync Three.js objects with physics
      Object.entries(rapierBodiesRef.current).forEach(([objId, body]) => {
        const mesh = threeObjectsRef.current[objId];
        if (!mesh) return;
        const t = body.translation();
        const r = body.rotation();
        mesh.position.set(t.x, t.y, t.z);
        mesh.quaternion.set(r.x, r.y, r.z, r.w);
      });
      rapierRafRef.current = requestAnimationFrame(tick);
    };
    rapierRafRef.current = requestAnimationFrame(tick);
  };

  const stopPhysics = () => {
    setPhysicsRunning(false);
    if (rapierRafRef.current) cancelAnimationFrame(rapierRafRef.current);
  };

  const resetPhysics = () => {
    stopPhysics();
    // Reset all physics objects to original positions
    scene3DObjects.forEach(obj => {
      const body = rapierBodiesRef.current[obj.id];
      const mesh = threeObjectsRef.current[obj.id];
      if (body && mesh) {
        body.setTranslation({x:obj.position.x, y:obj.position.y, z:obj.position.z}, true);
        body.setLinvel({x:0,y:0,z:0}, true);
        body.setAngvel({x:0,y:0,z:0}, true);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      }
    });
  };

  const applyForce = (objId, force) => {
    const body = rapierBodiesRef.current[objId];
    if (!body) return;
    body.applyImpulse(force, true);
  };

  // ── Session D: SkinnedMesh + Weight Painting ──────────────────────────────
  const convertToSkinnedMesh = (objId) => {
    const scene = threeSceneRef.current;
    const mesh = threeObjectsRef.current[objId];
    if (!mesh || !mesh.isMesh) { alert('Select a mesh object first'); return; }
    if (mesh.isSkinnedMesh) { console.log('Already a SkinnedMesh'); return; }

    // Build skeleton from rig bones
    const bones = [];
    const boneMap = {};
    const bonesData = rigBones.length ? rigBones : RIG_BONES_DEFAULTS;

    bonesData.forEach(bd => {
      const bone = new THREE.Bone();
      bone.name = bd.name;
      bone.position.set(...bd.head);
      boneMap[bd.id] = bone;
      bones.push(bone);
    });

    // Parent bones
    bonesData.forEach(bd => {
      if (bd.parent && boneMap[bd.parent]) {
        boneMap[bd.parent].add(boneMap[bd.id]);
      }
    });

    const rootBone = bones[0];
    const skeleton = new THREE.Skeleton(bones);

    // Create skinned mesh
    const geo = mesh.geometry.clone();
    const vertCount = geo.attributes.position.count;

    // Assign simple proximity-based weights
    const skinIndices  = new Float32Array(vertCount * 4);
    const skinWeights  = new Float32Array(vertCount * 4);
    const pos = geo.attributes.position.array;

    for (let i = 0; i < vertCount; i++) {
      const vy = pos[i*3+1];
      // Simple vertical weight distribution across 2 bones
      const t = Math.max(0, Math.min(1, (vy + 1) / 2));
      const boneA = 0, boneB = Math.min(1, bones.length-1);
      skinIndices[i*4] = boneA; skinIndices[i*4+1] = boneB;
      skinWeights[i*4] = 1-t;  skinWeights[i*4+1] = t;
      skinIndices[i*4+2] = 0;  skinIndices[i*4+3] = 0;
      skinWeights[i*4+2] = 0;  skinWeights[i*4+3] = 0;
    }

    geo.setAttribute('skinIndex',  new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const skinnedMesh = new THREE.SkinnedMesh(geo, mesh.material);
    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);
    skinnedMesh.userData = {...mesh.userData};
    skinnedMesh.position.copy(mesh.position);
    skinnedMesh.rotation.copy(mesh.rotation);
    skinnedMesh.scale.copy(mesh.scale);

    scene.remove(mesh);
    scene.add(skinnedMesh);
    threeObjectsRef.current[objId] = skinnedMesh;

    setScene3DObjects(os => os.map(o => o.id===objId ? {...o, isSkinned:true} : o));
    console.log('✅ Converted to SkinnedMesh with', bones.length, 'bones');
  };

  const paintBoneWeight = (e) => {
    if (!weightPaintMode || !activeBone || !selected3DId) return;
    const mesh = threeObjectsRef.current[selected3DId];
    if (!mesh || !mesh.isSkinnedMesh) return;
    const geo = mesh.geometry;
    const skinWeights = geo.attributes.skinWeight;
    const skinIndices = geo.attributes.skinIndex;
    const pos = geo.attributes.position.array;

    const canvas = threeCanvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX-rect.left)/rect.width)*2-1;
    const my = -((e.clientY-rect.top)/rect.height)*2+1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x:mx,y:my}, threeCameraRef.current);
    const hits = raycaster.intersectObject(mesh);
    if (!hits.length) return;
    const hitPt = hits[0].point;

    // Find bone index
    const boneIdx = (rigBones.length ? rigBones : RIG_BONES_DEFAULTS).findIndex(b=>b.id===activeBone);
    if (boneIdx < 0) return;

    const arr = skinWeights.array;
    const idxArr = skinIndices.array;
    for (let i=0; i<pos.length/3; i++) {
      const vx=pos[i*3], vy=pos[i*3+1], vz=pos[i*3+2];
      const dist = hitPt.distanceTo(new THREE.Vector3(vx,vy,vz));
      if (dist < wpBrushRadius) {
        const falloff = (1 - dist/wpBrushRadius) * wpBrushStrength;
        // Find slot for this bone
        for (let s=0; s<4; s++) {
          if (idxArr[i*4+s] === boneIdx) {
            if (wpBrushMode==='add')      arr[i*4+s] = Math.min(1, arr[i*4+s]+falloff);
            else if (wpBrushMode==='subtract') arr[i*4+s] = Math.max(0, arr[i*4+s]-falloff);
            else arr[i*4+s] = arr[i*4+s]*(1-falloff) + 0.5*falloff;
            break;
          }
        }
      }
    }
    skinWeights.needsUpdate = true;

    // Update weight overlay colors
    updateWeightColors(mesh, boneIdx);
  };

  const updateWeightColors = (mesh, boneIdx) => {
    const geo = mesh.geometry;
    const skinWeights = geo.attributes.skinWeight;
    const skinIndices = geo.attributes.skinIndex;
    const vertCount = geo.attributes.position.count;
    const colors = new Float32Array(vertCount*3);
    for (let i=0; i<vertCount; i++) {
      let w = 0;
      for (let s=0; s<4; s++) {
        if (skinIndices.array[i*4+s]===boneIdx) { w=skinWeights.array[i*4+s]; break; }
      }
      // Map weight to color: blue(0) → green(0.5) → red(1)
      const r = w > 0.5 ? (w-0.5)*2 : 0;
      const g = w < 0.5 ? w*2 : (1-w)*2;
      const b = w < 0.5 ? 1-w*2 : 0;
      colors[i*3]=r; colors[i*3+1]=g; colors[i*3+2]=b;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
    if (mesh.material && !Array.isArray(mesh.material)) {
      mesh.material.vertexColors = true;
      mesh.material.needsUpdate = true;
    }
  };

  const wpMouseDown = (e) => { if (weightPaintMode) paintBoneWeight(e); };
  const wpMouseMove = (e) => { if (weightPaintMode && e.buttons===1) paintBoneWeight(e); };


  // ── Spline Gap 1: Clipping Planes ─────────────────────────────────────────
  const addClippingPlane = (axis='y', constant=0) => {
    const renderer = threeRendererRef.current; if (!renderer) return;
    renderer.localClippingEnabled = true;
    const normal = axis==='x' ? new THREE.Vector3(-1,0,0)
                 : axis==='y' ? new THREE.Vector3(0,-1,0)
                 : new THREE.Vector3(0,0,-1);
    const plane = new THREE.Plane(normal, constant);
    const id = `clip_${Date.now()}`;
    // Apply to all scene materials
    threeSceneRef.current?.traverse(obj => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          m.clippingPlanes = [...(m.clippingPlanes||[]), plane];
          m.clipShadows = true;
          m.needsUpdate = true;
        });
      }
    });
    setClippingPlanes(ps => [...ps, {id, axis, constant, plane}]);
  };

  const updateClippingPlane = (id, constant) => {
    setClippingPlanes(ps => ps.map(p => {
      if (p.id !== id) return p;
      p.plane.constant = constant;
      return {...p, constant};
    }));
  };

  const removeClippingPlane = (id) => {
    const cp = clippingPlanes.find(p=>p.id===id);
    if (!cp) return;
    threeSceneRef.current?.traverse(obj => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          m.clippingPlanes = (m.clippingPlanes||[]).filter(p=>p!==cp.plane);
          m.needsUpdate = true;
        });
      }
    });
    setClippingPlanes(ps => ps.filter(p=>p.id!==id));
  };

  const clearAllClipping = () => {
    threeSceneRef.current?.traverse(obj => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { m.clippingPlanes = []; m.needsUpdate = true; });
      }
    });
    setClippingPlanes([]);
  };

  // ── Spline Gap 2: 3D Text ──────────────────────────────────────────────────
  const create3DText = async () => {
    setText3DLoading(true);
    const scene = threeSceneRef.current; if (!scene) { setText3DLoading(false); return; }
    const fontDef = TEXT3D_FONTS.find(f=>f.id===text3DFont) || TEXT3D_FONTS[0];

    const loadFont = () => new Promise((resolve, reject) => {
      if (fontCacheRef.current[fontDef.id]) { resolve(fontCacheRef.current[fontDef.id]); return; }
      const loader = new FontLoader();
      loader.load(fontDef.url, font => {
        fontCacheRef.current[fontDef.id] = font;
        resolve(font);
      }, undefined, reject);
    });

    try {
      const font = await loadFont();
      const geo = new TextGeometry(text3DContent || 'SPX', {
        font, size: text3DSize, depth: text3DDepth,
        curveSegments: 12, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 5,
      });
      geo.computeBoundingBox();
      const center = new THREE.Vector3();
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -center.y, -center.z);

      const mat = new THREE.MeshStandardMaterial({
        color: text3DColor, roughness: 0.3, metalness: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      scene.add(mesh);

      const id = `text3d_${Date.now()}`;
      mesh.userData.id = id;
      threeObjectsRef.current[id] = mesh;

      const obj = {
        id, type:'text3d', name:`Text: ${text3DContent.slice(0,10)}`,
        position:{x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, scale:{x:1,y:1,z:1},
        material:{color:text3DColor, roughness:0.3, metalness:0.5},
        keyframes:[], visible:true,
      };
      setScene3DObjects(os => [...os, obj]);
      setSelected3DId(id);
      setText3DPanelOpen(false);
    } catch(e) {
      console.error('3D Text error:', e);
      alert('Could not load font. Check network connection.');
    }
    setText3DLoading(false);
  };

  // ── Spline Gap 3: Web Embed Export ────────────────────────────────────────
  const generateEmbedCode = async () => {
    setEmbedGenerating(true);
    const renderer = threeRendererRef.current;
    const canvas   = threeCanvasRef.current;
    if (!renderer || !canvas) { setEmbedGenerating(false); return; }

    // Capture current viewport as thumbnail
    renderer.render(threeSceneRef.current, threeCameraRef.current);
    const thumbnail = canvas.toDataURL('image/jpeg', 0.6);

    // Build scene descriptor
    const sceneData = {
      objects: scene3DObjects.map(o => ({
        id:o.id, type:o.type, name:o.name,
        position:o.position, rotation:o.rotation, scale:o.scale,
        material:o.material,
      })),
      lights: sceneLights,
      camera: {
        theta: orbitState.theta, phi: orbitState.phi, radius: orbitState.radius,
      },
      triggers: objectTriggers,
    };

    const sceneJSON = JSON.stringify(sceneData);
    const encoded   = btoa(unescape(encodeURIComponent(sceneJSON)));

    const code = `<!-- SPX 3D Embed — streampirex.com -->
<div id="spx-3d-embed" style="width:100%;aspect-ratio:16/9;"></div>
<script src="https://streampirex.com/embed/spx3d.js"></script>
<script>
  SPX3D.init('#spx-3d-embed', {
    scene: '${encoded.slice(0,80)}...', // full scene data
    autoRotate: true,
    background: '#06060f',
    controls: true,
  });
</script>
<!-- Generated by StreamPireX SPX 3D — ${new Date().toLocaleDateString()} -->`;

    setEmbedCode(code);
    setEmbedGenerating(false);
  };

  // ── Spline Gap 4: Interactive States ─────────────────────────────────────
  const assignTrigger = (objId, triggerId) => {
    setObjectTriggers(t => ({
      ...t,
      [objId]: [...new Set([...(t[objId]||[]), triggerId])],
    }));
  };

  const removeTrigger = (objId, triggerId) => {
    setObjectTriggers(t => ({
      ...t,
      [objId]: (t[objId]||[]).filter(id=>id!==triggerId),
    }));
  };

  const handleViewportClick3D = (e) => {
    const canvas = threeCanvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX-rect.left)/rect.width)*2-1;
    const my = -((e.clientY-rect.top)/rect.height)*2+1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x:mx,y:my}, threeCameraRef.current);
    const meshes = Object.entries(threeObjectsRef.current)
      .filter(([,m])=>m.isMesh||m.isGroup)
      .map(([,m])=>m);
    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return;
    const hit = hits[0].object;
    // Walk up to find root object with id
    let root = hit;
    while (root.parent && !root.userData.id) root = root.parent;
    const objId = root.userData.id;
    if (!objId) return;
    // Fire click triggers
    const triggers = objectTriggers[objId] || [];
    triggers.forEach(tId => {
      const tDef = INTERACTION_TRIGGERS.find(t=>t.id===tId);
      if (!tDef || tDef.event!=='click') return;
      fireInteraction(objId, tDef);
    });
  };

  const handleViewportHover3D = (e) => {
    const canvas = threeCanvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX-rect.left)/rect.width)*2-1;
    const my = -((e.clientY-rect.top)/rect.height)*2+1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x:mx,y:my}, threeCameraRef.current);
    const meshes = Object.entries(threeObjectsRef.current)
      .filter(([,m])=>m.isMesh||m.isGroup).map(([,m])=>m);
    const hits = raycaster.intersectObjects(meshes, true);
    const hoveredId = hits.length ? (() => {
      let root = hits[0].object;
      while (root.parent && !root.userData.id) root = root.parent;
      return root.userData.id;
    })() : null;
    // Fire hover triggers for newly hovered object
    if (hoveredId && hoveredId !== hoverStateRef.current.id) {
      const triggers = objectTriggers[hoveredId] || [];
      triggers.forEach(tId => {
        const tDef = INTERACTION_TRIGGERS.find(t=>t.id===tId);
        if (tDef?.event==='hover') fireInteraction(hoveredId, tDef);
      });
    }
    hoverStateRef.current.id = hoveredId;
  };

  const fireInteraction = (objId, tDef) => {
    const mesh = threeObjectsRef.current[objId]; if (!mesh) return;
    const {action, params} = tDef;
    const start = performance.now();
    const duration = (params.duration||1) * 1000;
    const origScale = mesh.scale.clone();
    const origPos   = mesh.position.clone();

    const tick = () => {
      const t = Math.min(1, (performance.now()-start)/duration);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      if (action==='rotate') {
        mesh.rotation.y += THREE.MathUtils.degToRad(params.y||360) * (1/60) / (params.duration||1);
      } else if (action==='scale') {
        const s = 1 + (params.to-1)*ease;
        mesh.scale.set(s,s,s);
      } else if (action==='bounce') {
        mesh.position.y = origPos.y + Math.sin(t*Math.PI) * (params.height||1);
      } else if (action==='emissive') {
        if (mesh.material) {
          mesh.material.emissive = new THREE.Color(params.color||'#00ffc8');
          mesh.material.emissiveIntensity = t < 0.5 ? params.intensity*ease*2 : params.intensity*(1-ease)*2;
          mesh.material.needsUpdate = true;
        }
      } else if (action==='explode') {
        mesh.position.y = origPos.y + ease * params.force;
        mesh.rotation.x += 0.1;
        mesh.rotation.z += 0.05;
      }
      if (t < 1 && action !== 'rotate') {
        interactRafRef.current[objId] = requestAnimationFrame(tick);
      } else if (action==='rotate') {
        if (t < 1) interactRafRef.current[objId] = requestAnimationFrame(tick);
      }
    };
    if (interactRafRef.current[objId]) cancelAnimationFrame(interactRafRef.current[objId]);
    interactRafRef.current[objId] = requestAnimationFrame(tick);
  };

  // Scroll trigger handler
  React.useEffect(() => {
    const onScroll = () => {
      Object.entries(objectTriggers).forEach(([objId, triggers]) => {
        triggers.forEach(tId => {
          const tDef = INTERACTION_TRIGGERS.find(t=>t.id===tId);
          if (tDef?.event==='scroll') {
            const mesh = threeObjectsRef.current[objId]; if (!mesh) return;
            const scrollY = window.scrollY || 0;
            if (tDef.params.action==='rotate' || tDef.action==='rotate') {
              mesh.rotation.y = scrollY * (tDef.params.speed||0.5) * 0.01;
            } else if (tDef.action==='translate') {
              mesh.position.y = scrollY * (tDef.params.speed||0.3) * 0.01;
            }
          }
        });
      });
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [objectTriggers]);

  const [edges, setEdges] = React.useState([]);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [rotoShape, setRotoShape] = React.useState({ id: "roto_start", closed: true, feather: 0, invert: false, points: [] });

  const graphRunnerRef = React.useRef(null);
  if (!graphRunnerRef.current) {
    graphRunnerRef.current = createGraphRunner();
  }
  const duration = 10;
  const [projectName, setProjectName] = React.useState("Untitled Composite");
  // ── Blender Lite 3D Viewport (Sessions 6+7) ───────────────────────────────
  const threeCanvasRef   = useRef ? React.useRef(null) : React.useRef(null);
  const threeSceneRef    = React.useRef(null);
  const threeRendererRef = React.useRef(null);
  const threeCameraRef   = React.useRef(null);
  const threeRafRef      = React.useRef(null);
  const threeObjectsRef  = React.useRef({});   // id -> THREE.Object3D
  const threeGizmoRef    = React.useRef(null);

  const [show3D,          setShow3D]          = React.useState(false);
  const [scene3DObjects,  setScene3DObjects]  = React.useState([]);
  const [selected3DId,    setSelected3DId]    = React.useState(null);
  const [cameraMode,      setCameraMode]      = React.useState('perspective');
  const [renderMode,      setRenderMode]      = React.useState('solid'); // solid|wireframe|material
  const [sceneLights,     setSceneLights]     = React.useState([
    {id:'amb_default', type:'ambient', color:'#ffffff', intensity:0.4},
    {id:'dir_default', type:'directional', color:'#ffffff', intensity:0.8, x:5, y:10, z:5},
  ]);
  const [hdriEnabled,     setHdriEnabled]     = React.useState(false);
  const [activeAnim3D,    setActiveAnim3D]    = React.useState(null);
  const [kfTime,          setKfTime]          = React.useState(0);
  const [kfPlaying,       setKfPlaying]       = React.useState(false);
  const [kfDuration,      setKfDuration]      = React.useState(5);
  const [nlaClips,        setNlaClips]        = React.useState([]);
  const [orbitState,      setOrbitState]      = React.useState({theta:0.5, phi:1.0, radius:8});
  const orbitDrag         = React.useRef(null);
  // ── Sessions 8+9+10 state ──────────────────────────────────────────────────
  const [activeMode,     setActiveMode]     = React.useState('object'); // object|edit|sculpt|pose
  const [modifierPanel,  setModifierPanel]  = React.useState(false);
  const [sculptBrush,    setSculptBrush]    = React.useState('draw');
  const [sculptRadius,   setSculptRadius]   = React.useState(50);
  const [sculptStrength, setSculptStrength] = React.useState(0.5);
  const [sculptSymmetry, setSculptSymmetry] = React.useState(true);
  const [textureLayer,   setTextureLayer]   = React.useState(0);
  const [textureLayers,  setTextureLayers]  = React.useState([{id:'tl_0',name:'Base Color',visible:true,opacity:1,blendMode:'normal'}]);
  const [shapeKeys,      setShapeKeys]      = React.useState(SHAPE_KEY_DEFAULTS);
  const [activeShapeKey, setActiveShapeKey] = React.useState('sk_basis');
  const [rigBones,       setRigBones]       = React.useState([]);
  const [rigVisible,     setRigVisible]     = React.useState(false);
  const [selectedBone,   setSelectedBone]   = React.useState(null);
  const [doppelflexImg,  setDoppelflexImg]  = React.useState(null);
  const [autoRigLoading, setAutoRigLoading] = React.useState(false);
  const sculptCanvasRef  = React.useRef(null);
  // ── Spline Gap state ──────────────────────────────────────────────────────
  // 1. Clipping planes
  const [clippingPlanes,   setClippingPlanes]   = React.useState([]);
  const [clipPanelOpen,    setClipPanelOpen]    = React.useState(false);

  // 2. 3D Text
  const [text3DPanelOpen,  setText3DPanelOpen]  = React.useState(false);
  const [text3DContent,    setText3DContent]    = React.useState('SPX');
  const [text3DFont,       setText3DFont]       = React.useState('helvetiker');
  const [text3DSize,       setText3DSize]       = React.useState(1);
  const [text3DDepth,      setText3DDepth]      = React.useState(0.3);
  const [text3DColor,      setText3DColor]      = React.useState('#00ffc8');
  const [text3DLoading,    setText3DLoading]    = React.useState(false);
  const fontCacheRef       = React.useRef({});

  // 3. Web embed
  const [embedPanelOpen,   setEmbedPanelOpen]   = React.useState(false);
  const [embedCode,        setEmbedCode]        = React.useState('');
  const [embedGenerating,  setEmbedGenerating]  = React.useState(false);

  // 4. Interactive states
  const [interactPanelOpen,setInteractPanelOpen]= React.useState(false);
  const [objectTriggers,   setObjectTriggers]   = React.useState({}); // objId -> [triggerId]
  const interactRafRef     = React.useRef({});
  const hoverStateRef      = React.useRef({});

  // ── Session C: Rapier Physics ────────────────────────────────────────────
  const rapierWorldRef    = React.useRef(null);
  const rapierBodiesRef   = React.useRef({});   // objId -> rigidBody
  const rapierRafRef      = React.useRef(null);
  const [physicsRunning,  setPhysicsRunning]   = React.useState(false);
  const [physicsObjects,  setPhysicsObjects]   = React.useState([]);
  const [gravity,         setGravity]          = React.useState({x:0,y:-9.81,z:0});
  const [physicsDebug,    setPhysicsDebug]      = React.useState(false);

  // ── Session D: SkinnedMesh + Weight Painting ──────────────────────────────
  const [weightPaintMode,  setWeightPaintMode]  = React.useState(false);
  const [activeBone,       setActiveBone]       = React.useState(null);
  const [boneWeights,      setBoneWeights]      = React.useState({});  // objId -> {boneId -> Float32Array}
  const [wpBrushRadius,    setWpBrushRadius]    = React.useState(0.5);
  const [wpBrushStrength,  setWpBrushStrength]  = React.useState(0.5);
  const [wpBrushMode,      setWpBrushMode]      = React.useState('add'); // add|subtract|smooth
  const weightCanvasRef    = React.useRef(null);

  // ── Session A: Model import ───────────────────────────────────────────────
  const modelFileRef      = React.useRef(null);
  const [importingModel,  setImportingModel]  = React.useState(false);
  const [importedModels,  setImportedModels]  = React.useState([]);

  // ── Session B: Node Shader Editor ────────────────────────────────────────
  const [shaderEditorOpen, setShaderEditorOpen] = React.useState(false);
  const [shaderNodes,      setShaderNodes]      = React.useState([]);
  const [shaderEdges,      setShaderEdges]      = React.useState([]);
  const [shaderTarget,     setShaderTarget]     = React.useState(null); // object id
  const [draggingShaderNode, setDraggingShaderNode] = React.useState(null);
  const [shaderDragOffset,   setShaderDragOffset]   = React.useState({x:0,y:0});
  const [connectingFrom,     setConnectingFrom]      = React.useState(null);
  const shaderCanvasRef   = React.useRef(null);

  // ── Sessions 11-14 state ───────────────────────────────────────────────────
  const [particles,       setParticles]       = React.useState([]);
  const [activeParticle,  setActiveParticle]  = React.useState('fire');
  const [particleEmitters,setParticleEmitters]= React.useState([]);
  const particleRafRef    = React.useRef(null);
  const [physicsEnabled,  setPhysicsEnabled]  = React.useState(false);
  const [clothObjects,    setClothObjects]    = React.useState([]);
  const [activeClothPreset,setActiveClothPreset]=React.useState('cotton');
  const [greasePencilMode,setGreasePencilMode]= React.useState(false);
  const [gpStrokes,       setGpStrokes]       = React.useState([]);
  const [gpColor,         setGpColor]         = React.useState('#00ffc8');
  const [gpSize,          setGpSize]          = React.useState(4);
  const gpCanvasRef       = React.useRef(null);
  const gpDrawing         = React.useRef(false);
  const gpCurrentStroke   = React.useRef([]);
  const [postFX,          setPostFX]          = React.useState({});
  const [renderQueue,     setRenderQueue]     = React.useState([]);
  const [renderFormat,    setRenderFormat]    = React.useState('MP4 (H.264)');
  const [renderRes,       setRenderRes]       = React.useState({w:1920,h:1080});
  const [renderFPS,       setRenderFPS]       = React.useState(30);
  const [renderPanel,     setRenderPanel]     = React.useState(false);
  const [exporting3D,     setExporting3D]     = React.useState(false);

  const sculptPainting   = React.useRef(false);



  // Auto-save nodes/edges
  React.useEffect(() => {
    if (nodes.length > 0) {
      try {
        const serializable = nodes.map(n => ({...n}));
        localStorage.setItem(COMP_KEY, JSON.stringify({ nodes: serializable, edges, name: projectName, savedAt: Date.now() }));
      } catch(e) {}
    }
  }, [nodes, edges, projectName]);

  // Load on mount
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COMP_KEY) || "null");
      if (saved?.nodes?.length > 0) {
        setNodes(saved.nodes);
        if (saved.edges) setEdges(saved.edges);
        if (saved.name) setProjectName(saved.name);
      }
    } catch(e) {}
  }, []);

  const nodes = useEditorStore((s) => s.nodes);
  const setNodes = useEditorStore((s) => s.setNodes);
  const addNode = useEditorStore((s) => s.addNode);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);

  useEffect(() => {
    if (!nodes.length) {
      setNodes([
        {
          id: "color_1",
          type: "color",
          x: 120,
          y: 100,
          value: "#00ffc8",
          inputs: {},
          outputs: {},
        },
        {
          id: "shader_1",
          type: "shader",
          x: 360,
          y: 180,
          shader: SHADER_NODE_PRESETS[0].id,
          params: { intensity: 1 },
          inputs: {},
          outputs: {},
        },
        {
          id: "output_1",
          type: "output",
          x: 640,
          y: 180,
          inputs: { source: "shader_1" },
          outputs: {},
        },
      ]);
    }
  }, [nodes.length, setNodes]);

  const graphResult = useMemo(() => evaluateGraph(nodes), [nodes]);

  graphRunnerRef.current.setGraph(nodes, edges);
  const engineEvaluation = React.useMemo(() => {
    return graphRunnerRef.current.runFrame(Math.floor(currentTime * 30));
  }, [nodes, edges, currentTime]);

  const addMediaNodeFromPanel = (node) => {
    setNodes((prev) => [...prev, node]);
  };

  const updateNode = (id, patch) => {
    graphRunnerRef.current.invalidateNode(id);
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  useEffect(() => {
    let raf = null;
    let last = performance.now();

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        setCurrentTime((t) => {
          const next = t + dt;
          return next >= duration ? 0 : next;
        });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [playing]);

  const addCompositorShaderNode = () => {
    addNode({
      type: "shader",
      x: 240 + nodes.length * 20,
      y: 120 + nodes.length * 20,
      shader: SHADER_NODE_PRESETS[1]?.id || "basicColor",
      params: { intensity: 1 },
      inputs: {},
      outputs: {},
    });
  };

  const handleRenderProject = () => {
    if (graphRunnerRef.current) {
      const result = graphRunnerRef.current.runFrame(Math.floor(currentTime * 30));
      console.log("Render result:", result);
    }
  };

  const addValueNode = () => {
    addNode({
      type: "value",
      x: 160 + nodes.length * 20,
      y: 120 + nodes.length * 16,
      value: Math.random().toFixed(2),
      inputs: {},
      outputs: {},
    });
  };

  return (<>
    <div className="node-compositor-page"
      style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 60px)", overflow:"hidden" }}>
      <AppMenuBar
        projectName={projectName}
        setProjectName={setProjectName}
        rightContent={
          <span style={{fontSize:10,color:"#4e6a82"}}>{nodes.length} nodes · {edges.length} edges</span>
        }
        menus={[
          { label: "File", items: [
            { label: "New Composite", action: () => { if(window.confirm("Clear?")){ setNodes([]); setEdges([]); localStorage.removeItem(COMP_KEY); } } },
            { label: "Save to Cloud ☁", shortcut: "Ctrl+Shift+S", action: async () => {
              try {
                const r = await saveToCloud("compositor", projectName, {nodes, edges, name: projectName});
                alert("✅ Saved to cloud: " + r.name);
              } catch(e) { alert("Cloud save failed: " + e.message); }
            } },
            { label: "Open from Cloud ☁", action: async () => {
              try {
                const projects = await listCloudProjects("compositor");
                if (!projects.length) { alert("No saved projects found."); return; }
                const names = projects.map((p,i) => i+1+". "+p.name+" ("+new Date(p.modified).toLocaleDateString()+")").join("\n");
                const choice = prompt("Choose project:\n"+names+"\nEnter number:");
                const idx = parseInt(choice)-1;
                if (isNaN(idx)||idx<0||idx>=projects.length) return;
                const payload = await loadFromCloud(projects[idx].key);
                if (payload) { alert("✅ Loaded: "+projects[idx].name); }
              } catch(e) { alert("Load failed: "+e.message); }
            } },
            { label: "Save", shortcut: "Ctrl+S", action: () => { try { localStorage.setItem(COMP_KEY, JSON.stringify({nodes,edges,name:projectName,savedAt:Date.now()})); alert("Saved!"); } catch(e){} } },
            "---",
            { label: "Export PNG",  action: () => {} },
            { label: "Export EXR",  action: () => {} },
            { label: "Render Queue", action: handleRenderProject },
          ]},
          { label: "Edit", items: [
            { label: "Undo",       shortcut: "Ctrl+Z",       action: () => {} },
            { label: "Redo",       shortcut: "Ctrl+Shift+Z", action: () => {} },
            "---",
            { label: "Select All",    action: () => {} },
            { label: "Delete Node",   action: () => {} },
            { label: "Duplicate Node", action: () => {} },
          ]},
          { label: "Node", items: [
            { label: "Add Media",      action: () => addNode({type:"media",     x:200,y:150,inputs:{},outputs:{}}) },
            { label: "Add Text",       action: () => addNode({type:"text",      x:200,y:200,inputs:{},outputs:{}}) },
            { label: "Add Color Grade",action: () => addNode({type:"colorgrade",x:300,y:150,inputs:{},outputs:{}}) },
            { label: "Add Merge",      action: () => addNode({type:"merge",     x:400,y:150,inputs:{},outputs:{}}) },
            { label: "Add Blur",       action: () => addNode({type:"blur",      x:400,y:200,params:{amount:10},inputs:{},outputs:{}}) },
            { label: "Add ChromaKey",  action: () => addNode({type:"chromakey", x:300,y:200,inputs:{},outputs:{}}) },
            { label: "Add LUT",        action: () => addNode({type:"lut",       x:350,y:250,inputs:{},outputs:{}}) },
            { label: "Add Output",     action: () => addNode({type:"output",    x:600,y:200,inputs:{},outputs:{}}) },
            "---",
            { label: "Clear All Edges", action: () => setEdges([]) },
            { label: "Reset Canvas",    action: () => { setNodes([]); setEdges([]); } },
          ]},
          { label: "View", items: [
            { label: "Zoom In",    action: () => {} },
            { label: "Zoom Out",   action: () => {} },
            { label: "Fit All",    action: () => {} },
            "---",
            { label: "Toggle Preview",        action: () => {} },
            { label: "Toggle Color Pipeline", action: () => {} },
          ]},
          { label: "Render", items: [
            { label: "Render Frame",   action: handleRenderProject },
            { label: "Render Range",   action: () => {} },
            { label: "Add to Queue",   action: () => {} },
            "---",
            { label: "Output: PNG",    action: () => {} },
            { label: "Output: ProRes", action: () => {} },
            { label: "Output: EXR",    action: () => {} },
          ]},
          { label: "Help", items: [
            { label: "Node Reference", action: () => alert("Connect nodes by dragging from output dot to input dot. Output node is required for render.") },
            { label: "Shortcuts",      action: () => alert("Ctrl+Z=Undo  Del=Delete node  Ctrl+S=Save") },
          ]},
        ]}
      />
      <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 12px", background:"#161b22", borderBottom:"1px solid #21262d", flexShrink:0 }}>
          <span style={{ color:"#00ffc8", fontWeight:700, fontSize:13 }}>🎛️ SPX Compositor</span>
          <div style={{ width:1, height:20, background:"#21262d", margin:"0 4px" }}/>
          <button className="spx-comp-btn" onClick={() => setPlaying(p => !p)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
          <button className="spx-comp-btn" onClick={() => setCurrentTime(0)}>⏮</button>
          <span style={{ color:"#00ffc8", fontFamily:"monospace", fontSize:11 }}>{currentTime.toFixed(2)}s / {duration}s</span>
          <div style={{ flex:1 }}/>
          <button className="spx-comp-btn" onClick={() => setEdges([])}>Clear Edges</button>
          <button className="spx-comp-btn" onClick={() => { setNodes([]); setEdges([]); }}>Reset</button>
          <button className="spx-comp-btn spx-comp-btn-primary" onClick={handleRenderProject}>▶ Render</button>
        </div>
        {/* ── 3-Panel Fusion-style Layout ── */}
        <div style={{ display:"flex", flex:1, overflow:"hidden", gap:0 }}>

          {/* LEFT — Node Library + Inspector */}
          <div style={{ width:280, background:"#0d1117", borderRight:"1px solid #21262d",
            display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0 }}>

            <div style={{ padding:"8px 10px", borderBottom:"1px solid #21262d" }}>
              <div style={{ color:"#8b949e", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Node Library</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {[
                  ["Media","media"],["Text","text"],["Solid","solid"],["Gradient","gradient"],
                  ["Merge","merge"],["Over","over"],["Multiply","multiply"],["Screen","screen"],
                  ["Blur","blur"],["Sharpen","sharpen"],["ChromaKey","chromakey"],["LUT","lut"],
                  ["Transform","transform"],["Crop","crop"],["ColorGrade","colorgrade"],
                  ["Roto","roto"],["Mask","mask"],["Shader","shader"],["Particles","particles"],["Output","output"],
                ].map(([label,type]) => (
                  <button key={type} onClick={() => addNode({
                    type, x:120+nodes.length*20, y:100+nodes.length*15,
                    properties:{name:label}, inputs:{}, outputs:{},
                  })} style={{ padding:"2px 6px", borderRadius:3, cursor:"pointer", fontSize:9, fontWeight:700,
                    background:"#21262d", color:"#8b949e", border:"none", marginBottom:2 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <MediaIngestPanel onAddMediaNode={addMediaNodeFromPanel} />
            <ColorPipelinePanel />
            <TrackerPanelPro />
          </div>

          {/* CENTER — Node Graph + Timeline */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
              <NodeGraphPro
                nodes={nodes}
                edges={edges}
                selectedId={selection.nodeId}
                onSelect={(id) => setSelection({ nodeId: id })}
                onNodesChange={setNodes}
                onEdgesChange={setEdges}
              />
            </div>
            <div style={{ borderTop:"1px solid #21262d", flexShrink:0 }}>
              <CompositorTimeline
                currentTime={currentTime}
                duration={duration}
                setCurrentTime={setCurrentTime}
                playing={playing}
                onTogglePlay={() => setPlaying((p) => !p)}
              />
            </div>
          </div>

          {/* RIGHT — Preview + Inspector + Panels */}
          <div style={{ width:340, background:"#0d1117", borderLeft:"1px solid #21262d",
            display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0 }}>

            <CompositorPreviewPro nodes={nodes} edges={edges} currentTime={currentTime} />

            <CompositorInspectorPro
              selectedNode={nodes.find(n => n.id === selection.nodeId) || null}
              updateNode={updateNode}
            />

            <GPUMultiPassPanel />

            <div className="motion-panel">
              <div className="motion-panel-title">Live Shader Preview</div>
              <ShaderPreviewCanvas shaderId="basicColor" height={180} />
            </div>

                        <RotoOverlayEditor shape={rotoShape} setShape={setRotoShape} width={320} height={180} />
            <RotoTimelinePanel />
            <RenderQueuePanel />
            <BackendRenderPanel />
            <DependencyGraphPanel nodes={nodes} edges={edges} />
            <NodeEnginePanel frame={Math.floor(currentTime * 30)} evaluation={engineEvaluation} />

            <div style={{ padding:8 }}>
              <button
                onClick={handleRenderProject}
                style={{
                  width:"100%",
                  padding:"8px",
                  borderRadius:6,
                  cursor:"pointer",
                  fontWeight:700,
                  fontSize:12,
                  background:"#00ffc8",
                  color:"#000",
                  border:"none"
                }}
              >
                ▶ Render Project
              </button>
            </div>

            <div className="motion-panel">
              <div className="motion-panel-title">Graph Output</div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#d9eaff"
                }}
              >
{JSON.stringify(
  { currentTime, edges, rotoShape, graphResult, engineEvaluation },
  null,

)}
              </pre>
            </div>

          </div>
        </div>
      </div>
    </div>

    {/* ── Blender Lite 3D Viewport toggle ──────────────────────────────── */}
    <button
      onClick={() => setShow3D(s => !s)}
      title="Toggle 3D Viewport"
      style={{
        position:"fixed",
        bottom:24,
        left:"50%",
        transform:"translateX(-50%)",
        zIndex:1000,
        padding:"8px 24px",
        borderRadius:20,
        border:"2px solid #00ffc8",
        background: show3D ? "#00ffc8" : "#0d1117",
        color: show3D ? "#06060f" : "#00ffc8",
        cursor:"pointer",
        fontWeight:700,
        fontSize:12,
        fontFamily:"JetBrains Mono",
        boxShadow:"0 4px 20px rgba(0,255,200,0.3)"
      }}
    >
      {show3D ? "✕ Close 3D" : "⬡ 3D Viewport"}
    </button>

    {/* ── 3D Viewport Panel ─────────────────────────────────────────────── */}
    {show3D && (
      <div
        style={{
          position:"fixed",
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:"#06060f",
          zIndex:2000,
          display:"flex",
          flexDirection:"column"
        }}
      >

        {/* Top bar */}
          <div style={{height:40,background:'#0d1117',borderBottom:'1px solid #21262d',display:'flex',alignItems:'center',gap:12,padding:'0 16px',flexShrink:0}}>
            <span style={{color:'#00ffc8',fontFamily:'JetBrains Mono',fontSize:12,fontWeight:700}}>⬡ SPX 3D — Blender Lite</span>
            <div style={{flex:1}}/>
            {/* Camera mode */}
            {CAMERA_MODES.map(m=>(
              <button key={m} onClick={()=>{
                setCameraMode(m);
                const cam = threeCameraRef.current;
                if (!cam) return;
              }}
                style={{padding:'3px 10px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                  background:cameraMode===m?'#00ffc8':'#1a1f2e',color:cameraMode===m?'#06060f':'#888'}}>
                {m}
              </button>
            ))}
            {/* Render mode */}
            {['solid','wireframe','material'].map(m=>(
              <button key={m} onClick={()=>{
                setRenderMode(m);
                Object.values(threeObjectsRef.current).forEach(mesh=>{
                  if (mesh.material) mesh.material.wireframe = m==='wireframe';
                });
              }}
                style={{padding:'3px 10px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                  background:renderMode===m?'#FF6600':'#1a1f2e',color:renderMode===m?'#fff':'#888'}}>
                {m}
              </button>
            ))}
            <button onClick={()=>setShow3D(false)}
              style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:20,marginLeft:8}}>✕</button>
          </div>

          <div style={{flex:1,display:'flex',overflow:'hidden'}}>

            {/* Left toolbar */}
            <div style={{width:48,background:'#0d1117',borderRight:'1px solid #21262d',display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 0',gap:4,flexShrink:0}}>
              {PRIMITIVES.map(p=>(
                <button key={p.id} title={p.label} onClick={()=>add3DPrimitive(p.id)}
                  style={{width:36,height:36,border:'none',borderRadius:4,background:'#1a1f2e',color:'#aaa',cursor:'pointer',fontSize:16}}>
                  {p.icon}
                </button>
              ))}
              <div style={{width:'80%',height:1,background:'#21262d',margin:'4px 0'}}/>
              {LIGHT_TYPES.map(l=>(
                <button key={l.id} title={`Add ${l.label} Light`} onClick={()=>add3DLight(l.id)}
                  style={{width:36,height:36,border:'none',borderRadius:4,background:'#1a1f2e',color:'#FF6600',cursor:'pointer',fontSize:11,fontWeight:700}}>
                  ☀
                </button>
              ))}
            </div>

            {/* Viewport canvas */}
            <div style={{flex:1,position:'relative',overflow:'hidden'}}
              onMouseDown={onOrbitMouseDown} onMouseMove={onOrbitMouseMove}
              onMouseUp={onOrbitMouseUp} onMouseLeave={onOrbitMouseUp}
              onWheel={onOrbitWheel}>
              <canvas ref={threeCanvasRef} style={{width:'100%',height:'100%',display:'block'}}
                width={1200} height={700}/>
              {/* Viewport overlay info */}
              <div style={{position:'absolute',top:8,left:8,color:'#555',fontSize:10,fontFamily:'JetBrains Mono',pointerEvents:'none'}}>
                <div>Objects: {scene3DObjects.length}</div>
                <div>Lights: {sceneLights.length}</div>
                <div style={{color:selected3DId?'#00ffc8':'#555'}}>
                  {selected3DId ? `Selected: ${scene3DObjects.find(o=>o.id===selected3DId)?.name||selected3DId}` : 'Nothing selected'}
  
              {/* ── Model Import ─────────────────────────────────────── */}
              <div style={{width:'80%',height:1,background:'#21262d',margin:'4px 0'}}/>
              <input ref={modelFileRef} type="file" accept=".glb,.gltf,.obj,.fbx"
                style={{display:'none'}} onChange={e=>importModel(e.target.files?.[0])}/>
              <button title="Import Model (GLB/OBJ/FBX)" onClick={()=>modelFileRef.current?.click()}
                style={{width:36,height:36,border:'none',borderRadius:4,
                  background:importingModel?'#333':'#1a1f2e',
                  color:importingModel?'#555':'#00ffc8',cursor:'pointer',fontSize:14}}
                disabled={importingModel}>
                {importingModel ? '⏳' : '📦'}
              </button>
              <button title="Node Shader Editor" onClick={()=>{setShaderTarget(selected3DId);setShaderEditorOpen(true);}}
                style={{width:36,height:36,border:'none',borderRadius:4,background:'#1a1f2e',color:'#FF6600',cursor:'pointer',fontSize:14}}>
                ⬡
              </button>
              </div>
              </div>
            </div>

            {/* Right panel */}
            <div style={{width:240,background:'#0d1117',borderLeft:'1px solid #21262d',overflowY:'auto',flexShrink:0,padding:10,display:'flex',flexDirection:'column',gap:10}}>

              {/* Scene outliner */}
              <div>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Scene</div>
                {scene3DObjects.map(obj=>(
                  <div key={obj.id} onClick={()=>setSelected3DId(obj.id)}
                    style={{padding:'4px 8px',borderRadius:3,cursor:'pointer',marginBottom:2,
                      background:selected3DId===obj.id?'#1a1f2e':'transparent',
                      border:selected3DId===obj.id?'1px solid #00ffc8':'1px solid transparent',
                      display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{color:'#dde6ef',fontSize:11}}>{obj.name}</span>
                    <button onClick={e=>{e.stopPropagation();delete3DObject(obj.id);}}
                      style={{background:'none',border:'none',color:'#444',cursor:'pointer',fontSize:12}}>✕</button>
                  </div>
                ))}
                {sceneLights.map(l=>(
                  <div key={l.id} style={{padding:'4px 8px',borderRadius:3,marginBottom:2,
                    background:'#0a0e1a',border:'1px solid #1a1f2e',display:'flex',alignItems:'center',gap:6}}>
                    <span style={{color:'#FF6600',fontSize:10}}>☀</span>
                    <span style={{color:'#888',fontSize:10}}>{l.type}</span>
                  </div>
                ))}
              </div>


              {/* ── Mode selector ──────────────────────────────────────── */}
              <div style={{display:'flex',gap:2,marginBottom:6}}>
                {['object','edit','sculpt','pose'].map(m=>(
                  <button key={m} onClick={()=>setActiveMode(m)}
                    style={{flex:1,padding:'3px 0',border:'none',borderRadius:3,cursor:'pointer',fontSize:9,fontWeight:700,textTransform:'uppercase',
                      background:activeMode===m?'#00ffc8':'#1a1f2e',color:activeMode===m?'#06060f':'#888'}}>
                    {m}
                  </button>
                ))}
              </div>

              {/* ── Sculpt mode tools ──────────────────────────────────── */}
              {activeMode==='sculpt' && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{color:'#FF6600',fontSize:10,fontWeight:700}}>SCULPT BRUSHES</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                    {SCULPT_BRUSHES.map(b=>(
                      <button key={b.id} onClick={()=>setSculptBrush(b.id)}
                        style={{padding:'5px 4px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                          background:sculptBrush===b.id?'#FF6600':'#1a1f2e',
                          color:sculptBrush===b.id?'#fff':'#888',display:'flex',gap:4,alignItems:'center'}}>
                        <span>{b.icon}</span><span>{b.label}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:4}}>
                    {[['Radius','sculptRadius',setSculptRadius,10,200],['Strength','sculptStrength',setSculptStrength,0,1,0.01]].map(([lbl,key,setter,min,max,step=1])=>(
                      <div key={key} style={{display:'flex',gap:6,alignItems:'center'}}>
                        <span style={{color:'#888',fontSize:10,width:55}}>{lbl}</span>
                        <input type="range" min={min} max={max} step={step}
                          value={key==='sculptRadius'?sculptRadius:sculptStrength}
                          onChange={e=>setter(Number(e.target.value))} style={{flex:1}}/>
                        <span style={{color:'#00ffc8',fontSize:9,width:28,textAlign:'right'}}>
                          {key==='sculptRadius'?sculptRadius:sculptStrength.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <label style={{display:'flex',gap:6,alignItems:'center',cursor:'pointer'}}>
                      <input type="checkbox" checked={sculptSymmetry} onChange={e=>setSculptSymmetry(e.target.checked)}/>
                      <span style={{color:'#888',fontSize:10}}>X Symmetry</span>
                    </label>
                  </div>
                  <div style={{color:'#555',fontSize:9,fontStyle:'italic'}}>Click+drag on viewport to sculpt</div>

                  {/* Texture painting layers */}
                  <div style={{borderTop:'1px solid #21262d',paddingTop:6,marginTop:4}}>
                    <div style={{color:'#888',fontSize:10,fontWeight:700,marginBottom:4}}>TEXTURE LAYERS</div>
                    {textureLayers.map((tl,i)=>(
                      <div key={tl.id} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',
                        borderBottom:'1px solid #0a0e1a'}}>
                        <span style={{color:textureLayer===i?'#00ffc8':'#888',fontSize:10,cursor:'pointer',flex:1}}
                          onClick={()=>setTextureLayer(i)}>{tl.name}</span>
                        <input type="range" min={0} max={1} step={0.01} value={tl.opacity}
                          onChange={e=>setTextureLayers(ls=>ls.map((l,j)=>j===i?{...l,opacity:Number(e.target.value)}:l))}
                          style={{width:50}}/>
                      </div>
                    ))}
                    <button onClick={()=>setTextureLayers(ls=>[...ls,{id:`tl_${Date.now()}`,name:`Layer ${ls.length}`,visible:true,opacity:1,blendMode:'normal'}])}
                      style={{marginTop:4,background:'#0d1117',border:'1px solid #333',color:'#aaa',borderRadius:3,padding:'3px 8px',cursor:'pointer',fontSize:10,width:'100%'}}>
                      + Add Layer
                    </button>
                  </div>
                </div>
              )}

              {/* ── Shape Keys ──────────────────────────────────────────── */}
              {activeMode==='edit' && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{color:'#FF6600',fontSize:10,fontWeight:700}}>SHAPE KEYS</div>
                  {shapeKeys.map(sk=>(
                    <div key={sk.id} style={{display:'flex',flexDirection:'column',gap:2}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{color:activeShapeKey===sk.id?'#00ffc8':'#888',fontSize:10,cursor:'pointer'}}
                          onClick={()=>setActiveShapeKey(sk.id)}>{sk.name}</span>
                        <span style={{color:'#555',fontSize:9}}>{sk.value.toFixed(2)}</span>
                      </div>
                      {sk.id !== 'sk_basis' && (
                        <input type="range" min={0} max={1} step={0.01} value={sk.value}
                          onChange={e=>updateShapeKey(sk.id,{value:Number(e.target.value)})}
                          style={{width:'100%'}}/>
                      )}
                    </div>
                  ))}
                  <button onClick={addShapeKey}
                    style={{background:'#0d1117',border:'1px solid #333',color:'#aaa',borderRadius:3,padding:'3px 8px',cursor:'pointer',fontSize:10}}>
                    + Add Shape Key
                  </button>
                </div>
              )}

              {/* ── Modifiers ───────────────────────────────────────────── */}
              {activeMode==='object' && selected3DId && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{color:'#FF6600',fontSize:10,fontWeight:700}}>MODIFIERS</div>
                  {(() => {
                    const obj = scene3DObjects.find(o=>o.id===selected3DId);
                    const mods = obj?.modifiers||[];
                    return (<>
                      {mods.map(m=>(
                        <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                          background:'#1a1f2e',borderRadius:4,padding:'4px 8px',border:'1px solid #21262d'}}>
                          <span style={{color:'#dde6ef',fontSize:10}}>{m.id.charAt(0).toUpperCase()+m.id.slice(1)}</span>
                          <button onClick={()=>removeModifier(selected3DId,m.id)}
                            style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:12}}>✕</button>
                        </div>
                      ))}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginTop:4}}>
                        {MODIFIERS.map(m=>(
                          <button key={m.id} onClick={()=>applyModifier(selected3DId,m.id,m.params)}
                            title={m.label}
                            style={{padding:'5px 4px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                              background:'#1a1f2e',color:'#aaa',display:'flex',gap:4,alignItems:'center'}}>
                            <span>{m.icon}</span><span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </>);
                  })()}
                </div>
              )}

              {/* ── Rigging / Pose ──────────────────────────────────────── */}
              {activeMode==='pose' && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{color:'#FF6600',fontSize:10,fontWeight:700}}>RIGGING</div>

                  {rigBones.length === 0 ? (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      <button onClick={initDefaultRig}
                        style={{background:'#1a1f2e',border:'1px solid #333',color:'#dde6ef',borderRadius:4,
                          padding:'6px',cursor:'pointer',fontSize:10}}>
                        + Generate Default Rig
                      </button>
                      <div style={{borderTop:'1px solid #21262d',paddingTop:6}}>
                        <div style={{color:'#888',fontSize:10,marginBottom:4}}>Doppelflex Auto-Rig</div>
                        <div style={{fontSize:9,color:'#555',marginBottom:4}}>Upload a selfie/pose photo to auto-generate rig</div>
                        <label style={{display:'block',background:'#0d1117',border:'1px dashed #333',borderRadius:4,
                          padding:'8px',cursor:'pointer',textAlign:'center',color:'#888',fontSize:10}}>
                          {autoRigLoading ? '⏳ Auto-rigging…' : '📷 Upload Photo'}
                          <input type="file" accept="image/*" onChange={handleDoppelflexUpload} style={{display:'none'}}/>
                        </label>
                        {doppelflexImg && <img src={doppelflexImg} alt="ref" style={{width:'100%',borderRadius:4,marginTop:4,opacity:0.5}}/>}
                      </div>
                    </div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {rigBones.map(bone=>(
                        <div key={bone.id}
                          onClick={()=>setSelectedBone(bone.id)}
                          style={{padding:'4px 8px',borderRadius:3,cursor:'pointer',
                            background:selectedBone===bone.id?'#1a1f2e':'transparent',
                            border:selectedBone===bone.id?'1px solid #FF6600':'1px solid transparent',
                            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{color:'#dde6ef',fontSize:10}}>{bone.name}</span>
                          {bone.parent && <span style={{color:'#555',fontSize:8}}>↖ {bone.parent.replace('bone_','')}</span>}
                        </div>
                      ))}
                      {selectedBone && (
                        <div style={{marginTop:4,display:'flex',flexDirection:'column',gap:4}}>
                          <div style={{color:'#888',fontSize:9}}>Rotate selected bone:</div>
                          <div style={{display:'flex',gap:4}}>
                            {['x','y','z'].map(ax=>(
                              <div key={ax} style={{flex:1,display:'flex',flexDirection:'column',gap:2}}>
                                <span style={{color:'#555',fontSize:8,textAlign:'center'}}>{ax.toUpperCase()}</span>
                                <div style={{display:'flex',gap:2}}>
                                  <button onClick={()=>rotateBone(selectedBone,ax,-5)}
                                    style={{flex:1,background:'#1a1f2e',border:'none',color:'#aaa',borderRadius:2,cursor:'pointer',fontSize:10}}>−</button>
                                  <button onClick={()=>rotateBone(selectedBone,ax,5)}
                                    style={{flex:1,background:'#1a1f2e',border:'none',color:'#aaa',borderRadius:2,cursor:'pointer',fontSize:10}}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button onClick={()=>{setRigBones([]); setRigVisible(false); setSelectedBone(null);
                            Object.keys(threeObjectsRef.current).filter(k=>k.startsWith('rig_')).forEach(k=>{
                              threeSceneRef.current?.remove(threeObjectsRef.current[k]);
                              delete threeObjectsRef.current[k];
                            });
                          }}
                            style={{background:'#1a1f2e',border:'1px solid #444',color:'#ff4444',borderRadius:3,
                              padding:'3px 8px',cursor:'pointer',fontSize:10,marginTop:4}}>
                            Clear Rig
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}




              {/* ── Spline Gap 1: Clipping Planes ──────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6}}>CLIPPING PLANES</div>
                <div style={{display:'flex',gap:4,marginBottom:6}}>
                  {['x','y','z'].map(axis=>(
                    <button key={axis} onClick={()=>addClippingPlane(axis, 0)}
                      style={{flex:1,padding:'4px',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,fontWeight:700,
                        background:'#1a1f2e',color:'#aaa'}}>
                      + {axis.toUpperCase()}
                    </button>
                  ))}
                  {clippingPlanes.length>0 && (
                    <button onClick={clearAllClipping}
                      style={{padding:'4px 8px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                        background:'#1a1f2e',color:'#ff4444'}}>
                      Clear
                    </button>
                  )}
                </div>
                {clippingPlanes.map(cp=>(
                  <div key={cp.id} style={{display:'flex',flexDirection:'column',gap:3,marginBottom:6,
                    background:'#0a0e1a',borderRadius:4,padding:'6px 8px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{color:'#888',fontSize:10}}>Clip {cp.axis.toUpperCase()}</span>
                      <button onClick={()=>removeClippingPlane(cp.id)}
                        style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:11}}>✕</button>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <input type="range" min={-5} max={5} step={0.05} value={cp.constant}
                        onChange={e=>updateClippingPlane(cp.id,Number(e.target.value))}
                        style={{flex:1}}/>
                      <span style={{color:'#00ffc8',fontSize:9,width:32}}>{cp.constant.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {clippingPlanes.length===0 && (
                  <div style={{color:'#333',fontSize:9,fontStyle:'italic'}}>
                    Add a plane to slice through objects in real-time
                  </div>
                )}
              </div>

              {/* ── Spline Gap 2: 3D Text ────────────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6}}>3D TEXT</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <input value={text3DContent} onChange={e=>setText3DContent(e.target.value)}
                    placeholder="Enter text..."
                    style={{background:'#06060f',border:'1px solid #333',borderRadius:3,
                      padding:'5px 8px',color:'#dde6ef',fontSize:12,fontFamily:'JetBrains Mono',outline:'none'}}/>
                  <select value={text3DFont} onChange={e=>setText3DFont(e.target.value)}
                    style={{background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'3px 6px',fontSize:10}}>
                    {TEXT3D_FONTS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{color:'#888',fontSize:10,width:40}}>Color</span>
                    <input type="color" value={text3DColor} onChange={e=>setText3DColor(e.target.value)}
                      style={{width:32,height:22,border:'none',borderRadius:3,cursor:'pointer'}}/>
                  </div>
                  {[['Size','text3DSize',setText3DSize,0.1,5,0.1],['Depth','text3DDepth',setText3DDepth,0.01,2,0.05]].map(([lbl,key,setter,min,max,step])=>(
                    <div key={key} style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{color:'#888',fontSize:10,width:40}}>{lbl}</span>
                      <input type="range" min={min} max={max} step={step}
                        value={key==='text3DSize'?text3DSize:text3DDepth}
                        onChange={e=>setter(Number(e.target.value))} style={{flex:1}}/>
                      <span style={{color:'#00ffc8',fontSize:9,width:28}}>
                        {(key==='text3DSize'?text3DSize:text3DDepth).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <button onClick={create3DText} disabled={text3DLoading||!text3DContent.trim()}
                    style={{background:text3DLoading?'#333':'#00ffc8',color:text3DLoading?'#555':'#06060f',
                      border:'none',borderRadius:4,padding:'6px',cursor:'pointer',fontWeight:700,fontSize:11}}>
                    {text3DLoading ? '⏳ Loading font…' : '⬡ Create 3D Text'}
                  </button>
                </div>
              </div>

              {/* ── Spline Gap 3: Web Embed Export ──────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#FF6600',fontSize:10,fontWeight:700,marginBottom:6}}>WEB EMBED</div>
                <div style={{color:'#555',fontSize:9,marginBottom:6}}>
                  Export your 3D scene as an embeddable widget for any website.
                </div>
                <button onClick={generateEmbedCode} disabled={embedGenerating}
                  style={{width:'100%',background:embedGenerating?'#333':'#FF6600',color:'#fff',
                    border:'none',borderRadius:4,padding:'6px',cursor:'pointer',fontWeight:700,fontSize:11,marginBottom:6}}>
                  {embedGenerating ? '⏳ Generating…' : '⬡ Generate Embed Code'}
                </button>
                {embedCode && (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <textarea readOnly value={embedCode} rows={6}
                      style={{background:'#06060f',border:'1px solid #333',borderRadius:4,
                        padding:'8px',color:'#00ffc8',fontSize:9,fontFamily:'JetBrains Mono',
                        resize:'none',width:'100%',boxSizing:'border-box'}}/>
                    <button onClick={()=>navigator.clipboard.writeText(embedCode)}
                      style={{background:'#1a1f2e',border:'1px solid #00ffc8',color:'#00ffc8',
                        borderRadius:3,padding:'4px',cursor:'pointer',fontSize:10}}>
                      📋 Copy to Clipboard
                    </button>
                  </div>
                )}
              </div>

              {/* ── Spline Gap 4: Interactive States ────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#FF6600',fontSize:10,fontWeight:700,marginBottom:6}}>INTERACTIVE STATES</div>
                {selected3DId ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{color:'#888',fontSize:9}}>
                      Assign triggers to: {scene3DObjects.find(o=>o.id===selected3DId)?.name||selected3DId}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      {INTERACTION_TRIGGERS.map(t=>{
                        const active = (objectTriggers[selected3DId]||[]).includes(t.id);
                        return (
                          <button key={t.id} onClick={()=>active?removeTrigger(selected3DId,t.id):assignTrigger(selected3DId,t.id)}
                            style={{padding:'4px 8px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                              textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',
                              background:active?'#1a1f2e':'transparent',
                              color:active?'#dde6ef':'#555',
                              borderLeft:active?`3px solid ${t.event==='hover'?'#00ffc8':t.event==='click'?'#FF6600':'#888'}`:'3px solid transparent'}}>
                            <span>{t.label}</span>
                            <span style={{fontSize:8,color:'#555'}}>{t.event}</span>
                          </button>
                        );
                      })}
                    </div>
                    {(objectTriggers[selected3DId]||[]).length > 0 && (
                      <div style={{marginTop:4}}>
                        <div style={{color:'#555',fontSize:9,marginBottom:4}}>Active triggers — click/hover in viewport to test</div>
                        <button onClick={()=>setObjectTriggers(t=>({...t,[selected3DId]:[]}))}
                          style={{background:'none',border:'1px solid #333',color:'#ff4444',borderRadius:3,
                            padding:'3px 8px',cursor:'pointer',fontSize:9}}>
                          Clear All Triggers
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{color:'#555',fontSize:10,fontStyle:'italic'}}>Select an object to assign interactions</div>
                )}
              </div>

              {/* ── Session C: Rapier Physics ──────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6}}>PHYSICS — RAPIER</div>

                {/* Gravity */}
                <div style={{display:'flex',gap:4,alignItems:'center',marginBottom:6}}>
                  <span style={{color:'#888',fontSize:10,width:44}}>Gravity Y</span>
                  <input type="range" min={-30} max={0} step={0.1} value={gravity.y}
                    onChange={e=>{
                      const y=Number(e.target.value);
                      setGravity(g=>({...g,y}));
                      const ctx=rapierWorldRef.current;
                      if(ctx) ctx.world.gravity={x:gravity.x,y,z:gravity.z};
                    }} style={{flex:1}}/>
                  <span style={{color:'#00ffc8',fontSize:9,width:32}}>{gravity.y}</span>
                </div>

                {/* Play/Stop/Reset */}
                <div style={{display:'flex',gap:4,marginBottom:6}}>
                  <button onClick={async()=>{ if(!rapierWorldRef.current) await initRapier(); startPhysics(); }}
                    disabled={physicsRunning}
                    style={{flex:1,padding:'5px',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,fontWeight:700,
                      background:physicsRunning?'#333':'#00ffc8',color:physicsRunning?'#555':'#06060f'}}>
                    ▶ Play
                  </button>
                  <button onClick={stopPhysics} disabled={!physicsRunning}
                    style={{flex:1,padding:'5px',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,fontWeight:700,
                      background:!physicsRunning?'#333':'#ff4444',color:'#fff'}}>
                    ⏹ Stop
                  </button>
                  <button onClick={resetPhysics}
                    style={{flex:1,padding:'5px',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,
                      background:'#1a1f2e',color:'#888'}}>
                    ↺ Reset
                  </button>
                </div>

                {/* Add physics to selected */}
                {selected3DId && (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <span style={{color:'#888',fontSize:9}}>Add to selected object:</span>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {RIGID_BODY_TYPES.map(t=>(
                        <button key={t.id} onClick={()=>addRigidBody(selected3DId,t.id,'cuboid')}
                          title={t.desc}
                          style={{padding:'3px 8px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                            background:'#1a1f2e',color:'#aaa'}}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {COLLIDER_SHAPES.map(c=>(
                        <button key={c.id} onClick={()=>addRigidBody(selected3DId,'dynamic',c.id)}
                          style={{padding:'2px 6px',border:'1px solid #21262d',borderRadius:3,cursor:'pointer',fontSize:9,
                            background:'#0d1117',color:'#666'}}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={()=>applyForce(selected3DId,{x:0,y:5,z:0})}
                      style={{padding:'4px',border:'1px solid #FF6600',borderRadius:3,cursor:'pointer',fontSize:10,
                        background:'transparent',color:'#FF6600'}}>
                      ↑ Apply Impulse (up)
                    </button>
                  </div>
                )}

                {/* Physics objects list */}
                {physicsObjects.length > 0 && (
                  <div style={{marginTop:6}}>
                    <span style={{color:'#555',fontSize:9}}>Physics objects ({physicsObjects.length})</span>
                    {physicsObjects.map(p=>(
                      <div key={p.id} style={{display:'flex',justifyContent:'space-between',
                        background:'#0a0e1a',borderRadius:3,padding:'2px 6px',marginTop:2}}>
                        <span style={{color:'#888',fontSize:9}}>{p.name}</span>
                        <span style={{color:'#555',fontSize:8}}>{p.bodyType} · {p.colliderShape}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Session D: Weight Painting ──────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#FF6600',fontSize:10,fontWeight:700,marginBottom:6}}>WEIGHT PAINTING</div>

                {selected3DId && (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {/* Convert to SkinnedMesh */}
                    {!scene3DObjects.find(o=>o.id===selected3DId)?.isSkinned && (
                      <button onClick={()=>convertToSkinnedMesh(selected3DId)}
                        style={{background:'#1a1f2e',border:'1px solid #FF6600',color:'#FF6600',
                          borderRadius:4,padding:'5px',cursor:'pointer',fontSize:10,fontWeight:700}}>
                        ⬡ Convert to SkinnedMesh
                      </button>
                    )}

                    {scene3DObjects.find(o=>o.id===selected3DId)?.isSkinned && (<>
                      {/* Weight paint toggle */}
                      <label style={{display:'flex',gap:6,alignItems:'center',cursor:'pointer'}}>
                        <input type="checkbox" checked={weightPaintMode}
                          onChange={e=>setWeightPaintMode(e.target.checked)}/>
                        <span style={{color:'#dde6ef',fontSize:11}}>Weight Paint Mode</span>
                      </label>

                      {weightPaintMode && (<>
                        {/* Bone selector */}
                        <span style={{color:'#888',fontSize:10}}>Active Bone</span>
                        <select value={activeBone||''}
                          onChange={e=>setActiveBone(e.target.value)}
                          style={{background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',
                            borderRadius:3,padding:'3px 6px',fontSize:10}}>
                          <option value="">— select bone —</option>
                          {(rigBones.length?rigBones:RIG_BONES_DEFAULTS).map(b=>(
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>

                        {/* Brush settings */}
                        {[['Radius','wpBrushRadius',setWpBrushRadius,0.1,3,0.05],
                          ['Strength','wpBrushStrength',setWpBrushStrength,0,1,0.01]].map(([lbl,key,setter,min,max,step])=>(
                          <div key={key} style={{display:'flex',gap:6,alignItems:'center'}}>
                            <span style={{color:'#888',fontSize:10,width:52}}>{lbl}</span>
                            <input type="range" min={min} max={max} step={step}
                              value={key==='wpBrushRadius'?wpBrushRadius:wpBrushStrength}
                              onChange={e=>setter(Number(e.target.value))} style={{flex:1}}/>
                            <span style={{color:'#FF6600',fontSize:9,width:28}}>
                              {(key==='wpBrushRadius'?wpBrushRadius:wpBrushStrength).toFixed(2)}
                            </span>
                          </div>
                        ))}

                        {/* Brush mode */}
                        <div style={{display:'flex',gap:4}}>
                          {['add','subtract','smooth'].map(m=>(
                            <button key={m} onClick={()=>setWpBrushMode(m)}
                              style={{flex:1,padding:'3px 0',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                                background:wpBrushMode===m?'#FF6600':'#1a1f2e',
                                color:wpBrushMode===m?'#fff':'#888'}}>
                              {m}
                            </button>
                          ))}
                        </div>

                        {/* Weight legend */}
                        <div style={{display:'flex',gap:0,height:8,borderRadius:3,overflow:'hidden',marginTop:2}}>
                          {WEIGHT_COLORS.map((wc,i)=>(
                            <div key={i} style={{flex:1,background:wc.color}}/>
                          ))}
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <span style={{color:'#555',fontSize:8}}>0.0</span>
                          <span style={{color:'#555',fontSize:8}}>1.0</span>
                        </div>
                        <div style={{color:'#555',fontSize:9,fontStyle:'italic'}}>
                          Click+drag on mesh to paint weights
                        </div>
                      </>)}
                    </>)}
                  </div>
                )}

                {!selected3DId && (
                  <div style={{color:'#555',fontSize:10,fontStyle:'italic'}}>Select a mesh object to begin weight painting</div>
                )}
              </div>

              {/* ── Session 11: Particles ──────────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6}}>PARTICLES</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:6}}>
                  {PARTICLE_PRESETS.map(p=>(
                    <button key={p.id} onClick={()=>setActiveParticle(p.id)}
                      style={{padding:'4px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                        background:activeParticle===p.id?'#FF6600':'#1a1f2e',
                        color:activeParticle===p.id?'#fff':'#888'}}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <button onClick={()=>spawnParticles(activeParticle)}
                  style={{width:'100%',background:'#FF6600',border:'none',color:'#fff',borderRadius:4,
                    padding:'5px',cursor:'pointer',fontSize:11,fontWeight:700,marginBottom:4}}>
                  ▶ Spawn {PARTICLE_PRESETS.find(p=>p.id===activeParticle)?.label}
                </button>
                {particleEmitters.map(e=>(
                  <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    background:'#0a0e1a',borderRadius:3,padding:'3px 8px',marginBottom:2}}>
                    <span style={{color:'#888',fontSize:10}}>{e.label} ({e.count})</span>
                    <button onClick={()=>removeEmitter(e.id)}
                      style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:11}}>✕</button>
                  </div>
                ))}
              </div>

              {/* ── Session 12: Cloth ──────────────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6}}>CLOTH SIM</div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>
                  {CLOTH_PRESETS.map(c=>(
                    <button key={c.id} onClick={()=>setActiveClothPreset(c.id)}
                      style={{padding:'3px 8px',border:'none',borderRadius:3,cursor:'pointer',fontSize:10,
                        background:activeClothPreset===c.id?'#00ffc8':'#1a1f2e',
                        color:activeClothPreset===c.id?'#06060f':'#888'}}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <button onClick={addClothSim}
                  style={{width:'100%',background:'#1a1f2e',border:'1px solid #00ffc8',color:'#00ffc8',
                    borderRadius:4,padding:'5px',cursor:'pointer',fontSize:11,fontWeight:700,marginBottom:4}}>
                  + Add Cloth Object
                </button>
                {clothObjects.map(c=>(
                  <div key={c.id} style={{display:'flex',justifyContent:'space-between',
                    background:'#0a0e1a',borderRadius:3,padding:'3px 8px',marginBottom:2}}>
                    <span style={{color:'#888',fontSize:10}}>{c.label}</span>
                    <span style={{color:'#00ffc8',fontSize:9}}>active</span>
                  </div>
                ))}
              </div>

              {/* ── Session 13: Grease Pencil ──────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6}}>GREASE PENCIL</div>
                <label style={{display:'flex',gap:6,alignItems:'center',cursor:'pointer',marginBottom:6}}>
                  <input type="checkbox" checked={greasePencilMode} onChange={e=>setGreasePencilMode(e.target.checked)}/>
                  <span style={{color:'#dde6ef',fontSize:11}}>Draw in 3D Space</span>
                </label>
                {greasePencilMode && (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{color:'#888',fontSize:10,width:40}}>Color</span>
                      <input type="color" value={gpColor} onChange={e=>setGpColor(e.target.value)}
                        style={{width:32,height:22,border:'none',borderRadius:3,cursor:'pointer'}}/>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{color:'#888',fontSize:10,width:40}}>Size</span>
                      <input type="range" min={1} max={20} value={gpSize} onChange={e=>setGpSize(Number(e.target.value))} style={{flex:1}}/>
                      <span style={{color:'#00ffc8',fontSize:9,width:16}}>{gpSize}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{color:'#555',fontSize:9}}>{gpStrokes.length} strokes</span>
                      <button onClick={clearGPStrokes}
                        style={{background:'none',border:'1px solid #333',color:'#ff4444',borderRadius:3,
                          padding:'2px 8px',cursor:'pointer',fontSize:9}}>Clear</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Session 13: Post-FX ────────────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#00ffc8',fontSize:10,fontWeight:700,marginBottom:6}}>POST-PROCESSING</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {POSTFX_EFFECTS.map(fx=>{
                    const enabled = postFX[fx.id]?.enabled;
                    return (
                      <div key={fx.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                        background:enabled?'#1a1f2e':'transparent',borderRadius:3,padding:'3px 6px',
                        border:enabled?'1px solid #21262d':'1px solid transparent'}}>
                        <label style={{display:'flex',gap:6,alignItems:'center',cursor:'pointer',flex:1}}>
                          <input type="checkbox" checked={!!enabled}
                            onChange={e=>setPostFX(p=>({...p,[fx.id]:{...fx.params,enabled:e.target.checked}}))}/>
                          <span style={{color:enabled?'#dde6ef':'#666',fontSize:10}}>{fx.label}</span>
                        </label>
                        {enabled && fx.params.strength !== undefined && (
                          <input type="range" min={0} max={1} step={0.05}
                            value={postFX[fx.id]?.strength||fx.params.strength||0.5}
                            onChange={e=>setPostFX(p=>({...p,[fx.id]:{...p[fx.id],strength:Number(e.target.value)}}))}
                            style={{width:50}}/>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Session 14: Render Queue ───────────────────────────── */}
              <div style={{borderTop:'1px solid #21262d',paddingTop:8}}>
                <div style={{color:'#FF6600',fontSize:10,fontWeight:700,marginBottom:6}}>RENDER QUEUE</div>
                <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:6}}>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <span style={{color:'#888',fontSize:10,width:50}}>Format</span>
                    <select value={renderFormat} onChange={e=>setRenderFormat(e.target.value)}
                      style={{flex:1,background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}>
                      {RENDER_FORMATS.map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <span style={{color:'#888',fontSize:10,width:50}}>Res</span>
                    <input type="number" value={renderRes.w} onChange={e=>setRenderRes(r=>({...r,w:Number(e.target.value)}))}
                      style={{width:52,background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}/>
                    <span style={{color:'#555',fontSize:10}}>×</span>
                    <input type="number" value={renderRes.h} onChange={e=>setRenderRes(r=>({...r,h:Number(e.target.value)}))}
                      style={{width:52,background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}/>
                  </div>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <span style={{color:'#888',fontSize:10,width:50}}>FPS</span>
                    <select value={renderFPS} onChange={e=>setRenderFPS(Number(e.target.value))}
                      style={{width:70,background:'#1a1a1a',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}>
                      {[24,25,30,50,60,120].map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:'flex',gap:4,marginBottom:6}}>
                  <button onClick={addToRenderQueue}
                    style={{flex:1,background:'#1a1f2e',border:'1px solid #FF6600',color:'#FF6600',borderRadius:4,
                      padding:'5px',cursor:'pointer',fontSize:10,fontWeight:700}}>
                    + Queue Render
                  </button>
                  <button onClick={exportToVideoEditor}
                    style={{flex:1,background:'#FF6600',border:'none',color:'#fff',borderRadius:4,
                      padding:'5px',cursor:'pointer',fontSize:10,fontWeight:700}}>
                    → Video Editor
                  </button>
                </div>
                {renderQueue.map(job=>(
                  <div key={job.id} style={{background:'#0a0e1a',borderRadius:4,padding:'6px 8px',marginBottom:4,border:'1px solid #21262d'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                      <span style={{color:'#dde6ef',fontSize:10}}>{job.name}</span>
                      <span style={{color:job.status==='done'?'#00ffc8':job.status==='rendering'?'#FF6600':'#555',fontSize:9}}>
                        {job.status}
                      </span>
                    </div>
                    <div style={{color:'#555',fontSize:9,marginBottom:4}}>{job.format} · {job.resolution} · {job.fps}fps</div>
                    {job.status==='queued' && (
                      <button onClick={()=>startRender(job.id)}
                        style={{width:'100%',background:'#00ffc8',border:'none',color:'#06060f',borderRadius:3,
                          padding:'3px',cursor:'pointer',fontSize:10,fontWeight:700}}>
                        ▶ Start Render
                      </button>
                    )}
                    {job.status==='rendering' && (
                      <div style={{height:4,background:'#1a1f2e',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${job.progress}%`,background:'#FF6600',transition:'width 0.1s'}}/>
                      </div>
                    )}
                    {job.status==='done' && (
                      <div style={{color:'#00ffc8',fontSize:9}}>✓ Complete — {job.addedAt}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected object properties */}
              {selected3DId && (() => {
                const obj = scene3DObjects.find(o=>o.id===selected3DId);
                if (!obj) return null;
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{color:'#FF6600',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Properties</div>

                    {/* Transform */}
                    {['position','rotation','scale'].map(prop=>(
                      <div key={prop}>
                        <div style={{color:'#888',fontSize:9,marginBottom:3,textTransform:'uppercase'}}>{prop}</div>
                        <div style={{display:'flex',gap:4}}>
                          {['x','y','z'].map(ax=>(
                            <div key={ax} style={{flex:1}}>
                              <span style={{color:'#555',fontSize:8}}>{ax.toUpperCase()}</span>
                              <input type="number" step={prop==='scale'?0.1:0.5}
                                value={Number((obj[prop]?.[ax]??0)).toFixed(2)}
                                onChange={e=>{
                                  const v = Number(e.target.value);
                                  update3DObject(obj.id,{[prop]:{...obj[prop],[ax]:v}});
                                  if (prop==='position') addKeyframe(obj.id,'position',{...obj.position,[ax]:v});
                                }}
                                style={{width:'100%',background:'#06060f',border:'1px solid #333',
                                  color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}/>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* PBR Material */}
                    <div style={{color:'#888',fontSize:9,textTransform:'uppercase',marginTop:4}}>Material</div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{color:'#666',fontSize:10,width:60}}>Color</span>
                      <input type="color" value={obj.material?.color||'#888888'}
                        onChange={e=>update3DObject(obj.id,{material:{...obj.material,color:e.target.value}})}
                        style={{width:36,height:24,border:'none',borderRadius:3,cursor:'pointer'}}/>
                    </div>
                    {[['Roughness','roughness',0,1,0.01],['Metalness','metalness',0,1,0.01],['Opacity','opacity',0,1,0.01]].map(([lbl,key,min,max,step])=>(
                      <div key={key} style={{display:'flex',gap:6,alignItems:'center'}}>
                        <span style={{color:'#666',fontSize:10,width:60}}>{lbl}</span>
                        <input type="range" min={min} max={max} step={step}
                          value={obj.material?.[key]??PBR_DEFAULTS[key]}
                          onChange={e=>update3DObject(obj.id,{material:{...obj.material,[key]:Number(e.target.value)}})}
                          style={{flex:1}}/>
                        <span style={{color:'#00ffc8',fontSize:9,width:28}}>{Number(obj.material?.[key]??PBR_DEFAULTS[key]).toFixed(2)}</span>
                      </div>
                    ))}

                    {/* Material Presets */}
                    <div style={{marginTop:6}}>
                      <div style={{color:'#888',fontSize:9,textTransform:'uppercase',marginBottom:4}}>Material Presets</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3}}>
                        {MATERIAL_PRESETS.map(p=>(
                          <button key={p.id} onClick={()=>applyMaterialPreset(selected3DId,p.id)}
                            style={{padding:'3px 4px',border:'none',borderRadius:3,cursor:'pointer',fontSize:9,
                              background:'#1a1f2e',color:'#aaa',textAlign:'left',
                              borderLeft:`3px solid ${p.color}`}}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label style={{display:'flex',gap:6,alignItems:'center',cursor:'pointer'}}>
                      <input type="checkbox" checked={obj.material?.wireframe||false}
                        onChange={e=>update3DObject(obj.id,{material:{...obj.material,wireframe:e.target.checked}})}/>
                      <span style={{color:'#888',fontSize:10}}>Wireframe</span>
                    </label>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── NLA / Keyframe Timeline (Session 7) ─────────────────────── */}
          <div style={{height:160,background:'#0d1117',borderTop:'1px solid #21262d',flexShrink:0,display:'flex',flexDirection:'column'}}>
            <div style={{height:28,display:'flex',alignItems:'center',gap:10,padding:'0 12px',borderBottom:'1px solid #21262d'}}>
              <span style={{color:'#FF6600',fontSize:10,fontWeight:700,fontFamily:'JetBrains Mono'}}>NLA EDITOR</span>
              <button onClick={()=>setKfPlaying(p=>!p)}
                style={{padding:'2px 12px',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,
                  background:kfPlaying?'#ff4444':'#00ffc8',color:kfPlaying?'#fff':'#06060f',fontWeight:700}}>
                {kfPlaying?'⏹ Stop':'▶ Play'}
              </button>
              <span style={{color:'#888',fontSize:10}}>t = {kfTime.toFixed(2)}s</span>
              <input type="range" min={0} max={kfDuration} step={0.01} value={kfTime}
                onChange={e=>setKfTime(Number(e.target.value))}
                style={{width:200}}/>
              <span style={{color:'#555',fontSize:10}}>dur:</span>
              <input type="number" min={1} max={60} value={kfDuration}
                onChange={e=>setKfDuration(Number(e.target.value))}
                style={{width:40,background:'#06060f',border:'1px solid #333',color:'#dde6ef',borderRadius:3,padding:'2px 4px',fontSize:10}}/>
              <span style={{color:'#555',fontSize:10}}>s</span>
              <div style={{flex:1}}/>
              {selected3DId && (
                <button onClick={()=>{
                  const obj = scene3DObjects.find(o=>o.id===selected3DId);
                  if (obj) { addKeyframe(selected3DId,'position',obj.position); addKeyframe(selected3DId,'rotation',obj.rotation); }
                }}
                  style={{padding:'2px 10px',border:'1px solid #FF6600',borderRadius:3,cursor:'pointer',fontSize:10,background:'transparent',color:'#FF6600'}}>
                  ◆ Insert Keyframe
                </button>
              )}
            </div>

            {/* Timeline tracks */}
            <div style={{flex:1,overflowX:'auto',overflowY:'auto',padding:'4px 0'}}>
              {scene3DObjects.filter(o=>o.keyframes?.length>0).map(obj=>(
                <div key={obj.id} style={{display:'flex',alignItems:'center',height:24,borderBottom:'1px solid #0a0e1a'}}>
                  <div style={{width:120,padding:'0 8px',color:'#888',fontSize:10,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {obj.name}
                  </div>
                  <div style={{flex:1,position:'relative',height:'100%',background:'#06060f'}}>
                    {obj.keyframes.map((kf,i)=>(
                      <div key={i} style={{
                        position:'absolute',top:'50%',transform:'translate(-50%,-50%)',
                        left:`${(kf.time/kfDuration)*100}%`,
                        width:8,height:8,background:'#FF6600',
                        clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)',
                        cursor:'pointer',
                      }} title={`t=${kf.time.toFixed(2)} ${kf.prop}`}/>
                    ))}
                    {/* Playhead */}
                    <div style={{position:'absolute',top:0,bottom:0,width:1,background:'#00ffc8',
                      left:`${(kfTime/kfDuration)*100}%`,pointerEvents:'none'}}/>
                  </div>
                </div>
              ))}
              {scene3DObjects.every(o=>!o.keyframes?.length) && (
                <div style={{color:'#333',fontSize:10,padding:'8px 130px',fontFamily:'JetBrains Mono'}}>
                  No keyframes yet — select an object and click Insert Keyframe
                </div>
              )}
            </div>
          </div>
        </div>
      )}

  </>);
}