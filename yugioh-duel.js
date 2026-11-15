"use strict";
(() => {
  /* CTooniverse fan duel. Simplified, local-only, no artwork or account transactions. */
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
      const release=()=>{
        if(finished)return;
        finished=true;
        artRequests--;
        setTimeout(pumpImages,180);
      };
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
  const $=id=>document.getElementById(id),opponent=s=>s==="player"?"cpu":"player",who=s=>s==="player"?"Player":"Computer";
  let uid=0,game;
  function makeCard(id){const spec=catalog[id];return{uid:++uid,id,name:spec[0],type:typeof spec[1]==="number"?"monster":spec[1],level:typeof spec[1]==="number"?spec[1]:0,atk:spec[2]||0,def:spec[3]||0,icon:spec[typeof spec[1]==="number"?4:3],text:typeof spec[1]==="number"?"Normal Monster":spec[2]};}
  function makeDeck(side){const result=[];for(const [id,n] of Object.entries(deckLists[side]))for(let i=0;i<n;i++)result.push(makeCard(id));for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  function makeSide(side){return{lp:8000,deck:makeDeck(side),hand:[],field:Array(5).fill(null),traps:Array(5).fill(null),grave:[],shield:0};}
  function note(message){game.history.unshift(message);game.history=game.history.slice(0,25);}
  function record(){try{return JSON.parse(localStorage.getItem("ctoon-yugioh-stats")||'{"wins":0,"losses":0}');}catch(_){return {wins:0,losses:0};}}
  function finish(winner,why){if(game.winner)return;game.winner=winner;game.phase="finished";game.selected=null;note((winner==="player"?"Victory! ":"Defeat! ")+why);const stats=record();stats[winner==="player"?"wins":"losses"]++;try{localStorage.setItem("ctoon-yugioh-stats",JSON.stringify(stats));}catch(_){}}
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
    note("Computer's turn.");draw("cpu",1);if(!game.winner)cpuTurn();if(game.player.shield>0)game.player.shield--;
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
    const name=document.createElement("strong");name.textContent=card.name;root.append(name);
    const desc=document.createElement("p");desc.textContent=card.type==="monster"?"Level "+card.level+" · ATK "+card.atk+" / DEF "+card.def:card.text;root.append(desc);
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
  function render(){if(!game)return;
    $("yd-turn").textContent="Turn "+game.turn+" · "+(game.winner?"Duel Over":game.phase==="battle"?"Battle Phase":"Main Phase");
    $("yd-message").textContent=game.winner?"Use New Duel to play again.":game.turn===1?"Opening turn: no attacks.":"Summon one monster each turn, then enter Battle Phase.";
    $("yd-battle").disabled=!!game.winner||game.active!=="player"||game.phase!=="main"||game.turn===1;
    $("yd-end").disabled=!!game.winner||game.active!=="player";
    for(const s of ["player","cpu"]){const p=game[s];$("yd-"+s+"-lp").textContent=p.lp.toLocaleString();$("yd-"+s+"-counts").textContent="Deck "+p.deck.length+" · Hand "+p.hand.length+" · Grave "+p.grave.length;renderRow(s,"field");renderRow(s,"traps");}
    const hand=$("yd-hand");hand.replaceChildren();
    for(const card of game.player.hand){const btn=document.createElement("button");btn.type="button";btn.className="yd-handcard";btn.setAttribute("aria-pressed",String(game.selected?.zone==="hand"&&game.selected.uid===card.uid));btn.setAttribute("aria-label",card.name);btn.append(cardFace(card,false));btn.addEventListener("click",()=>{if(game.winner||game.active!=="player")return;game.selected={zone:"hand",uid:card.uid};render();});hand.append(btn);}
    if(!game.player.hand.length)hand.textContent="Your hand is empty.";
    renderDetail();const log=$("yd-log");log.replaceChildren();game.history.slice(0,12).forEach(x=>{const li=document.createElement("li");li.textContent=x;log.append(li);});
    const result=$("yd-result");result.hidden=!game.winner;result.textContent=game.winner==="player"?"🏆 You won the duel!":"The computer won. Duel again!";
    const r=record();$("yd-record").textContent=r.wins+" wins · "+r.losses+" losses";
  }
  function reset(){uid=0;game={player:makeSide("player"),cpu:makeSide("cpu"),turn:1,active:"player",phase:"main",summoned:false,selected:null,winner:null,history:[]};draw("player",5);draw("cpu",5);note("Duel begins! You play first.");render();}
  $("yd-battle").addEventListener("click",startBattle);$("yd-end").addEventListener("click",endTurn);$("yd-new").addEventListener("click",reset);reset();
})();