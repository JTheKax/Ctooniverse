// CToon Showdown V2 — new, self-contained sprite pipeline.
// Every atlas is 3 columns x 11 rows, with fully transparent backgrounds.
// First candidate is the artwork prepared from the owner's fighter sheets;
// previously published atlases remain fallbacks until new art is uploaded.
export const ACTIONS=['idle','walk','run','punch','kick','block','jump','crouch','special','hurt','ko'];
export const PLAYABLE_IDS=['disney-hercules','jack-skellington'];
const ASSETS={
  'disney-hercules':[
    '/images/showdown/hercules-illustrated-atlas.png',
    '/images/showdown/hercules-cleaned-atlas.png',
    '/images/showdown/hercules-atlas.svg'
  ],
  'jack-skellington':[
    '/images/showdown/jack-illustrated-atlas.png',
    '/images/showdown/jack-cleaned-atlas.png',
    '/images/showdown/jack-skellington-atlas.svg'
  ]
};
const cache=new Map();
export const hasAnimation=id=>Object.hasOwn(ASSETS,id);
export const spriteStatus=id=>{const a=cache.get(id);return {ready:!!a?.image,source:a?.source||null,failed:!!a?.failed};};

function measureRows(image,fw,fh){
  const cvs=document.createElement('canvas');cvs.width=image.naturalWidth;cvs.height=image.naturalHeight;
  const cx=cvs.getContext('2d',{willReadFrequently:true});if(!cx)return ACTIONS.map(()=>({x:0,y:0,w:fw,h:fh}));
  cx.drawImage(image,0,0);
  let data;try{data=cx.getImageData(0,0,cvs.width,cvs.height).data;}catch{return ACTIONS.map(()=>({x:0,y:0,w:fw,h:fh}));}
  const w=cvs.width;
  return ACTIONS.map((_,row)=>{
    let minX=fw,minY=fh,maxX=-1,maxY=-1;
    for(let col=0;col<3;col++){
      for(let y=0;y<fh;y+=2)for(let x=0;x<fw;x+=2){
        if(data[((row*fh+y)*w+col*fw+x)*4+3]<=42)continue;
        if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y;
      }
    }
    if(maxX<minX)return {x:0,y:0,w:fw,h:fh};
    const x=Math.max(0,minX-4),y=Math.max(0,minY-4);
    return {x,y,w:Math.min(fw-x,maxX-x+8),h:Math.min(fh-y,maxY-y+8)};
  });
}
export async function loadSprite(id){
  if(!hasAnimation(id))return false;
  if(cache.get(id)?.promise)return cache.get(id).promise;
  const state={image:null,source:null,failed:false,promise:null,rows:null,id};
  cache.set(id,state);
  state.promise=(async()=>{
    for(const url of ASSETS[id]){
      const img=new Image();img.decoding='async';
      const success=await new Promise(resolve=>{
        img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=url;
      });
      if(!success)continue;
      const fw=img.naturalWidth/3,fh=img.naturalHeight/ACTIONS.length;
      if(!Number.isInteger(fw)||!Number.isInteger(fh)||fw<32||fh<32)continue;
      state.image=img;state.source=url;state.fw=fw;state.fh=fh;
      state.rows=measureRows(img,fw,fh);
      return true;
    }
    state.failed=true;
    return false;
  })();
  return state.promise;
}
export function preloadSprites(){return Promise.all(PLAYABLE_IDS.map(loadSprite));}

function drawFallback(ctx,id,action,frame,height){
  const jack=id==='jack-skellington',ink='#171326',accent=jack?'#9d6dea':'#ebaf45';
  const lift=action==='jump'?28:0,crouch=action==='crouch'?24:0;
  const swing=['punch','special'].includes(action)?frame*11:0;
  const step=['walk','run'].includes(action)?Math.sin(frame*2.1)*14:0;
  ctx.save();ctx.translate(0,-lift);
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=ink;ctx.lineWidth=jack?7:11;
  ctx.beginPath();ctx.moveTo(0,-height*.57+crouch);ctx.lineTo(-20-step,-10);ctx.moveTo(0,-height*.57+crouch);ctx.lineTo(19+step,-10);ctx.stroke();
  ctx.strokeStyle=jack?'#ded7eb':'#ce8046';ctx.lineWidth=jack?4:8;
  ctx.beginPath();ctx.moveTo(0,-height*.59+crouch);ctx.lineTo(-20-step,-12);ctx.moveTo(0,-height*.59+crouch);ctx.lineTo(19+step,-12);ctx.stroke();
  ctx.fillStyle=ink;ctx.fillRect(jack?-15:-25,-height*.78+crouch,jack?30:50,height*.24);
  ctx.fillStyle=jack?'#ddd8e2':'#c0783c';ctx.fillRect(jack?-11:-21,-height*.75+crouch,jack?22:42,height*.18);
  ctx.strokeStyle=ink;ctx.lineWidth=jack?8:14;
  ctx.beginPath();ctx.moveTo(-8,-height*.75+crouch);ctx.lineTo(-39,-height*.50+crouch);ctx.moveTo(9,-height*.75+crouch);ctx.lineTo(39+swing,-height*.52+crouch);ctx.stroke();
  ctx.fillStyle=jack?'#eee9dc':'#f0b27f';
  ctx.beginPath();ctx.ellipse(0,-height*.88+crouch,jack?19:23,jack?21:25,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(jack){ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(-7,-height*.9+crouch,4,6,0,0,Math.PI*2);ctx.ellipse(7,-height*.9+crouch,4,6,0,0,Math.PI*2);ctx.fill();}
  else{ctx.fillStyle='#a64f29';ctx.fillRect(-22,-height*.99+crouch,45,7);}
  ctx.strokeStyle=accent;ctx.lineWidth=4;
  if(action==='special'){ctx.beginPath();ctx.arc(33,-height*.49,18+frame*7,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
export function drawFighter(ctx,id,action,frame,{x=0,ground=0,height=230,face=1,alpha=1}={}){
  const state=cache.get(id),row=Math.max(0,ACTIONS.indexOf(action)),col=Math.max(0,Math.floor(frame))%3;
  ctx.save();ctx.translate(Math.round(x),Math.round(ground));ctx.scale(face<0?-1:1,1);ctx.globalAlpha=alpha;
  if(state?.image){
    const bounds=state.rows[row],idle=state.rows[0];
    // Anchor scale to idle height so animation rows do not grow/shrink.
    const scale=height/Math.max(64,idle.h);
    const sourceWidth=bounds.w,sourceHeight=bounds.h;
    const dw=sourceWidth*scale,dh=sourceHeight*scale;
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(state.image,col*state.fw+bounds.x,row*state.fh+bounds.y,sourceWidth,sourceHeight,
      -dw/2,-dh,dw,dh);
  }else drawFallback(ctx,id,action,col,height);
  ctx.restore();
}
