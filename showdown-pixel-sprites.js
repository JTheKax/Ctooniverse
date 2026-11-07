// Ctoon Showdown standard: crisp 2D pixel-art character sprites.
// Every fighter uses the same 64x80 sprite canvas and pose API.
// Add future fighters to PALETTES and/or draw their custom silhouette here.
export const PALETTES={
 'disney-hercules':{skin:'#e9aa77',shade:'#b96d50',hair:'#a34a20',body:'#bd8740',trim:'#f5d56e',pants:'#2855a0',cape:'#a52743',eyes:'#24243b'},
 'jack-skellington':{skin:'#f3f0e4',shade:'#b3b0ad',hair:'#15141b',body:'#1b1925',trim:'#a4a2b0',pants:'#191820',cape:null,eyes:'#0b0a13'},
 'training-rival':{skin:'#a3b5db',shade:'#6c7eb2',hair:'#27365d',body:'#334b91',trim:'#b0d5fa',pants:'#25396c',cape:null,eyes:'#171b34'}
};
const cache=new Map();
function sprite(id,pose,step){
 const key=id+':'+pose+':'+step;if(cache.has(key))return cache.get(key);
 const p=PALETTES[id]||PALETTES['training-rival'],jack=id==='jack-skellington';
 const c=document.createElement('canvas');c.width=64;c.height=80;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 const px=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h))};
 const outline='#14111d';const walking=pose==='walk'?(step?3:-3):0,low=pose==='crouch'?9:0,jump=pose==='jump'?-4:0;

 const attacking=['punch','kick','special'].includes(pose),kick=pose==='kick',guard=pose==='block';
 // Character shadow is rendered in the arena, not in the sprite.
 if(p.cape){px(outline,15,27+low,34,38-low);px(p.cape,17,29+low,29,34-low);px('#db4b59',19,32+low,3,25-low)}
 // Legs, sandals and boots.
 const legs=[{x:24,offset:walking},{x:36,offset:-walking}];
 for(let i=0;i<2;i++){const leg=legs[i];const extended=kick&&i===1;
  const legTop=47+low+leg.offset,legLength=pose==='crouch'?14:21;
  if(!extended){px(outline,leg.x-5,legTop,11,legLength+2);px(p.pants,leg.x-3,legTop+1,7,legLength-1)}
  if(extended){px(outline,36,50+low,20,9);px(p.pants,38,51+low,15,6);px(outline,52,51+low,10,9);px(p.trim,54,53+low,6,4)}
  else{const footY=Math.min(72,legTop+legLength);px(outline,leg.x-6,footY,14,7);px(jack?'#24222b':p.trim,leg.x-4,footY+1,12,5)}
 }
 // Torso with differentiated silhouette.
 px(outline,jack?26:19,26+low+jump,jack?14:27,26);
 px(p.body,jack?28:21,28+low+jump,jack?10:23,22);
 if(jack){for(let i=0;i<4;i++)px(p.trim,29+i*3,29+low+jump,1,20);px('#f3f0e4',30,28+low+jump,4,9);
  px(outline,23,28+low+jump,18,5);px(p.trim,25,30+low+jump,14,1)}
 else{px(p.trim,22,30+low+jump,21,4);px(p.trim,28,43+low+jump,11,4);px(p.pants,25,48+low,17,5)}
 // Arms and hands, with attack and guard frames.
 for(const side of [-1,1]){
  const ax=side<0?(jack?23:16):(jack?41:47),ay=30+low+jump;
  const punch=attacking&&side===1&&!kick;
  if(punch){const reach=step?13:8;px(outline,ax-1,ay+4,reach+5,9);px(jack?p.body:p.skin,ax+1,ay+6,reach+1,5);px(outline,Math.min(56,ax+reach),ay+2,7,12);px(p.skin,Math.min(57,ax+reach+1),ay+4,5,8)}
  else if(guard){px(outline,ax-4,ay-7,9,19);px(jack?p.body:p.skin,ax-2,ay-5,5,15);px(p.skin,ax-3,ay-9,7,6)}
  else{px(outline,ax-5,ay,10,22);px(jack?p.body:p.skin,ax-3,ay+2,6,17);px(outline,ax-5,ay+19,10,8);px(p.skin,ax-3,ay+20,6,6);
   if(jack){for(let j=0;j<3;j++)px(p.skin,ax-3+j*2,ay+25,1,5)}}
 }
 // Head and facial identity.
 if(jack){
  px(outline,20,5+jump,25,24);px(p.skin,22,7+jump,21,20);
  px(p.eyes,24,13+jump,7,7);px(p.eyes,35,13+jump,7,7);
  px(p.eyes,26,23+jump,14,2);for(let i=0;i<5;i++)px(p.eyes,27+i*3,22+jump,1,4);
  px(p.skin,30,27+jump,6,4);
  // Bat-shaped bow tie.
  px(outline,22,29+low+jump,20,6);px(p.skin,31,31+low+jump,3,2);
 }else{
  px(outline,22,5+jump,21,24);px(p.skin,24,10+jump,17,17);
  px(p.hair,22,5+jump,22,9);px(p.hair,19,9+jump,7,8);px(p.hair,37,7+jump,8,7);
  px('#ffffff',35,16+jump,4,3);px(p.eyes,37,16+jump,2,3);
  px(p.shade,34,23+jump,7,2);
 }
 if(pose==='special'){px(jack?'#b7d5ff':'#f7ec88',55,19,6,6);px('#ffffff',57,21,2,2);px(jack?'#8b73d8':'#b26aff',59,15,4,4)}
 cache.set(key,c);return c;
}
export function drawPixelFighter(ctx,f,id,time=0,ground=445){
 const pose=f.hp<=0?'hurt':f.guard?'block':f.crouch?'crouch':f.y<ground-3?'jump':f.attack>0?(f.kind||'punch'):Math.abs(f.vx)>.1?'walk':'idle';
 const frame=Math.floor(time*9)%2,source=sprite(id,pose,frame);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#07071999';ctx.beginPath();ctx.ellipse(f.x,ground+1,42,9,0,0,Math.PI*2);ctx.fill();
 ctx.translate(Math.round(f.x),Math.round(f.y));
 ctx.scale(f.face===-1?-1:1,1);
 // 64x80 sprite, drawn at exactly 3x resolution.
 ctx.drawImage(source,-96,-240,192,240);
 if(f.hit&&f.attack>0){ctx.strokeStyle='#f4f0a3';ctx.lineWidth=4;ctx.strokeRect(-96,-240,192,240)}
 ctx.restore();
}
export function mountPixelPreview(container,id){
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=240;canvas.className='pixel-fighter-preview';
 container.replaceChildren(canvas);const ctx=canvas.getContext('2d');let live=true,raf=0;
 function tick(t){if(!live)return;ctx.clearRect(0,0,192,240);ctx.imageSmoothingEnabled=false;const frame=Math.floor(t/240)%2;ctx.drawImage(sprite(id,frame?'walk':'idle',frame),0,0,192,240);raf=requestAnimationFrame(tick)}
 raf=requestAnimationFrame(tick);return()=>{live=false;cancelAnimationFrame(raf);canvas.remove()};
}
