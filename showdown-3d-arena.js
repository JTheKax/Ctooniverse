// WebGL 3D combat overlay. Uses the same coordinate/state system as the 2D training simulation.
import * as THREE from 'https://esm.sh/three@0.170.0';
import {buildJack} from './jack-skellington-3d.js';
export function createArena3D(canvas){
 const host=canvas.parentElement;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='showdown-webgl';
 renderer.domElement.setAttribute('aria-hidden','true');
 host.append(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(36,960/540,.1,100);
 camera.position.set(0,3.5,13.8);camera.lookAt(0,1.8,0);
 scene.add(new THREE.HemisphereLight(0xe1edff,0x3b275b,2.5));
 const sun=new THREE.DirectionalLight(0xffe0b4,3.1);sun.position.set(-4,8,7);scene.add(sun);
 const rim=new THREE.DirectionalLight(0x7f83ff,2);rim.position.set(5,4,-4);scene.add(rim);
 const mat=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.43:.82});
 const skin=mat('#e4a075'),hair=mat('#b45c24'),bronze=mat('#b7833d',.45),gold=mat('#ffcc65',.55),red=mat('#a82640'),blue=mat('#28427c'),enemySkin=mat('#99a9d7'),enemyHair=mat('#293352'),white=mat('#ffffff'),dark=mat('#171629');
 function orb(parent,material,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
 function limb(parent,material,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.CapsuleGeometry(sx,Math.max(.01,sy-2*sx),5,12),material);m.position.set(x,y,z);m.scale.z=sz/sx;parent.add(m);return m}
 function build(hercules){
  const root=new THREE.Group();scene.add(root);
  const body=new THREE.Group();root.add(body);
  const flesh=hercules?skin:enemySkin,headHair=hercules?hair:enemyHair,plate=hercules?bronze:blue;
  orb(body,plate,0,2.25,0,.52,.65,.35);
  orb(body,hercules?blue:dark,0,1.64,0,.38,.29,.31);
  orb(body,hercules?gold:white,0,2.49,.32,.34,.1,.09);
  orb(body,flesh,0,3.14,0,.32,.4,.29);
  orb(body,headHair,0,3.46,-.04,.35,.2,.32);
  for(let i=0;i<6;i++)orb(body,headHair,-.27+i*.11,3.48+(i%2)*.09,.17,.12,.14,.14);
  for(const side of [-1,1]){orb(body,white,side*.13,3.2,.25,.075,.07,.035);orb(body,dark,side*.13,3.2,.28,.032,.04,.02)}
  const arms=[],legs=[];
  for(const side of [-1,1]){
   orb(body,plate,side*.59,2.63,0,.29,.25,.28);
   const arm=new THREE.Group();arm.position.set(side*.64,2.54,0);body.add(arm);
   limb(arm,flesh,side*.11,-.38,.02,.17,.78,.18);
   orb(arm,hercules?gold:blue,side*.16,-.65,.03,.19,.16,.18);
   orb(arm,flesh,side*.18,-.82,.06,.19,.2,.18);
   arms.push(arm);
   const leg=new THREE.Group();leg.position.set(side*.26,1.47,0);body.add(leg);
   limb(leg,flesh,side*.03,-.48,0,.21,.95,.22);
   orb(leg,plate,side*.03,-1.04,.18,.23,.16,.38);
   legs.push(leg);
  }
  let cape=null;
  if(hercules){const shape=new THREE.Shape();shape.moveTo(-.45,2.72);shape.lineTo(.45,2.72);shape.lineTo(.75,.55);shape.quadraticCurveTo(0,.35,-.75,.55);shape.closePath();cape=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0xab2940,side:THREE.DoubleSide,roughness:.9}));cape.position.z=-.38;body.add(cape)}
  return {root,body,arms,legs,cape,phase:0};
 }
 const hercules=build(true),jack=buildJack(),rival=build(false);scene.add(jack.root);
 // Both characters use the same ground plane and body-part pivot conventions.
 const platform=new THREE.Mesh(new THREE.PlaneGeometry(15,4),new THREE.MeshStandardMaterial({color:0x302655,roughness:.8}));platform.rotation.x=-Math.PI/2;platform.position.y=-.06;scene.add(platform);
 const rings=new THREE.GridHelper(15,15,0xb95bea,0x473f7d);rings.position.y=-.04;scene.add(rings);
 const geometry=new THREE.TorusGeometry(.35,.045,8,28);const aura=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xffdb63,transparent:true,opacity:.85}));aura.visible=false;scene.add(aura);
 let active=true;
 function resize(){const w=canvas.clientWidth||host.clientWidth||960,h=canvas.clientHeight||w*540/960;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 function pose(model,f,t){model.root.position.set((f.x-480)/95,Math.max(0,(445-f.y)/105),0);model.root.rotation.y=f.face===1?.38:-.38;model.phase+=t;
 const walking=Math.abs(f.vx)>.1?Math.sin(model.phase*13)*.36:Math.sin(model.phase*2)*.035;
 model.legs[0].rotation.set(0,0,walking);model.legs[1].rotation.set(0,0,-walking);
 model.arms[0].rotation.set(0,0,-walking*.35);model.arms[1].rotation.set(0,0,walking*.35);
 model.body.position.y=f.crouch?-.48:Math.sin(model.phase*3)*.025;model.body.rotation.z=0;
 if(f.guard){model.arms[0].rotation.z=-.95;model.arms[1].rotation.z=.95;model.arms[0].rotation.x=-.45;model.arms[1].rotation.x=-.45}
 else if(f.attack>0){const duration=f.kind==='special'?.48:f.kind==='kick'?.33:.24;
  const progress=1-Math.min(1,f.attack/duration),impulse=Math.sin(Math.PI*progress);
  const forward=f.face===1?1:-1,arm=forward===1?model.arms[1]:model.arms[0],leg=forward===1?model.legs[1]:model.legs[0];
  arm.rotation.z=forward*1.55*impulse;arm.rotation.x=-.3*impulse;
  if(f.kind==='kick'){arm.rotation.z=forward*.35;leg.rotation.z=forward*1.1*impulse;leg.rotation.x=-.4*impulse}
  if(f.kind==='special'){model.arms[0].rotation.z=-1.4*impulse;model.arms[1].rotation.z=1.4*impulse;model.body.rotation.z=forward*.14*impulse}
 }
 if(model.cape)model.cape.rotation.y=Math.sin(model.phase*4)*.08;
 }
 function render(hero,cpu,dt,selected='disney-hercules'){if(!active)return;const useJack=selected==='jack-skellington';hercules.root.visible=!useJack;jack.root.visible=useJack;pose(useJack?jack:hercules,hero,dt);pose(rival,cpu,dt);aura.visible=hero.attack>0&&hero.kind==='special';if(aura.visible){aura.position.set((useJack?jack:hercules).root.position.x+hero.face*.85,2.1+(useJack?jack:hercules).root.position.y,0);aura.rotation.y=Math.PI/2;aura.scale.setScalar(1+Math.sin(performance.now()*.025)*.2)}renderer.render(scene,camera)}
 function destroy(){active=false;observer.disconnect();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}});renderer.domElement.remove()}
 return {render,destroy};
}
