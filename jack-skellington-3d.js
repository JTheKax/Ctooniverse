import * as THREE from 'https://esm.sh/three@0.170.0';
// Stylized procedural Jack Skellington, shared between preview and combat.
export function buildJack(){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.83});
 const bone=material('#f1eee2'),suit=material('#16151d'),stripe=material('#a5a5ae'),dark=material('#09080d'),white=material('#ffffff');
 function orb(parent,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
 function bar(parent,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);parent.add(m);return m}
 orb(body,bone,0,3.38,0,.36,.43,.31);
 for(const side of [-1,1])orb(body,dark,side*.14,3.42,.27,.125,.145,.055);
 for(let i=-3;i<=3;i++)bar(body,dark,i*.058,3.13,.3,.025,.045,.018);
 bar(body,suit,0,2.34,0,.51,.99,.28);
 for(let i=-2;i<=2;i++)bar(body,stripe,i*.09,2.34,.151,.013,.92,.012);
 bar(body,white,0,2.66,.18,.17,.3,.025);
 const bow=new THREE.Group();bow.position.set(0,2.87,.2);body.add(bow);
 for(const side of [-1,1]){const wing=orb(bow,dark,side*.23,0,0,.25,.105,.06);wing.rotation.z=side*.4;orb(bow,bone,side*.35,.08,.06,.07,.055,.04)}orb(bow,dark,0,0,.07,.09,.09,.08);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.36,2.75,0);body.add(arm);
  bar(arm,suit,side*.08,-.43,0,.14,.84,.16);
  orb(arm,suit,side*.08,-.86,0,.085,.09,.09);
  bar(arm,suit,side*.08,-.99,0,.115,.28,.13);
  for(let i=0;i<5;i++)bar(arm,stripe,side*.08,-.15-i*.17,.086,.12,.013,.012);
  orb(arm,bone,side*.08,-1.17,0,.105,.12,.09);
  for(let j=-2;j<=2;j++){const finger=bar(arm,bone,side*.08+j*.044,-1.32+Math.abs(j)*.022,.035,.025,.19-Math.abs(j)*.018,.028);finger.rotation.z=j*.08;}
  arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.14,1.83,0);body.add(leg);
  bar(leg,suit,0,-.73,0,.17,1.45,.19);
  for(let i=0;i<7;i++)bar(leg,stripe,0,-.16-i*.17,.104,.14,.014,.012);
  orb(leg,dark,0,-1.49,.18,.17,.12,.34);legs.push(leg);
 }
 return {root,body,arms,legs,phase:0,cape:null};
}
export function mountJack(container){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(0,2.1,7.3);camera.lookAt(0,2,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;container.replaceChildren(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xdfe6ff,0x45345d,3));const lamp=new THREE.DirectionalLight(0xffffff,2);lamp.position.set(-3,6,4);scene.add(lamp);
 const model=buildJack();scene.add(model.root);let active=true,frame=0;
 function resize(){const w=container.clientWidth||300,h=container.clientHeight||360;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();
 function tick(){if(!active)return;frame+=.02;model.root.rotation.y=Math.sin(frame*.3)*.3;model.body.position.y=Math.sin(frame*2)*.04;model.arms[0].rotation.z=Math.sin(frame)*.08;model.arms[1].rotation.z=-Math.sin(frame)*.08;renderer.render(scene,camera);requestAnimationFrame(tick)}tick();
 return()=>{active=false;observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}});renderer.dispose();renderer.domElement.remove()};
}
