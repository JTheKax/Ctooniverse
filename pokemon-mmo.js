import {createClient} from "https://esm.sh/@supabase/supabase-js@2.58.0";

const db=createClient("https://hsxdyxdazsdmpucyhqly.supabase.co","sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS");
const $=id=>document.getElementById(id);
const COLS=24,ROWS=18,TILE=40;
const SPECIES={
  1:"Bulbasaur",4:"Charmander",7:"Squirtle",10:"Caterpie",13:"Weedle",
  16:"Pidgey",19:"Rattata",25:"Pikachu",43:"Oddish",69:"Bellsprout"
};
const sprite=id=>"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/"+id+".png";
let user=null,trainer=null,party=[],selectedStarter=1,guest=false,busy=false,encounter=null,channel=null,online=new Map();
let view={x:0,y:0,cols:COLS,rows:ROWS},moveLast=0,presenceLast=0,healLast=0,saveTimer=null,presenceTimer=null,moveInterval=null;
const sessionKey=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():String(Math.random());
const canvas=$("pmmo-map"),ctx=canvas.getContext("2d");
const battleModal=$("pmmo-battle");
const range=(v,a,b)=>Math.min(b,Math.max(a,v));
function report(message){$("pmmo-message").textContent=message;}
function friend(){return party.find(p=>p.is_starter)||{species_id:trainer?.starter_species||1,level:5,xp:0};}
function lake(x,y){return x>=17&&x<=22&&y>=3&&y<=7&&((x!==17&&x!==22)||(y>=4&&y<=6));}
function clinic(x,y){return x>=9&&x<=13&&y>=2&&y<=5;}
function gym(x,y){return x>=17&&x<=21&&y>=10&&y<=13;}
function tree(x,y){
 if(x===0||x===23||y===0||y===17)return true;
 return [[2,2],[2,3],[3,2],[4,2],[5,2],[6,2],[20,15],[21,15],[20,16],[21,16],[1,15],[2,15],[1,16],[2,16],[6,15],[7,15],[6,16]].some(([a,b])=>a===x&&b===y);
}
function path(x,y){return (x>=11&&x<=13)||(y>=8&&y<=9)||(x>=14&&x<=17&&y>=8&&y<=10);}
function grass(x,y){
 if(path(x,y)||clinic(x,y)||gym(x,y)||lake(x,y)||tree(x,y))return false;
 return (x>=2&&x<=8&&y>=4&&y<=13)||(x>=15&&x<=22&&y>=12&&y<=16)||(x>=5&&x<=9&&y>=3&&y<=7);
}
function solid(x,y){return x<0||x>=COLS||y<0||y>=ROWS||tree(x,y)||lake(x,y)||clinic(x,y)||gym(x,y);}
function tileDraw(x,y,screenX,screenY){
 const u=screenX*TILE,v=screenY*TILE;
 const noise=Math.abs((x*89+y*137+x*y*7)%11);
 ctx.fillStyle=path(x,y)?"#d9c79f":noise%2?"#74b965":"#68b55d";
 ctx.fillRect(u,v,TILE,TILE);
 if(path(x,y)){
   ctx.fillStyle="#b8ae86";ctx.fillRect(u+(noise*3)%33,v+((noise*9)%35),3,3);
 }else{
   ctx.fillStyle="#4c9851";ctx.fillRect(u+(noise*3)%31,v+(noise*5)%34,4,6);
 }
 if(grass(x,y)){
   ctx.fillStyle=noise%2?"#2f8647":"#378d4b";
   for(let k=0;k<4;k++){const sx=u+4+(k*9+(noise%3)),sy=v+7+(k*7)%28;
     ctx.fillRect(sx,sy,3,13);ctx.fillRect(sx-4,sy+4,7,3);}
 }
 if(lake(x,y)){
   ctx.fillStyle="#368fba";ctx.fillRect(u,v,TILE,TILE);
   ctx.fillStyle="#7cd3d5";ctx.fillRect(u+(noise%4)*7+3,v+(noise%3)*9+12,13,2);
 }
 if(tree(x,y)){
   ctx.fillStyle="#735137";ctx.fillRect(u+15,v+24,10,16);
   ctx.fillStyle="#2b6a3b";ctx.fillRect(u+3,v+8,34,25);
   ctx.fillStyle="#3d9954";ctx.fillRect(u+8,v+4,23,17);
   ctx.fillStyle="#78bc5e";ctx.fillRect(u+13,v+5,9,7);
 }
 if(clinic(x,y)||gym(x,y)){
   const center=clinic(x,y),roof=center?"#e56a65":"#645dd4",shade=center?"#bd5357":"#4747a9";
   ctx.fillStyle=shade;ctx.fillRect(u,v,TILE,TILE);
   ctx.fillStyle=roof;ctx.fillRect(u+2,v+3,36,27);
   ctx.fillStyle="#fee5b5";ctx.fillRect(u+4,v+31,32,8);
   if(y===5&&((center&&x===11)||(!center&&x===19))){
     ctx.fillStyle="#2a3547";ctx.fillRect(u+9,v+17,22,23);
   }
 }
 if(x===11&&y===7){
   ctx.fillStyle="#e0fff4";ctx.fillRect(u+6,v+4,28,31);
   ctx.fillStyle="#ef6e75";ctx.fillRect(u+17,v+7,7,20);ctx.fillRect(u+11,v+13,19,7);
   ctx.strokeStyle="#377b74";ctx.strokeRect(u+6,v+4,28,31);
 }
 if(x===12&&y===6){
   ctx.fillStyle="#ffdeae";ctx.fillRect(u+12,v+24,15,13);
   ctx.fillStyle="#775c39";ctx.fillRect(u+9,v+8,21,19);
   ctx.fillStyle="#f5edbd";ctx.fillRect(u+12,v+10,15,14);
 }
 if(!path(x,y)&&!grass(x,y)&&!tree(x,y)&&!lake(x,y)&&!clinic(x,y)&&!gym(x,y)&&noise===4){
   ctx.fillStyle="#f1eb8d";ctx.fillRect(u+18,v+12,3,6);ctx.fillRect(u+15,v+15,9,2);
 }
}
function avatar(x,y,name,isSelf=false,hue=0){
 const sx=(x-view.x)*TILE,sy=(y-view.y)*TILE;
 if(sx<0||sx>=canvas.width||sy<0||sy>=canvas.height)return;
 ctx.save();
 const bump=isSelf?0:1;
 ctx.fillStyle="#0b3c3b82";ctx.beginPath();ctx.ellipse(sx+20,sy+36,12,5,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#202d47";ctx.fillRect(sx+13,sy+29,6,7);ctx.fillRect(sx+22,sy+29,6,7);
 ctx.fillStyle=isSelf?"#e74857":hue?"#8058c8":"#4d96ce";ctx.fillRect(sx+10,sy+17,20,14);
 ctx.fillStyle="#f4bf91";ctx.fillRect(sx+12,sy+8,16,12);
 ctx.fillStyle="#423a35";ctx.fillRect(sx+11,sy+5,18,6);
 ctx.fillStyle=isSelf?"#f9e9ad":"#d7f2f8";ctx.fillRect(sx+9,sy+5,22,5);
 ctx.fillStyle="#1b3440";ctx.fillRect(sx+15,sy+14,2,2);ctx.fillRect(sx+24,sy+14,2,2);
 if(name){
   const label=String(name).slice(0,22);
   ctx.font="bold 11px system-ui,sans-serif";ctx.textAlign="center";
   const w=Math.min(148,ctx.measureText(label).width+12);
   ctx.fillStyle="#061c29d9";ctx.fillRect(sx+20-w/2,sy-13-bump,w,14);
   ctx.fillStyle=isSelf?"#fff0ae":"#f0faff";ctx.fillText(label,sx+20,sy-2-bump);
 }
 ctx.restore();
}
function resizeWorld(){
 const isMobile=window.innerWidth<670;
 view.cols=isMobile?12:COLS;view.rows=isMobile?9:ROWS;
 canvas.width=view.cols*TILE;canvas.height=view.rows*TILE;
 render();
}
function render(){
 if(!trainer)return;
 view.x=range(trainer.tile_x-Math.floor(view.cols/2),0,COLS-view.cols);
 view.y=range(trainer.tile_y-Math.floor(view.rows/2),0,ROWS-view.rows);
 ctx.clearRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<view.rows;y++)for(let x=0;x<view.cols;x++)tileDraw(x+view.x,y+view.y,x,y);
 // Landmarks and visible fellow trainers.
 ctx.font="bold 11px system-ui,sans-serif";ctx.textAlign="center";ctx.fillStyle="#fff9cf";
 for(const [x,y,name] of [[11,2,"POKÉMON CENTER"],[19,10,"GYM • COMING SOON"]]){
  const sx=(x-view.x)*TILE,sy=(y-view.y)*TILE;
  if(sx>-120&&sx<canvas.width+120&&sy>-20&&sy<canvas.height+70){
    ctx.fillStyle="#183332e8";ctx.fillRect(sx-79,sy+8,158,15);
    ctx.fillStyle="#fff7bc";ctx.fillText(name,sx,sy+19);
  }
 }
 for(const other of online.values()){
  if(other.id===sessionKey)continue;
  if(!Number.isInteger(other.x)||!Number.isInteger(other.y))continue;
  avatar(range(other.x,0,23),range(other.y,0,17),other.name,false,other.x%2);
 }
 avatar(trainer.tile_x,trainer.tile_y,trainer.display_name,true);
}
async function saveLocation(){
 if(!user||!trainer||guest)return;
 const x=trainer.tile_x,y=trainer.tile_y;
 const {error}=await db.from("pokemon_mmo_trainers")
 .update({tile_x:x,tile_y:y}).eq("user_id",user.id);
 if(error)console.warn("Could not save MMO location",error.message);
}
function scheduleSave(){
 if(!user||guest)return;
 if(saveTimer)clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{saveTimer=null;saveLocation();},2200);
}
function sendPresence(force=false){
 if(!channel||!trainer||!user||guest)return;
 const now=Date.now();
 if(!force&&now-presenceLast<1750){
   if(!presenceTimer)presenceTimer=setTimeout(()=>{
     presenceTimer=null;
     sendPresence(true);
   },1750-(now-presenceLast));
   return;
 }
 if(presenceTimer){clearTimeout(presenceTimer);presenceTimer=null;}
 presenceLast=now;
 channel.track({id:sessionKey,name:trainer.display_name,x:trainer.tile_x,y:trainer.tile_y}).catch(()=>{});
}
async function connectPresence(){
 if(!user||!trainer||guest)return;
 if(channel){await db.removeChannel(channel);channel=null;}
 channel=db.channel("ctoon-pokemon-meadow-town-v1",{
  config:{presence:{key:sessionKey}}
 });
 channel.on("presence",{event:"sync"},()=>{
  online.clear();
  for(const entries of Object.values(channel.presenceState())){
    for(const item of entries){
     if(!item||typeof item.id!=="string"||typeof item.name!=="string")continue;
     if(item.name.length>22)continue;
     online.set(item.id,item);
    }
  }
  $("pmmo-online").textContent=String(online.size||1);
  render();
 }).subscribe(async status=>{
   if(status==="SUBSCRIBED")sendPresence(true);
   else if(status==="CHANNEL_ERROR")report("The live trainer connection is unavailable. Your solo progress still saves.");
 });
}
function refreshHud(){
 if(!trainer)return;
 if(guest)$("pmmo-online").textContent="0";
 $("pmmo-trainer-label").textContent=trainer.display_name;
 $("pmmo-balls").textContent=String(trainer.pokeballs);
 $("pmmo-hp").textContent=String(trainer.hp);
 $("pmmo-state").textContent=guest?"Guest exploration · offline":encounter?"In a wild encounter":"Adventure saved online";
}
function partyCard(p){
 const card=document.createElement("div");card.className="pmmo-party-card";
 const pic=document.createElement("img");pic.alt="";pic.loading="lazy";pic.src=sprite(p.species_id);
 const info=document.createElement("div");
 const name=document.createElement("strong");name.textContent=SPECIES[p.species_id]||"Unknown Pokémon";
 const level=document.createElement("span");level.textContent="Lv. "+p.level+(p.is_starter?" · Partner":"");
 info.append(name,level);
 if(p.is_starter){
  const xp=document.createElement("span");xp.className="pmmo-party-starter";
  xp.textContent="XP "+p.xp+"/"+(p.level*35);info.append(xp);
 }
 card.append(pic,info);return card;
}
function renderParty(){
 const root=$("pmmo-party");root.replaceChildren();
 party.forEach(p=>root.append(partyCard(p)));
 $("pmmo-party-count").textContent=party.length+" Pokémon";
}
async function loadSaved(){
 if(!user)return;
 const {data:profile,error}=await db.from("pokemon_mmo_trainers")
 .select("user_id,display_name,starter_species,tile_x,tile_y,pokeballs,hp,wins")
 .eq("user_id",user.id).maybeSingle();
 if(error)throw error;
 if(!profile)return false;
 trainer=profile;guest=false;
 const {data:monsters,error:monsterError}=await db.from("pokemon_mmo_creatures")
 .select("id,species_id,level,xp,is_starter,caught_at")
 .eq("user_id",user.id).order("caught_at",{ascending:true}).limit(200);
 if(monsterError)throw monsterError;
 party=monsters||[];
 return true;
}
async function refreshSaved(){
 await loadSaved();refreshHud();renderParty();render();
}
async function enterWorld(){
 $("pmmo-setup").hidden=true;$("pmmo-game").hidden=false;
 $("pmmo-map-loading").hidden=true;
 resizeWorld();refreshHud();renderParty();
 report(guest?"Guest mode: explore the town! Sign in to battle, catch Pokémon, and meet other trainers.":
  "Welcome back, "+trainer.display_name+"! Walk through tall grass to encounter wild Pokémon.");
 if(!guest){
   await connectPresence();
   const {data,error}=await db.from("pokemon_mmo_encounters")
      .select("species_id,level,wild_hp,max_hp").eq("user_id",user.id).maybeSingle();
   if(!error&&data)showEncounter({status:"battle",species_id:data.species_id,
     level:data.level,hp:data.wild_hp,max_hp:data.max_hp},"Your wild battle was restored.");
 }
}
async function setup(){
 const {data,error}=await db.auth.getUser();
 user=error?null:data?.user||null;
 $("pmmo-login").hidden=!!user;
 $("pmmo-guest").hidden=false;
 $("pmmo-auth-note").textContent=user?
  "Signed in! Choose your starter once. Your Pokémon and progress will be saved.":
  "Sign in to save and play with others, or explore the town as a guest.";
 if(user){
   const found=await loadSaved();
   if(found){await enterWorld();return;}
 }
 $("pmmo-setup").hidden=false;$("pmmo-game").hidden=true;
}
async function begin(){
 if(busy)return;
 const raw=$("pmmo-trainer-name").value.trim();
 if(!/^[a-zA-Z0-9 _-]{2,22}$/.test(raw)){
   $("pmmo-auth-note").textContent="Enter a trainer name between 2 and 22 letters, digits, spaces, _ or -.";
   return;
 }
 if(!user){
   $("pmmo-auth-note").textContent="Sign in to save a starter, or choose Explore as Guest.";
   return;
 }
 busy=true;$("pmmo-begin").disabled=true;
 try{
   const {error}=await db.rpc("pokemon_mmo_start",{p_starter:selectedStarter,p_name:raw});
   if(error)throw error;
   await loadSaved();await enterWorld();
 }catch(e){
   $("pmmo-auth-note").textContent="Could not begin: "+(e.message||"Please try again.");
 }finally{busy=false;$("pmmo-begin").disabled=false;}
}
function walk(dx,dy){
 if(!trainer||busy||encounter)return;
 const now=Date.now();
 if(now-moveLast<130)return;
 moveLast=now;
 const x=trainer.tile_x+dx,y=trainer.tile_y+dy;
 if(solid(x,y)){report("A tree, building, or lake blocks the way.");return;}
 trainer.tile_x=x;trainer.tile_y=y;render();scheduleSave();sendPresence();
 if(grass(x,y)&&user&&!guest&&Math.random()<0.115){
  startEncounter();
 }else if(x===11&&y===7){
  report("Healing station! Press Interact to restore HP and Poké Balls.");
 }else if(x===19&&y===14){
  report("The Pokémon Gym is under construction. More locations are planned!");
 }
}
function setBattleButtons(enabled){
 for(const id of ["pmmo-attack","pmmo-catch","pmmo-run"])$(id).disabled=!enabled;
}
function showEncounter(data,message){
 $("pmmo-attack").hidden=false;
 $("pmmo-catch").hidden=false;
 $("pmmo-run").textContent="↩ Run";
 encounter={species_id:data.species_id,level:data.level,hp:data.hp??data.wild_hp,
   max_hp:data.max_hp??data.wild_max};
 $("pmmo-wild-name").textContent=SPECIES[encounter.species_id]||"Wild Pokémon";
 $("pmmo-wild-level").textContent="Lv. "+encounter.level;
 $("pmmo-wild-img").src=sprite(encounter.species_id);
 $("pmmo-wild-img").alt="Wild "+(SPECIES[encounter.species_id]||"Pokémon");
 const partner=friend();
 $("pmmo-friend-img").src=sprite(partner.species_id);
 $("pmmo-friend-name").textContent=SPECIES[partner.species_id];
 $("pmmo-friend-level").textContent="Lv. "+partner.level;
 $("pmmo-wild-hp-fill").style.width=(100*encounter.hp/encounter.max_hp)+"%";
 $("pmmo-friend-hp-fill").style.width=100*(trainer?.hp||0)/45+"%";
 $("pmmo-battle-message").textContent=message||"A wild "+SPECIES[encounter.species_id]+" appeared! What will you do?";
 setBattleButtons(true);
 if(!battleModal.open)battleModal.showModal();
 refreshHud();
}
async function startEncounter(){
 if(busy||guest||!user||encounter)return;
 busy=true;
 try{
   const {data,error}=await db.rpc("pokemon_mmo_encounter_start");
   if(error)throw error;
   showEncounter(data);
 }catch(e){report("Couldn't load wild encounter: "+(e.message||"Try again."));}
 finally{busy=false;}
}
async function doBattle(action){
 if(busy||!encounter)return;
 busy=true;setBattleButtons(false);
 try{
   const {data,error}=await db.rpc("pokemon_mmo_battle_action",{p_action:action});
   if(error)throw error;
   if(data.status==="battle"||data.status==="no_balls"){
     if(data.status==="no_balls"){
       $("pmmo-battle-message").textContent="You're out of Poké Balls! Run and visit the healing station.";
     }else{
       encounter.hp=data.wild_hp;
       $("pmmo-wild-hp-fill").style.width=100*encounter.hp/encounter.max_hp+"%";
       $("pmmo-battle-message").textContent=(action==="catch"?"The Pokémon broke free!":"Your Pokémon dealt "+data.damage+" damage!")+
         " Wild Pokémon hit back for "+data.incoming+".";
     }
     trainer.hp=data.hp;trainer.pokeballs=data.pokeballs;
     $("pmmo-friend-hp-fill").style.width=100*trainer.hp/45+"%";
     refreshHud();setBattleButtons(true);return;
   }
   const previous=encounter;encounter=null;
   await refreshSaved();
   const messages={
    won:"You defeated wild "+SPECIES[previous.species_id]+"! Your starter gained experience.",
    caught:"Success! "+SPECIES[previous.species_id]+" was caught and added to your collection!",
    escaped:"You escaped safely.",fainted:"Your Pokémon fainted! You returned to Meadow Town fully healed.",
    none:"The encounter has ended."
   };
   $("pmmo-battle-message").textContent=messages[data.status]||"Battle finished.";
   report(messages[data.status]||"Battle finished.");
   if(data.status==="fainted"){trainer.tile_x=12;trainer.tile_y=10;render();}
   $("pmmo-attack").hidden=true;$("pmmo-catch").hidden=true;
   $("pmmo-run").disabled=false;$("pmmo-run").textContent="Continue Adventure";
 }catch(e){
   $("pmmo-battle-message").textContent="Battle error: "+(e.message||"Try again.");
   setBattleButtons(true);
 }finally{busy=false;}
}
function closeBattle(){
 if(busy)return;
 if(encounter){doBattle("run");return;}
 if(battleModal.open)battleModal.close();
 $("pmmo-attack").hidden=false;$("pmmo-catch").hidden=false;
 $("pmmo-run").textContent="↩ Run";setBattleButtons(true);
 refreshHud();
}
async function interact(){
 if(!trainer||busy||encounter)return;
 if(Math.abs(trainer.tile_x-11)<=2&&Math.abs(trainer.tile_y-7)<=2){
  if(guest){trainer.hp=45;refreshHud();report("Welcome to the Pokémon Center! Sign in to save your adventure.");return;}
  busy=true;
  try{
    const {data,error}=await db.rpc("pokemon_mmo_heal");
    if(error)throw error;
    trainer.hp=data.hp;trainer.pokeballs=data.pokeballs;refreshHud();
    report("Your team was healed! You also received a Poké Ball refill (minimum 6).");
  }catch(e){report("Couldn't heal: "+(e.message||"Try again."));}
  finally{busy=false;}return;
 }
 if(grass(trainer.tile_x,trainer.tile_y)){
  if(!user||guest){report("Wild battles and catching need a signed-in CTooniverse account.");return;}
  await startEncounter();return;
 }
 report("Visit the healing station by the Pokémon Center or explore the tall grass!");
}
$("pmmo-setup").addEventListener("click",event=>{
 const btn=event.target.closest("button[data-starter]");
 if(!btn)return;
 selectedStarter=Number(btn.dataset.starter);
 for(const b of document.querySelectorAll(".pmmo-starter")){
   const active=Number(b.dataset.starter)===selectedStarter;
   b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active));
 }
});
$("pmmo-begin").addEventListener("click",begin);
$("pmmo-guest").addEventListener("click",async()=>{
 guest=true;user=null;online.clear();trainer={display_name:"Guest Explorer",starter_species:selectedStarter,
 tile_x:12,tile_y:10,pokeballs:0,hp:45,wins:0};
 party=[{species_id:selectedStarter,level:5,xp:0,is_starter:true}];
 await enterWorld();
});
$("pmmo-attack").addEventListener("click",()=>doBattle("attack"));
$("pmmo-catch").addEventListener("click",()=>doBattle("catch"));
$("pmmo-run").addEventListener("click",()=>encounter?doBattle("run"):closeBattle());
$("pmmo-battle-close").addEventListener("click",closeBattle);
battleModal.addEventListener("cancel",event=>{if(encounter||busy){event.preventDefault();closeBattle();}});
$("pmmo-interact").addEventListener("click",interact);
$("pmmo-party-btn").addEventListener("click",()=>$("pmmo-party-heading").scrollIntoView({behavior:"smooth",block:"center"}));
$("pmmo-guide-btn").addEventListener("click",()=>$("pmmo-help").scrollIntoView({behavior:"smooth",block:"center"}));
const steps={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],
 w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],W:[0,-1],S:[0,1],A:[-1,0],D:[1,0]};
