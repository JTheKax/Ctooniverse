// CToon Showdown V2 — independent 2D combat engine (no old 3D/WebGL state).
import {drawFighter,loadSprite,preloadSprites} from './showdown-v2-sprites.js?v=2';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const NAMES={'disney-hercules':'HERCULES','jack-skellington':'JACK SKELLINGTON'};
const GROUND=442,LEFT=52,RIGHT=908,STEP=1/60;
const ATTACKS={
  punch:{duration:.29,activeStart:.11,activeEnd:.22,reach:109,damage:8,knock:16,gain:12},
  kick:{duration:.44,activeStart:.16,activeEnd:.34,reach:137,damage:12,knock:26,gain:16},
  special:{duration:.67,activeStart:.26,activeEnd:.49,reach:179,damage:24,knock:43,gain:8,cost:40}
};
function fighter(id,x,face){
  return {id,x,face,y:0,vy:0,vx:0,hp:100,meter:0,pose:'idle',poseTime:0,
    attack:null,attackClock:0,hasHit:false,stun:0,block:false,crouch:false,aiCooldown:0};
}
export class ShowdownGame{
  constructor({canvas,ui,controls,onRoundEnd}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.ui=ui;this.controls=[...controls];
    this.onRoundEnd=onRoundEnd||(()=>{});
    this.p1='disney-hercules';this.p2='jack-skellington';
    this.hero=fighter(this.p1,250,1);this.cpu=fighter(this.p2,710,-1);
    this.mode='ready';this.paused=false;this.round=1;this.wins=[0,0];this.draws=0;this.clock=60;
    this.keys=new Set();this.presses=new Set();this.particles=[];this.flash=0;this.shake=0;
    this.label='SELECT YOUR FIGHTER';this.labelUntil=0;this.elapsed=0;this.between=0;
    this.last=0;this.accumulator=0;this.lastHUD=0;this.handlers=[];
    this.bindInputs();preloadSprites();
    this.updateHUD(true);this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  setSelected(id){
    if(!NAMES[id]||this.mode==='fight'||this.mode==='between')return false;
    this.p1=id;this.p2=id==='disney-hercules'?'jack-skellington':'disney-hercules';
    this.hero.id=this.p1;this.cpu.id=this.p2;
    this.ui.start.textContent='START '+NAMES[id];
    this.label='READY TO FIGHT';this.labelUntil=this.elapsed+1.5;
    this.ui.status.textContent=NAMES[id]+' selected. Press Start Match.';
    this.updateHUD(true);loadSprite(id);loadSprite(this.p2);return true;
  }
  setButtons(){
    this.ui.start.disabled=this.mode==='fight'||this.mode==='between';
    this.ui.pause.disabled=this.mode!=='fight';
    this.ui.pause.textContent=this.paused?'RESUME':'PAUSE';
  }
  startMatch(){
    if(this.mode==='fight'||this.mode==='between')return;
    this.round=1;this.wins=[0,0];this.draws=0;this.startRound();
  }
  startRound(){
    this.hero=fighter(this.p1,250,1);this.cpu=fighter(this.p2,710,-1);
    this.clock=60;this.mode='fight';this.paused=false;this.particles.length=0;
    this.flash=0;this.shake=0;this.accumulator=0;
    this.keys.clear();this.presses.clear();
    this.label='ROUND '+this.round+' — FIGHT!';this.labelUntil=this.elapsed+1.4;
    this.ui.status.textContent=NAMES[this.p1]+' VS '+NAMES[this.p2];
    this.setButtons();this.updateHUD(true);
  }
  togglePause(){
    if(this.mode!=='fight')return;
    this.paused=!this.paused;this.keys.clear();this.presses.clear();
    this.setButtons();this.ui.status.textContent=this.paused?'Match paused':'Fight!';
  }
  clearInputs(){this.keys.clear();this.presses.clear();}
  bindInputs(){
    const allowed=new Set(['a','d','w','s','j','k','l','u','arrowleft','arrowright','arrowup','arrowdown']);
    const normalize=k=>({'arrowleft':'a','arrowright':'d','arrowup':'w','arrowdown':'s'}[k]||k);
    const down=e=>{
      const raw=e.key.toLowerCase();if(!allowed.has(raw))return;
      if(document.activeElement?.matches('input,select,textarea,[contenteditable]'))return;
      e.preventDefault();if(e.repeat)return;
      const k=normalize(raw);if(!this.keys.has(k))this.presses.add(k);this.keys.add(k);
    };
    const up=e=>{const raw=e.key.toLowerCase();if(!allowed.has(raw))return;e.preventDefault();this.keys.delete(normalize(raw));};
    const blur=()=>{this.clearInputs();if(this.mode==='fight'&&!this.paused)this.togglePause();};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
    this.handlers.push(()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);});
    for(const button of this.controls){
      const key=button.dataset.key;
      const press=e=>{
        e.preventDefault();if(!this.keys.has(key))this.presses.add(key);this.keys.add(key);
        try{button.setPointerCapture(e.pointerId);}catch{}
      };
      const release=e=>{e.preventDefault();this.keys.delete(key);};
      button.addEventListener('pointerdown',press);
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
      this.handlers.push(()=>{
        button.removeEventListener('pointerdown',press);
        for(const event of ['pointerup','pointercancel','lostpointercapture'])button.removeEventListener(event,release);
      });
    }
  }
  attack(f,type){
    const move=ATTACKS[type];if(!move||f.attack||f.stun>0||f.hp<=0)return false;
    if(move.cost&&f.meter<move.cost)return false;
    if(move.cost)f.meter-=move.cost;
    f.attack=type;f.attackClock=0;f.hasHit=false;f.vx=0;return true;
  }
  processPlayer(){
    const f=this.hero;
    f.block=this.keys.has('l')&&!f.attack&&f.y===0&&f.stun<=0;
    f.crouch=this.keys.has('s')&&!f.block&&f.y===0&&f.stun<=0;
    f.vx=(!f.block&&!f.crouch&&!f.attack&&f.stun<=0)?
      (Number(this.keys.has('d'))-Number(this.keys.has('a')))*238:0;
    if(this.presses.has('w')&&!f.block&&!f.crouch&&f.y===0&&f.stun<=0)f.vy=-615;
    for(const [key,type] of [['u','special'],['k','kick'],['j','punch']]){
      if(this.presses.has(key)){this.attack(f,type);break;}
    }
  }
  processCPU(dt){
    const c=this.cpu,p=this.hero,d=Math.abs(p.x-c.x);
    c.aiCooldown=Math.max(0,c.aiCooldown-dt);
    if(c.stun>0){c.vx=0;c.block=false;return;}
    c.block=!c.attack&&c.y===0&&d<162&&!!p.attack&&Math.random()<.34;
    c.crouch=false;
    c.vx=c.block||c.attack?0:d>110?Math.sign(p.x-c.x)*152:0;
    if(d<167&&c.aiCooldown<=0&&!c.attack&&!c.block){
      const choice=c.meter>=40&&Math.random()<.16?'special':Math.random()<.4?'kick':'punch';
      if(this.attack(c,choice))c.aiCooldown=.45+Math.random()*.48;
    }
    if(d>260&&c.y===0&&Math.random()<dt*.26)c.vy=-545;
  }
  physics(f,dt){
    f.x=clamp(f.x+f.vx*dt,LEFT,RIGHT);
    f.y=Math.min(0,f.y+f.vy*dt);f.vy+=1650*dt;
    if(f.y>=0){f.y=0;f.vy=0;}
    f.stun=Math.max(0,f.stun-dt);
    if(f.attack)f.attackClock+=dt;
  }
  hits(from,to){
    if(!from.attack||from.hasHit||from.stun>0)return;
    const move=ATTACKS[from.attack],t=from.attackClock;
    if(t<move.activeStart||t>move.activeEnd)return;
    const dx=to.x-from.x;
    if(Math.abs(dx)>move.reach||Math.abs(to.y-from.y)>112||Math.sign(dx)!==from.face)return;
    from.hasHit=true;
    const guarded=to.block&&to.y===0&&!to.attack;
    const damage=move.damage*(guarded?.23:1);
    to.hp=clamp(to.hp-damage,0,100);to.stun=guarded?.10:.25;
    if(!guarded){to.attack=null;to.attackClock=0;to.hasHit=false;}
    to.vx=0;to.x=clamp(to.x+from.face*move.knock*(guarded?.4:1),LEFT,RIGHT);
    from.meter=clamp(from.meter+move.gain,0,100);to.meter=clamp(to.meter+(guarded?3:7),0,100);
    this.shake=guarded?2:from.attack==='special'?12:6;
    this.flash=guarded?.035:from.attack==='special'?.14:.08;
    const origin={x:(from.x+to.x)/2,y:GROUND+to.y-125};
    this.spawnImpact(origin,from.id,guarded);
  }
  spawnImpact(origin,id,guarded){
    const color=guarded?'#9ce9ff':id==='jack-skellington'?'#c697ff':'#ffda6b';
    for(let i=0;i<11;i++){
      const a=Math.PI*2*i/11,life=.16+Math.random()*.16,speed=100+Math.random()*320;
      this.particles.push({x:origin.x,y:origin.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,maxLife:life,color});
    }
  }
  endRound(){
    const winner=this.hero.hp>this.cpu.hp?0:this.cpu.hp>this.hero.hp?1:-1;
    if(winner>=0)this.wins[winner]++;else this.draws++;
    this.mode='between';this.between=1.85;this.keys.clear();this.presses.clear();
    this.label=winner===0?'ROUND WON!':winner===1?'ROUND LOST!':'ROUND DRAW';
    this.labelUntil=Infinity;this.updateHUD(true);this.onRoundEnd({round:this.round,winner});
  }
  completeMatch(){
    this.mode='finished';this.paused=false;
    const winner=this.wins[0]===this.wins[1]?'MATCH DRAW':
      this.wins[0]>this.wins[1]?NAMES[this.p1]+' WINS!':'CPU WINS!';
    this.label=winner;this.labelUntil=Infinity;
    this.ui.status.textContent='Match finished. Choose a fighter or play again.';
    this.ui.start.textContent='PLAY AGAIN';this.setButtons();this.updateHUD(true);
  }
  step(dt){
    this.elapsed+=dt;
    if(this.mode==='between'){
      this.between-=dt;
      if(this.between<=0){
        if(this.wins[0]>=2||this.wins[1]>=2||this.round>=3)this.completeMatch();
        else{this.round++;this.startRound();}
      }
      return;
    }
    if(this.mode!=='fight'||this.paused)return;
    this.clock=Math.max(0,this.clock-dt);
    this.hero.face=this.hero.x<=this.cpu.x?1:-1;
    this.cpu.face=-this.hero.face;
    this.processPlayer();this.processCPU(dt);
    this.presses.clear();
    this.physics(this.hero,dt);this.physics(this.cpu,dt);
    const distance=this.cpu.x-this.hero.x;
    if(Math.abs(distance)<64){
      const dx=(64-Math.abs(distance))/2;
      const dir=distance>=0?1:-1;
      this.hero.x=clamp(this.hero.x-dir*dx,LEFT,RIGHT);
      this.cpu.x=clamp(this.cpu.x+dir*dx,LEFT,RIGHT);
    }
    this.hero.face=this.hero.x<=this.cpu.x?1:-1;this.cpu.face=-this.hero.face;
    this.hits(this.hero,this.cpu);this.hits(this.cpu,this.hero);
    for(const f of [this.hero,this.cpu]){
      if(f.attack&&f.attackClock>=ATTACKS[f.attack].duration){f.attack=null;f.attackClock=0;f.hasHit=false;}
      const next=f.hp<=0?'ko':f.stun>0?'hurt':f.block?'block':f.attack||
        (f.y<0?'jump':f.crouch?'crouch':Math.abs(f.vx)>180?'run':Math.abs(f.vx)>0?'walk':'idle');
      if(f.pose!==next){f.pose=next;f.poseTime=0;}else f.poseTime+=dt;
    }
    if(this.hero.hp<=0||this.cpu.hp<=0||this.clock<=0)this.endRound();
  }
  drawBackdrop(t){
    const ctx=this.ctx;
    const sky=ctx.createLinearGradient(0,0,0,540);
    sky.addColorStop(0,'#11102d');sky.addColorStop(.6,'#3d265b');sky.addColorStop(1,'#0a1735');
    ctx.fillStyle=sky;ctx.fillRect(0,0,960,540);
    ctx.fillStyle='#b56ee322';ctx.beginPath();ctx.arc(480,165,168,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ad70e366';ctx.lineWidth=4;ctx.beginPath();ctx.arc(480,165,142,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<16;i++){
      const x=i*69-25,h=110+(i*71)%170;
      ctx.fillStyle=i%2?'#16163a':'#1c204a';ctx.fillRect(x,GROUND-h,61,h);
      ctx.fillStyle=i%3?'#6b60a2':'#60b3d4';
      for(let y=GROUND-h+15;y<GROUND-16;y+=25)for(let k=0;k<3;k++)ctx.fillRect(x+11+k*16,y,6,9);
    }
    ctx.fillStyle='#111a31';ctx.fillRect(0,GROUND,960,540-GROUND);
    const line=ctx.createLinearGradient(0,GROUND,0,540);line.addColorStop(0,'#d24a94');line.addColorStop(1,'#45356f');
    ctx.strokeStyle=line;ctx.lineWidth=2;
    for(let i=-5;i<20;i++){ctx.beginPath();ctx.moveTo(480,GROUND);ctx.lineTo(i*88,540);ctx.stroke();}
    for(let y=GROUND+20;y<=540;y+=23){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}
    ctx.strokeStyle='#df76dc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,GROUND);ctx.lineTo(960,GROUND);ctx.stroke();
    ctx.fillStyle='#ffffff0b';ctx.fillRect(0,GROUND+8,960,6);
  }
  drawCharacter(f,t){
    const ctx=this.ctx;
    const action=f.pose;
    const move=ATTACKS[f.attack];
    const progress=move?f.attackClock/move.duration:0;
    const frame=move?(progress<.3?0:progress<.73?1:2):
      ['ko','hurt','jump','crouch','block'].includes(action)?Math.min(2,Math.floor(f.poseTime*9)):
      Math.floor(f.poseTime*(action==='idle'?4:action==='run'?13:10))%3;
    ctx.fillStyle='#050510aa';ctx.beginPath();ctx.ellipse(f.x,GROUND+1,44,9,0,0,Math.PI*2);ctx.fill();
    drawFighter(ctx,f.id,action,frame,{x:f.x,ground:GROUND+f.y,height:f.id==='jack-skellington'?266:238,face:f.face,alpha:f.stun>0?.83:1});
    if(f.attack==='special'&&progress>.23&&progress<.78){
      ctx.save();ctx.translate(f.x+f.face*78,GROUND+f.y-137);
      ctx.strokeStyle=f.id==='jack-skellington'?'#ae68ff':'#ffd166';
      ctx.lineWidth=6;ctx.shadowBlur=18;ctx.shadowColor=ctx.strokeStyle;
      ctx.beginPath();ctx.arc(0,0,22+progress*23,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  draw(){
    const ctx=this.ctx;
    ctx.save();
    if(this.shake>0){ctx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake*=.77;if(this.shake<.4)this.shake=0;}
    this.drawBackdrop(this.elapsed);
    this.drawCharacter(this.hero,this.elapsed);this.drawCharacter(this.cpu,this.elapsed);
    for(const p of this.particles){
      ctx.globalAlpha=clamp(p.life/p.maxLife,0,1);ctx.fillStyle=p.color;
      ctx.fillRect(p.x-4,p.y-4,8,8);
    }
    ctx.globalAlpha=1;
    if(this.flash>0){ctx.fillStyle='rgba(255,238,193,'+Math.min(.42,this.flash*2.5)+')';ctx.fillRect(0,0,960,540);}
    ctx.restore();
    const text=this.mode==='ready'?'SELECT A FIGHTER':
      this.paused?'PAUSED':this.mode==='finished'||this.mode==='between'?this.label:
      this.labelUntil>this.elapsed?this.label:'';
    if(this.ui.announcement.textContent!==text)this.ui.announcement.textContent=text;
  }
  tick(t){
    const dt=this.last?clamp((t-this.last)/1000,0,.07):0;this.last=t;
    this.accumulator=Math.min(.12,this.accumulator+dt);
    let loops=0;
    while(this.accumulator>=STEP&&loops<7){
      this.step(STEP);
      for(const p of this.particles){p.x+=p.vx*STEP;p.y+=p.vy*STEP;p.life-=STEP;}
      this.particles=this.particles.filter(p=>p.life>0);
      this.flash=Math.max(0,this.flash-STEP);
      this.accumulator-=STEP;loops++;
    }
    this.draw();
    if(t-this.lastHUD>=75){this.lastHUD=t;this.updateHUD();}
    this.frame=requestAnimationFrame(t2=>this.tick(t2));
  }
  updateHUD(force=false){
    const u=this.ui;
    u.p1Name.textContent=NAMES[this.p1];u.p2Name.textContent=NAMES[this.p2];
    u.p1Health.style.width=clamp(this.hero.hp,0,100)+'%';
    u.p2Health.style.width=clamp(this.cpu.hp,0,100)+'%';
    u.p1Meter.style.width=this.hero.meter+'%';
    u.p2Meter.style.width=this.cpu.meter+'%';
    u.time.textContent=String(Math.ceil(this.clock));
    u.score.textContent='ROUND '+this.round+'  •  '+this.wins[0]+' — '+this.wins[1]+(this.draws?'  •  '+this.draws+' DRAW':'');
    u.p1Health.parentElement.setAttribute('aria-label',NAMES[this.p1]+' health '+Math.ceil(this.hero.hp)+'%');
    u.p2Health.parentElement.setAttribute('aria-label',NAMES[this.p2]+' health '+Math.ceil(this.cpu.hp)+'%');
    if(force)this.setButtons();
  }
  destroy(){
    cancelAnimationFrame(this.frame);for(const release of this.handlers)release();
    this.handlers.length=0;this.keys.clear();this.presses.clear();
  }
}
export function createShowdownV2(options){return new ShowdownGame(options);}
