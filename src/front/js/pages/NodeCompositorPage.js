import React, { useEffect, useMemo } from "react";
import * as THREE from 'three';


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
  // ── Three.js scene bootstrap ──────────────────────────────────────────────
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

    // Grid helper
    const grid = new THREE.GridHelper(20, 20, '#21262d', '#21262d');
    scene.add(grid);

    // Axes helper
    const axes = new THREE.AxesHelper(3);
    scene.add(axes);

    // Default lights
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

  const addShaderNode = () => {
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

  return (
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
              <button onClick={handleRenderProject}
                style={{ width:"100%", padding:"8px", borderRadius:6, cursor:"pointer",
                  fontWeight:700, fontSize:12, background:"#00ffc8", color:"#000", border:"none" }}>
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
                  color: "#d9eaff",
                }}
              >
{JSON.stringify({ currentTime, edges, rotoShape, graphResult, engineEvaluation }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
      {/* ── Blender Lite 3D Viewport toggle ──────────────────────────────── */}
      <button onClick={()=>setShow3D(s=>!s)}
        title="Toggle 3D Viewport"
        style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:1000,
          padding:'8px 24px',borderRadius:20,border:'2px solid #00ffc8',
          background:show3D?'#00ffc8':'#0d1117',color:show3D?'#06060f':'#00ffc8',
          cursor:'pointer',fontWeight:700,fontSize:12,fontFamily:'JetBrains Mono',
          boxShadow:'0 4px 20px rgba(0,255,200,0.3)'}}>
        {show3D ? '✕ Close 3D' : '⬡ 3D Viewport'}
      </button>

      {/* ── 3D Viewport Panel ─────────────────────────────────────────────── */}
      {show3D && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#06060f',zIndex:2000,display:'flex',flexDirection:'column'}}>

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

  );
}