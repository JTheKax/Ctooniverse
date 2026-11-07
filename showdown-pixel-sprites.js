// Ctoon Showdown standard: crisp 2D pixel-art character sprites.
// M.U.G.E.N.-inspired arcade proportions, expressive silhouettes and pose API.
// Original procedural artwork; no third-party game sprite sheets.
// Add future fighters to PALETTES and/or draw their custom silhouette here.
export const PALETTES={
 'disney-hercules':{skin:'#e9aa77',shade:'#b96d50',hair:'#a34a20',body:'#bd8740',trim:'#f5d56e',pants:'#2855a0',cape:'#a52743',eyes:'#24243b'},
 'jack-skellington':{skin:'#f3f0e4',shade:'#b3b0ad',hair:'#15141b',body:'#1b1925',trim:'#a4a2b0',pants:'#191820',cape:null,eyes:'#0b0a13'},
 'training-rival':{skin:'#a3b5db',shade:'#6c7eb2',hair:'#27365d',body:'#334b91',trim:'#b0d5fa',pants:'#25396c',cape:null,eyes:'#171b34'}
};
// Illustrated atlas contract: 3 columns and one row per animation, transparent PNG.
// Missing assets safely fall back to procedural art until production sheets are uploaded.
export const FIGHTER_SPRITES={
 'disney-hercules':{url:'./images/showdown/hercules-cleaned-atlas.png',frameWidth:192,frameHeight:224},
 'jack-skellington':{url:'./images/showdown/jack-cleaned-atlas.png',frameWidth:192,frameHeight:224}
};
export const ANIMATIONS=['idle','walk','run','punch','kick','block','jump','crouch','special','hurt','ko'];
const atlases=new Map();
export function loadFighterSprites(id){
 const asset=FIGHTER_SPRITES[id];if(!asset)return Promise.resolve(false);
 if(atlases.has(id))return atlases.get(id).promise;
 const state={image:null,ready:false,promise:null};atlases.set(id,state);
 const candidates=[asset.url,asset.url.replace('-cleaned-atlas.png','-atlas.svg')];
 state.promise=new Promise(resolve=>{
  function tryNext(index){
   if(index>=candidates.length){resolve(false);return}
   const image=new Image();image.decoding='async';
   image.onload=()=>{
    if(image.naturalWidth>=asset.frameWidth*3&&image.naturalHeight>=asset.frameHeight*ANIMATIONS.length){
     state.image=image;state.ready=true;resolve(true);
    }else tryNext(index+1);
   };
   image.onerror=()=>tryNext(index+1);
   image.src=candidates[index];
  }
  tryNext(0);
 });return state.promise;
}
function atlasFrame(ctx,id,pose,step,x,y,width,height){
 const state=atlases.get(id),config=FIGHTER_SPRITES[id];if(!state?.ready||!config)return false;
 const row=ANIMATIONS.indexOf(pose);if(row<0)return false;
 ctx.drawImage(state.image,(step%3)*config.frameWidth,row*config.frameHeight,config.frameWidth,config.frameHeight,x,y,width,height);return true;
}
const cache=new Map();
const spritePlayback=new WeakMap();
function sprite(id,pose,step){
 const key=id+':'+pose+':'+step;if(cache.has(key))return cache.get(key);
 const p=PALETTES[id]||PALETTES['training-rival'],jack=id==='jack-skellington';
 const c=document.createElement('canvas');c.width=96;c.height=112;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 const px=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h))};
 const outline='#14111d';
 const polygon=(color,points)=>{x.fillStyle=color;x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fill()};const walking=pose==='walk'?(step===0?-4:step===1?0:4):0,low=pose==='crouch'?9:0,jump=pose==='jump'?-4:0;

 const attacking=['punch','kick','special'].includes(pose),kick=pose==='kick',guard=pose==='block';
 const attackReach=step===0?3:step===1?9:15;
 // Arcade sprites are composed at a consistent native resolution with hard pixel edges.
 x.save();x.translate(15,5);x.scale(1.02,1.24);
 // Character shadow is rendered in the arena, not in the sprite.
 if(p.cape){polygon(outline,[[20,27+low],[43,28+low],[51,64],[36,60],[18,72],[15,51]]);polygon(p.cape,[[21,29+low],[42,30+low],[48,61],[35,57],[19,68],[18,50]]);polygon('#d44859',[[20,32+low],[24,34+low],[21,62],[18,65]])}
 // Legs, sandals and boots.
 const legs=[{x:24,offset:walking},{x:36,offset:-walking}];
 for(let i=0;i<2;i++){const leg=legs[i];const extended=kick&&i===1;
  const legTop=47+low+leg.offset,legLength=pose==='crouch'?14:21;
  if(!extended){px(outline,leg.x-5,legTop,11,legLength+2);px(p.pants,leg.x-3,legTop+1,7,legLength-1)}
  if(extended){px(outline,36,50+low,20,9);px(p.pants,38,51+low,15,6);px(outline,52,51+low,10,9);px(p.trim,54,53+low,6,4)}
  else{const footY=Math.min(72,legTop+legLength);px(outline,leg.x-6,footY,14,7);px(jack?'#24222b':p.trim,leg.x-4,footY+1,12,5)}
 }
 // Torso with differentiated silhouette.
 if(jack){polygon(outline,[[27,27+low+jump],[39,27+low+jump],[42,48+low],[38,54+low],[26,53+low],[24,44+low]]);polygon(p.body,[[29,29+low+jump],[37,29+low+jump],[39,48+low],[37,52+low],[28,51+low],[26,44+low]])}
 else{polygon(outline,[[22,26+low+jump],[40,26+low+jump],[49,34+low],[43,48+low],[22,51+low],[15,36+low]]);polygon(p.body,[[23,28+low+jump],[39,28+low+jump],[46,35+low],[41,46+low],[23,48+low],[18,36+low]]);polygon('#dba451',[[24,30+low],[37,30+low],[43,35+low],[37,39+low],[25,39+low]])}
 if(jack){for(let i=0;i<4;i++)px(p.trim,29+i*3,29+low+jump,1,20);px('#f3f0e4',30,28+low+jump,4,9);
  polygon(outline,[[22,29+low+jump],[30,31+low+jump],[33,29+low+jump],[36,31+low+jump],[44,29+low+jump],[40,35+low+jump],[33,32+low+jump],[26,35+low+jump]]);px(p.trim,32,30+low+jump,2,3)}
 else{px(p.trim,22,30+low+jump,21,4);px('#fff1b5',25,31+low+jump,14,1);px(p.trim,28,43+low+jump,11,4);px(p.pants,25,48+low,17,5)}
 // Arms and hands, with attack and guard frames.
 for(const side of [-1,1]){
  const ax=side<0?(jack?23:16):(jack?41:47),ay=30+low+jump;
  const punch=attacking&&side===1&&!kick;
  if(punch){const reach=attackReach;px(outline,ax-1,ay+4,reach+5,9);px(jack?p.body:p.skin,ax+1,ay+6,reach+1,5);px(outline,Math.min(56,ax+reach),ay+2,7,12);px(p.skin,Math.min(57,ax+reach+1),ay+4,5,8)}
  else if(guard){px(outline,ax-4,ay-7,9,19);px(jack?p.body:p.skin,ax-2,ay-5,5,15);px(p.skin,ax-3,ay-9,7,6)}
  else{px(outline,ax-5,ay,10,22);px(jack?p.body:p.skin,ax-3,ay+2,6,17);px(outline,ax-5,ay+19,10,8);px(p.skin,ax-3,ay+20,6,6);
   if(jack){for(let j=0;j<3;j++)px(p.skin,ax-3+j*2,ay+25,1,5)}}
 }
 // Head and facial identity.
 if(jack){
  polygon(outline,[[23,7+jump],[29,3+jump],[39,4+jump],[45,10+jump],[46,20+jump],[42,28+jump],[25,29+jump],[19,21+jump],[19,13+jump]]);
  polygon(p.skin,[[24,9+jump],[30,5+jump],[39,6+jump],[43,11+jump],[44,20+jump],[40,26+jump],[26,27+jump],[21,20+jump],[21,13+jump]]);
  px('#ffffff',26,8+jump,9,2);px(p.shade,22,20+jump,4,4);
  px(p.eyes,24,13+jump,7,7);px(p.eyes,35,13+jump,7,7);
  px(p.eyes,26,23+jump,14,2);for(let i=0;i<5;i++)px(p.eyes,27+i*3,22+jump,1,4);
  px(p.skin,30,27+jump,6,4);
  // Bat-shaped bow tie.
  px(outline,22,29+low+jump,20,6);px(p.skin,31,31+low+jump,3,2);
 }else{
  polygon(outline,[[23,8+jump],[30,5+jump],[40,8+jump],[44,15+jump],[42,24+jump],[36,30+jump],[25,26+jump],[21,18+jump]]);
  polygon(p.skin,[[25,10+jump],[31,8+jump],[39,10+jump],[42,16+jump],[40,23+jump],[35,27+jump],[26,24+jump],[23,18+jump]]);
  px(p.shade,24,19+jump,5,5);px('#f6c49a',32,12+jump,7,3);
  polygon(p.hair,[[20,16+jump],[21,9+jump],[17,7+jump],[25,7+jump],[27,2+jump],[31,6+jump],[37,2+jump],[39,7+jump],[45,5+jump],[43,15+jump],[38,11+jump],[27,12+jump]]);
  px('#df8740',25,7+jump,7,2);px('#74371d',39,9+jump,3,6);
  px('#ffffff',35,16+jump,5,3);px(p.eyes,38,16+jump,2,3);px('#6b3929',33,14+jump,8,1);
  px(p.shade,33,24+jump,7,2);px('#713a2b',35,27+jump,5,1);
 }
 if(pose==='special'){px(jack?'#b7d5ff':'#f7ec88',55,19,6,6);px('#ffffff',57,21,2,2);px(jack?'#8b73d8':'#b26aff',59,15,4,4)}
 // Distinctive shaded outlines, muscle/suit highlights and secondary motion.
 if(jack){
  px('#53505d',29,35+low,2,13);px('#eeeeed',27,9+jump,3,3);
  px('#5c5967',25,54+low,2,12);px('#5c5967',37,54+low,2,12);
  if(pose==='walk'){px('#a5a1a8',25,30+low,1,15);px('#a5a1a8',38,30+low,1,15)}
 }else{
  px('#f4c08b',25,14+jump,4,8);px('#f5d56e',21,33+low,3,13);
  px('#e4b65d',41,33+low,3,12);px('#763a24',23,7+jump,4,4);
  px('#6d3a79',29,48+low,10,2);
 }
 if(pose==='hurt'){px('#fff6c8',40,16+jump,3,3);px('#ff7878',44,14+jump,4,2)}
 // Additional attack anticipation and recovery frames to avoid frozen-looking strikes.
 if(pose==='punch'&&step===0){px(outline,41,30+low,11,9);px(p.skin,43,32+low,7,5)}
 if(pose==='kick'&&step===0){px(outline,39,48+low,13,9);px(p.pants,40,50+low,10,5)}
 if(pose==='idle'&&step===2){px(p.trim,31,45+low,3,2)}
 x.restore();cache.set(key,c);return c;
}
export function drawPixelFighter(ctx,f,id,time=0,ground=445){
 const pose=f.hp<=0?'ko':f.guard?'block':f.crouch?'crouch':f.y<ground-3?'jump':f.attack>0?(f.kind||'punch'):Math.abs(f.vx)>.1?'walk':'idle';
 const playback=spritePlayback.get(f)||{pose:'',start:time};
 if(playback.pose!==pose){playback.pose=pose;playback.start=time;spritePlayback.set(f,playback)}
 const fps=pose==='idle'?4:pose==='walk'?10:pose==='ko'?5:pose==='special'?9:14;
 const index=Math.floor(Math.max(0,time-playback.start)*fps);
 const frame=['ko','hurt','jump','crouch','block'].includes(pose)?Math.min(2,index):index%3;
 const source=sprite(id,pose,frame);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#07071999';ctx.beginPath();ctx.ellipse(f.x,ground+1,42,9,0,0,Math.PI*2);ctx.fill();
 ctx.translate(Math.round(f.x),Math.round(f.y));
 ctx.scale(f.face===-1?-1:1,1);
 // 96x112 arcade sprite, displayed at crisp native 2x resolution.
 if(!atlasFrame(ctx,id,pose,frame,-96,-224,192,224))ctx.drawImage(source,-96,-224,192,224);
 if(pose==='special'){
  const pulse=7+frame*4;ctx.strokeStyle=id==='jack-skellington'?'#a99cff':'#ffe67b';ctx.lineWidth=3;
  ctx.strokeRect(64,-181-pulse/2,18+pulse,18+pulse);
 }
 if(f.hit&&f.attack>0){ctx.strokeStyle='#f4f0a3';ctx.lineWidth=4;ctx.strokeRect(-96,-224,192,224)}
 ctx.restore();
}
export function mountPixelPreview(container,id){
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=224;canvas.className='pixel-fighter-preview';
 container.replaceChildren(canvas);loadFighterSprites(id);const ctx=canvas.getContext('2d');let live=true,raf=0;
 function tick(t){if(!live)return;ctx.clearRect(0,0,192,224);ctx.imageSmoothingEnabled=false;const sequence=['idle','idle','walk','walk','punch','kick','block','special'];const phase=Math.floor(t/700)%sequence.length;
 const pose=sequence[phase],frame=Math.floor(t/110)%3;if(!atlasFrame(ctx,id,pose,frame,0,0,192,224))ctx.drawImage(sprite(id,pose,frame),0,0,192,224);raf=requestAnimationFrame(tick)}
 raf=requestAnimationFrame(tick);return()=>{live=false;cancelAnimationFrame(raf);canvas.remove()};
}
