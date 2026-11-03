(()=>{'use strict';
const canvas=document.getElementById('pinball-canvas'),ctx=canvas?.getContext('2d');if(!ctx)return;
const W=420,H=680,scoreEl=document.getElementById('pinball-score'),bestEl=document.getElementById('pinball-best'),ballsEl=document.getElementById('pinball-balls'),msg=document.getElementById('pinball-message');
const leftBtn=document.getElementById('pinball-left'),rightBtn=document.getElementById('pinball-right'),launchBtn=document.getElementById('pinball-launch');
let score=0,best=0,balls=3,active=false,over=false,last=0,left=false,right=false,launchHeld=false;
const ball={x:379,y:610,vx:0,vy:0,r:9};const bumpers=[{x:126,y:210,r:31,c:'#ffca36',points:100},{x:271,y:204,r:31,c:'#ff65b8',points:100},{x:199,y:316,r:36,c:'#43dbff',points:150},{x:105,y:402,r:24,c:'#98f84a',points:50},{x:298,y:407,r:24,c:'#ff973c',points:50}];
function resetBall(){active=false;ball.x=379;ball.y=610;ball.vx=0;ball.vy=0;launchBtn.disabled=false;msg.textContent=over?'Game over! Press LAUNCH BALL to play again.':'Ready to launch!'}
function newGame(){score=0;balls=3;over=false;scoreEl.textContent=0;ballsEl.textContent=3;resetBall()}
function launch(){if(active)return;if(over)newGame();active=true;ball.x=379;ball.y=605;ball.vx=-2.3;ball.vy=-15.4;launchBtn.disabled=true;msg.textContent='Keep it bouncing!'}
function addScore(n){score+=n;scoreEl.textContent=score.toLocaleString();if(score>best){best=score;bestEl.textContent=best.toLocaleString()}}
function hitCircle(cx,cy,r,boost=1.1){const dx=ball.x-cx,dy=ball.y-cy,d=Math.hypot(dx,dy);if(d>=r+ball.r)return false;const nx=dx/(d||1),ny=dy/(d||1);ball.x=cx+nx*(r+ball.r+1);ball.y=cy+ny*(r+ball.r+1);const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx=(ball.vx-2*dot*nx)*boost;ball.vy=(ball.vy-2*dot*ny)*boost}return true}
function segment(x1,y1,x2,y2,power=0){const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((ball.x-x1)*dx+(ball.y-y1)*dy)/(dx*dx+dy*dy)));const cx=x1+t*dx,cy=y1+t*dy;const dist=Math.hypot(ball.x-cx,ball.y-cy);if(dist>ball.r+7)return;const nx=(ball.x-cx)/(dist||1),ny=(ball.y-cy)/(dist||1);ball.x=cx+nx*(ball.r+8);ball.y=cy+ny*(ball.r+8);const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=1.7*dot*nx;ball.vy-=1.7*dot*ny}if(power){ball.vy=Math.min(ball.vy,-power);ball.vx+=power*(x1<210?0.22:-0.22)}}
function step(dt){if(!active)return;for(let k=0;k<2;k++){const t=dt/2;ball.vy+=0.27*t;ball.x+=ball.vx*t;ball.y+=ball.vy*t;ball.vx*=0.999;ball.vy*=0.999;
if(ball.x<ball.r+20){ball.x=ball.r+20;ball.vx=Math.abs(ball.vx)*.86}if(ball.x>W-ball.r-18){ball.x=W-ball.r-18;ball.vx=-Math.abs(ball.vx)*.86}if(ball.y<ball.r+27){ball.y=ball.r+27;ball.vy=Math.abs(ball.vy)*.86}
for(const b of bumpers){if(hitCircle(b.x,b.y,b.r,1.12)){addScore(b.points);ball.vy=Math.max(-14,Math.min(14,ball.vy))}}
segment(20,500,88,560);segment(400,500,330,560);
const ly=left?563:589,ry=right?563:589;
segment(110,580,190,ly,left?12:0);segment(310,580,230,ry,right?12:0);
if(ball.y>H+12){active=false;balls--;ballsEl.textContent=balls;if(balls<=0){over=true;msg.textContent='Game over! Final score: '+score.toLocaleString()+'. Press Launch to restart.'}else msg.textContent='Ball lost! '+balls+' balls remaining.';resetBall();break}
ball.vx=Math.max(-13,Math.min(13,ball.vx));ball.vy=Math.max(-17,Math.min(17,ball.vy));}}
function draw(){ctx.clearRect(0,0,W,H);const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#38218b');bg.addColorStop(1,'#100d39');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
ctx.strokeStyle='#6e56e5';ctx.lineWidth=2;for(let i=0;i<11;i++){ctx.beginPath();ctx.moveTo(0,i*75);ctx.lineTo(W,i*75);ctx.stroke()}
ctx.lineWidth=12;ctx.strokeStyle='#f8d045';ctx.beginPath();ctx.moveTo(20,500);ctx.lineTo(20,110);ctx.quadraticCurveTo(20,28,105,28);ctx.lineTo(315,28);ctx.quadraticCurveTo(400,28,400,110);ctx.lineTo(400,500);ctx.stroke();
ctx.textAlign='center';ctx.font='bold 27px system-ui';ctx.lineWidth=5;ctx.strokeStyle='#190f46';ctx.strokeText('★ CTOON PINBALL ★',210,94);ctx.fillStyle='#ffde58';ctx.fillText('★ CTOON PINBALL ★',210,94);
for(const b of bumpers){ctx.shadowColor=b.c;ctx.shadowBlur=17;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle=b.c;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#241046';ctx.lineWidth=6;ctx.stroke();ctx.fillStyle='#241046';ctx.font='bold 18px system-ui';ctx.fillText('★',b.x,b.y+7)}
ctx.lineCap='round';ctx.lineWidth=15;ctx.strokeStyle='#ff8d40';ctx.beginPath();ctx.moveTo(20,500);ctx.lineTo(88,560);ctx.moveTo(400,500);ctx.lineTo(330,560);ctx.stroke();
ctx.lineWidth=19;ctx.strokeStyle='#10102e';ctx.beginPath();ctx.moveTo(110,580);ctx.lineTo(190,left?563:589);ctx.moveTo(310,580);ctx.lineTo(230,right?563:589);ctx.stroke();
ctx.lineWidth=12;ctx.strokeStyle='#54edff';ctx.beginPath();ctx.moveTo(110,580);ctx.lineTo(190,left?563:589);ctx.moveTo(310,580);ctx.lineTo(230,right?563:589);ctx.stroke();
ctx.fillStyle='#fef5ba';ctx.shadowColor='#fff';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
ctx.fillStyle='#e5dfff';ctx.font='bold 15px system-ui';ctx.fillText('BONUS BUMPERS + POINTS',210,473);ctx.fillText('FLIP TO SAVE!',210,644)}
function frame(ts){const dt=Math.min(2,(ts-last)/16.67||1);last=ts;step(dt);draw();requestAnimationFrame(frame)}
function bind(btn,set){btn.addEventListener('pointerdown',e=>{e.preventDefault();set(true);btn.setPointerCapture(e.pointerId)});for(const type of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(type,()=>set(false))}
bind(leftBtn,v=>left=v);bind(rightBtn,v=>right=v);launchBtn.addEventListener('click',launch);
window.addEventListener('keydown',e=>{if(['Space','ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();if(e.code==='Space'&&!e.repeat)launch();if(['ArrowLeft','KeyA'].includes(e.code))left=true;if(['ArrowRight','KeyD'].includes(e.code))right=true}});
window.addEventListener('keyup',e=>{if(['ArrowLeft','KeyA'].includes(e.code))left=false;if(['ArrowRight','KeyD'].includes(e.code))right=false});
window.addEventListener('blur',()=>{left=false;right=false});requestAnimationFrame(frame);
})();