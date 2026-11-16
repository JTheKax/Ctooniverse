"use strict";
(async () => {
  /* CTooniverse fan duel. Account-bound starter selection; no collection/inventory transactions.
     A second CDN keeps the arena accessible when the main module host is unavailable. */
  let createClient;
  try{
    ({createClient}=await import("https://esm.sh/@supabase/supabase-js@2.58.0"));
  }catch(firstError){
    try{
      ({createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm"));
    }catch(secondError){
      const status=document.getElementById("yd-starter-status");
      if(status)status.textContent="The Duel Arena engine could not connect. Please refresh the page or try again shortly.";
      console.error("Duel Arena: failed to load Supabase client",firstError,secondError);
      return;
    }
  }
  const db=createClient("https://hsxdyxdazsdmpucyhqly.supabase.co","sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS");
  let activeStarter=null,choosingStarter=false,selectedOpponent=null,loadingOpponent=false;
  let armedPortraitId=null; // A deliberate portrait selection is needed before starting a duel.
  let rosterSeries="all";
  const starterCardCache=new Map();
  const catalog={
    dark:["Dark Magician",7,2500,2100,"🪄"],blue:["Blue-Eyes White Dragon",8,3000,2500,"🐉"],
    red:["Red-Eyes Black Dragon",7,2400,2000,"🐲"],skull:["Summoned Skull",6,2500,1200,"👹"],
    celtic:["Celtic Guardian",4,1400,1200,"🗡️"],stone:["Giant Soldier of Stone",3,1300,2000,"🪨"],
    ox:["Battle Ox",4,1700,1000,"🪓"],jinn:["La Jinn",4,1800,1000,"🧞"],
    elf:["Mystical Elf",4,800,2000,"🧝"],kuriboh:["Kuriboh",1,300,200,"🟤"],
    dragon:["Baby Dragon",3,1200,700,"🐣"],harpie:["Harpie Lady",4,1300,1400,"🪽"],
    imp:["Feral Imp",4,1300,1400,"😈"],kaiser:["Kaiser Sea Horse",4,1700,1650,"🐴"],
    ryu:["Ryu-Kishin Powered",4,1600,1200,"⚡"],lord:["Lord of D.",4,1200,1100,"🎭"],
    pot:["Pot of Greed","spell","Draw 2 cards.","🏺"],
    fissure:["Fissure","spell","Destroy the opponent's face-up monster with the lowest ATK.","🌋"],
    reborn:["Monster Reborn","spell","Revive the latest monster from your Graveyard.","✨"],
    heal:["Dian Keto the Cure Master","spell","Gain 1000 Life Points.","💚"],
    swords:["Swords of Revealing Light","spell","Stop opponent attacks for 2 turns.","⚔️"],
    axe:["Axe of Despair","spell","Give your strongest monster +1000 ATK.","🪓"],
    storm:["Mystical Space Typhoon","spell","Destroy an opponent's set Trap.","🌪️"],
    mirror:["Mirror Force","trap","Destroy all the attacker's Attack Position monsters.","🪞"],
    hole:["Trap Hole","trap","Destroy a face-up Normal Summoned monster with at least 1000 ATK.","🕳️"],
    negate:["Negate Attack","trap","Cancel an opponent's attack.","🛡️"]
  };

  // Artwork for the playable prototype's 26 cards, mapped to IDs already
  // indexed in the CTooniverse Supabase Yu-Gi-Oh! card catalog.
  const artIds={
    dark:46986414,blue:89631139,red:74677422,skull:70781052,
    celtic:91152256,stone:13039848,ox:5053103,jinn:97590747,
    elf:15025844,kuriboh:40640057,dragon:88819587,harpie:76812113,
    imp:41392891,kaiser:17444133,ryu:24611934,lord:17985575,
    pot:55144522,fissure:66788016,reborn:83764719,heal:84257640,
    swords:72302403,axe:40619825,storm:5318639,mirror:44095762,
    hole:4206964,negate:14315573
  };
  const artStorage="https://hsxdyxdazsdmpucyhqly.supabase.co/storage/v1/object/public/yugioh-artwork/small/";
  const artFunction="https://hsxdyxdazsdmpucyhqly.supabase.co/functions/v1/yugioh-artwork";
  const artJobs=[];
  let artRequests=0;
  function pumpImages(){
    while(artRequests<2&&artJobs.length){
      const job=artJobs.shift();
      if(!job.img.isConnected)continue;
      artRequests++;
      let finished=false;
      let timeoutId=0;
      const release=()=>{
        if(finished)return;
        finished=true;
        clearTimeout(timeoutId);
        artRequests--;
        setTimeout(pumpImages,180);
      };
      timeoutId=setTimeout(release,14000);
      job.img.addEventListener("load",release,{once:true});
      job.img.addEventListener("error",release,{once:true});
      job.img.src=job.url;
    }
  }
  function decorateArt(node,card){
    const id=artIds[card.id];
    if(!id)return;
    const picture=document.createElement("img");
    picture.alt="";
    picture.loading="lazy";
    picture.decoding="async";
    let attempted=false;
    picture.addEventListener("load",()=>node.classList.add("yd-art-loaded"));
    picture.addEventListener("error",()=>{
      if(!attempted){
        attempted=true;
        artJobs.push({img:picture,url:artFunction+"?id="+id+"&size=small"});
        pumpImages();
      }else{
        picture.remove();
      }
    });
    node.append(picture);
    picture.src=artStorage+id+".jpg";
  }

  const deckLists={
    player:{dark:2,red:1,skull:2,celtic:3,stone:3,ox:2,kuriboh:3,elf:3,dragon:2,harpie:2,imp:3,jinn:2,pot:2,fissure:2,reborn:1,heal:1,swords:1,axe:1,storm:1,mirror:1,hole:1,negate:1},
    cpu:{blue:3,skull:1,ox:3,jinn:3,stone:3,kaiser:3,ryu:3,lord:2,elf:2,imp:3,harpie:2,pot:2,fissure:2,reborn:1,heal:1,swords:1,axe:1,storm:1,mirror:1,hole:1,negate:1}
  };

  // Free Duel rivals: signature-card portraits and catalog-derived thematic decks.
  // Opponent selection never modifies the permanent starter or owned inventory.
  // Actual Duel Monsters character art from the official Yu-Gi-Oh! character
  // profiles. Load from the source host; if unavailable, show the in-game
  // signature-card artwork instead of an empty roster slot.
  const DUELIST_PORTRAITS=Object.freeze({
    "yugi": "https://uploads3.yugioh.com/character/2/detail/detail/yugi-l.png?1371660955=",
    "kaiba": "https://uploads4.yugioh.com/character/11/detail/detail/kaib-l.png?1375717119=",
    "joey": "https://uploads2.yugioh.com/character/5/detail/detail/joey-l.png?1375717061=",
    "pegasus": "https://uploads2.yugioh.com/character/13/detail/detail/pagasus.png?1375717258=",
    "mai": "https://uploads3.yugioh.com/character/6/detail/detail/mai-l.png?1375717076=",
    "weevil": "https://uploads3.yugioh.com/character/155/detail/detail/weevil-lg.png?1384808905=",
    "rex": "https://uploads4.yugioh.com/character/149/detail/detail/rex-lrgs.png?1393274278=",
    "mako": "https://uploads4.yugioh.com/character/111/detail/detail/mako-lgx.png?1384883790=",
    "keith": "https://uploads1.yugioh.com/character/62/detail/detail/bandit-lg.png?1384883953=",
    "bakura": "https://uploads4.yugioh.com/character/14/detail/detail/y-bakura-l.png?1371755458=",
    "marik": "https://uploads3.yugioh.com/character/12/detail/detail/ymarik-l.png?1371754161=",
    "ishizu": "https://uploads4.yugioh.com/character/58/detail/detail/ishizu-lg.png?1384802855=",
    "tea": "https://uploads2.yugioh.com/character/8/detail/detail/tea-l.png?1371746845=",
    "odion": "https://uploads2.yugioh.com/character/59/detail/detail/odion-lg.png?1384802615=",
    "bonz": "https://uploads2.yugioh.com/character/136/detail/detail/bonz-lrg.png?1393274111=",
    "jaden": "https://uploads4.yugioh.com/character/24/detail/detail/jaden-l.png?1375717855=",
    "zane": "https://uploads2.yugioh.com/character/26/detail/detail/zane-l.png?1371841335=",
    "alexis": "https://uploads1.yugioh.com/character/19/detail/detail/alexis-l.png?1375717276=",
    "chazz": "https://uploads2.yugioh.com/character/21/detail/detail/chazz-l.png?1371839968=",
    "syrus": "https://uploads1.yugioh.com/character/25/detail/detail/syrus-l.png?1371841093=",
    "aster": "https://uploads4.yugioh.com/character/37/detail/detail/aster-l.png?1375717571=",
    "crowler": "https://uploads4.yugioh.com/character/23/detail/detail/Crowler-l.png?1371840566=",
    "chumley": "https://uploads4.yugioh.com/character/22/detail/detail/chumley-l.png?1371840210=",
    "bastion": "https://uploads4.yugioh.com/character/20/detail/detail/bastion-l.png?1375717320="
  });
  const DUELISTS=[
    {id:"yugi",name:"Yugi Muto",epithet:"King of Games",hero:46986414,race:"Spellcaster",difficulty:3,style:"Dark Magician · Spellcaster tactics",flavor:"A balanced rival whose spellcasters reward careful play."},
    {id:"kaiba",name:"Seto Kaiba",epithet:"Blue-Eyes Rival",hero:89631139,race:"Dragon",difficulty:5,style:"Blue-Eyes · Dragon power",flavor:"High-attack dragons threaten your Life Points."},
    {id:"joey",name:"Joey Wheeler",epithet:"Red-Eyes Challenger",hero:74677422,race:"Warrior",difficulty:2,style:"Red-Eyes · Warrior beatdown",flavor:"A brawling duelist who favors direct monster battles."},
    {id:"pegasus",name:"Maximillion Pegasus",epithet:"Toon Creator",hero:15259703,race:"Spellcaster",archetype:"Toon",difficulty:3,style:"Toons · Illusion and trickery",flavor:"Toon monsters bring an unpredictable challenge."},
    {id:"mai",name:"Mai Valentine",epithet:"Harpie Duelist",hero:76812113,race:"Winged Beast",archetype:"Harpie",difficulty:3,style:"Harpies · Winged Beasts",flavor:"Agile flyers and relentless attacks rule this duel."},
    {id:"weevil",name:"Weevil Underwood",epithet:"Insect Expert",hero:91512835,race:"Insect",difficulty:2,style:"Insects · Swarming monsters",flavor:"Small insect monsters gather before the queen arrives."},
    {id:"rex",name:"Rex Raptor",epithet:"Dinosaur Tamer",hero:94119974,race:"Dinosaur",difficulty:2,style:"Dinosaurs · Physical strength",flavor:"Prehistoric monsters stand ready to attack."},
    {id:"mako",name:"Mako Tsunami",epithet:"Ocean Warrior",hero:3643300,race:"Fish",difficulty:2,style:"Water creatures · Ocean tactics",flavor:"Ocean creatures can overwhelm an unprepared field."},
    {id:"keith",name:"Bandit Keith",epithet:"Machine Commander",hero:81480461,race:"Machine",difficulty:4,style:"Machines · Heavy artillery",flavor:"Mechanized monsters pack serious firepower."},
    {id:"bakura",name:"Yami Bakura",epithet:"Shadow Duelist",hero:31829185,race:"Fiend",difficulty:4,style:"Fiends · Graveyard creatures",flavor:"Dark fiends lurk behind seemingly quiet moves."},
    {id:"marik",name:"Yami Marik",epithet:"Millennium Rod",hero:10000010,race:"Fiend",difficulty:5,style:"Fiends · Egyptian God challenge",flavor:"A dangerous master of high-level monsters."},
    {id:"ishizu",name:"Ishizu Ishtar",epithet:"Keeper of Fate",hero:17484499,race:"Fairy",difficulty:3,style:"Fairies · Ancient traps",flavor:"An elegant duelist who knows how to control the field."},
    {id:"tea",name:"Téa Gardner",epithet:"Friendship Duelist",hero:38033121,race:"Fairy",difficulty:1,style:"Fairies · Dark Magician Girl",flavor:"A welcoming rival to practice the fundamentals."},
    {id:"odion",name:"Odion",epithet:"Temple Guardian",hero:89194033,race:"Rock",difficulty:4,style:"Rock monsters · Defensive traps",flavor:"Strong defenses may force you into a long battle."},
    {id:"bonz",name:"Bonz",epithet:"Ghost Gravekeeper",hero:29155212,race:"Zombie",difficulty:1,style:"Zombies · Haunted graveyard",flavor:"Rise against monsters from the haunted crypt."},
{id:"jaden",series:"gx",name:"Jaden Yuki",epithet:"Slifer Red Hero",hero:89943723,race:"Warrior",archetype:"Elemental HERO",difficulty:3,style:"Elemental HERO · Neo-Spacian heroes",flavor:"Duel Academy's rising star challenges you with heroic monsters."},
    {id:"zane",series:"gx",name:"Zane Truesdale",epithet:"Duel Academy Ace",hero:70095154,race:"Machine",archetype:"Cyber Dragon",difficulty:5,style:"Cyber Dragon · Machine offense",flavor:"An elite opponent whose machines hit hard and fast."},
    {id:"alexis",series:"gx",name:"Alexis Rhodes",epithet:"Obelisk Blue Champion",hero:77235086,race:"Fairy",archetype:"Cyber Angel",difficulty:3,style:"Cyber Angels · Fairy tactics",flavor:"A precise rival who brings disciplined dueling and powerful fairies."},
    {id:"chazz",series:"gx",name:"Chazz Princeton",epithet:"The Chazz",hero:73879377,race:"Dragon",archetype:"Armed Dragon",difficulty:4,style:"Armed Dragons · Dragon beatdown",flavor:"An ambitious challenger who brings his strongest dragons."},
    {id:"syrus",series:"gx",name:"Syrus Truesdale",epithet:"Roid Rookie",hero:44729197,race:"Machine",archetype:"roid",difficulty:2,style:"Vehicroids · Machine teamwork",flavor:"The underdog of Slifer Red fights with trusty machine monsters."},
    {id:"aster",series:"gx",name:"Aster Phoenix",epithet:"Destiny HERO Pro",hero:83965310,race:"Warrior",archetype:"Destiny HERO",difficulty:4,style:"Destiny HERO · Pro dueling",flavor:"A calculated professional with formidable Destiny HERO monsters."},
    {id:"crowler",series:"gx",name:"Dr. Vellian Crowler",epithet:"Duel Academy Professor",hero:83104731,race:"Machine",archetype:"Ancient Gear",difficulty:4,style:"Ancient Gear · Heavy machines",flavor:"The professor is ready to test you with ancient machinery."},
    {id:"chumley",series:"gx",name:"Chumley Huffington",epithet:"Koala-Loving Slifer Red",hero:42129512,race:"Beast",difficulty:2,style:"Big Koala · Beast creatures",flavor:"A laid-back duelist who calls on koalas and other powerful beasts."},
    {id:"bastion",series:"gx",name:"Bastion Misawa",epithet:"Duel Academy Strategist",hero:85066822,race:"Dinosaur",difficulty:4,style:"Water Dragon · Hydrogeddon chemistry",flavor:"A calculating rival who uses dinosaur monsters and scientific combinations."}
  ];
  function opponentRecord(id){
    try{
      const r=JSON.parse(localStorage.getItem("ctoon-yugioh-free-duel-records-v1")||"{}")[id];
      return {wins:Math.max(0,Number(r?.wins)||0),losses:Math.max(0,Number(r?.losses)||0)};
    }catch(_){return {wins:0,losses:0};}
  }
  function recordOpponentResult(id,won){
    if(!id)return;
    try{
      const all=JSON.parse(localStorage.getItem("ctoon-yugioh-free-duel-records-v1")||"{}");
      const r=opponentRecord(id);
      r[won?"wins":"losses"]++;
      all[id]=r;
      localStorage.setItem("ctoon-yugioh-free-duel-records-v1",JSON.stringify(all));
    }catch(_){}
  }
  const $=id=>document.getElementById(id),opponent=s=>s==="player"?"cpu":"player",who=s=>s==="player"?"Player":(selectedOpponent?.name||"Computer");
  let uid=0,game;
  function makeCard(id){const spec=catalog[id];if(!spec)throw new Error("Missing duel card: "+id);return{uid:++uid,id,name:spec[0],type:typeof spec[1]==="number"?"monster":spec[1],level:typeof spec[1]==="number"?spec[1]:0,atk:spec[2]||0,def:spec[3]||0,icon:spec[typeof spec[1]==="number"?4:3],text:typeof spec[1]==="number"?"Monster card (simplified arena rules)":spec[2]};}
  function makeDeck(side){const result=[];for(const [id,n] of Object.entries(deckLists[side]))for(let i=0;i<n;i++)result.push(makeCard(id));for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  function makeSide(side){return{lp:8000,deck:makeDeck(side),hand:[],field:Array(5).fill(null),traps:Array(5).fill(null),grave:[],shield:0};}
  function note(message){game.history.unshift(message);game.history=game.history.slice(0,25);}
  function record(){try{return JSON.parse(localStorage.getItem("ctoon-yugioh-stats")||'{"wins":0,"losses":0}');}catch(_){return {wins:0,losses:0};}}
  function finish(winner,why){if(game.winner)return;game.winner=winner;game.phase="finished";game.selected=null;note((winner==="player"?"Victory! ":"Defeat! ")+why);const stats=record();stats[winner==="player"?"wins":"losses"]++;try{localStorage.setItem("ctoon-yugioh-stats",JSON.stringify(stats));}catch(_){}recordOpponentResult(selectedOpponent?.id,winner==="player");}
  function damage(side,n){game[side].lp=Math.max(0,game[side].lp-n);if(game[side].lp===0)finish(opponent(side),"A duelist reached 0 Life Points.");}
  function draw(side,n){for(let k=0;k<n&&!game.winner;k++){const card=game[side].deck.pop();if(!card){finish(opponent(side),who(side)+" has no cards left to draw.");return;}game[side].hand.push(card);}}
  function removeHand(side,card){const a=game[side].hand,i=a.findIndex(c=>c.uid===card.uid);return i>=0?a.splice(i,1)[0]:null;}
  function sendGrave(side,index){const m=game[side].field[index];if(m){game[side].grave.push(m.card);game[side].field[index]=null;}}
  function destroyTrap(side,index){const c=game[side].traps[index];if(c){game[side].grave.push(c.card);game[side].traps[index]=null;}}
  function tributes(card){return card.level>=7?2:card.level>=5?1:0;}
  function eligible(side,card){const count=game[side].field.filter(Boolean).length,needed=tributes(card);return card.type==="monster"&&!game.summoned&&count>=needed&&(count<5||needed>0);}
  function normal(side,card,defense){if(game.active!==side||game.phase!=="main"||game.winner||!eligible(side,card))return;const p=game[side],n=tributes(card);
    const trib=p.field.map((m,i)=>m?{i,atk:m.card.atk+(m.bonus||0)}:null).filter(Boolean).sort((a,b)=>a.atk-b.atk).slice(0,n);
    for(const x of trib){note(who(side)+" tributes "+p.field[x.i].card.name+".");sendGrave(side,x.i);}
    const idx=p.field.findIndex(x=>!x);const owned=removeHand(side,card);if(!owned||idx<0)return;
    p.field[idx]={card:owned,defense:!!defense,hidden:!!defense,attacked:false,bonus:0,changed:game.turn};game.summoned=true;game.selected=null;
    note(who(side)+(defense?" sets one monster.":" summons "+owned.name+"."));
    if(!defense){const enemy=opponent(side),trap=game[enemy].traps.findIndex(x=>x&&x.card.id==="hole"&&x.turn<game.turn);
      if(trap>=0&&owned.atk>=1000){destroyTrap(enemy,trap);sendGrave(side,idx);note(who(enemy)+" activates Trap Hole!");}}
    render();
  }
  function canSpell(side,card){const p=game[side],e=game[opponent(side)];
    if(card.id==="pot")return !!p.deck.length;
    if(card.id==="fissure")return e.field.some(m=>m&&!m.hidden);
    if(card.id==="reborn")return p.field.includes(null)&&p.grave.some(c=>c.type==="monster");
    if(card.id==="axe")return p.field.some(Boolean);
    if(card.id==="storm")return e.traps.some(Boolean);
    return true;
  }
  function spell(side,card){if(game.active!==side||game.phase!=="main"||game.winner||card.type!=="spell"||!canSpell(side,card))return;
    const p=game[side],e=game[opponent(side)];if(!removeHand(side,card))return;p.grave.push(card);game.selected=null;note(who(side)+" activates "+card.name+".");
    if(card.id==="pot")draw(side,2);
    if(card.id==="heal")p.lp+=1000;
    if(card.id==="swords")p.shield=2;
    if(card.id==="axe"){const best=p.field.filter(Boolean).sort((a,b)=>(b.card.atk+b.bonus)-(a.card.atk+a.bonus))[0];if(best)best.bonus+=1000;}
    if(card.id==="fissure"){const options=e.field.map((m,i)=>m&&!m.hidden?{i,atk:m.card.atk+m.bonus}:null).filter(Boolean).sort((a,b)=>a.atk-b.atk);if(options.length){note("Fissure destroys "+e.field[options[0].i].card.name+".");sendGrave(opponent(side),options[0].i);}}
    if(card.id==="storm"){const i=e.traps.findIndex(Boolean);if(i>=0){destroyTrap(opponent(side),i);note("A set Trap card is destroyed.");}}
    // Starter-template spells other than the original small prototype pool
    // use an explicitly simplified effect. Do not represent this as official card text.
    if(card.id.startsWith("starter_")||card.id.startsWith("npc_")){p.lp+=500;note(who(side)+" gains 500 LP from a prototype Spell effect.");}
    if(card.id==="reborn"){let i=-1;for(let j=p.grave.length-1;j>=0;j--)if(p.grave[j].type==="monster"){i=j;break;}if(i>=0){const revived=p.grave.splice(i,1)[0],slot=p.field.findIndex(x=>!x);p.field[slot]={card:revived,defense:false,hidden:false,attacked:false,bonus:0,changed:game.turn};note(who(side)+" revives "+revived.name+".");}}
    render();
  }
  function setTrap(side,card){if(game.active!==side||game.phase!=="main"||game.winner)return;const p=game[side],i=p.traps.findIndex(x=>!x);if(i<0||card.type!=="trap"||!removeHand(side,card))return;p.traps[i]={card,turn:game.turn};game.selected=null;note(who(side)+" sets one Trap.");render();}
  function changePosition(index){if(game.active!=="player"||game.phase!=="main")return;const m=game.player.field[index];if(!m||m.changed===game.turn||m.attacked)return;m.defense=!m.defense;m.hidden=false;m.changed=game.turn;note("Changed "+m.card.name+" to "+(m.defense?"Defense":"Attack")+" Position.");game.selected=null;render();}
  function attack(side,index,target){if(game.active!==side||game.phase!=="battle"||game.winner)return;
    const p=game[side],enemySide=opponent(side),e=game[enemySide],m=p.field[index];
    if(!m||m.defense||m.hidden||m.attacked||e.shield>0)return;
    if(target===null&&e.field.some(Boolean))return;
    if(target!==null&&!e.field[target])return;
    m.attacked=true;
    const mirror=e.traps.findIndex(x=>x&&x.card.id==="mirror"&&x.turn<game.turn);
    if(mirror>=0){destroyTrap(enemySide,mirror);note(who(enemySide)+" activates Mirror Force!");p.field.forEach((v,i)=>{if(v&&!v.defense)sendGrave(side,i);});game.selected=null;render();return;}
    const negate=e.traps.findIndex(x=>x&&x.card.id==="negate"&&x.turn<game.turn);
    if(negate>=0){destroyTrap(enemySide,negate);note(who(enemySide)+" activates Negate Attack!");game.selected=null;render();return;}
    const starterTrap=e.traps.findIndex(x=>x&&(x.card.id.startsWith("starter_")||x.card.id.startsWith("npc_"))&&x.turn<game.turn);
    if(starterTrap>=0){destroyTrap(enemySide,starterTrap);note(who(enemySide)+" blocks the attack with a prototype Trap effect.");game.selected=null;render();return;}
    const atk=m.card.atk+m.bonus;
    if(target===null){damage(enemySide,atk);note(m.card.name+" attacks directly for "+atk+" damage!");}
    else {const d=e.field[target],defPower=d.defense?d.card.def:d.card.atk+d.bonus;d.hidden=false;note(m.card.name+" attacks "+d.card.name+".");
      if(d.defense){if(atk>defPower){sendGrave(enemySide,target);note("Defender destroyed!");}else if(atk<defPower)damage(side,defPower-atk);}
      else if(atk>defPower){sendGrave(enemySide,target);damage(enemySide,atk-defPower);}
      else if(atk<defPower){sendGrave(side,index);damage(side,defPower-atk);}
      else {sendGrave(side,index);sendGrave(enemySide,target);}
    }
    game.selected=null;render();
  }
  function startBattle(){if(game.active!=="player"||game.phase!=="main"||game.turn===1||game.winner)return;game.phase="battle";game.selected=null;note("Battle Phase: choose your attacker and an opponent target.");render();}
  function cpuTurn(){
    for(const c of [...game.cpu.hand])if(!game.winner&&c.type==="spell"&&canSpell("cpu",c))spell("cpu",c);
    const t=game.cpu.hand.find(c=>c.type==="trap"&&game.cpu.traps.includes(null));if(t)setTrap("cpu",t);
    const available=game.cpu.hand.filter(c=>eligible("cpu",c)).sort((a,b)=>b.atk-a.atk);if(available.length)normal("cpu",available[0],false);
    if(game.winner)return;
    game.phase="battle";
    if(game.player.shield){note("Swords of Revealing Light block the computer's attacks.");return;}
    for(let i=0;i<5&&!game.winner;i++){const a=game.cpu.field[i];if(!a||a.defense||a.hidden||a.attacked)continue;
      const options=game.player.field.map((m,j)=>m?{j,power:m.defense?m.card.def:m.card.atk+m.bonus}:null).filter(Boolean).sort((x,y)=>x.power-y.power);
      if(!options.length)attack("cpu",i,null);
      else if(a.card.atk+a.bonus>=options[0].power)attack("cpu",i,options[0].j);
    }
  }
  function endTurn(){if(game.active!=="player"||game.winner)return;
    game.active="cpu";game.phase="main";game.turn++;game.summoned=false;game.selected=null;
    for(const m of game.cpu.field)if(m)m.attacked=false;
    note(who("cpu")+"'s turn.");draw("cpu",1);if(!game.winner)cpuTurn();if(game.player.shield>0)game.player.shield--;
    if(!game.winner){game.active="player";game.phase="main";game.turn++;game.summoned=false;
      for(const m of game.player.field)if(m)m.attacked=false;
      if(game.cpu.shield>0)game.cpu.shield--;draw("player",1);note("Your turn. You draw one card.");}
    render();
  }
  function cardFace(card,hidden){const root=document.createElement("span");root.className="yd-card yd-"+(hidden?"back":card.type);
    if(hidden){root.textContent="✦";return root;}
    const name=document.createElement("strong");name.className="yd-card-name";name.textContent=card.name;
    const stars=document.createElement("small");stars.className="yd-stars";stars.textContent=card.type==="monster"?"★".repeat(card.level):card.type.toUpperCase();
    const art=document.createElement("span");art.className="yd-art";art.textContent=card.icon;decorateArt(art,card);
    const stats=document.createElement("small");stats.className="yd-stats";stats.textContent=card.type==="monster"?"ATK "+(card.atk)+" / DEF "+card.def:card.type.toUpperCase();root.append(name,stars,art,stats);return root;}
  function renderRow(side,kind){const slots=game[side][kind],parent=$("yd-"+side+"-"+kind);parent.replaceChildren();
    slots.forEach((entry,i)=>{const button=document.createElement("button");button.type="button";button.className="yd-slot";const isMonster=kind==="field",hidden=side==="cpu"?(isMonster?entry?.hidden:!!entry):isMonster&&entry?.hidden;
      if(entry)button.append(cardFace(entry.card,hidden));else button.textContent="+";
      if(entry&&isMonster){const position=document.createElement("span");position.className="yd-position";position.textContent=entry.defense?"DEF":"ATK";button.append(position);}
      button.setAttribute("aria-label",entry?(hidden?"Face-down card":entry.card.name):"Empty zone "+(i+1));
      if(side==="player"&&isMonster&&game.selected?.zone==="field"&&game.selected.index===i)button.classList.add("yd-selected");
      if(side==="cpu"&&isMonster&&entry&&game.selected?.zone==="field"&&game.phase==="battle")button.classList.add("yd-target");
      if(isMonster)button.addEventListener("click",()=>{
        if(game.active!=="player"||game.winner)return;
        if(side==="player"&&entry){game.selected={zone:"field",index:i};render();}
        else if(side==="cpu"&&entry&&game.selected?.zone==="field"&&game.phase==="battle")attack("player",game.selected.index,i);
      });parent.append(button);
    });
  }
  function action(parent,label,fn,disabled,primary){const btn=document.createElement("button");btn.className="button "+(primary?"primary":"secondary");btn.type="button";btn.textContent=label;btn.disabled=!!disabled;btn.addEventListener("click",fn);parent.append(btn);}
  function renderDetail(){const root=$("yd-details");root.replaceChildren();const sel=game.selected;
    if(!sel){root.textContent=game.winner?"Duel finished. Try New Duel.":game.phase==="battle"?"Tap your attacker, then an opposing monster.":"Choose a card in your hand to see available moves.";return;}
    const card=sel.zone==="hand"?game.player.hand.find(x=>x.uid===sel.uid):game.player.field[sel.index]?.card;
    if(!card){game.selected=null;root.textContent="Choose a card.";return;}
    const summary=document.createElement("div");summary.className="yd-detail-summary";
    const artPreview=document.createElement("div");artPreview.className="yd-detail-preview";artPreview.append(cardFace(card,false));
    const description=document.createElement("div");description.className="yd-detail-copy";
    const name=document.createElement("strong");name.textContent=card.name;description.append(name);
    const desc=document.createElement("p");desc.textContent=card.type==="monster"?"Level "+card.level+" · ATK "+card.atk+" / DEF "+card.def:card.text;description.append(desc);
    summary.append(artPreview,description);root.append(summary);
    const controls=document.createElement("div");controls.className="yd-actions";root.append(controls);
    if(sel.zone==="hand"&&game.active==="player"&&game.phase==="main"&&!game.winner){
      if(card.type==="monster"){const n=tributes(card);if(n){const p=document.createElement("p");p.textContent="Requires "+n+" tribute(s); your weakest monsters are automatically tributed.";root.append(p);}
        action(controls,"Summon ATK",()=>normal("player",card,false),!eligible("player",card),true);
        action(controls,"Set DEF",()=>normal("player",card,true),!eligible("player",card),false);
      }else if(card.type==="spell")action(controls,"Activate Spell",()=>spell("player",card),!canSpell("player",card),true);
      else action(controls,"Set Trap",()=>setTrap("player",card),!game.player.traps.includes(null),true);
    }else if(sel.zone==="field"&&game.active==="player"&&!game.winner){const m=game.player.field[sel.index];
      if(game.phase==="main")action(controls,"Change Position",()=>changePosition(sel.index),m.changed===game.turn||m.attacked,false);
      if(game.phase==="battle"){const msg=document.createElement("p");msg.textContent=game.cpu.shield?"Opponent's Swords prevent attacks.":"Tap an enemy monster to target it.";root.append(msg);
        action(controls,"Attack Directly",()=>attack("player",sel.index,null),m.defense||m.hidden||m.attacked||game.cpu.shield>0||game.cpu.field.some(Boolean),true);}
    }
    action(controls,"Cancel",()=>{game.selected=null;render();},false,false);
  }
  function arenaHint(){
    if(game.winner)return "Duel over. Rematch or choose another opponent.";
    if(game.phase==="battle")return game.selected?.zone==="field"?"Select an enemy target, or attack directly if there are no enemy monsters.":"Select your attacker, then the opposing monster.";
    if(game.selected?.zone==="hand")return "Card selected. Choose an action in the Selected Card panel below.";
    if(game.selected?.zone==="field")return "Monster selected. Its available actions are below.";
    if(game.turn===1)return "Opening turn: summon or set cards. You cannot attack yet.";
    return game.summoned?"Play Spells or Traps, then battle or end your turn.":"Select a card from your hand to summon, set, or activate.";
  }
  function render(){if(!game)return;
    const phase=game.winner?"DUEL OVER":game.phase==="battle"?"BATTLE PHASE":game.turn===1?"OPENING TURN":"MAIN PHASE";
    const hint=arenaHint();
    $("yd-turn").textContent="Turn "+game.turn+" · "+phase;
    $("yd-message").textContent=hint;
    $("yd-phase-label").textContent=phase;
    $("yd-phase-hint").textContent=hint;
    $("yd-hud-opponent").textContent=selectedOpponent?.name||"Computer Duelist";
    for(const side of ["cpu","player"]){
      const points=game[side].lp;
      const meter=$("yd-"+side+"-lp-meter");
      meter.setAttribute("aria-valuemax",String(Math.max(8000,points)));
      meter.setAttribute("aria-valuenow",String(points));
      $("yd-"+side+"-lp-fill").style.width=Math.max(0,Math.min(100,points/80))+"%";
      $("yd-hud-"+side+"-lp").textContent=points.toLocaleString();
    }
    $("yd-battle").disabled=!!game.winner||game.active!=="player"||game.phase!=="main"||game.turn===1;
    $("yd-end").disabled=!!game.winner||game.active!=="player";
    for(const s of ["player","cpu"]){const p=game[s];$("yd-"+s+"-lp").textContent=p.lp.toLocaleString();$("yd-"+s+"-counts").textContent="Deck "+p.deck.length+" · Hand "+p.hand.length+" · Grave "+p.grave.length;renderRow(s,"field");renderRow(s,"traps");}
    const hand=$("yd-hand");const handScroll=hand.scrollLeft;hand.replaceChildren();
    for(const card of game.player.hand){const btn=document.createElement("button");btn.type="button";btn.className="yd-handcard";btn.setAttribute("aria-pressed",String(game.selected?.zone==="hand"&&game.selected.uid===card.uid));btn.setAttribute("aria-label",card.name);btn.append(cardFace(card,false));btn.addEventListener("click",()=>{if(game.winner||game.active!=="player")return;game.selected={zone:"hand",uid:card.uid};render();});hand.append(btn);}
    hand.scrollLeft=handScroll;
    if(!game.player.hand.length)hand.textContent="Your hand is empty.";
    renderDetail();const log=$("yd-log");log.replaceChildren();game.history.slice(0,12).forEach(x=>{const li=document.createElement("li");li.textContent=x;log.append(li);});
    const result=$("yd-result");result.hidden=!game.winner;result.textContent=game.winner==="player"?"🏆 You defeated "+who("cpu")+"!":"Defeat against "+who("cpu")+". Duel again!";
    const r=record();$("yd-record").textContent=r.wins+" wins · "+r.losses+" losses";
  }
  function reset(){if(!activeStarter||!selectedOpponent||!$("yd-free-duel").hidden)return;uid=0;game={player:makeSide("player"),cpu:makeSide("cpu"),turn:1,active:"player",phase:"main",summoned:false,selected:null,winner:null,history:[]};draw("player",5);draw("cpu",5);note("Free Duel versus "+selectedOpponent.name+"! You play first with "+activeStarter.deck_name+".");$("yd-cpu-name").textContent=selectedOpponent.name;$("yd-cpu-avatar").replaceChildren(duelistArtwork(selectedOpponent,true));render();}

  // Locked starter decks belong to the Arena entitlement, not to card ownership.
  // The only write here is to yugioh_player_starter_choices, and the database
  // allows one insert per user and no user UPDATE or DELETE.
  function elt(tag,className,text){
    const v=document.createElement(tag);
    if(className)v.className=className;
    if(text!=null)v.textContent=String(text);
    return v;
  }
  function entryStatus(text,error=false){
    const v=$("yd-starter-status");
    v.textContent=text;
    v.classList.toggle("yd-starter-error",error);
  }
  async function starterCards(ids){
    const missing=[...new Set(ids.map(Number))].filter(id=>Number.isSafeInteger(id)&&!starterCardCache.has(id));
    for(let i=0;i<missing.length;i+=80){
      const {data,error}=await db.from("yugioh_cards")
        .select("card_id,name,card_type,level,attack,defense,art_image_id,description")
        .in("card_id",missing.slice(i,i+80));
      if(error)throw error;
      for(const c of data||[])starterCardCache.set(Number(c.card_id),c);
    }
    const notFound=ids.find(id=>!starterCardCache.has(Number(id)));
    if(notFound)throw new Error("Starter card #"+notFound+" is missing from the catalog.");
  }
  function starterArtwork(id,name){
    const wrapper=elt("span","yd-starter-art");
    const img=document.createElement("img");
    img.alt=name+" card artwork";img.loading="lazy";img.decoding="async";
    let tried=false;
    img.addEventListener("error",()=>{
      if(tried){img.remove();wrapper.append(elt("span","yd-starter-no-art","✦"));return;}
      tried=true;img.src=artFunction+"?id="+encodeURIComponent(String(id))+"&size=small";
    });
    img.src=artStorage+encodeURIComponent(String(id))+".jpg";
    wrapper.append(img);return wrapper;
  }
  function duelistArtwork(profile,featured=false){
    const frame=elt("span","yd-starter-art yd-character-art");
    const url=DUELIST_PORTRAITS[profile.id];
    if(!url){
      frame.replaceChildren(starterArtwork(profile.hero,profile.name+" signature card"));
      return frame;
    }
    const img=document.createElement("img");
    img.className="yd-character-image";
    img.dataset.portraitStyle="kaiba";
    img.dataset.duelist=profile.id;
    img.alt=profile.name+" portrait";
    img.width=561;
    img.height=594;
    img.loading=featured?"eager":"lazy";
    img.decoding="async";
    if(featured)img.fetchPriority="high";
    // Image errors are handled locally. Never block a duel if an external
    // illustration is unavailable or the source host changes its URLs.
    img.addEventListener("error",()=>{
      if(img.isConnected)frame.replaceChildren(starterArtwork(profile.hero,profile.name+" signature card"));
    },{once:true});
    frame.append(img);
    img.src=url;
    return frame;
  }

  async function previewStarter(template){
    const root=$("yd-starter-preview");
    root.hidden=false;root.replaceChildren(elt("p","","Loading fixed card list…"));
    try{
      await starterCards([...template.main_cards,...template.extra_cards]);
      root.replaceChildren(elt("h3","",template.deck_name+" — Locked deck list"));
      for(const [zone,ids] of [["Main Deck",template.main_cards],["Extra Deck",template.extra_cards]]){
        root.append(elt("h4","",zone+" ("+ids.length+")"));
        const list=elt("ul","yd-starter-preview-list");
        const counts=new Map();
        for(const id of ids)counts.set(Number(id),(counts.get(Number(id))||0)+1);
        for(const [id,n] of counts){
          const c=starterCardCache.get(id);
          list.append(elt("li","",n+"× "+c.name));
        }
        root.append(list);
      }
      root.append(elt("p","yd-starter-disclaimer","Preview only — no editing, no collection cards awarded. Card effects in this prototype are simplified."));
    }catch(e){
      root.replaceChildren(elt("p","yd-starter-error",e.message||"Unable to load deck preview."));
    }
  }

  function shuffleCards(input){
    const list=[...input];
    for(let i=list.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [list[i],list[j]]=[list[j],list[i]];
    }
    return list;
  }
  function registerOpponentCard(card){
    const id=Number(card.card_id);
    if(!Number.isSafeInteger(id)||id<1)throw new Error("Invalid opponent card");
    const key="npc_"+id;
    if(!catalog[key]){
      if(card.card_type==="Spell Card"){
        catalog[key]=[card.name,"spell","Prototype Spell: Gain 500 Life Points.","✨"];
      }else if(card.card_type==="Trap Card"){
        catalog[key]=[card.name,"trap","Prototype Trap: Prevent one attack.","🛡️"];
      }else{
        const level=Math.max(1,Math.min(12,Number(card.level)||4));
        // Negative ATK/DEF is undefined in the reference catalog for some
        // variable-stat monsters. Use a clearly simplified prototype value.
        const attack=Number(card.attack);
        const defense=Number(card.defense);
        const divine=card.name==="The Winged Dragon of Ra";
        catalog[key]=[card.name,level,
          attack>=0?attack:(divine?3000:0),defense>=0?defense:(divine?3000:0),"✦"];
      }
    }
    artIds[key]=Number(card.art_image_id)||id;
    return key;
  }
  async function opponentMonsterPool(profile,minimumLevel,maximumLevel,minimumAttack,maximumAttack,useRace=false){
    let query=db.from("yugioh_cards")
      .select("card_id,name,card_type,level,attack,defense,art_image_id")
      .eq("language_code","en")
      .ilike("card_type","%Monster%")
      .gte("level",minimumLevel)
      .lte("level",maximumLevel)
      .gte("attack",minimumAttack)
      .lte("attack",maximumAttack);
    if(profile.archetype&&!useRace)query=query.ilike("archetype","%"+profile.archetype+"%");
    else query=query.eq("race",profile.race);
    const {data,error}=await query.order("attack",{ascending:profile.difficulty<=2}).limit(180);
    if(error)throw error;
    return data||[];
  }
  async function buildOpponentDeck(profile){
    await starterCards([profile.hero]);
    const signature=starterCardCache.get(Number(profile.hero));
    if(!signature)throw new Error("Signature card not found");
    const strong=profile.difficulty>=4;
    const lowMin=strong?1200:profile.difficulty===3?650:0;
    const lowMax=profile.difficulty>=5?2300:profile.difficulty===4?2100:profile.difficulty===3?1900:1650;
    let low=await opponentMonsterPool(profile,1,4,lowMin,lowMax);
    if(low.length<13){
      const more=await opponentMonsterPool(profile,1,4,0,2500,true);
      const map=new Map([...low,...more].map(card=>[Number(card.card_id),card]));
      low=[...map.values()];
    }
    if(!low.length){
      // The public card catalog can be temporarily sparse after a reimport.
      // Return a valid playable fallback rather than a broken game screen.
      deckLists.cpu={blue:2,skull:2,ox:3,jinn:3,stone:3,kaiser:2,
        ryu:3,lord:2,elf:2,imp:3,harpie:2,kuriboh:1,pot:2,fissure:2,
        reborn:1,heal:1,swords:1,axe:1,storm:1,mirror:1,hole:1,negate:1};
      return;
    }
    const next={};
    const add=(key,count=1)=>{next[key]=(next[key]||0)+count;};
    const regular=shuffleCards(low);
    // 26 level 1–4 monsters: enough viable opening summons.
    for(let i=0;i<13;i++)add(registerOpponentCard(regular[i%regular.length]),2);

    let bosses=shuffleCards(await opponentMonsterPool(profile,5,8,0,4500))
      .filter(card=>Number(card.card_id)!==Number(profile.hero));
    const signatureMonster=signature.card_type.includes("Monster");
    if(signatureMonster)add(registerOpponentCard(signature));
    const bossNeeded=signatureMonster?2:3;
    for(let i=0;i<bossNeeded;i++){
      const choice=bosses[i]||regular[(i+4)%regular.length];
      add(registerOpponentCard(choice));
    }
    // Eleven shared prototype spell/traps. Signature Spell/Trap replaces a
    // support card, while signature monsters are included as a boss monster.
    const support=["pot","fissure","reborn","heal","swords","axe","storm",
      "mirror","hole","negate","fissure"];
    if(!signatureMonster)support[4]=registerOpponentCard(signature);
    for(const key of support)add(key);
    const total=Object.values(next).reduce((sum,count)=>sum+count,0);
    if(total!==40)throw new Error("Opponent deck must contain 40 cards, got "+total);
    deckLists.cpu=next;
  }
  function updateRosterPreview(){
    const profile=selectedOpponent;
    if(!profile)return;
    $("yd-free-duel-opponent").textContent=profile.name;
    $("yd-free-duel-subtitle").textContent=profile.epithet;
    $("yd-free-duel-difficulty").textContent="DIFFICULTY · "+"★".repeat(profile.difficulty)+"☆".repeat(5-profile.difficulty);
    $("yd-free-duel-style").textContent=profile.style+" · "+profile.flavor;
    const r=opponentRecord(profile.id);
    $("yd-free-duel-record").textContent="Your record: "+r.wins+" wins · "+r.losses+" losses";
    $("yd-free-duel-preview-art").replaceChildren(duelistArtwork(profile,true));
    for(const btn of $("yd-free-duel-grid").querySelectorAll(".yd-free-duel-thumb")){
      btn.setAttribute("aria-pressed",String(btn.dataset.duelist===profile.id));
    }
    $("yd-free-duel-status").textContent="Ready to challenge "+profile.name+".";
  }
  function renderDuelistRoster(){
    armedPortraitId=null;
    const grid=$("yd-free-duel-grid");
    grid.replaceChildren();
    const visible=DUELISTS
      .filter(profile=>rosterSeries==="all"||(profile.series||"classic")===rosterSeries)
      .sort((a,b)=>a.name.localeCompare(b.name,"en",{sensitivity:"base",ignorePunctuation:true}));
    for(const [index,profile] of visible.entries()){
      const portrait=elt("button","yd-free-duel-thumb");
      portrait.type="button";
      portrait.dataset.duelist=profile.id;
      portrait.title=profile.name+" · "+profile.epithet;
      portrait.setAttribute("aria-label",profile.name+", difficulty "+profile.difficulty+" of 5. Select twice to start the duel.");
      portrait.setAttribute("aria-pressed","false");
      if(profile.series==="gx"){
        portrait.classList.add("yd-free-duel-thumb-gx");
        portrait.append(elt("span","yd-free-duel-thumb-series","GX"));
      }
      portrait.append(duelistArtwork(profile,index<4));
      portrait.append(elt("span","yd-free-duel-thumb-difficulty","★".repeat(profile.difficulty)));
      portrait.append(elt("span","yd-free-duel-thumb-name",profile.name));
      portrait.addEventListener("click",()=>{
        if(loadingOpponent)return;
        const startNow=armedPortraitId===profile.id;
        selectedOpponent=profile;
        updateRosterPreview();
        if(startNow){
          armedPortraitId=null;
          void beginFreeDuel();
        }else{
          armedPortraitId=profile.id;
          $("yd-free-duel-status").textContent=profile.name+" selected. Tap the portrait again to start the duel.";
        }
      });
      grid.append(portrait);
    }
    if(!visible.some(profile=>profile.id===selectedOpponent?.id))selectedOpponent=visible[0];
    $("yd-free-duel-count").textContent=visible.length+" DUELISTS";
    $("yd-free-duel-series").querySelectorAll("button").forEach(btn=>{
      btn.setAttribute("aria-pressed",String(btn.dataset.series===rosterSeries));
      btn.disabled=loadingOpponent;
    });
    updateRosterPreview();
  }
  async function beginFreeDuel(){
    if(!activeStarter||!selectedOpponent||loadingOpponent)return;
    armedPortraitId=null;
    loadingOpponent=true;
    const btn=$("yd-free-duel-start");
    btn.disabled=true;
    btn.textContent="PREPARING DUEL…";
    $("yd-free-duel-status").textContent="Building "+selectedOpponent.name+"'s 40-card deck…";
    try{
      await buildOpponentDeck(selectedOpponent);
      $("yd-free-duel").hidden=true;
      $("yd-duel-content").hidden=false;
      reset();
      $("yd-duel-content").scrollIntoView({behavior:"smooth",block:"start"});
    }catch(error){
      $("yd-free-duel-status").textContent="Could not prepare this opponent: "+
        (error.message||"Please try again.");
    }finally{
      loadingOpponent=false;
      btn.disabled=false;
      btn.textContent="⚔️ START DUEL";
    }
  }
  function returnToFreeDuel(){
    if(!activeStarter||loadingOpponent)return;
    if(game&&!game.winner&&!confirm("Leave this duel and return to the opponent roster? Your current duel will be abandoned."))return;
    game=null;
    $("yd-duel-content").hidden=true;
    $("yd-free-duel").hidden=false;
    armedPortraitId=null;
    updateRosterPreview();
    $("yd-free-duel").scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function activateStarter(template){
    await starterCards([...template.main_cards,...template.extra_cards]);
    const keyed=Object.entries(catalog);
    const byName=new Map(keyed.map(([key,v])=>[v[0],key]));
    const next={};
    for(const idValue of template.main_cards){
      const c=starterCardCache.get(Number(idValue));
      const known=byName.get(c.name);
      const code=known||"starter_"+c.card_id;
      if(!known){
        const cat=c.card_type;
        if(cat==="Spell Card")catalog[code]=[c.name,"spell","Prototype Spell: Gain 500 Life Points.","✨"];
        else if(cat==="Trap Card")catalog[code]=[c.name,"trap","Prototype Trap: Prevent one attack.","🛡️"];
        else catalog[code]=[c.name,Math.max(1,Math.min(12,Number(c.level)||4)),
            Math.max(0,Number(c.attack)||0),Math.max(0,Number(c.defense)||0),"✦"];
      }
      artIds[code]=Number(c.art_image_id)||Number(c.card_id);
      next[code]=(next[code]||0)+1;
    }
    deckLists.player=next;
    activeStarter=template;
    $("yd-starter-gate").hidden=true;
    $("yd-duel-content").hidden=true;
    $("yd-free-duel").hidden=false;
    $("yd-starter-name").textContent=template.deck_name;
    $("yd-starter-extra-count").textContent=template.extra_cards.length+" Extra Deck cards (view only; Extra summons not yet implemented)";
    renderDuelistRoster();
  }
  function renderStarterPicker(templates){
    const root=$("yd-starter-options");
    root.replaceChildren();
    $("yd-starter-preview").hidden=true;
    for(const template of templates){
      const card=elt("article","yd-starter-card yd-starter-"+template.theme);
      card.append(starterArtwork(template.hero_image_id,template.deck_name));
      const summary=elt("div","yd-starter-card-summary");
      summary.append(elt("h3","",template.deck_name));
      summary.append(elt("p","",template.description));
      summary.append(elt("small","","40 Main · "+template.extra_cards.length+" Extra · Locked"));
      const actions=elt("div","yd-starter-actions");
      const view=elt("button","button secondary","View Cards");
      view.type="button";
      view.addEventListener("click",()=>previewStarter(template));
      const choose=elt("button","button primary","Choose This Starter");
      choose.type="button";
      choose.addEventListener("click",async()=>{
        if(choosingStarter)return;
        if(!confirm("Choose "+template.deck_name+" permanently for this account? You cannot switch starter decks. Choosing does NOT add these cards to your collection."))return;
        choosingStarter=true;
        root.querySelectorAll("button").forEach(b=>b.disabled=true);
        entryStatus("Saving your one-time starter selection…");
        try{
          const {data,error}=await db.from("yugioh_player_starter_choices")
            .insert({starter_id:template.id}).select("starter_id").single();
          if(error)throw error;
          if(data.starter_id!==template.id)throw new Error("Starter selection was not confirmed.");
          await activateStarter(template);
        }catch(e){
          // If a prior selection won the race or a retry hit the primary key,
          // reload the server's immutable choice, never override it.
          try{
            const {data:original,error:loadError}=await db.from("yugioh_player_starter_choices")
              .select("starter_id").maybeSingle();
            if(loadError)throw loadError;
            if(original){
              const selected=templates.find(t=>t.id===original.starter_id);
              if(!selected)throw new Error("Saved starter is not available.");
              await activateStarter(selected);
            }else entryStatus("Could not save your choice: "+(e.message||"Retry."),true);
          }catch(err){entryStatus("Starter selection unavailable: "+(err.message||"Retry."),true);}
        }finally{
          choosingStarter=false;
          root.querySelectorAll("button").forEach(b=>b.disabled=false);
        }
      });
      actions.append(view,choose);
      summary.append(actions);
      card.append(summary);
      root.append(card);
    }
  }
  async function initStarter(){
    $("yd-duel-content").hidden=true;
    $("yd-free-duel").hidden=true;
    $("yd-starter-gate").hidden=false;
    entryStatus("Checking your starter deck selection…");
    try{
      const {data:auth,error:authError}=await db.auth.getUser();
      if(authError||!auth.user){
        entryStatus("Sign in to choose your one permanent starter deck.");
        $("yd-starter-login").hidden=false;
        return;
      }
      const {data:templates,error:templateError}=await db.from("yugioh_starter_decks")
        .select("id,deck_name,description,theme,hero_image_id,main_cards,extra_cards,side_cards")
        .order("deck_name",{ascending:true});
      if(templateError)throw templateError;
      if(!templates||templates.length!==4)throw new Error("Starter deck list is not ready.");
      const {data:chosen,error:selectionError}=await db.from("yugioh_player_starter_choices")
        .select("starter_id").maybeSingle();
      if(selectionError)throw selectionError;
      if(chosen){
        const template=templates.find(t=>t.id===chosen.starter_id);
        if(!template)throw new Error("Your chosen starter is unavailable.");
        entryStatus("Loading your "+template.deck_name+"…");
        await activateStarter(template);
        return;
      }
      entryStatus("Choose ONE starter deck. Your choice is permanent. Cards are loaned for Arena play only — you own cards only after opening packs.");
      renderStarterPicker(templates);
    }catch(e){
      entryStatus("Could not load starter decks: "+(e.message||"Please try again."),true);
      const retry=elt("button","button secondary","Try Again");
      retry.type="button";
      retry.addEventListener("click",()=>{retry.remove();initStarter();});
      $("yd-starter-options").replaceChildren(retry);
    }
  }

  $("yd-zoom").addEventListener("click",()=>{
    const large=$("yd-board-scroll").classList.toggle("yd-large-view");
    $("yd-zoom").textContent=large?"Fit Field":"Enlarge Field";
    $("yd-zoom").setAttribute("aria-pressed",String(large));
    if(!large)$("yd-board-scroll").scrollLeft=0;
  });
  $("yd-battle").addEventListener("click",startBattle);
  $("yd-end").addEventListener("click",endTurn);
  $("yd-new").addEventListener("click",reset);
  $("yd-choose-opponent").addEventListener("click",returnToFreeDuel);
  $("yd-free-duel-start").addEventListener("click",beginFreeDuel);
  $("yd-free-duel-series").addEventListener("click",event=>{
    const btn=event.target.closest("button[data-series]");
    if(!btn||loadingOpponent||btn.dataset.series===rosterSeries)return;
    rosterSeries=btn.dataset.series;
    renderDuelistRoster();
  });
  $("yd-free-duel-grid").addEventListener("keydown",event=>{
    const gridCols=getComputedStyle(event.currentTarget).gridTemplateColumns.split(" ").length||4;
    const arrows={ArrowRight:1,ArrowLeft:-1,ArrowDown:gridCols,ArrowUp:-gridCols};
    if(!(event.key in arrows))return;
    const cells=[...event.currentTarget.querySelectorAll(".yd-free-duel-thumb")];
    const current=cells.indexOf(document.activeElement);
    if(current<0)return;
    event.preventDefault();
    const nextIndex=(current+arrows[event.key]+cells.length)%cells.length;
    cells[nextIndex].focus();
    armedPortraitId=null; // Arrow keys navigate portraits without triggering a duel.
    cells[nextIndex].click();
  });
  initStarter();
})();