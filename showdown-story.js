// CToon Showdown: Rift Crisis story campaign.
// Progress is cosmetic and stored per player in this browser. Purchases/coins are never changed here.
'use strict';

const CHAPTERS=[
 {title:'Chapter I · The Signal',subtitle:'An arcade broadcast bends reality.'},
 {title:'Chapter II · Broken Worlds',subtitle:'The rift opens, and the challengers arrive.'},
 {title:'Chapter III · The Final Showdown',subtitle:'One last fight to seal the breach.'}
];
const MISSIONS=[
 {id:'static-in-the-arcade',chapter:0,title:'Static in the Arcade',enemy:'johnny-bravo',stage:'arcade',difficulty:.77,
  summary:'Investigate a strange signal inside a neon arcade.',
  opening:'Every screen in CTooniverse flickers to life. A mysterious voice announces a tournament that nobody remembers entering.',
  speaker:'Johnny Bravo',quote:'Whoa, mama! A fight and an audience? Now this is my kind of party!',
  outro:'The arcade signal carries coordinates to the city skyline. Somebody is gathering champions across worlds.'},
 {id:'code-red',chapter:0,title:'Code Red',enemy:'kim-possible',stage:'skyline',difficulty:.86,
  summary:'Find out who is rerouting the city broadcasts.',
  opening:'A warning flashes over every rooftop display. Kim Possible intercepts the transmission and demands a sparring match before sharing the access code.',
  speaker:'Kim Possible',quote:'Something is seriously wrong with these portals. Show me you can handle what comes next.',
  outro:'Kim traces the interference to an ancient gate. The signal is not a game invitation; it is a trap.'},
 {id:'the-samurais-test',chapter:1,title:"The Samurai's Test",enemy:'samurai-jack',stage:'dojo',difficulty:1,
  summary:'Earn a guardian’s trust at the moonlit gate.',
  opening:'Beyond the rift, a moonlit dojo stands untouched by time. A lone samurai guards the passage and will not let an untested warrior through.',
  speaker:'Samurai Jack',quote:'A great danger waits ahead. Prove that your courage is stronger than your fear.',
  outro:'Jack lowers his sword and warns of a fast-moving warrior patrolling the ruins. The path forward is open.'},
 {id:'blue-comet',chapter:1,title:'Blue Comet',enemy:'burter',stage:'desert',difficulty:1.1,
  summary:'Catch the blue-speed fighter before he seals the gate.',
  opening:'A blue streak tears across the desert. Burter has been ordered to keep all challengers away from the heart of the rift.',
  speaker:'Burter',quote:"You won't even see me move! I’m the fastest fighter in the universe!",
  outro:'Burter retreats, leaving behind the energy signature of the mastermind. It points straight to a shattered arena in space.'},
 {id:'perfect-chaos',chapter:2,title:'Perfect Chaos',enemy:'perfect-cell',stage:'space',difficulty:1.2,
  summary:'Challenge the architect of the crossover tournament.',
  opening:'The fractured worlds converge above a cosmic arena. Perfect Cell has been feeding on the tournament’s energy, waiting for a worthy final opponent.',
  speaker:'Perfect Cell',quote:'At last, a challenger worthy of my perfect power. Do try to make this interesting.',
  outro:'The rift collapses, the stolen energy disperses, and every world begins to return home. CTooniverse has a new Showdown Champion.'}
];
const PROGRESS_PREFIX='ctoon-showdown-story-v1:';
const $=id=>document.getElementById(id);