document.addEventListener("keydown",event=>{
 if(event.target instanceof HTMLElement&&event.target.closest("input,textarea,select,[contenteditable]"))return;
 if(!$("pmmo-game").hidden&&!battleModal.open){
   if(steps[event.key]){event.preventDefault();walk(...steps[event.key]);}
   if(event.key==="e"||event.key==="E"){event.preventDefault();interact();}
 }
});
function stopTouch(){if(moveInterval){clearInterval(moveInterval);moveInterval=null;}}
for(const button of document.querySelectorAll("[data-move]")){
 const vector={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[button.dataset.move];
 button.addEventListener("pointerdown",event=>{
   event.preventDefault();stopTouch();walk(...vector);
   moveInterval=setInterval(()=>walk(...vector),160);
 });
 for(const type of ["pointerup","pointerleave","pointercancel"])button.addEventListener(type,stopTouch);
}
window.addEventListener("blur",stopTouch);
window.addEventListener("resize",resizeWorld);
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="hidden"&&saveTimer){
   clearTimeout(saveTimer);saveTimer=null;saveLocation();
 }
});
window.addEventListener("pagehide",()=>{
 stopTouch();
 if(saveTimer){clearTimeout(saveTimer);saveTimer=null;saveLocation();}
 if(presenceTimer){clearTimeout(presenceTimer);presenceTimer=null;}
 if(channel){channel.untrack().catch(()=>{});db.removeChannel(channel);}
});
db.auth.onAuthStateChange(event=>{
 if(event==="SIGNED_OUT"&&trainer&&!guest)report("You signed out. Refresh to play as a guest.");
});
setup().catch(e=>{
 $("pmmo-auth-note").textContent="Couldn't load your adventure: "+(e.message||"Please refresh.");
 $("pmmo-map-loading").hidden=true;
});