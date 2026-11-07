// Original procedural 3D Hercules model for Ctoon Showdown. No external mesh assets.
import * as THREE from 'https://esm.sh/three@0.170.0';
export function mountHercules(container){
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,1,0.1,100);camera.position.set(0,2.25,8.8);camera.lookAt(0,1.85,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;container.replaceChildren(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xc8d9ff,0x30204a,2.4));const key=new THREE.DirectionalLight(0xffe1b3,3);key.position.set(-3,7,6);scene.add(key);const rim=new THREE.DirectionalLight(0x718aff,2);rim.position.set(4,4,-3);scene.add(rim);
 const skin=new THREE.MeshStandardMaterial({color:0xe6a477,roughness:.78}),hair=new THREE.MeshStandardMaterial({color:0xb65b20,roughness:.9}),armor=new THREE.MeshStandardMaterial({color:0xb87933,metalness:.45,roughness:.36}),gold=new THREE.MeshStandardMaterial({color:0xffd06a,metalness:.65,roughness:.28}),blue=new THREE.MeshStandardMaterial({color:0x263f82,roughness:.75}),cape=new THREE.MeshStandardMaterial({color:0xa92737,side:THREE.DoubleSide,roughness:.9}),white=new THREE.MeshStandardMaterial({color:0xffffff}),black=new THREE.MeshStandardMaterial({color:0x25202c});
 const hero=new THREE.Group();scene.add(hero);
 function sphere(parent,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
 function cylinder(parent,mat,a,b,r1,r2){const d=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a));const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,d.length(),16),mat);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(m);return m}
 sphere(hero,skin,0,3.47,0,.36,.44,.32);sphere(hero,skin,0,3.08,0,.18,.22,.19);
 sphere(hero,armor,0,2.63,0,.66,.73,.37);sphere(hero,blue,0,1.98,0,.43,.33,.32);
 sphere(hero,gold,0,2.93,.35,.39,.09,.09);sphere(hero,gold,0,2.38,.35,.45,.1,.09);
 for(const side of [-1,1]){
  const x=side*.66;sphere(hero,armor,x,2.92,0,.32,.28,.33);
  const upper=cylinder(hero,skin,[side*.78,2.83,0],[side*.95,2.19,.1],.19,.23);
  cylinder(hero,gold,[side*.94,2.25,.1],[side*.97,2.08,.12],.21,.2);
  cylinder(hero,skin,[side*.97,2.07,.12],[side*.89,1.48,.22],.16,.18);
  sphere(hero,skin,side*.89,1.39,.22,.2,.24,.17);
  sphere(hero,blue,side*.28,1.75,0,.3,.33,.32);
  cylinder(hero,skin,[side*.3,1.55,0],[side*.35,.86,.04],.22,.2);
  cylinder(hero,skin,[side*.35,.86,.04],[side*.39,.22,.12],.15,.17);
  sphere(hero,armor,side*.39,.22,.23,.24,.17,.42);
  sphere(hero,white,side*.15,3.52,.28,.1,.095,.045);sphere(hero,black,side*.15,3.52,.32,.04,.055,.024);
 }
 sphere(hero,hair,0,3.81,-.08,.38,.24,.34);
 for(let i=0;i<8;i++){const a=i*Math.PI/7;sphere(hero,hair,Math.cos(a)*.3,3.79+Math.sin(a)*.12,.16,.14,.16,.18)}
 sphere(hero,skin,0,3.3,.32,.11,.1,.12);sphere(hero,black,0,3.18,.31,.13,.025,.025);
 const capeShape=new THREE.Shape();capeShape.moveTo(-.52,3);capeShape.lineTo(.52,3);capeShape.lineTo(.85,.8);capeShape.quadraticCurveTo(0,.45,-.85,.8);capeShape.closePath();const capeMesh=new THREE.Mesh(new THREE.ShapeGeometry(capeShape),cape);capeMesh.position.z=-.4;hero.add(capeMesh);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(1.6,48),new THREE.MeshBasicMaterial({color:0x7254cb,transparent:true,opacity:.3}));ground.rotation.x=-Math.PI/2;ground.position.y=.02;scene.add(ground);
 let frame=0,active=true;function resize(){const w=container.clientWidth||300,h=container.clientHeight||360;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}resize();const observer=new ResizeObserver(resize);observer.observe(container);
 function tick(){if(!active)return;frame+=.018;hero.rotation.y=Math.sin(frame*.35)*.28;hero.position.y=Math.sin(frame*1.5)*.045;renderer.render(scene,camera);requestAnimationFrame(tick)}tick();
 return()=>{active=false;observer.disconnect();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose()});renderer.domElement.remove()};
}