export function createStoryMode({getFighter,getPlayable,startBattle,onReturn}){
 const panel=$('story-mode'),map=$('story-mission-map'),progress=$('story-progress');
 const heroSelect=$('story-hero'),scene=$('story-scene'),sceneTitle=$('story-scene-title');
 const sceneIntro=$('story-scene-intro'),sceneQuote=$('story-scene-quote');
 const sceneSpeaker=$('story-scene-speaker'),scenePortrait=$('story-scene-portrait');
 const primary=$('story-scene-primary'),close=$('story-scene-close');
 const continueBtn=$('story-continue'),returnBtn=$('story-return');
 const feedback=$('story-feedback'),badge=$('story-champion-badge');
 let accountId=null,completed=new Set(),current=null,battle=null,sceneMode='intro';
 let savedHeroId=null;
 const key=()=>PROGRESS_PREFIX+(accountId||'guest');
 const write=()=>{try{localStorage.setItem(key(),JSON.stringify([...completed]));}catch(error){console.warn('Story save unavailable',error)}};
 const read=()=>{
  try{const data=JSON.parse(localStorage.getItem(key())||'[]');return new Set(Array.isArray(data)?data.filter(id=>MISSIONS.some(m=>m.id===id)):[])}
  catch{return new Set()}
 };
 const nextMission=()=>MISSIONS.find(m=>!completed.has(m.id));
 const accessible=index=>index===0||completed.has(MISSIONS[index-1].id);
 const announce=message=>{feedback.textContent=message};
 const goto=element=>element?.scrollIntoView({behavior:'smooth',block:'start'});
 function renderHeroes(){
  const before=heroSelect.value||savedHeroId;
  heroSelect.replaceChildren();
  const playable=getPlayable().sort((a,b)=>a.name.localeCompare(b.name));
  for(const fighter of playable){const option=document.createElement('option');option.value=fighter.fighter_id;option.textContent=fighter.name;heroSelect.append(option)}
  if(playable.length){
   const candidate=playable.find(f=>f.fighter_id===before)||playable[0];
   heroSelect.value=candidate.fighter_id;
   heroSelect.disabled=false;
  }else{
   heroSelect.add(new Option('No fighters available',''));
   heroSelect.disabled=true;
  }
  primary.disabled=sceneMode==='intro'&&!playable.length;
 }
 function render(){
  progress.textContent=completed.size+' / '+MISSIONS.length+' MISSIONS COMPLETE';
  badge.hidden=completed.size!==MISSIONS.length;
  map.replaceChildren();
  let lastChapter=-1;
  for(let i=0;i<MISSIONS.length;i++){
   const mission=MISSIONS[i],open=accessible(i),done=completed.has(mission.id);
   if(mission.chapter!==lastChapter){
    lastChapter=mission.chapter;
    const heading=document.createElement('div');heading.className='story-chapter-heading';
    const name=document.createElement('strong');name.textContent=CHAPTERS[lastChapter].title;
    const subtitle=document.createElement('small');subtitle.textContent=CHAPTERS[lastChapter].subtitle;
    heading.append(name,subtitle);map.append(heading);
   }
   const card=document.createElement('button');
   card.type='button';card.className='story-mission'+(done?' is-complete':open?' is-open':' is-locked');
   card.disabled=!open;
   card.dataset.stage=mission.stage;
   card.setAttribute('aria-label',mission.title+(done?', completed':open?', available':', locked'));
   const stamp=document.createElement('span');stamp.className='story-mission-count';stamp.textContent='MISSION '+String(i+1).padStart(2,'0');
   const title=document.createElement('strong');title.textContent=mission.title;
   const description=document.createElement('span');description.className='story-mission-summary';description.textContent=mission.summary;
   const state=document.createElement('span');state.className='story-mission-state';state.textContent=done?'✓ REPLAY':open?'▶ PLAY':'🔒 LOCKED';
   card.append(stamp,title,description,state);
   card.addEventListener('click',()=>openMission(mission));
   map.append(card);
  }
  const next=nextMission();
  announce(completed.size===MISSIONS.length?'Campaign complete! CTooniverse Champion badge earned. Replay any mission.':next?'Up next: '+next.title+' · progress saves on this device.':'');
  renderHeroes();
 }
 function syncFighters(){renderHeroes();}
 function setAccount(id){
  const next=id||null;
  if(accountId===next)return;
  accountId=next;
  completed=read();current=null;battle=null;scene.hidden=true;
  continueBtn.hidden=true;returnBtn.hidden=true;
  render();
 }
 function showScene(mission,mode){
  current=mission;sceneMode=mode;
  const enemy=getFighter(mission.enemy);
  scene.hidden=false;
  scene.dataset.stage=mission.stage;
  sceneTitle.textContent=mode==='victory'?'MISSION CLEAR · '+mission.title:mode==='defeat'?'MISSION FAILED · '+mission.title:mission.title;
  sceneIntro.textContent=mode==='victory'?mission.outro:mode==='defeat'?'The rift remains unstable. Regroup and challenge this fighter again.':mission.opening;
  sceneSpeaker.textContent=mode==='victory'?'The Rift Chronicles':mode==='defeat'?'Narrator':mission.speaker;
  sceneQuote.textContent=mode==='victory'?completed.size===MISSIONS.length?'CAMPAIGN COMPLETE · CTOONIVERSE CHAMPION!':'A new mission has opened. Keep the worlds connected!':mode==='defeat'?'This story is not over yet.':'“'+mission.quote+'”';
  scenePortrait.replaceChildren();
  if(enemy?.portrait){
   const art=document.createElement('img');
   art.src=enemy.portrait;art.alt=enemy.name+' portrait';
   art.onerror=()=>{art.remove();scenePortrait.textContent=enemy.name[0]||'★';};
   scenePortrait.append(art);
  }else scenePortrait.textContent=enemy?.name?.[0]||'★';
  primary.disabled=false;
  primary.textContent=mode==='victory'?(nextMission()?'▶ NEXT MISSION':'↻ REPLAY FIRST MISSION') :mode==='defeat'?'↻ RETRY BATTLE':'⚔ BEGIN STORY BATTLE';
  close.textContent=mode==='intro'?'Back to chapter map':'Return to chapter map';
 }
 function openMission(mission){
  const index=MISSIONS.findIndex(m=>m.id===mission.id);
  if(index<0||!accessible(index))return;
  if(battle?.mode==='active'){announce('Finish this battle or select STORY MAP in the arena before switching missions.');return;}
  battle=null;continueBtn.hidden=true;returnBtn.hidden=true;
  showScene(mission,'intro');
  goto(scene);
 }
 function begin(mission=current,heroId=heroSelect.value){
  if(!mission)return;
  const hero=getPlayable().find(f=>f.fighter_id===heroId);
  const enemy=getFighter(mission.enemy);
  if(!hero||!enemy){
   announce('Select an available fighter to begin Story Mode.');
   return;
  }
  savedHeroId=hero.fighter_id;
  heroSelect.value=savedHeroId;
  current=mission;
  battle={mission,heroId:hero.fighter_id,mode:'active'};
  scene.hidden=true;continueBtn.hidden=true;returnBtn.hidden=false;
  startBattle(hero,enemy,mission.stage,mission.difficulty);
 }
 function retry(){
  if(battle){
   const {mission,heroId}=battle;
   begin(mission,heroId);
  }else if(current)begin(current);
 }
 function onMatchFinished(won){
  if(!battle||battle.mode!=='active')return false;
  battle.mode=won?'victory':'defeat';
  if(won){completed.add(battle.mission.id);write();}
  render();
  showScene(battle.mission,battle.mode);
  continueBtn.hidden=false;
  continueBtn.textContent=won?'▶ CONTINUE STORY':'↻ RETRY STORY MISSION';
  return true;
 }
 function continueStory(){
  if(!battle)return;
  if(battle.mode==='defeat'){retry();return;}
  const next=nextMission();
  leave();
  if(next)openMission(next);
  else{render();showScene(current||MISSIONS[MISSIONS.length-1],'victory');goto(scene);}
 }
 function leave(){
  battle=null;
  continueBtn.hidden=true;returnBtn.hidden=true;
 }
 function storyReturn(){leave();scene.hidden=true;onReturn?.();goto(panel);}
 primary.addEventListener('click',()=>{
  if(sceneMode==='victory'){
   const next=nextMission();
   if(next)openMission(next);
   else openMission(MISSIONS[0]);
  }else begin();
 });
 close.addEventListener('click',()=>{scene.hidden=true;goto(panel);});
 continueBtn.addEventListener('click',()=>{const retrying=battle?.mode==='defeat';continueStory();if(!retrying)goto(scene.hidden?panel:scene);});
 returnBtn.addEventListener('click',storyReturn);
 heroSelect.addEventListener('change',()=>{savedHeroId=heroSelect.value});
 $('story-begin').addEventListener('click',()=>{
  const next=nextMission()||MISSIONS[0];
  openMission(next);
 });
 completed=read();
 render();
 return {syncFighters,setAccount,onMatchFinished,leave,retry,isActive:()=>!!battle};
}
