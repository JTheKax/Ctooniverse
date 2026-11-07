// Articulated 2D fighter rig: all body parts share shoulder, elbow, hip and knee joints.
// The existing CTooniverse avatar image supplies the fighter's custom face and hairstyle.
export function drawRig(ctx,f,ground){
 const moving=Math.abs(f.vx)>30&&f.y>=ground,step=moving?Math.sin(f.pose*14):0;
 const attacking=f.attack&&f.attack.time<.36;
 const punch=attacking&&f.attack.type==='punch',kick=attacking&&f.attack.type==='kick',special=attacking&&f.attack.type==='special';
 const lean=(punch||special?12:0)+(f.stun>0?-12:0);
 const crouch=f.crouch?43:0,shirt=f.colors?.shirt||'#6545d7',skin=f.colors?.skin||'#f2b989';
 const outline='#211634',pants='#252544',shoe='#e6e6fa';
 const joint=(x,y,r,color)=>{ctx.fillStyle=outline;ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()};
 const segment=(a,b,color,width)=>{ctx.lineCap='round';ctx.strokeStyle=outline;ctx.lineWidth=width+6;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};
 const limb=(a,b,c,color,width)=>{segment(a,b,color,width);segment(b,c,color,width*.85);joint(...b,width*.47,color);joint(...c,width*.49,color)};
 const hipY=-73+crouch,shoulderY=-171+crouch+lean*.1;
 const rearFoot=[-33-step*18,-7],rearKnee=[-29-step*12,-37+crouch*.45];
 const frontFoot=kick?[125,-96+crouch]:[31+step*20,-7],frontKnee=kick?[75,-101+crouch]:[28+step*13,-39+crouch*.5];
 // Rear limbs are drawn first, then torso and foreground limbs.
 limb([-20,hipY],rearKnee,rearFoot,pants,22);
 limb([-31,shoulderY],[-53,-141+crouch],[-25,-119+crouch],shirt,17);
 ctx.save();ctx.translate(lean,crouch);
 ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(-45,-179);ctx.quadraticCurveTo(0,-197,45,-179);ctx.lineTo(32,-72);ctx.quadraticCurveTo(0,-60,-32,-72);ctx.closePath();ctx.fill();
 ctx.fillStyle=shirt;ctx.beginPath();ctx.moveTo(-39,-176);ctx.quadraticCurveTo(0,-190,39,-176);ctx.lineTo(28,-79);ctx.quadraticCurveTo(0,-71,-28,-79);ctx.closePath();ctx.fill();
 ctx.fillStyle='#ffffff33';ctx.fillRect(-22,-163,9,65);ctx.restore();
 limb([20,hipY],frontKnee,frontFoot,pants,23);
 segment([frontFoot[0]-5,frontFoot[1]+1],[frontFoot[0]+26,frontFoot[1]+1],shoe,14);
 segment([rearFoot[0]-5,rearFoot[1]+1],[rearFoot[0]+23,rearFoot[1]+1],shoe,13);
 const shoulder=[31+lean,shoulderY],elbow=punch||special?[86,-151+crouch]:[53,-137+crouch],hand=punch||special?[143,-146+crouch]:[27,-114+crouch];
 limb(shoulder,elbow,hand,shirt,19);
 joint(...hand,12,skin);
 // Avatar head is cropped from the existing SVG artwork, preserving saved customization.
 const headY=-253+crouch+lean*.12;
 if(f.img.complete&&f.img.naturalWidth){ctx.drawImage(f.img,40,23,124,140,-49+lean,headY,98,99)}
 else{joint(lean,-207+crouch,43,skin)}
 if(f.guard){ctx.strokeStyle='#80f4ff';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(42,-127+crouch,57,92,0,0,Math.PI*2);ctx.stroke()}
 if(attacking){ctx.fillStyle=special?'#a57affaa':kick?'#ffe276aa':'#78ecffbb';ctx.beginPath();ctx.ellipse(special?163:kick?143:153,special?-145:kick?-95:-146,special?48:26,special?40:20,0,0,Math.PI*2);ctx.fill()}
}
