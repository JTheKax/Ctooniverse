"use strict";
(() => {
const $ = id => document.getElementById(id);
const heroes = [
{id:"hercules",name:"Hercules",series:"Disney",role:"Tank",icon:"⚡",color:"#c98e45",hp:575,atk:40,def:18,skill:"Olympian Guard",ability:"guard"},
{id:"jack",name:"Jack Skellington",series:"The Nightmare Before Christmas",role:"Control",icon:"🎃",color:"#745a9c",hp:370,atk:49,def:9,skill:"Pumpkin Panic",ability:"stun"},
{id:"yugi",name:"Yugi Muto",series:"Yu-Gi-Oh!",role:"Support",icon:"🃏",color:"#b847bd",art:"public/images/ctoons/yugi-muto.png",hp:395,atk:39,def:11,skill:"Heart of the Cards",ability:"boost"},
{id:"tidus",name:"Tidus",series:"Kingdom Hearts",role:"Damage",icon:"🗡️",color:"#3296d1",art:"public/images/ctoons/kingdom-hearts-tidus.png",hp:405,atk:58,def:9,skill:"Blitz Rush",ability:"strike"},
{id:"wakka",name:"Wakka",series:"Kingdom Hearts",role:"Damage",icon:"🏐",color:"#5db18c",art:"public/images/ctoons/kingdom-hearts-ctoon-wakka.png",hp:390,atk:56,def:10,skill:"Blitz Bomb",ability:"blast"},
{id:"sora",name:"Sora",series:"Kingdom Hearts",role:"Damage",icon:"🗝️",color:"#5b9fdc",hp:435,atk:64,def:11,skill:"Keyblade Burst",ability:"blast"},
{id:"luigi",name:"Luigi",series:"Super Mario",role:"Control",icon:"👻",color:"#4aa567",hp:430,atk:46,def:13,skill:"Ghost Trap",ability:"stun"},
{id:"spongebob",name:"SpongeBob",series:"SpongeBob SquarePants",role:"Support",icon:"🧽",color:"#ebbd36",hp:470,atk:37,def:13,skill:"Jellyfish Jelly",ability:"heal"},
{id:"courage",name:"Courage",series:"Courage the Cowardly Dog",role:"Tank",icon:"🐕",color:"#d97bc3",hp:540,atk:42,def:17,skill:"Courageous Shield",ability:"guard"},
{id:"homer",name:"Homer Simpson",series:"The Simpsons",role:"Damage",icon:"🍩",color:"#f0b540",hp:485,atk:60,def:12,skill:"Donut Slam",ability:"strike"}
];
const byId = Object.fromEntries(heroes.map(h=>[h.id,h]));
const starter = ["hercules","jack","yugi","tidus","wakka"];
const SAVE_KEY = "ctooniverse-battle-quest-v1";
const stageNames = ["Neon Alley","Arcade Entrance","Retro Rooftops","Pixel Plaza","Glitch Gate","Candy Crossroads","Haunted Highway","Rocket Rail","Card Kingdom","Boss Boulevard","Starlight Steps","Mysterious Mansion","Game Grid","Clockwork Castle","Shadow Circuit","Twilight Towers","Cosmic Causeway","The Final Glitch"];
const villains = [
{name:"Glitchling",icon:"👾",hp:195,atk:27,def:6},
{name:"Shadow Bot",icon:"🤖",hp:235,atk:24,def:9},
{name:"Corrupted Slime",icon:"🟣",hp:220,atk:29,def:5},
{name:"Static Phantom",icon:"👻",hp:205,atk:32,def:6}
];
const copy = o => JSON.parse(JSON.stringify(o));
const fresh = () => ({credits:1800,wins:0,highestCleared:0,team:[],lineupVersion:2,shards:{},roster:Object.fromEntries(starter.map(id=>[id,{level:1,stars:1,rank:0}]))});
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY));
  if(!raw || typeof raw!=="object")return fresh();
  const s=fresh();
  s.credits=Number.isSafeInteger(raw.credits)?Math.max(0,Math.min(10000000,raw.credits)):s.credits;
  s.wins=Number.isSafeInteger(raw.wins)?Math.max(0,Math.min(999999,raw.wins)):0;
  s.highestCleared=Number.isSafeInteger(raw.highestCleared)?Math.max(0,Math.min(18,raw.highestCleared)):0;
  if(raw.roster&&typeof raw.roster==="object"){
   for(const id of Object.keys(byId)){
    const r=raw.roster[id];
    if(!r||typeof r!=="object")continue;
    const level=Number(r.level),stars=Number(r.stars),rank=Number(r.rank);
    s.roster[id]={level:Number.isInteger(level)?Math.min(50,Math.max(1,level)):1,stars:Number.isInteger(stars)?Math.min(5,Math.max(1,stars)):1,rank:Number.isInteger(rank)?Math.min(9,Math.max(0,rank)):0};
   }
  }
  if(raw.shards&&typeof raw.shards==="object"){
   for(const id of Object.keys(byId)){
    const n=raw.shards[id];
    s.shards[id]=Number.isSafeInteger(n)?Math.max(0,Math.min(99999,n)):0;
   }
  }
  const team=Array.isArray(raw.team)?raw.team.filter(id=>byId[id]&&s.roster[id]):[];
  // Clear preexisting beta starter teams once. Preserve heroes, shards and campaign progress.
  s.team=raw.lineupVersion===2?[...new Set(team)].slice(0,5):[];
  return s;
 }catch(_){return fresh();}
}
let state=load();
let selectedHero="hercules", selectedStage=Math.min(18,state.highestCleared+1), active=null, ticker=null, autoSpecials=false, paused=false, battleSpeed=1, currentView="campaign", messages=[];
const fmt=n=>Math.round(n).toLocaleString();
const heroState=id=>state.roster[id];
const hpOf=h=>Math.round((h.hp+(heroState(h.id).level-1)*24)*(1+(heroState(h.id).stars-1)*.12+heroState(h.id).rank*.1));
const atkOf=h=>Math.round((h.atk+(heroState(h.id).level-1)*6)*(1+(heroState(h.id).stars-1)*.12+heroState(h.id).rank*.09));
const defOf=h=>Math.round(h.def+heroState(h.id).level*.8+heroState(h.id).rank*2);
const power=id=>Math.round(hpOf(byId[id])/5+atkOf(byId[id])*3+defOf(byId[id])*4);
const levelCost=id=>Math.round(75*heroState(id).level+20*heroState(id).level**2);
const promoteCost=id=>350*(heroState(id).rank+1);
const starCost=id=>heroState(id).stars*12;
const unlocked=id=>!!state.roster[id];
const teamPower=()=>state.team.reduce((n,id)=>n+(unlocked(id)?power(id):0),0);
const suggestedPower=stage=>1100+stage*220;
/* Reuse saved heroes and progress; only change the lineup by explicit player action. */
function autoBuildTeam(){
 if(active){notice("Finish or retreat from battle before changing your team.");return;}
 const available=heroes.filter(h=>unlocked(h.id)).sort((a,b)=>power(b.id)-power(a.id));
 if(!available.length){notice("No unlocked heroes are available.");return;}
 const picked=[];
 for(const role of ["Tank","Support","Control","Damage"]){
  const hero=available.find(h=>h.role===role&&!picked.includes(h.id));
  if(hero)picked.push(hero.id);
 }
 for(const hero of available){if(picked.length>=5)break;if(!picked.includes(hero.id))picked.push(hero.id);}
 state.team=picked;
 save();render();notice("Balanced squad ready! "+picked.length+" heroes selected. Choose a stage and enter battle.");
}
const save=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(_){notice("Storage unavailable. Progress may not persist after refresh.");}};
function notice(message){$("hb-message").textContent=message;}
function portrait(h){return '<div class="hb-portrait" style="--hero-color:'+h.color+'">'+(h.art?'<img src="'+h.art+'" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(&quot;span&quot;),{textContent:&quot;'+h.icon+'&quot;}))">':'<span aria-hidden="true">'+h.icon+'</span>')+'</div>';}
function stars(n){return "★".repeat(n)+"☆".repeat(5-n);}
function renderHeader(){
 $("hb-credits").textContent=fmt(state.credits);
 $("hb-wins").textContent=fmt(state.wins);
 $("hb-power").textContent=fmt(teamPower());
 $("hb-team-count").textContent=state.team.length+" / 5";
}
function renderCampaign(){
 $("hb-stage-progress").textContent=state.highestCleared+" / 18";
 $("hb-current-stage").textContent="Stage "+selectedStage+": "+stageNames[selectedStage-1];
 $("hb-missions").innerHTML=stageNames.map((name,i)=>{
  const n=i+1,open=n<=state.highestCleared+1,done=n<=state.highestCleared;
  return '<button type="button" class="hb-mission '+(selectedStage===n?"chosen ":"")+(done?"cleared":"")+'" data-stage="'+n+'" '+(!open||!!active?"disabled":"")+'><strong>'+(done?"✓ ":"")+'STAGE '+n+'</strong><small>'+name+'</small><span>'+(done?"CLEARED":open?"AVAILABLE":"🔒 LOCKED")+'</span></button>';
 }).join("");
 $("hb-campaign-team").innerHTML=state.team.length?state.team.map(id=>'<div class="hb-mini"><b>'+byId[id].icon+'</b><span>'+byId[id].name+'</span><small>Lv '+heroState(id).level+'</small></div>').join(""):'<p class="hb-muted">Your team is empty. Open MY TEAM to choose your heroes.</p>';
 const estimate=suggestedPower(selectedStage),strength=teamPower();
 const risk=!state.team.length?"Pick a squad first":strength>=estimate?"Squad looks ready":"Consider training your squad";
 const creditReward=200+selectedStage*70,shardReward=3+(selectedStage%3);
 $("hb-stage-intel").innerHTML=
  '<div class="hb-intel-heading"><strong>🎯 STAGE BRIEFING</strong><span>'+risk+'</span></div>'+
  '<div class="hb-intel-grid"><div><small>YOUR TEAM POWER</small><strong>'+fmt(strength)+'</strong></div>'+
  '<div><small>SUGGESTED POWER (EST.)</small><strong>'+fmt(estimate)+'</strong></div>'+
  '<div><small>VICTORY CREDITS</small><strong>+'+fmt(creditReward)+'</strong></div>'+
  '<div><small>RANDOM HERO SHARDS</small><strong>+'+shardReward+'</strong></div></div>'+
  '<p class="hb-note">Three waves · stronger foes in later stages · replay cleared missions for rewards.</p>';
 $("hb-start").disabled=!!active||!state.team.length;
 $("hb-quick-team").disabled=!!active||!heroes.some(h=>unlocked(h.id));
}
function heroCard(h,teamMode){
 const r=heroState(h.id),isIn=state.team.includes(h.id);
 return '<article class="hb-card '+(!r?"locked ":"")+(selectedHero===h.id?"selected":"")+'">'+portrait(h)+'<h3>'+h.name+'</h3><small>'+h.role+' · '+h.series+'</small>'+
 (r?'<div class="hb-stars">'+stars(r.stars)+'</div><small>Level '+r.level+' · Power '+fmt(power(h.id))+'</small>':'<div class="hb-stars">🔒 LOCKED</div><small>Shards '+(state.shards[h.id]||0)+' / 12</small>')+
 (teamMode?'<button data-action="team" data-id="'+h.id+'" '+(!r?"disabled":"")+' class="'+(isIn?"is-picked":"")+'">'+(!r?"LOCKED":isIn?"✓ ON TEAM":"ADD TO TEAM")+'</button>':'<button data-action="inspect" data-id="'+h.id+'">VIEW & UPGRADE</button>')+'</article>';
}
function renderTeam(){
 $("hb-team-slots").innerHTML=Array.from({length:5},(_,i)=>state.team[i]?'<div class="hb-mini"><b>'+byId[state.team[i]].icon+'</b><span>'+byId[state.team[i]].name+'</span><small>'+byId[state.team[i]].role+'</small></div>':'<div class="hb-mini"><b>＋</b><span>EMPTY SLOT</span></div>').join("");
 $("hb-team-roster").innerHTML=heroes.filter(h=>unlocked(h.id)).map(h=>heroCard(h,true)).join("");
 $("hb-clear-team").disabled=!!active||state.team.length===0;
 $("hb-auto-team").disabled=!!active||!heroes.some(h=>unlocked(h.id));
}
function renderDetails(){
 const h=byId[selectedHero],r=heroState(h.id),shards=state.shards[h.id]||0;
 if(!r){
  $("hb-details").innerHTML='<p class="hb-eyebrow">LOCKED HERO</p>'+portrait(h)+'<h2>'+h.name+'</h2><p class="hb-subtitle">'+h.series+' · '+h.role+'</p><p>Collect <b>12 hero shards</b> from campaign victories to recruit this hero.</p><div class="hb-statrow"><span>Hero shards</span><strong>'+shards+' / 12</strong></div><div class="hb-upgrade"><button data-action="recruit" data-id="'+h.id+'" '+(shards<12?"disabled":"")+'>RECRUIT HERO</button></div>';
  return;
 }
 const levelReady=r.level<50&&state.credits>=levelCost(h.id), promotedReady=r.rank<9&&r.level>=(r.rank+1)*5&&state.credits>=promoteCost(h.id), evolveReady=r.stars<5&&shards>=starCost(h.id)&&state.credits>=200*r.stars;
 $("hb-details").innerHTML='<p class="hb-eyebrow">HERO PROFILE</p>'+portrait(h)+'<h2>'+h.name+'</h2><p class="hb-subtitle">'+h.series+' · '+h.role+'</p>'+
 '<div class="hb-statrow"><span>Level / Rank</span><strong>'+r.level+' / '+(r.rank+1)+'</strong></div><div class="hb-statrow"><span>Stars</span><strong class="hb-stars">'+stars(r.stars)+'</strong></div>'+
 '<div class="hb-statrow"><span>Health / Attack</span><strong>'+hpOf(h)+' / '+atkOf(h)+'</strong></div><div class="hb-statrow"><span>Hero shards</span><strong>'+shards+'</strong></div>'+
 '<div class="hb-statrow"><span>Special</span><strong>'+h.skill+'</strong></div>'+
 '<div class="hb-upgrade"><strong>LEVEL UP</strong><small>Increase health and damage. Costs '+fmt(levelCost(h.id))+' Battle Credits.</small><button data-action="level" data-id="'+h.id+'" '+(!levelReady?"disabled":"")+'>TRAIN '+h.name.toUpperCase()+'</button></div>'+
 '<div class="hb-upgrade"><strong>PROMOTE RANK</strong><small>Requires level '+((r.rank+1)*5)+' and '+fmt(promoteCost(h.id))+' credits.</small><button data-action="promote" data-id="'+h.id+'" '+(!promotedReady?"disabled":"")+'>PROMOTE</button></div>'+
 '<div class="hb-upgrade"><strong>EVOLVE STARS</strong><small>Requires '+starCost(h.id)+' shards and '+(200*r.stars)+' credits. You have '+shards+' shards.</small><button data-action="evolve" data-id="'+h.id+'" '+(!evolveReady?"disabled":"")+'>EVOLVE</button></div>';
}
function render(){renderHeader();renderCampaign();renderTeam();$("hb-roster").innerHTML=heroes.map(h=>heroCard(h,false)).join("");renderDetails();renderBattle();}
function showView(v){
 currentView=v;
 document.querySelectorAll("[data-view]").forEach(b=>{const on=b.dataset.view===v;b.classList.toggle("active",on);b.setAttribute("aria-selected",String(on));});
 ["campaign","team","heroes"].forEach(k=>{$("hb-view-"+k).hidden=k!==v;});
}
function modifyHero(id,action){
 if(active){notice("Finish or retreat from the battle before editing your roster.");return;}
 const h=byId[id];if(!h)return;
 const r=heroState(id),shards=state.shards[id]||0;
 if(action==="recruit"){
  if(r||shards<12)return;
  state.shards[id]=shards-12;state.roster[id]={level:1,stars:1,rank:0};notice(h.name+" joined your roster!");
 }else if(!r)return;
 else if(action==="level"){
  const cost=levelCost(id);if(r.level>=50||state.credits<cost)return;
  state.credits-=cost;r.level++;notice(h.name+" trained to level "+r.level+"!");
 }else if(action==="promote"){
  const cost=promoteCost(id);if(r.rank>=9||r.level<(r.rank+1)*5||state.credits<cost)return;
  state.credits-=cost;r.rank++;notice(h.name+" promoted to rank "+(r.rank+1)+"!");
 }else if(action==="evolve"){
  const chips=starCost(id),cost=200*r.stars;if(r.stars>=5||shards<chips||state.credits<cost)return;
  state.shards[id]-=chips;state.credits-=cost;r.stars++;notice(h.name+" evolved to "+r.stars+" stars!");
 }else if(action==="team"){
  if(state.team.includes(id)){state.team=state.team.filter(x=>x!==id);}
  else {if(state.team.length>=5){notice("Your team is full. Remove a hero to add another.");return;}state.team.push(id);}
  notice("Lineup updated: "+state.team.length+" / 5 heroes.");
 }
 save();render();
}
function stageEnemies(stage,wave){
 const multiplier=1+(stage-1)*.23+(wave-1)*.18;
 const count=wave===1?2:wave===2?3:3;
 return Array.from({length:count},(_,i)=>{
  const boss=wave===3&&i===count-1;
  const v=villains[(stage+wave+i)%villains.length];
  const hp=Math.round(v.hp*multiplier*(boss?1.75:1));
  return {id:"enemy-"+wave+"-"+i,name:boss?(stage%5===0?"Glitch Overlord":"Elite "+v.name):v.name,icon:boss?"👹":v.icon,maxHp:hp,hp,attack:Math.round(v.atk*multiplier*(boss?1.25:1)),def:Math.round(v.def*multiplier),stunned:0,shield:0,energy:0,boost:0,boss};
 });
}
function unitFromHero(id){
 const h=byId[id];return {id,name:h.name,icon:h.icon,maxHp:hpOf(h),hp:hpOf(h),attack:atkOf(h),def:defOf(h),energy:0,shield:0,stunned:0,boost:0,ability:h.ability,skill:h.skill};
}
function log(s){messages.unshift(s);messages=messages.slice(0,10);}
function living(arr){return arr.filter(u=>u.hp>0);}
function target(arr){const list=living(arr);return list.length?list[Math.floor(Math.random()*list.length)]:null;}
function strike(source,victim,multiplier=1){
 if(!victim||victim.hp<=0)return 0;
 const boost=source.boost>0?1.28:1;
 const raw=Math.max(6,Math.round((source.attack*multiplier*boost-victim.def*.62)*(.86+Math.random()*.28)));
 const block=Math.min(victim.shield,raw);victim.shield-=block;
 const dealt=raw-block;victim.hp=Math.max(0,victim.hp-dealt);
 return dealt;
}
function useSpecial(id,automatic=false){
 if(!active||active.phase!=="running"||paused)return;
 const me=active.allies.find(u=>u.id===id&&u.hp>0&&u.energy>=100);if(!me)return;
 me.energy=0;const enemies=living(active.enemies),allies=living(active.allies);
 let message=me.name+" used "+me.skill+"!";
 if(me.ability==="guard"){allies.forEach(u=>u.shield+=Math.round(me.attack*1.75));message+=" The whole team gained shields.";}
 if(me.ability==="heal"){allies.forEach(u=>u.hp=Math.min(u.maxHp,u.hp+Math.round(me.attack*2.15)));message+=" Allies recovered health.";}
 if(me.ability==="boost"){allies.forEach(u=>u.boost=3);message+=" Team attack increased.";}
 if(me.ability==="stun"){enemies.slice(0,2).forEach(u=>{strike(me,u,1.4);u.stunned=2;});message+=" Enemies are stunned.";}
 if(me.ability==="strike"){const e=target(active.enemies);if(e){const n=strike(me,e,3.4);message+=" "+n+" damage!";}}
 if(me.ability==="blast"){enemies.forEach(u=>strike(me,u,1.7));message+=" Hit every enemy.";}
 log(message);renderBattle();
 if(!automatic)resolveBattle();
}
function renderUnit(u,enemy=false){
 const pct=Math.max(0,Math.round(100*u.hp/u.maxHp));
 const energy=Math.min(100,u.energy);
 return '<div class="hb-unit '+(enemy?"enemy ":"")+(u.hp<=0?"fallen":"")+'"><span class="icon" aria-hidden="true">'+u.icon+'</span><strong>'+u.name+'</strong><div class="hb-meter" title="Health"><span style="width:'+pct+'%"></span></div><small>'+fmt(u.hp)+' / '+fmt(u.maxHp)+'</small>'+
 (enemy?'<small>'+(u.boss?" ★ BOSS":"")+(u.stunned>0?" · STUNNED":"")+'</small>':'<div class="hb-meter energy" title="Special energy"><span style="width:'+energy+'%"></span></div><button data-action="special" data-id="'+u.id+'" '+(u.hp<=0||u.energy<100||!active||active.phase!=="running"||paused?"disabled":"class=\"ready\"")+' aria-label="Use '+u.skill+'">'+(u.energy>=100?"★ "+u.skill:"SPECIAL "+u.energy+"%")+'</button>')+'</div>';
}
function renderBattle(){
 $("hb-battle").hidden=!active;
 if(!active)return;
 $("hb-battle-title").textContent="Stage "+active.stage+": "+stageNames[active.stage-1];
 $("hb-wave").textContent=active.phase==="running"?(paused?"⏸ PAUSED · ":"")+"WAVE "+active.wave+" / 3":active.phase.toUpperCase();
 $("hb-wave-track").innerHTML=[1,2,3].map(w=>{
  const stateClass=active.phase==="victory"||w<active.wave?"cleared":w===active.wave?"current":"upcoming";
  return '<span class="hb-wave-step '+stateClass+'">'+(stateClass==="cleared"?"✓ ":"")+"WAVE "+w+'</span>';
 }).join("");
 $("hb-allies").innerHTML=active.allies.map(u=>renderUnit(u)).join("");
 $("hb-enemies").innerHTML=active.enemies.map(u=>renderUnit(u,true)).join("");
 $("hb-auto").textContent="AUTO SPECIALS: "+(autoSpecials?"ON":"OFF");
 $("hb-auto").setAttribute("aria-pressed",String(autoSpecials));
 $("hb-auto").disabled=active.phase!=="running";
 $("hb-speed").textContent="⏩ SPEED: "+battleSpeed+"×";
 $("hb-speed").disabled=active.phase!=="running";
 $("hb-pause").textContent=paused?"▶ RESUME":"⏸ PAUSE";
 $("hb-pause").setAttribute("aria-pressed",String(paused));
 $("hb-pause").disabled=active.phase!=="running";
 $("hb-retreat").textContent=active.phase==="running"?"RETREAT":"RETURN TO CAMPAIGN";
 $("hb-log").innerHTML=messages.map(m=>"<li>"+m+"</li>").join("");
}
function beginBattle(){
 if(active){notice("You already have an active battle.");return;}
 if(selectedStage>state.highestCleared+1||selectedStage<1||selectedStage>18){notice("This stage is locked.");return;}
 const lineup=state.team.filter(id=>unlocked(id));
 if(!lineup.length){notice("Add at least one unlocked hero to your team.");return;}
 active={stage:selectedStage,wave:1,phase:"running",allies:lineup.map(unitFromHero),enemies:stageEnemies(selectedStage,1)};
 paused=false;messages=[];log("Stage "+selectedStage+" begins. Fight through three waves!");
 $("hb-battle").hidden=false;
 render();$("hb-battle").scrollIntoView({behavior:"smooth",block:"start"});
 startTicker();
}
function stop(){if(ticker){clearInterval(ticker);ticker=null;}}
function startTicker(){
 stop();
 if(active&&active.phase==="running"&&!paused)ticker=setInterval(step,Math.round(1150/battleSpeed));
}
function togglePause(){
 if(!active||active.phase!=="running")return;
 paused=!paused;
 if(paused){stop();log("Battle paused. Your squad is safe while you plan the next special.");}
 else {log("Battle resumed.");startTicker();}
 renderBattle();
}
function toggleSpeed(){
 if(!active||active.phase!=="running")return;
 battleSpeed=battleSpeed===1?2:1;
 if(!paused)startTicker();
 renderBattle();
}
function resolveBattle(){
 if(!active||active.phase!=="running")return false;
 if(!living(active.allies).length){active.phase="defeat";stop();log("Defeat. Train your heroes and try again.");notice("Battle lost! Upgrade your team and retry.");render();return true;}
 if(!living(active.enemies).length){
  if(active.wave<3){
   active.wave++;
   active.allies.forEach(u=>{if(u.hp>0)u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*.09));});
   active.enemies=stageEnemies(active.stage,active.wave);
   log("Wave "+active.wave+" approaches! Your surviving heroes recover a little health.");
   renderBattle();return true;
  }
  active.phase="victory";stop();
  const stage=active.stage,credits=200+stage*70;
  state.credits+=credits;state.wins++;state.highestCleared=Math.max(state.highestCleared,stage);
  const pool=heroes.filter(h=>!unlocked(h.id));
  const rewardHero=(pool.length?pool:heroes)[Math.floor(Math.random()*(pool.length?pool.length:heroes.length))];
  const amount=3+(stage%3);
  state.shards[rewardHero.id]=(state.shards[rewardHero.id]||0)+amount;
  log("VICTORY! +"+credits+" Battle Credits and +"+amount+" "+rewardHero.name+" shards!");
  notice("Stage "+stage+" cleared! Earned "+credits+" credits and "+amount+" "+rewardHero.name+" shards.");
  selectedStage=Math.min(18,state.highestCleared+1);save();render();return true;
 }
 return false;
}
function step(){
 if(!active||active.phase!=="running"||paused)return;
 if(resolveBattle())return;
 const allies=living(active.allies);
 for(const u of allies){
  const e=target(active.enemies);if(!e)break;
  const damage=strike(u,e);u.energy=Math.min(100,u.energy+27);
  if(Math.random()<.14)log(u.name+" hit "+e.name+" for "+damage+".");
 }
 if(resolveBattle())return;
 for(const e of living(active.enemies)){
  if(e.stunned>0){e.stunned--;continue;}
  const u=target(active.allies);if(!u)break;
  strike(e,u);
 }
 for(const u of living(active.allies))if(u.boost>0)u.boost--;
 if(autoSpecials)for(const u of living(active.allies))if(u.energy>=100)useSpecial(u.id,true);
 if(!resolveBattle())renderBattle();
}
function retreat(){
 if(!active)return;
 stop();active=null;paused=false;messages=[];render();notice("Returned to the campaign. No rewards were collected.");$("hb-view-campaign").scrollIntoView({behavior:"smooth",block:"start"});
}
document.addEventListener("click",e=>{
 const view=e.target.closest("[data-view]");
 if(view){showView(view.dataset.view);return;}
 const stage=e.target.closest("[data-stage]");
 if(stage){selectedStage=Number(stage.dataset.stage);renderCampaign();return;}
 const action=e.target.closest("[data-action]");
 if(action){
  const id=action.dataset.id,type=action.dataset.action;
  if(type==="inspect"){selectedHero=id;render();return;}
  if(type==="special"){useSpecial(id);return;}
  if(byId[id])modifyHero(id,type);
 }
});
$("hb-start").addEventListener("click",beginBattle);
$("hb-quick-team").addEventListener("click",autoBuildTeam);
$("hb-auto-team").addEventListener("click",autoBuildTeam);
$("hb-speed").addEventListener("click",toggleSpeed);
$("hb-pause").addEventListener("click",togglePause);
$("hb-clear-team").addEventListener("click",()=>{
 if(active){notice("Finish or retreat before clearing your team.");return;}
 if(!state.team.length){notice("Your team is already empty.");return;}
 state.team=[];save();render();notice("Team cleared. Select any unlocked hero to rebuild your lineup.");
});
$("hb-retreat").addEventListener("click",retreat);
$("hb-auto").addEventListener("click",()=>{autoSpecials=!autoSpecials;renderBattle();});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden&&active&&active.phase==="running"&&!paused){
  paused=true;stop();log("Battle paused when the tab was hidden.");renderBattle();
 }
});
window.addEventListener("pagehide",stop);
window.addEventListener("pageshow",event=>{
 if(event.persisted&&active&&active.phase==="running"&&!paused){
  paused=true;stop();renderBattle();notice("Battle paused after returning to this page. Tap Resume to continue.");
 }
});
showView("campaign");render();
})();
