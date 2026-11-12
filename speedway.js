"use strict";
(() => {
const $=id=>document.getElementById(id);
const canvas=$("race-canvas"),ctx=canvas.getContext("2d");
const W=960,H=540,HORIZON=184,DEFAULT_LAPS=3,KEY="ctoon-speedway-save-v1";
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const drivers=[
{id:"nova",name:"Nova",role:"Boost Specialist",icon:"🚀",color:"#b463fa",speed:3,handling:3,boost:5},
{id:"bolt",name:"Bolt",role:"Speedster",icon:"⚡",color:"#efae36",speed:5,handling:2,boost:3},
{id:"comet",name:"Comet",role:"Drift Master",icon:"🌠",color:"#43c2f2",speed:3,handling:5,boost:3},
{id:"ember",name:"Ember",role:"All-Rounder",icon:"🔥",color:"#f06471",speed:4,handling:3,boost:3},
{id:"gizmo",name:"Gizmo",role:"Tech Racer",icon:"🤖",color:"#4ac6a1",speed:2,handling:4,boost:5},
{id:"ripple",name:"Ripple",role:"Corner Cutter",icon:"🌊",color:"#5f97ff",speed:3,handling:5,boost:2},
{id:"vortex",name:"Vortex",role:"Nitro Ace",icon:"🌀",color:"#9a65ff",speed:4,handling:2,boost:5},
{id:"pixel",name:"Pixel",role:"Precision Driver",icon:"👾",color:"#63eadb",speed:3,handling:5,boost:4},
{id:"luna",name:"Luna",role:"Night Rider",icon:"🌙",color:"#ed93c5",speed:4,handling:4,boost:3}
];
const tracks=[
{id:"neon",name:"Neon Boulevard",icon:"🌆",location:"Cyber City",length:3600,phase:.5,curves:1.2,sky:["#14123d","#f565af"],grass:["#26376d","#181a52"],road:"#3e405a",accent:"#d784ff"},
{id:"meadow",name:"Starfall Gardens",icon:"🌳",location:"Fantasy Meadows",length:3950,phase:2.2,curves:1.55,sky:["#153c6d","#8cbada"],grass:["#30755c","#17494f"],road:"#424655",accent:"#83ffca"},
{id:"cosmic",name:"Cosmic Causeway",icon:"🪐",location:"Outer Orbit",length:4300,phase:4.1,curves:1.9,sky:["#0d123e","#4c41a8"],grass:["#262354","#181333"],road:"#343b61",accent:"#ffe38d"},
{id:"haunted",name:"Haunted Highway",icon:"🎃",location:"Phantom Forest",length:4000,phase:3.7,curves:1.6,sky:["#1a1038","#99547c"],grass:["#253044","#111d37"],road:"#424254",accent:"#ffa665"},
{id:"candy",name:"Candy Carnival",icon:"🍬",location:"Sugar Circuit",length:3650,phase:1.7,curves:1.4,sky:["#4233a0","#ff9aba"],grass:["#8a5a9f","#664288"],road:"#5f5977",accent:"#ffd680"},
{id:"sunset",name:"Sunset Harbor",icon:"🌅",location:"Coastal Raceway",length:3850,phase:2.8,curves:1.5,sky:["#40255e","#fbaa78"],grass:["#31668c","#1c4764"],road:"#44485e",accent:"#ffcd86"}
];
const driverById=Object.fromEntries(drivers.map(x=>[x.id,x]));
const trackById=Object.fromEntries(tracks.map(x=>[x.id,x]));
const newSave=()=>({tickets:500,driver:"nova",track:"neon",laps:DEFAULT_LAPS,skill:"standard",upgrades:{},records:{},races:0,wins:0});
function readSave(){
 const s=newSave();
 try{
  const r=JSON.parse(localStorage.getItem(KEY));
  if(!r||typeof r!=="object")return s;
  if(Number.isSafeInteger(r.tickets))s.tickets=clamp(r.tickets,0,1000000);
  if(driverById[r.driver])s.driver=r.driver;
  if(trackById[r.track])s.track=r.track;
  if([1,3,5].includes(r.laps))s.laps=r.laps;
  if(["casual","standard","expert"].includes(r.skill))s.skill=r.skill;
  if(r.upgrades&&typeof r.upgrades==="object"){
   for(const d of drivers){
    const u=r.upgrades[d.id];if(!u||typeof u!=="object")continue;
    s.upgrades[d.id]={};
    for(const k of ["engine","handling","nitro"])if(Number.isInteger(u[k]))s.upgrades[d.id][k]=clamp(u[k],0,5);
   }
  }
  if(r.records&&typeof r.records==="object"){
   for(const t of tracks){
    const v=r.records[t.id];if(!v||typeof v!=="object")continue;
    const oldBest=Number.isFinite(v.best)&&v.best>0?Math.min(99999,v.best):null;
    const bestByLaps={};
    for(const laps of [1,3,5]){
      const value=v.bestByLaps?.[laps];
      if(Number.isFinite(value)&&value>0)bestByLaps[laps]=Math.min(99999,value);
    }
    if(oldBest&&!bestByLaps[3])bestByLaps[3]=oldBest;
    s.records[t.id]={races:clamp(Number(v.races)||0,0,100000),wins:clamp(Number(v.wins)||0,0,100000),
      best:oldBest,bestLap:Number.isFinite(v.bestLap)&&v.bestLap>0?Math.min(99999,v.bestLap):null,
      bestByLaps,lastPosition:clamp(Number(v.lastPosition)||4,1,4)};
   }
  }
  s.races=clamp(Number(r.races)||0,0,100000);
  s.wins=clamp(Number(r.wins)||0,0,100000);
 }catch(_){}
 return s;
}
let save=readSave(),view="race",race=null,last=0,clock=0,ctrl={left:false,right:false,gas:false,brake:false,drift:false,boost:false},statusTimer=0;
const selectedDriver=()=>driverById[save.driver],selectedTrack=()=>trackById[save.track];
const upgrade=(id,stat)=>save.upgrades[id]?.[stat]||0;
const cash=n=>Math.round(n).toLocaleString();
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(save));}
 catch(_){$("status").textContent="Browser storage is unavailable; game progress may not persist.";}
}
function announce(s){$("status").textContent=s;}
function statBar(value){return '<div class="statbar"><span style="width:'+(Math.min(5,value)/5*100)+'%"></span></div>';}
function driverButton(d,garage=false){
 const chosen=save.driver===d.id;
 return '<button type="button" class="driver-card '+(chosen?"chosen":"")+'" data-driver="'+d.id+'" aria-pressed="'+chosen+'" '+(race?"disabled":"")+'>'+
 '<span class="driver-art" style="--kart:'+d.color+'">'+d.icon+'</span><strong>'+d.name+'</strong><small>'+d.role+'</small>'+
 (!garage?'<small>Speed '+d.speed+' / 5</small>'+statBar(d.speed)+'<small>Control '+d.handling+' · Nitro '+d.boost+'</small>':'<small>Engine +'+upgrade(d.id,"engine")+' · Nitro +'+upgrade(d.id,"nitro")+'</small>')+'</button>';
}
function renderOptions(){
 $("ticket-count").textContent=cash(save.tickets);
 $("driver-grid").innerHTML=drivers.map(d=>driverButton(d)).join("");
 $("garage-drivers").innerHTML=drivers.map(d=>driverButton(d,true)).join("");
 $("track-grid").innerHTML=tracks.map(t=>'<button type="button" class="track-card '+(save.track===t.id?"chosen":"")+'" data-track="'+t.id+'" aria-pressed="'+(save.track===t.id)+'" '+(race?"disabled":"")+'><span class="track-icon">'+t.icon+'</span><span><strong>'+t.name+'</strong><small>'+t.location+' · '+Math.round(t.length/1000*10)/10+' km*</small></span></button>').join("");
 $("race-title").textContent=selectedTrack().name;
 $("start-race").disabled=!!race;
 $("race-laps").value=String(save.laps);$("race-laps").disabled=!!race;
 $("race-skill").value=save.skill;$("race-skill").disabled=!!race;
 const labels={1:"SPRINT",3:"GRAND PRIX",5:"ENDURANCE"};
 $("race-format").textContent=labels[save.laps]+" · "+save.laps+" LAP"+(save.laps>1?"S":"")+" · 4 KARTS";
 $("race-format-detail").textContent=save.skill.toUpperCase()+" rivals · Speedway Tickets and lap records";
 renderGarage();renderRecords();
}
const upgradeTypes=[
{id:"engine",label:"ENGINE",description:"Higher maximum speed and acceleration"},
{id:"handling",label:"HANDLING",description:"Sharper corners and easier drifting"},
{id:"nitro",label:"NITRO",description:"Longer boosts and faster energy gains"}
];
function upgradeCost(d,stat){return 250+(upgrade(d.id,stat))*250;}
function renderGarage(){
 const d=selectedDriver();
 $("garage-details").innerHTML='<div class="upgrade-summary"><p class="eyebrow">KART BUILD · '+d.role.toUpperCase()+'</p><div class="driver-art" style="--kart:'+d.color+'">'+d.icon+'</div><h2>'+d.name+'’s Kart</h2><p>Speed '+d.speed+' · Handling '+d.handling+' · Nitro '+d.boost+'</p></div>'+
 upgradeTypes.map(x=>{
  const level=upgrade(d.id,x.id),cap=level===5,cost=upgradeCost(d,x.id);
  return '<div class="upgrade-row"><div><strong>'+x.label+' · LV '+level+'/5</strong><small>'+x.description+'</small>'+statBar(level)+'</div><button type="button" data-upgrade="'+x.id+'" '+(race||cap||save.tickets<cost?"disabled":"")+'>'+(cap?"MAXED":cash(cost)+" TICKETS")+'</button></div>';
 }).join('')+'<p class="muted">Tip: Win races to earn Speedway Tickets. Upgrades are exclusive to this game.</p>';
}
function renderRecords(){
 $("records").innerHTML=tracks.map(t=>{
 const r=save.records[t.id]||{};
 return '<article class="record-card"><span class="eyebrow">'+t.icon+' '+t.location+'</span><h3>'+t.name+'</h3><p>Races: <b>'+(r.races||0)+'</b> · Wins: <b>'+(r.wins||0)+'</b></p><p>Best time: <b>'+(r.best?timeFmt(r.best):"—")+'</b></p><p>Last finish: <b>'+(r.lastPosition?"#"+r.lastPosition:"—")+'</b></p></article>';
 }).join('')+'<article class="record-card"><span class="eyebrow">ALL-TIME STATS</span><h3>Your Career</h3><p>Total races: <b>'+save.races+'</b></p><p>First-place finishes: <b>'+save.wins+'</b></p><p>Current tickets: <b>'+cash(save.tickets)+'</b></p></article>';
}
function setView(next){
 view=next;
 document.querySelectorAll("[data-view]").forEach(b=>{const on=b.dataset.view===next;b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));});
 for(const name of ["race","garage","records"])$("view-"+name).hidden=name!==next;
}
function changeDriver(id){
 if(race||!driverById[id])return;
 save.driver=id;persist();renderOptions();announce(driverById[id].name+" is ready to race.");
}
function buyUpgrade(stat){
 if(race||!upgradeTypes.some(x=>x.id===stat))return;
 const d=selectedDriver(),n=upgrade(d.id,stat);
 if(n>=5)return;
 const cost=upgradeCost(d,stat);
 if(save.tickets<cost){announce("You need "+cash(cost)+" Speedway Tickets for that upgrade.");return;}
 save.tickets-=cost;
 if(!save.upgrades[d.id])save.upgrades[d.id]={};
 save.upgrades[d.id][stat]=n+1;
 persist();renderOptions();announce(d.name+"'s "+stat+" upgraded to level "+(n+1)+"!");
}
function timeFmt(sec){
 const m=Math.floor(sec/60),s=(sec%60).toFixed(1).padStart(4,"0");
 return m+":"+s;
}
const totalDistance=()=>race?race.track.length*race.laps:selectedTrack().length*save.laps;
function maxSpeed(d=selectedDriver()){return 165+d.speed*15+upgrade(d.id,"engine")*10;}
function boostMultiplier(d=selectedDriver()){return 1.28+d.boost*.035+upgrade(d.id,"nitro")*.035;}
function boostUsage(d=selectedDriver()){return 39-upgrade(d.id,"nitro")*3;}
function renderOverlay(title,kicker,description,showAction=false){
 $("overlay-title").textContent=title;
 $("overlay-kicker").textContent=kicker;
 $("overlay-description").textContent=description;
 $("overlay-action").hidden=!showAction;
 $("race-overlay").hidden=false;
}
function hideOverlay(){$("race-overlay").hidden=true;}
function clearInputs(){
 for(const k of Object.keys(ctrl))ctrl[k]=false;
 document.querySelectorAll("[data-control]").forEach(b=>b.classList.remove("pressed"));
}
function startRace(){
 if(race)return;
 clearInputs();
 const t=selectedTrack(),d=selectedDriver();
 const skill={casual:.76,standard:.91,expert:1.08}[save.skill]||.91;
 const opponents=drivers.filter(x=>x.id!==d.id)
   .sort((a,b)=>(a.speed+a.handling+2*a.boost)-(b.speed+b.handling+2*b.boost))
   .slice((drivers.findIndex(x=>x.id===d.id)+tracks.findIndex(x=>x.id===t.id))%3)
   .concat(drivers.filter(x=>x.id!==d.id)).filter((x,i,arr)=>arr.findIndex(y=>y.id===x.id)===i).slice(0,3);
 const pickups=[];
 for(let lap=0;lap<save.laps;lap++)for(let i=0;i<11;i++){
   const z=lap*t.length+230+i*(t.length-310)/11;
   pickups.push({id:lap+"-"+i,z,lane:[-.58,0,.58][(i+lap)%3]});
 }
 race={
 track:t,driver:d,laps:save.laps,skill:save.skill,phase:"countdown",countdown:3.3,time:0,elapsed:0,position:0,speed:0,lane:0,
 lapStartTime:0,lapTimes:[],bestLap:null,skillFactor:skill,pickupList:pickups,
 energy:72,driftCharge:0,wasDrifting:false,boosting:false,impactTimer:0,pickups:new Set(),
 rivals:opponents.map((v,i)=>({id:v.id,name:v.name,icon:v.icon,color:v.color,position:26+i*20,
 lane:[-.55,.12,.59][i],laneTarget:[-.55,.12,.59][i],speed:0,
 baseSpeed:maxSpeed(v)*skill*(.96+i*.035),finish:null,seed:i*2.7})),
 place:4,finishPlace:null,reward:0
 };
 $("phase").textContent="COUNTDOWN";
 $("pause-btn").disabled=false;$("leave-btn").disabled=false;$("restart-btn").disabled=false;
 $("pause-btn").textContent="PAUSE";
 $("race-panel").scrollIntoView({behavior:"smooth",block:"start"});
 renderOverlay("3","GET READY","Hold GAS or press W / ↑ when the lights turn green.");
 updateHud();
 announce("Race starting! Hold accelerate and steer around competitors.");
 renderOptions();
}
function stopRace(){
 race=null;clearInputs();$("pause-btn").disabled=true;$("leave-btn").disabled=true;$("restart-btn").disabled=true;
 $("phase").textContent="PRE-RACE";$("hud-speed").textContent="0";
 $("hud-boost").textContent="72%";$("boost-bar").style.width="72%";$("speed-bar").style.width="0%";
 $("hud-lap").textContent="1 / "+save.laps;$("hud-position").textContent="1 / 4";$("hud-time").textContent="0:00.0";
 $("hud-current-lap").textContent="0:00.0";$("hud-best-lap").textContent="—";$("hud-drift").textContent="—";
 $("speedway-progress-fill").style.width="0%";$("speedway-progress").setAttribute("aria-valuenow","0");
 renderOverlay("START YOUR ENGINES","GET READY","Pick a driver and a track above to begin.");
 renderOptions();
 announce("Back in the pit lane. Choose a racer or upgrade your kart.");
 window.scrollTo({top:0,behavior:"smooth"});
}
function togglePause(){
 if(!race||!["countdown","running","paused"].includes(race.phase))return;
 if(race.phase==="running"||race.phase==="countdown"){
  race.resumePhase=race.phase;race.phase="paused";clearInputs();
  $("pause-btn").textContent="RESUME";$("phase").textContent="PAUSED";
  renderOverlay("RACE PAUSED","TIME OUT","Resume when you are ready.");
  announce("Race paused.");
 }else{
  race.phase=race.resumePhase||"running";$("pause-btn").textContent="PAUSE";$("phase").textContent=race.phase==="countdown"?"COUNTDOWN":"RACING";if(race.phase==="running")hideOverlay();else renderOverlay(String(Math.max(1,Math.ceil(race.countdown))),"GET READY","Race starting!");announce("Go!");}
}
function currentPlace(){
 if(!race)return 1;
 // A rival that crossed the line earlier must stay ahead on the final standings.
 return 1+race.rivals.filter(o=>o.position>race.position ||
   (race.phase==="finished"&&o.finish!==null&&o.finish<race.time)).length;
}
function getPickups(){
 if(!race)return [];
 return race.pickupList;
}
function finishRace(){
 if(!race||race.phase==="finished")return;
 race.phase="finished";race.position=totalDistance();
 const place=currentPlace(),baseReward=[500,350,250,175][place-1];
 const reward=Math.round(baseReward*({1:.65,3:1,5:1.5}[race.laps]||1)*({casual:.8,standard:1,expert:1.25}[race.skill]||1));
 race.finishPlace=place;race.reward=reward;
 save.tickets+=reward;save.races++;
 if(place===1)save.wins++;
 const old=save.records[race.track.id]||{races:0,wins:0,best:null,bestByLaps:{}};
 const bestByLaps={...(old.bestByLaps||{})};
 bestByLaps[race.laps]=Math.min(bestByLaps[race.laps]||Infinity,race.time);
 save.records[race.track.id]={
   races:(old.races||0)+1,wins:(old.wins||0)+(place===1?1:0),
   // Original three-lap winning records retain their old meaning.
   best:place===1&&race.laps===3?Math.min(old.best||Infinity,race.time):old.best||null,
   bestLap:race.bestLap?Math.min(old.bestLap||Infinity,race.bestLap):old.bestLap||null,
   bestByLaps,lastPosition:place
 };
 persist();clearInputs();renderOptions();
 $("phase").textContent="FINISHED";
 $("pause-btn").disabled=true;
 renderOverlay(place===1?"CHAMPION!":"FINISH · #"+place,"CHECKERED FLAG",
 "Race time: "+timeFmt(race.time)+" · Best lap: "+(race.bestLap?timeFmt(race.bestLap):"—")+
 " · You earned "+cash(reward)+" Speedway Tickets.",true);
 announce("Finished #"+place+"! +"+cash(reward)+" Speedway Tickets added to your garage.");
}
function updateRace(dt){
 if(!race)return;
 const r=race,t=r.track,d=r.driver;
 if(r.phase==="countdown"){
  const before=Math.ceil(r.countdown);
  r.countdown-=dt;
  const after=Math.ceil(r.countdown);
  if(r.countdown<=0){r.phase="running";$("phase").textContent="RACING";hideOverlay();announce("GO! Drift around corners and use your boost!");}
  else if(before!==after&&after>=1)renderOverlay(String(after),"GET READY","W / ↑ accelerate · A,D steer · Shift boost · Space drift");
  return;
 }
 if(r.phase!=="running")return;
 r.time+=dt;
 const steer=(ctrl.right?1:0)-(ctrl.left?1:0),base=maxSpeed(d);
 const throttle=ctrl.gas,braking=ctrl.brake;
 const drifting=ctrl.drift&&steer!==0&&r.speed>65;
 if(r.wasDrifting&&!drifting&&r.driftCharge>0.45){
  r.energy=clamp(r.energy+Math.min(28,r.driftCharge*16),0,100);
  announce("Drift bonus! Your nitro meter recharged.");
 }
 r.wasDrifting=drifting;
 r.driftCharge=drifting?Math.min(2.6,r.driftCharge+dt):0;
 r.boosting=ctrl.boost&&r.energy>0&&r.speed>30;
 const bonus=boostMultiplier(d);
 const desiredMax=base*(r.boosting?bonus:1);
 if(throttle){
  const accel=69+d.speed*6+upgrade(d.id,"engine")*5;
  r.speed=Math.min(desiredMax,r.speed+accel*dt*(r.boosting?1.32:1));
 }else r.speed=Math.max(0,r.speed-(braking?170:46)*dt);
 if(braking)r.speed=Math.max(0,r.speed-110*dt);
 if(r.boosting){r.energy=Math.max(0,r.energy-boostUsage(d)*dt);}
 if(r.energy<=0)r.boosting=false;
 if(r.speed>desiredMax)r.speed=Math.max(desiredMax,r.speed-68*dt);
 const steerStrength=.73+d.handling*.065+upgrade(d.id,"handling")*.05;
 r.lane=clamp(r.lane+steer*steerStrength*dt*(.45+r.speed/210)*(drifting?1.5:1),-1.5,1.5);
 const curveDrive=(curveAt(r.position+70,t)-curveAt(r.position,t))*.005;
 r.lane=clamp(r.lane-curveDrive*dt*(.45+r.speed/250)*(drifting?.45:1),-1.5,1.5);
 if(Math.abs(r.lane)>1){r.speed=Math.min(r.speed,base*.54);}
 if(r.impactTimer>0)r.impactTimer-=dt;
 const previous=r.position;
 r.position+=r.speed*dt;
 const completedBefore=Math.min(r.laps,Math.floor(previous/t.length));
 const completedNow=Math.min(r.laps,Math.floor(r.position/t.length));
 if(completedNow>completedBefore){
   const lapTime=r.time-r.lapStartTime;
   r.lapTimes.push(lapTime);r.lapStartTime=r.time;
   r.bestLap=Math.min(r.bestLap||Infinity,lapTime);
   if(completedNow<r.laps)announce("LAP "+(completedNow+1)+" / "+r.laps+" · Last lap "+timeFmt(lapTime)+" · Best "+timeFmt(r.bestLap));
 }
 if(drifting)r.energy=clamp(r.energy+(1.6+upgrade(d.id,"nitro")*.6)*dt,0,100);
 for(const pickup of getPickups()){
  if(r.pickups.has(pickup.id))continue;
  if(pickup.z>=previous&&pickup.z<=r.position+5&&Math.abs(r.lane-pickup.lane)<.30){
   r.pickups.add(pickup.id);r.energy=clamp(r.energy+24,0,100);announce("Nitro pickup! +24 boost energy.");
  }
 }
 for(let i=0;i<r.rivals.length;i++){
  const bot=r.rivals[i];
  if(bot.finish!==null)continue;
  const wobble=Math.sin(r.time*.47+bot.seed)*.11;
  bot.laneTarget=[-.60,.05,.61][i]+wobble;
  bot.lane+=(bot.laneTarget-bot.lane)*Math.min(1,dt*1.7);
  bot.speed=Math.min(bot.baseSpeed,bot.speed+150*dt);
  bot.position=Math.min(totalDistance(),bot.position+bot.speed*dt);
  if(bot.position>=totalDistance())bot.finish=r.time;
  if(r.impactTimer<=0&&Math.abs(bot.position-r.position)<20&&Math.abs(bot.lane-r.lane)<.25){
   r.speed*=.68;r.impactTimer=1.5;
   bot.speed*=.75;announce("Bump! Steer around rivals to keep your speed.");
  }
 }
 r.place=currentPlace();
 if(r.position>=totalDistance())finishRace();
}
function curveAt(z,t){return (Math.sin(z/480+t.phase)*100+Math.sin(z/880+t.phase*1.4)*70)*t.curves;}
function sampleRoad(y,world,t){
 const u=clamp((y-HORIZON)/(H-HORIZON),0,1);
 const ahead=1000*Math.pow(1-u,2.2);
 const dz=curveAt(world+ahead,t)-curveAt(world,t);
 return {x:W/2+dz*(.9-u*.32),half:9+326*Math.pow(u,1.26),z:ahead,u};
}
function polygon(points,fill){
 ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
 ctx.closePath();ctx.fill();
}
function drawBackdrop(t,world){
 const sky=ctx.createLinearGradient(0,0,0,HORIZON+85);
 sky.addColorStop(0,t.sky[0]);sky.addColorStop(1,t.sky[1]);
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,HORIZON+90);
 ctx.fillStyle=t.accent;ctx.globalAlpha=.46;ctx.beginPath();ctx.arc(760,85,55,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 if(t.id==="cosmic"){
  for(let i=0;i<55;i++){
   const x=(i*127+23)%960,y=(i*63+7)%174;
   ctx.fillStyle=i%3===0?"#ffe69e":"#c6d7ff";ctx.fillRect(x,y,i%4===0?3:2,2);
  }
 }else{
  for(let i=0;i<18;i++){
   const x=i*66-30+Math.sin(world/1300)*22;
   const hh=40+(i*37%85);
   ctx.fillStyle=t.id==="neon"?"#1b1c4d":"#2a5574";ctx.fillRect(x,HORIZON-hh,54,hh);
   if(t.id==="neon"){
    ctx.fillStyle=i%2?"#f87dd8":"#79dafa";
    for(let row=0;row<4;row++)for(let col=0;col<2;col++)
     ctx.fillRect(x+10+col*18,HORIZON-hh+12+row*16,4,5);
   }
  }
 }
 ctx.fillStyle=t.grass[1];ctx.fillRect(0,HORIZON,W,H-HORIZON);
}
function drawRoad(t,world){
 for(let y=HORIZON;y<H;y+=5){
  const n=sampleRoad(y,world,t),b=sampleRoad(Math.min(H,y+6),world,t);
  const stripe=Math.floor((world+n.z)/85)%2===0;
  ctx.fillStyle=stripe?t.grass[0]:t.grass[1];ctx.fillRect(0,y,W,6);
  polygon([[n.x-n.half*1.08,y],[n.x+n.half*1.08,y],[b.x+b.half*1.08,y+6],[b.x-b.half*1.08,y+6]],stripe?"#ffe8fa":"#c95c85");
  polygon([[n.x-n.half,y],[n.x+n.half,y],[b.x+b.half,y+6],[b.x-b.half,y+6]],t.road);
  if(Math.floor((world+n.z)/62)%2===0){
   for(const at of [-1/3,1/3]){
    polygon([[n.x+n.half*at-2,y],[n.x+n.half*at+2,y],[b.x+b.half*at+4,y+6],[b.x+b.half*at-4,y+6]],"#d6dcff");
   }
  }
 }
}
function project(worldZ,lane,playerPos,t){
 const ahead=worldZ-playerPos;
 if(ahead<0||ahead>1000)return null;
 const u=1-Math.pow(ahead/1000,1/2.2);
 const y=HORIZON+(H-HORIZON)*u;
 const road=sampleRoad(y,playerPos,t);
 return {x:road.x+road.half*lane*.92,y,scale:.12+u*1.5,u,half:road.half};
}
function drawScenery(t,world){
 const size=230;
 for(let i=0;i<10;i++){
  const z=Math.floor(world/size)*size+i*size+size;
  const ahead=z-world;
  if(ahead<15||ahead>990)continue;
  for(const side of [-1,1]){
   const pos=project(z,side*1.5,world,t);
   if(!pos)continue;
   const sz=10+75*pos.u;
   const x=pos.x,y=pos.y;
   if(t.id==="neon"){
    ctx.fillStyle="#152a68";ctx.fillRect(x-sz*.4,y-sz*2,sz*.8,sz*2);
    ctx.fillStyle=(i+side)%2===0?"#ff91da":"#79f3ff";
    ctx.fillRect(x-sz*.34,y-sz*1.85,sz*.68,sz*.2);
    ctx.fillStyle="#f4ecff";ctx.fillRect(x-2,y-sz*1.5,4,sz*.9);
   }else if(t.id==="meadow"){
    ctx.fillStyle="#4b3756";ctx.fillRect(x-sz*.1,y-sz*.8,sz*.2,sz*.8);
    ctx.fillStyle=i%2===0?"#5de0ad":"#85ca72";
    ctx.beginPath();ctx.arc(x,y-sz*1.2,sz*.6,0,Math.PI*2);ctx.fill();
   }else{
    ctx.strokeStyle="#a57cff";ctx.lineWidth=Math.max(2,sz*.08);
    ctx.beginPath();ctx.arc(x,y-sz,sz*.5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#8cf5ff";ctx.beginPath();ctx.arc(x,y-sz,sz*.18,0,Math.PI*2);ctx.fill();
   }
  }
 }
}
function drawPickups(t,world){
 if(!race)return;
 for(const item of getPickups()){
  if(race.pickups.has(item.id))continue;
  const p=project(item.z,item.lane,world,t);
  if(!p||p.u<.08)continue;
  const sz=9+22*p.u;
  const y=p.y-12-30*p.u+Math.sin(clock*4+item.z)*4;
  ctx.save();ctx.translate(p.x,y);ctx.rotate(clock*1.5);
  ctx.shadowBlur=19;ctx.shadowColor="#a9faff";ctx.fillStyle="#8ef5ff";
  polygon([[0,-sz],[sz*.7,0],[0,sz],[-sz*.7,0]],"#9afaff");
  ctx.restore();
 }
}
function drawKart(x,y,scale,color,icon,boost=false,player=false){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 ctx.fillStyle="#05081799";ctx.beginPath();ctx.ellipse(0,7,33,11,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#121326";ctx.fillRect(-36,-14,13,33);ctx.fillRect(23,-14,13,33);
 if(boost){
  ctx.shadowColor="#7fe5ff";ctx.shadowBlur=18;ctx.fillStyle="#9bfbff";
  polygon([[-13,18],[0,43+Math.sin(clock*20)*8],[13,18]],"#86efff");
 }
 ctx.shadowBlur=0;
 ctx.fillStyle="#111229";ctx.fillRect(-27,-25,54,14);
 ctx.fillStyle=color;
 polygon([[-26,-16],[26,-16],[33,19],[20,23],[-20,23],[-33,19]],color);
 ctx.fillStyle="#fff5cc";ctx.fillRect(-23,12,11,7);ctx.fillRect(12,12,11,7);
 ctx.fillStyle="#1c2554";ctx.beginPath();ctx.ellipse(0,-16,22,18,0,0,Math.PI*2);ctx.fill();
 ctx.font=(player?"32px":"29px")+" system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(icon,0,-22);
 ctx.restore();
}
function drawKarts(t,world){
 if(race){
  const sorted=race.rivals.filter(bot=>bot.position-world>0&&bot.position-world<950).sort((a,b)=>b.position-a.position);
  for(const bot of sorted){
   const p=project(bot.position,bot.lane,world,t);
   if(!p)continue;
   drawKart(p.x,p.y-13*p.u,clamp(.19+p.u*1.2,.2,1.5),bot.color,bot.icon,false,false);
  }
 }
 const d=race?race.driver:selectedDriver();
 const lane=race?race.lane:Math.sin(clock*.5)*.04;
 const off=race&&Math.abs(race.lane)>1;
 drawKart(W/2+lane*312,488,2.15,d.color,d.icon,race?.boosting||false,true);
 if(off){
  ctx.fillStyle="#fff2bb";ctx.font="900 20px system-ui";ctx.textAlign="center";ctx.fillText("OFF-ROAD — SLOW DOWN",W/2,404);
 }
}
function drawTrackEffects(t,world){
 const finishEvery=t.length;
 for(let i=0;i<=(race?race.laps:save.laps);i++){
  const marker=i*finishEvery;
  const p=project(marker,0,world,t);if(!p||p.u<.02)continue;
  const stripW=p.half*1.95;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle="#fff";
  const h=2+16*p.u;
  for(let c=0;c<10;c++){
   ctx.fillStyle=c%2?"#131629":"#fff8db";
   ctx.fillRect(-stripW/2+stripW/10*c,-h,stripW/10,h);
  }
  ctx.restore();
 }
}
function drawPreviewOrRace(){
 if(!ctx)return;
 const t=race?race.track:selectedTrack();
 const world=race?race.position:clock*24;
 drawBackdrop(t,world);
 drawRoad(t,world);
 drawScenery(t,world);
 drawTrackEffects(t,world);
 drawPickups(t,world);
 drawKarts(t,world);
 if(race?.boosting&&race.phase==="running"){
  ctx.strokeStyle="#9eefff55";ctx.lineWidth=4;
  for(let i=0;i<13;i++){
   const x=(i*97+Math.floor(clock*120))%960;
   const y=250+i*21%230;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(x<480?-18:18),y+35);ctx.stroke();
  }
 }
 const grd=ctx.createLinearGradient(0,HORIZON,0,H);
 grd.addColorStop(0,"#00000000");grd.addColorStop(1,"#08081930");
 ctx.fillStyle=grd;ctx.fillRect(0,HORIZON,W,H-HORIZON);
}
function updateHud(){
 if(!race)return;
 const r=race;
 $("hud-position").textContent=currentPlace()+" / 4";
 $("hud-lap").textContent=Math.min(r.laps,Math.floor(r.position/r.track.length)+1)+" / "+r.laps;
 $("hud-current-lap").textContent=timeFmt(r.time-r.lapStartTime);
 $("hud-best-lap").textContent=r.bestLap?timeFmt(r.bestLap):"—";
 $("hud-drift").textContent=r.wasDrifting?Math.round(100*r.driftCharge/2.6)+"%":"—";
 const racePct=clamp(Math.round(100*r.position/(r.track.length*r.laps)),0,100);
 $("speedway-progress-fill").style.width=racePct+"%";
 $("speedway-progress").setAttribute("aria-valuenow",String(racePct));
 $("speedway-progress-label").textContent=racePct+"%";
 $("hud-time").textContent=timeFmt(r.time);
 $("hud-speed").textContent=Math.round(r.speed*1.35);
 $("speed-bar").style.width=Math.min(100,Math.round(r.speed/maxSpeed(r.driver)*100))+"%";
 $("boost-bar").style.width=Math.round(r.energy)+"%";
 $("hud-boost").textContent=Math.round(r.energy)+"%";
 const order=[{name:"YOU",position:r.position,finish:r.phase==="finished"?r.time:null,me:true},...r.rivals.map(x=>({name:x.name,position:x.position,finish:x.finish,me:false}))]
 .sort((a,b)=>b.position-a.position||(a.finish??Infinity)-(b.finish??Infinity));
 $("race-standings").innerHTML=order.map((x,i)=>'<span class="'+(x.me?"me":"")+'">'+(i+1)+'. '+x.name+'</span>').join('');
}
function frame(ms){
 const dt=Math.min(.05,Math.max(0,(ms-last)/1000||0));last=ms;clock+=dt;
 updateRace(dt);drawPreviewOrRace();
 if(race){
  statusTimer+=dt;if(statusTimer>.11){updateHud();statusTimer=0;}
 }
 requestAnimationFrame(frame);
}
const controlMap={ArrowUp:"gas",KeyW:"gas",ArrowDown:"brake",KeyS:"brake",ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",Space:"drift",ShiftLeft:"boost",ShiftRight:"boost",KeyB:"boost"};
document.addEventListener("keydown",e=>{
 if(e.code==="KeyP"){if(!e.repeat)togglePause();return;}
 const key=controlMap[e.code];if(!key)return;
 if(race&&["running","countdown"].includes(race.phase)){e.preventDefault();ctrl[key]=true;}
});
document.addEventListener("keyup",e=>{const key=controlMap[e.code];if(key){ctrl[key]=false;}});
document.querySelectorAll("[data-control]").forEach(button=>{
 const key=button.dataset.control;
 button.addEventListener("pointerdown",e=>{
  if(!race||!["running","countdown"].includes(race.phase))return;
  e.preventDefault();ctrl[key]=true;button.classList.add("pressed");
  try{button.setPointerCapture(e.pointerId);}catch(_){}
 });
 const release=e=>{ctrl[key]=false;button.classList.remove("pressed");};
 button.addEventListener("pointerup",release);
 button.addEventListener("pointercancel",release);
 button.addEventListener("lostpointercapture",release);
 button.addEventListener("contextmenu",e=>e.preventDefault());
});
document.addEventListener("click",e=>{
 const tab=e.target.closest("[data-view]");
 if(tab){setView(tab.dataset.view);return;}
 const driver=e.target.closest("[data-driver]");
 if(driver){changeDriver(driver.dataset.driver);return;}
 const track=e.target.closest("[data-track]");
 if(track&&!race&&trackById[track.dataset.track]){
  save.track=track.dataset.track;persist();renderOptions();announce(trackById[save.track].name+" selected.");return;
 }
 const up=e.target.closest("[data-upgrade]");
 if(up){buyUpgrade(up.dataset.upgrade);return;}
});
$("race-laps").addEventListener("change",()=>{
   if(race)return;const n=Number($("race-laps").value);
   if(![1,3,5].includes(n))return;save.laps=n;persist();renderOptions();
 });
 $("race-skill").addEventListener("change",()=>{
   if(race)return;const v=$("race-skill").value;
   if(!["casual","standard","expert"].includes(v))return;save.skill=v;persist();renderOptions();
 });
 $("start-race").addEventListener("click",startRace);
 $("restart-btn").addEventListener("click",()=>{
   if(!race)return;
   race=null;clearInputs();startRace();announce("Restarted the race. No tickets were awarded for the abandoned run.");
 });
$("pause-btn").addEventListener("click",togglePause);
$("leave-btn").addEventListener("click",stopRace);
$("overlay-action").addEventListener("click",()=>{stopRace();startRace();});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden&&race?.phase==="running")togglePause();
 clearInputs();
});
window.addEventListener("blur",clearInputs);
renderOverlay("START YOUR ENGINES","GET READY","Pick a driver and a track above to begin.");
if(!ctx){announce("Your browser does not support HTML canvas. Try another browser.");return;}
renderOptions();setView("race");requestAnimationFrame(frame);
})();
