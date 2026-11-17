import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS'),$=id=>document.getElementById(id);
const names={1:'Bulbasaur',4:'Charmander',7:'Squirtle',10:'Caterpie',13:'Weedle',16:'Pidgey',19:'Rattata',25:'Pikachu',43:'Oddish',69:'Bellsprout'};
let user=null,trainer=null,party=[],battle=null,busy=false,moving=false,presence=null,visitors=[];const WORLD_W=40,WORLD_H=28,VIEW_W=20,VIEW_H=14;
const generationBounds=[[1,151],[152,251],[252,386],[387,493],[494,649],[650,721],[722,809],[810,905],[906,1025]];let dexNames={...names};const name=id=>dexNames[id]||'Pokémon #'+id,art=id=>'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png';
const starterGroups=[
['Kanto',[1,'Bulbasaur'],[4,'Charmander'],[7,'Squirtle']],
['Johto',[152,'Chikorita'],[155,'Cyndaquil'],[158,'Totodile']],
['Hoenn',[252,'Treecko'],[255,'Torchic'],[258,'Mudkip']],
['Sinnoh',[387,'Turtwig'],[390,'Chimchar'],[393,'Piplup']],
['Unova',[495,'Snivy'],[498,'Tepig'],[501,'Oshawott']],
['Kalos',[650,'Chespin'],[653,'Fennekin'],[656,'Froakie']],
['Alola',[722,'Rowlet'],[725,'Litten'],[728,'Popplio']],
['Galar',[810,'Grookey'],[813,'Scorbunny'],[816,'Sobble']],
['Paldea',[906,'Sprigatito'],[909,'Fuecoco'],[912,'Quaxly']]];
function drawStarters(){const root=$('meadow-starters');if(!root)return;root.replaceChildren();starterGroups.forEach(([region,...options],index)=>{const section=document.createElement('div');section.className='meadow-starter-generation';const heading=document.createElement('h3');heading.textContent='Generation '+(index+1)+' · '+region;section.append(heading);const grid=document.createElement('div');grid.className='meadow-starter-options';options.forEach(([id,label],j)=>{const card=document.createElement('label');card.className='meadow-starter-card';const input=document.createElement('input');input.type='radio';input.name='starter';input.value=String(id);if(index===0&&j===0)input.checked=true;const img=document.createElement('img');img.src=art(id);img.alt='';img.loading='lazy';const nameLabel=document.createElement('strong');nameLabel.textContent=label;const type=document.createElement('small');type.textContent=['🌿 Grass','🔥 Fire','💧 Water'][j];card.append(input,img,nameLabel,type);grid.append(card)});section.append(grid);root.append(section)})}
drawStarters();
let touchScreen='party';
function setTouchScreen(page){touchScreen=page;document.querySelectorAll('[data-page]').forEach(el=>el.hidden=el.dataset.page!==page);document.querySelectorAll('[data-screen]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.screen===page)))}
document.querySelectorAll('[data-screen]').forEach(el=>el.addEventListener('click',()=>setTouchScreen(el.dataset.screen)));
setTouchScreen('party');
function say(s){$('meadow-status').textContent=s;$('meadow-log').textContent=s}
function lock(v){busy=v;document.querySelectorAll('#meadow-game button,#meadow-begin').forEach(b=>b.disabled=v)}
async function rpc(fn,args={}){const {data,error}=await db.rpc(fn,args);if(error)throw error;return data}
const worldDay=()=>Math.floor(Date.now()/86400000);
function hashTile(x,y,salt=0){let n=Math.imul(x+109,374761393)^Math.imul(y+317,668265263)^Math.imul(worldDay()+salt,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}
function regionIndex(x,y){return (y>=14?2:0)+(x>=20?1:0)}
const regionNames=['Meadow Crossing','Wildflower Grove','Pinewood Trail','Crystal Lake'];
const biomes=['meadow','woodland','forest','lakeside'];
function zone(x,y){return regionNames[regionIndex(x,y)]}
function tile(x,y){
 if(x===12&&y===10)return 'station';
 if(x<1||y<1||x>=WORLD_W-1||y>=WORLD_H-1)return 'water';
 // Permanent walkable routes connect every zone and the healing station.
 if(y===10||x===12||x===22||y===17||Math.abs(x-12)+Math.abs(y-10)<=2)return 'path';
 const biome=biomes[regionIndex(x,y)],r=hashTile(x,y),cluster=hashTile(Math.floor(x/3),Math.floor(y/3),17);
 if(biome==='lakeside'&&cluster<0.21&&r<0.82)return 'water';
 if(biome==='forest'&&cluster<0.39&&r<0.55)return 'trees';
 if(biome==='woodland'&&cluster<0.26&&r<0.44)return 'trees';
 if(r<(biome==='meadow'?0.57:biome==='forest'?0.46:0.49))return 'grass';
 if(r<0.72)return 'flowers';
 return 'path';
}
let facing='down';
const roamingSpecies=[[10,16,25,43,69,133],[152,163,179,187,194,252],[255,258,263,280,285,387],[390,393,396,403,406,495],[498,501,504,519,543,650],[653,656,659,661,722,725],[728,731,734,810,813,816],[906,909,912,915,921,926]];
function avatarColor(id){let h=0;for(const c of String(id||''))h=(Math.imul(h,31)+c.charCodeAt(0))|0;return ['blue','red','violet','gold'][Math.abs(h%4)]}
function avatarNode(id,dir='down',walking=false){const figure=document.createElement('span');figure.className='meadow-avatar meadow-sprite '+avatarColor(id)+' facing-'+(['up','down','left','right'].includes(dir)?dir:'down')+(walking?' walking':'');figure.setAttribute('aria-hidden','true');return figure}
function drawMap(){
 const map=$('meadow-map');if(!map)return;map.replaceChildren();if(!trainer)return;
 const ox=Math.max(0,Math.min(WORLD_W-VIEW_W,trainer.tile_x-Math.floor(VIEW_W/2)));
 const oy=Math.max(0,Math.min(WORLD_H-VIEW_H,trainer.tile_y-Math.floor(VIEW_H/2)));
 const fragment=document.createDocumentFragment();
 for(let y=oy;y<oy+VIEW_H;y++)for(let x=ox;x<ox+VIEW_W;x++){
  const t=document.createElement('div'),kind=tile(x,y),player=x===trainer.tile_x&&y===trainer.tile_y,guest=!player&&visitors.find(v=>v.x===x&&v.y===y);
  t.className='meadow-tile '+kind+(player?' player':guest?' visitor':'');
  if(kind==='station'){const building=document.createElement('span');building.className='meadow-building';building.textContent='✚';t.append(building)}
  else if(kind==='trees'){const tree=document.createElement('span');tree.className='meadow-tree';t.append(tree)}
  else if(kind==='flowers'){const flower=document.createElement('span');flower.className='meadow-flower';t.append(flower)}
  else if(kind==='grass'){const tuft=document.createElement('span');tuft.className='meadow-tuft';t.append(tuft)}
  if(player){t.append(avatarNode(user?.id,facing,moving));t.title=trainer.display_name+' (you)'}
  else if(guest){t.append(avatarNode(guest.id,guest.dir||'down'));t.title=guest.name}
  else if(kind==='grass'&&hashTile(x,y,112)<0.055){
   const pool=roamingSpecies[(regionIndex(x,y)*2+worldDay())%roamingSpecies.length];
   const id=pool[Math.floor(hashTile(x,y,78)*pool.length)];
   const img=document.createElement('img');img.className='meadow-roaming';img.src=art(id);img.alt='';img.loading='lazy';img.onerror=()=>img.remove();t.append(img);t.title='Wild Pokémon habitat';
  }
  fragment.append(t);
 }
 map.append(fragment);
 const label=$('meadow-zone');if(label)label.textContent='📍 '+zone(trainer.tile_x,trainer.tile_y);
}
async function setupPresence(){if(!user||!trainer||presence)return;presence=db.channel('pokemon-meadow-world',{config:{presence:{key:user.id}}});presence.on('presence',{event:'sync'},()=>{const state=presence.presenceState();visitors=Object.entries(state).filter(([id])=>id!==user.id).flatMap(([id,entries])=>entries.map(v=>({id,name:String(v.name||'Trainer').slice(0,22),x:Number(v.x),y:Number(v.y),dir:String(v.dir||'down')})).filter(v=>Number.isInteger(v.x)&&Number.isInteger(v.y)&&v.x>=0&&v.x<WORLD_W&&v.y>=0&&v.y<WORLD_H));const count=$('meadow-online');if(count)count.textContent='🟢 '+(visitors.length+1)+' trainer'+(visitors.length?'s':'')+' online';drawMap();drawVisitors()});presence.subscribe(async status=>{if(status==='SUBSCRIBED')await trackPresence()})}
async function trackPresence(){if(presence&&trainer)try{await presence.track({name:trainer.display_name,x:trainer.tile_x,y:trainer.tile_y,dir:facing})}catch(e){console.warn('Meadow presence unavailable',e)}}
function pokemonNode(p){const box=document.createElement('div');box.className='meadow-pokemon';const img=document.createElement('img');img.src=art(p.species_id);img.alt=name(p.species_id);img.loading='lazy';const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=name(p.species_id);const small=document.createElement('small');small.textContent='Lv. '+p.level+(p.is_starter?' · Partner':'')+' · XP '+p.xp;info.append(strong,small);box.append(img,info);return box}
function render(){if(!trainer)return;$('meadow-start').hidden=true;$('meadow-game').hidden=false;$('meadow-trainer').textContent='🧢 '+trainer.display_name;$('meadow-hp').textContent='❤️ HP '+trainer.hp+'/45';$('meadow-balls').textContent='🔴 Poké Balls '+trainer.pokeballs;$('meadow-wins').textContent='🏆 Wins '+trainer.wins;drawMap();setupPresence();if(battle)setTouchScreen('battle');const list=$('meadow-party');list.replaceChildren();for(const p of party)list.append(pokemonNode(p));renderDex();$('meadow-battle').hidden=!battle;$('meadow-no-battle').hidden=!!battle;if(battle){const wild=$('meadow-wild');wild.replaceChildren();wild.append(pokemonNode({species_id:battle.species_id,level:battle.level,xp:0}));const hp=document.createElement('p');hp.textContent='Wild HP '+battle.wild_hp+'/'+battle.max_hp;wild.append(hp)}}
async function reload(){const [t,p,e]=await Promise.all([db.from('pokemon_mmo_trainers').select('*').eq('user_id',user.id).maybeSingle(),db.from('pokemon_mmo_creatures').select('*').eq('user_id',user.id).order('caught_at'),db.from('pokemon_mmo_encounters').select('*').eq('user_id',user.id).maybeSingle()]);for(const v of [t,p,e])if(v.error)throw v.error;trainer=t.data;party=p.data||[];battle=e.data;if(trainer){render();loadRequests().catch(console.warn)}else{$('meadow-start').hidden=false;$('meadow-game').hidden=true}}
async function startEncounter(){if(battle)return;say('A wild Pokémon is appearing…');const result=await rpc('pokemon_mmo_encounter_start');await reload();say('A wild '+name(result.species_id)+' appeared! Level '+result.level)}
async function move(dx,dy){if(!trainer||busy||moving||battle)return;const x=Math.max(1,Math.min(WORLD_W-2,trainer.tile_x+dx)),y=Math.max(1,Math.min(WORLD_H-2,trainer.tile_y+dy));if(tile(x,y)==='water'||tile(x,y)==='trees')return;facing=dx>0?'right':dx<0?'left':dy<0?'up':'down';moving=true;const oldZone=zone(trainer.tile_x,trainer.tile_y);trainer.tile_x=x;trainer.tile_y=y;drawMap();try{const {error}=await db.from('pokemon_mmo_trainers').update({tile_x:x,tile_y:y}).eq('user_id',user.id);if(error)throw error;await trackPresence();if(zone(x,y)!==oldZone)say('Entering '+zone(x,y)+'!');if(tile(x,y)==='grass'&&Math.random()<0.16){lock(true);try{await startEncounter()}finally{lock(false)}}}catch(e){await reload().catch(()=>{});say('Movement error: '+e.message)}finally{moving=false}}
$('meadow-begin').addEventListener('click',async()=>{lock(true);try{const starter=Number(document.querySelector('input[name="starter"]:checked').value),name=$('meadow-name').value.trim();await rpc('pokemon_mmo_start',{p_starter:starter,p_name:name});await reload();say('Welcome to Meadow Crossing, '+trainer.display_name+'!')}catch(e){say(e.message)}finally{lock(false)}});
$('meadow-encounter').addEventListener('click',async()=>{if(battle)return;if(tile(trainer.tile_x,trainer.tile_y)!=='grass'){say('Move onto tall grass before searching for Pokémon.');return}lock(true);try{await startEncounter()}catch(e){say(e.message)}finally{lock(false)}});
$('meadow-heal').addEventListener('click',async()=>{if(battle){say('Finish the wild encounter before healing.');return}if(Math.abs(trainer.tile_x-12)+Math.abs(trainer.tile_y-10)>2){say('Visit the 🏥 Meadow Station to heal.');return}lock(true);try{await rpc('pokemon_mmo_heal');await reload();say('Your partner is healed and Poké Balls replenished!')}catch(e){say(e.message)}finally{lock(false)}});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',async()=>{lock(true);try{const r=await rpc('pokemon_mmo_battle_action',{p_action:b.dataset.action});await reload();say(({caught:'Caught '+name(r.species_id)+'!',won:'Wild Pokémon defeated! +XP earned.',escaped:'Escaped safely.',fainted:'Your partner fainted! You returned to Meadow Station.',no_balls:'No Poké Balls left! Visit Meadow Station.',battle:'Battle continues! Damage dealt: '+(r.damage||0)+'. Damage received: '+(r.incoming||0)+'.'})[r.status]||'Encounter updated.')}catch(e){say(e.message)}finally{lock(false)}}));
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>move(...dirs[b.dataset.move])));document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||e.repeat)return;const dir={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'}[e.key];if(dir){e.preventDefault();move(...dirs[dir])}});
(async()=>{try{const {data:{user:u},error}=await db.auth.getUser();if(error)throw error;user=u;if(!user){say('Sign in to CTooniverse to save your Pokémon adventure.');const link=document.createElement('a');link.href='login.html';link.textContent='Sign in to play';$('meadow-status').append(' ',link);return}await reload();say(trainer?'Welcome back, '+trainer.display_name+'!':'Choose your starter Pokémon to begin.')}catch(e){say('Could not load adventure: '+e.message)}})();

function makeButton(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b}
function drawVisitors(){const root=$('meadow-visitors');if(!root)return;root.replaceChildren();if(!visitors.length){root.textContent='No other trainers connected yet.';return}for(const v of visitors){const row=document.createElement('div');row.className='meadow-pokemon';const label=document.createElement('span');label.textContent='🧢 '+v.name+' · '+zone(v.x,v.y);row.append(label,makeButton('⚔️ Challenge',()=>sendRequest(v,'battle')),makeButton('🔄 Trade',()=>sendRequest(v,'trade')));root.append(row)}}
async function sendRequest(v,kind){if(!trainer||battle){say('Finish your current encounter first.');return}let offered=null,requested=null;if(kind==='trade'){const mine=party.filter(p=>!p.is_starter);if(!mine.length){say('Catch a non-starter Pokémon before trading.');return}const {data,error}=await db.rpc('pokemon_meadow_trade_options',{p_trainer:v.id});if(error)throwAndSay(error);if(!data?.length){say('This trainer has no tradable Pokémon.');return}const mineText=mine.map((p,i)=>i+1+': '+name(p.species_id)+' Lv.'+p.level).join('\\n');const theirText=data.map((p,i)=>i+1+': '+name(p.species_id)+' Lv.'+p.level).join('\\n');const a=prompt('Choose your Pokémon by number:\\n'+mineText);if(a===null)return;const b=prompt('Choose their Pokémon by number:\\n'+theirText);if(b===null)return;offered=mine[Number(a)-1]?.id;requested=data[Number(b)-1]?.id;if(!offered||!requested){say('Invalid Pokémon selection.');return}}
try{const {error}=await db.rpc('pokemon_meadow_send_request',{p_recipient:v.id,p_kind:kind,p_offered:offered,p_requested:requested});if(error)throw error;say((kind==='battle'?'Battle challenge':'Trade offer')+' sent to '+v.name+'.');await loadRequests()}catch(e){say(e.message)}}
function throwAndSay(e){say(e.message);throw e}
async function loadRequests(){if(!user||!trainer)return;const {data,error}=await db.from('pokemon_meadow_requests').select('*').or('sender_id.eq.'+user.id+',recipient_id.eq.'+user.id).order('created_at',{ascending:false}).limit(20);if(error)throw error;const root=$('meadow-requests');root.replaceChildren();const recent=data.filter(r=>r.status==='pending'||(Date.now()-new Date(r.resolved_at||r.created_at).getTime())<3600000);if(!recent.length){root.textContent='No pending or recent requests.';return}for(const r of recent){const incoming=r.recipient_id===user.id,row=document.createElement('div');row.className='meadow-request';const label=document.createElement('span');let message=(incoming?'Incoming ':'Sent ')+(r.kind==='trade'?'trade':'battle challenge')+' · '+r.status;if(r.result?.status==='battle_finished')message+=' · '+(r.result.winner_id===user.id?'You won!':'Opponent won');if(r.result?.status==='traded')message+=' · Trade completed';label.textContent=message;row.append(label);if(incoming&&r.status==='pending'){row.append(makeButton('Accept',()=>resolveRequest(r.id,true)),makeButton('Decline',()=>resolveRequest(r.id,false)))}root.append(row)}}
async function resolveRequest(id,accept){try{const {data,error}=await db.rpc('pokemon_meadow_resolve_request',{p_id:id,p_accept:accept});if(error)throw error;await reload();say(data.status==='traded'?'Trade completed!':data.status==='battle_finished'?(data.winner_id===user.id?'You won the trainer battle!':'Your opponent won the trainer battle.'):'Request declined.')}catch(e){say(e.message)}}
setInterval(()=>{if(user&&trainer&&!document.hidden)loadRequests().catch(console.warn)},12000);


function genOf(id){return generationBounds.findIndex(([lo,hi])=>id>=lo&&id<=hi)+1}
function renderDex(){const root=$('meadow-dex-results');if(!root)return;root.replaceChildren();const search=$('meadow-dex-search').value.trim().toLowerCase(),gen=Number($('meadow-dex-gen').value);const ids=Array.from({length:1025},(_,i)=>i+1).filter(id=>(!gen||genOf(id)===gen)&&(!search||String(id)===search||name(id).toLowerCase().includes(search)));$('meadow-dex-count').textContent=ids.length+' Pokémon · '+(gen?'Generation '+gen:'All generations')+' · '+party.length+' owned';for(const id of ids.slice(0,72)){const item=document.createElement('div');item.className='meadow-dex-entry';const img=document.createElement('img');img.src=art(id);img.alt='';img.loading='lazy';img.onerror=()=>{img.style.visibility='hidden'};const label=document.createElement('span');label.textContent='#'+String(id).padStart(4,'0')+' '+name(id);if(party.some(p=>p.species_id===id))item.classList.add('owned');item.append(img,label);root.append(item)}if(ids.length>72){const p=document.createElement('p');p.textContent='Showing first 72 results. Narrow your search to see more.';root.append(p)}}
async function loadNationalDex(){try{const response=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1025',{mode:'cors'});if(!response.ok)throw Error('Pokédex service unavailable');const data=await response.json();for(const item of data.results){const id=Number(item.url.match(/\/pokemon-species\/(\d+)\//)?.[1]);if(id>=1&&id<=1025)dexNames[id]=item.name.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}renderDex();if(trainer)render()}catch(e){console.warn('Pokédex names unavailable',e);$('meadow-dex-count').textContent='Showing Pokédex numbers (names temporarily unavailable)';renderDex()}}
$('meadow-dex-search').addEventListener('input',renderDex);
$('meadow-dex-gen').addEventListener('change',renderDex);
loadNationalDex();

window.addEventListener('pagehide',()=>{if(presence)db.removeChannel(presence)});
