"use strict";
(() => {
  // CTooniverse Pokémon Card Arena: deliberately simplified offline-capable
  // single-player game. No wallet, card inventory, or Pokémon account writes.
  const $=id=>document.getElementById(id);
  const TYPES={fire:{name:"Fire",emoji:"🔥",energy:"fireenergy"},water:{name:"Water",emoji:"💧",energy:"waterenergy"},lightning:{name:"Lightning",emoji:"⚡",energy:"lightningenergy"}};
  const CARDS={};
  const base=(id)=>"https://assets.tcgdex.net/en/base/base1/"+id+"/low.webp";
  const pokemon=(id,name,type,hp,stage,from,picture,emoji,attacks)=>{
    CARDS[id]={id,name,kind:"pokemon",type,hp,stage,from:from||null,picture,emoji,attacks:attacks.map(([label,cost,damage])=>({label,cost,damage}))};
  };
  pokemon("charmander","Charmander","fire",50,0,null,46,"🦎",[["Scratch",1,10],["Ember",2,30]]);
  pokemon("charmeleon","Charmeleon","fire",90,1,"Charmander",24,"🔥",[["Flame Claw",2,40],["Fire Tail",3,60]]);
  pokemon("charizard","Charizard","fire",150,2,"Charmeleon",4,"🐉",[["Fire Spin",4,100]]);
  pokemon("growlithe","Growlithe","fire",70,0,null,28,"🐕",[["Bite",1,20],["Flare",2,30]]);
  pokemon("arcanine","Arcanine","fire",120,1,"Growlithe",23,"🐅",[["Flame Charge",2,40],["Heat Wave",3,70]]);
  pokemon("vulpix","Vulpix","fire",50,0,null,68,"🦊",[["Tail Whip",1,10],["Fire Spark",2,30]]);
  pokemon("ninetales","Ninetales","fire",100,1,"Vulpix",12,"🦊",[["Flamethrower",3,70]]);
  pokemon("ponyta","Ponyta","fire",60,0,null,60,"🐎",[["Hoof Kick",1,20],["Blazing Run",2,30]]);
  pokemon("magmar","Magmar","fire",80,0,null,36,"🔥",[["Fire Punch",2,40]]);
  pokemon("squirtle","Squirtle","water",60,0,null,63,"🐢",[["Bubble",1,10],["Water Gun",2,30]]);
  pokemon("wartortle","Wartortle","water",90,1,"Squirtle",42,"🐢",[["Water Jet",2,40],["Shell Bash",3,60]]);
  pokemon("blastoise","Blastoise","water",150,2,"Wartortle",2,"🌊",[["Hydro Pump",3,80],["Water Cannon",4,110]]);
  pokemon("poliwag","Poliwag","water",50,0,null,59,"🌀",[["Splash",1,10],["Water Slap",2,30]]);
  pokemon("poliwhirl","Poliwhirl","water",80,1,"Poliwag",38,"🌀",[["Hypno Splash",2,40]]);
  pokemon("poliwrath","Poliwrath","water",120,2,"Poliwhirl",13,"💪",[["Mega Punch",3,70]]);
  pokemon("staryu","Staryu","water",60,0,null,65,"⭐",[["Spinning Star",1,20]]);
  pokemon("starmie","Starmie","water",100,1,"Staryu",64,"🌟",[["Star Beam",2,40],["Twister",3,60]]);
  pokemon("seel","Seel","water",70,0,null,41,"🦭",[["Headbutt",1,20],["Bubble",2,30]]);
  pokemon("dewgong","Dewgong","water",110,1,"Seel",25,"🦭",[["Ice Beam",3,70]]);
  pokemon("pikachu","Pikachu","lightning",60,0,null,58,"⚡",[["Quick Attack",1,20],["Thunder Shock",2,30]]);
  pokemon("raichu","Raichu","lightning",110,1,"Pikachu",14,"⚡",[["Thunderbolt",3,80]]);
  pokemon("magnemite","Magnemite","lightning",60,0,null,53,"🧲",[["Tackle",1,20]]);
  pokemon("magneton","Magneton","lightning",110,1,"Magnemite",9,"🧲",[["Electro Blast",3,70]]);
  pokemon("voltorb","Voltorb","lightning",60,0,null,67,"🔴",[["Rollout",1,20]]);
  pokemon("electrode","Electrode","lightning",110,1,"Voltorb",21,"⚡",[["Electric Ball",2,50]]);
  pokemon("electabuzz","Electabuzz","lightning",90,0,null,20,"⚡",[["Thunder Punch",2,40],["Lightning Strike",3,60]]);
  pokemon("zapdos","Zapdos","lightning",130,0,null,16,"🦅",[["Electric Storm",3,70]]);
  for(const [type,cardNumber] of [["fire",98],["water",102],["lightning",100]]){
    const id=type+"energy";
    CARDS[id]={id,name:TYPES[type].name+" Energy",kind:"energy",type,picture:cardNumber,emoji:TYPES[type].emoji};
  }
  CARDS.bill={id:"bill",name:"Bill",kind:"trainer",type:"trainer",picture:91,emoji:"📚",description:"Draw 2 cards."};
  CARDS.potion={id:"potion",name:"Potion",kind:"trainer",type:"trainer",picture:94,emoji:"🧪",description:"Heal 30 damage from your Active Pokémon."};
  CARDS.switch={id:"switch",name:"Switch",kind:"trainer",type:"trainer",picture:95,emoji:"🔄",description:"Swap your Active Pokémon with a Benched Pokémon."};

  const DECKS={
    fire:{pokemon:{charmander:4,charmeleon:3,charizard:2,growlithe:4,arcanine:3,vulpix:4,ninetales:2,ponyta:3,magmar:3},energy:22},
    water:{pokemon:{squirtle:4,wartortle:3,blastoise:2,poliwag:4,poliwhirl:3,poliwrath:2,staryu:4,starmie:3,seel:2,dewgong:2},energy:21},
    lightning:{pokemon:{pikachu:4,raichu:3,magnemite:4,magneton:3,voltorb:4,electrode:3,electabuzz:4,zapdos:2},energy:23}
  };
  // Device-local results; no Supabase inventory, coins or accounts are changed.
  const STATS_KEY="ctooniverse-pokemon-arena-stats-v1";
  function readStats(){
    try{
      const raw=JSON.parse(localStorage.getItem(STATS_KEY)||"{}");
      return {wins:Math.max(0,Number(raw.wins)||0),losses:Math.max(0,Number(raw.losses)||0)};
    }catch(_){return {wins:0,losses:0};}
  }
  function showStats(){
    const node=$("ptcg-record");if(!node)return;
    const stats=readStats();
    node.textContent="Your record on this device: "+stats.wins+" wins · "+stats.losses+" losses";
  }
  let nextUid=0,game=null,selection=null;
  let difficulty="normal";
  let customDeck=null;
  const makeCard=id=>({uid:++nextUid,id});
  const def=card=>CARDS[card.id];
  function shuffle(a){
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function makeDeck(type){
    if(type==="custom"){
      if(!Array.isArray(customDeck)||customDeck.length!==60)throw Error("Custom deck requires 60 cards");
      return shuffle(customDeck.map(makeCard));
    }
    const result=[],config=DECKS[type];
    for(const [id,n] of Object.entries(config.pokemon))for(let i=0;i<n;i++)result.push(makeCard(id));
    for(let i=0;i<config.energy;i++)result.push(makeCard(TYPES[type].energy));
    for(const [id,n] of [["bill",4],["potion",4],["switch",2]])for(let i=0;i<n;i++)result.push(makeCard(id));
    if(result.length!==60)throw Error("Deck size must be 60: "+type+" "+result.length);
    return shuffle(result);
  }
  function side(type){
    const result={type,deck:makeDeck(type),hand:[],prizes:[],active:null,bench:[],discard:[],attachedThisTurn:false,retreatedThisTurn:false};
    for(let tries=0;tries<35;tries++){
      const opening=result.deck.splice(0,7);
      if(opening.some(card=>def(card).kind==="pokemon"&&def(card).stage===0)){result.hand=opening;break;}
      result.deck.push(...opening);shuffle(result.deck);
    }
    if(!result.hand.length)throw Error("Could not draw an opening Basic Pokémon");
    result.prizes=result.deck.splice(0,6);
    const first=result.hand.findIndex(card=>def(card).kind==="pokemon"&&def(card).stage===0);
    result.active=makeInPlay(result.hand.splice(first,1)[0],0);
    return result;
  }
  function makeInPlay(card,entered){
    return {card,damage:0,energy:0,energyCards:[],evolutionCards:[],entered,evolvedAt:-1};
  }
  function nameOf(sideName){
    if(sideName==="cpu")return "Rival Trainer";
    const fromHeader=$("header-player-name")?.textContent?.trim();
    return fromHeader&&fromHeader!=="Guest"?fromHeader:"Trainer";
  }
  function note(message){
    if(!game)return;
    game.log.unshift(message);game.log=game.log.slice(0,26);
    game.message=message;
  }
  function finish(winner,reason){
    if(!game||game.winner)return;
    game.winner=winner;game.activeSide=null;
    const stats=readStats();if(winner==="player")stats.wins++;else stats.losses++;
    try{localStorage.setItem(STATS_KEY,JSON.stringify(stats));}catch(_){}
    note((winner==="player"?"Victory! ":"Defeat! ")+reason);
  }
  function drawFor(sideName,count=1){
    if(game.winner)return;
    const p=game[sideName];
    for(let i=0;i<count;i++){
      if(!p.deck.length){finish(sideName==="player"?"cpu":"player",nameOf(sideName)+" could not draw from an empty deck.");return;}
      p.hand.push(p.deck.pop());
    }
  }
  function removeHand(p,uid){
    const i=p.hand.findIndex(c=>c.uid===uid);
    return i<0?null:p.hand.splice(i,1)[0];
  }
  function canEvolve(pokemonInPlay,card){
    const cardDef=def(card);
    return cardDef.kind==="pokemon"&&cardDef.stage>0&&pokemonInPlay&&
      def(pokemonInPlay.card).name===cardDef.from&&
      game.turn>pokemonInPlay.entered&&game.turn>pokemonInPlay.evolvedAt;
  }
  function evolveAt(sideName,index,uid){
    if(game.winner||game.activeSide!==sideName)return;
    const p=game[sideName],target=index<0?p.active:p.bench[index];
    const card=p.hand.find(c=>c.uid===uid);
    if(!card||!canEvolve(target,card))return;
    const previous=target.card;
    const upgraded=removeHand(p,uid);
    target.evolutionCards.push(previous);
    target.card=upgraded;
    target.evolvedAt=game.turn;
    note(nameOf(sideName)+" evolved "+def(previous).name+" into "+def(upgraded).name+"!");
    selection=null;
    render();
  }
  function playBasic(sideName,uid){
    if(game.winner||game.activeSide!==sideName)return;
    const p=game[sideName],card=p.hand.find(c=>c.uid===uid);
    if(!card||def(card).kind!=="pokemon"||def(card).stage!==0||p.bench.length>=5)return;
    p.bench.push(makeInPlay(removeHand(p,uid),game.turn));
    note(nameOf(sideName)+" put "+def(card).name+" on the Bench.");
    selection=null;render();
  }
  function attachEnergy(sideName,uid,index){
    if(game.winner||game.activeSide!==sideName)return;
    const p=game[sideName],card=p.hand.find(c=>c.uid===uid);
    if(!card||def(card).kind!=="energy"||p.attachedThisTurn)return;
    const target=index<0?p.active:p.bench[index];if(!target)return;
    // Any Energy can be attached; this simplified arena uses generic attack costs.
    target.energyCards.push(removeHand(p,uid));
    target.energy=target.energyCards.length;
    p.attachedThisTurn=true;
    note(nameOf(sideName)+" attached "+TYPES[def(card).type].name+" Energy to "+def(target.card).name+".");
    selection=null;render();
  }
  function playTrainer(sideName,uid,index=-1){
    if(game.winner||game.activeSide!==sideName)return;
    const p=game[sideName],card=p.hand.find(c=>c.uid===uid);
    if(!card||def(card).kind!=="trainer")return;
    if(card.id==="potion"&&(!p.active||p.active.damage<=0))return;
    if(card.id==="switch"&&(!p.active||index<0||!p.bench[index]))return;
    removeHand(p,uid);p.discard.push(card);
    if(card.id==="bill"){note(nameOf(sideName)+" played Bill to draw 2 cards.");drawFor(sideName,2);}
    if(card.id==="potion"){p.active.damage=Math.max(0,p.active.damage-30);note(nameOf(sideName)+" healed 30 damage with Potion.");}
    if(card.id==="switch"){const temp=p.active;p.active=p.bench[index];p.bench[index]=temp;note(nameOf(sideName)+" played Switch.");}
    selection=null;render();
  }
  function retreat(index){
    if(game.winner||game.activeSide!=="player")return;
    const p=game.player;
    if(!p.active||p.active.energy<1||p.retreatedThisTurn||!p.bench[index])return;
    const spent=p.active.energyCards.pop();
    if(spent)p.discard.push(spent);
    p.active.energy=p.active.energyCards.length;
    const prior=p.active;p.active=p.bench[index];p.bench[index]=prior;
    p.retreatedThisTurn=true;
    note("You retreated into "+def(p.active.card).name+".");
    selection=null;render();
  }
  function collectPrize(attackerName){
    const p=game[attackerName];
    if(p.prizes.length){
      p.hand.push(p.prizes.pop());
      note(nameOf(attackerName)+" took a Prize card!");
    }
    if(p.prizes.length===0)finish(attackerName,nameOf(attackerName)+" claimed all six Prizes.");
  }
  function performAttack(sideName,attackIndex){
    if(!game||game.winner||game.activeSide!==sideName)return;
    // The starting player cannot attack on their first turn.
    if(sideName==="player"&&game.round===1)return;
    const attacker=game[sideName],defenderName=sideName==="player"?"cpu":"player",defender=game[defenderName];
    if(!attacker.active||!defender.active)return;
    const cardDef=def(attacker.active.card);
    const attack=cardDef.attacks[attackIndex];
    if(!attack||attacker.active.energy<attack.cost)return;
    const target=def(defender.active.card);
    // The three demo starter types form a simple Fire→Lightning→Water→Fire cycle.
    const beats={fire:"lightning",lightning:"water",water:"fire"};
    const multiplier=beats[cardDef.type]===target.type?2:1;
    const damage=attack.damage*multiplier;
    defender.active.damage+=damage;
    note(nameOf(sideName)+"'s "+cardDef.name+" used "+attack.label+" for "+damage+" damage"+(multiplier===2?" (weakness)!":"!"));
    if(defender.active.damage>=target.hp){
      note(target.name+" was Knocked Out!");
      defender.discard.push(defender.active.card,...defender.active.evolutionCards,...defender.active.energyCards);
      defender.active=defender.bench.shift()||null;
      collectPrize(sideName);
      if(!game.winner&&!defender.active)finish(sideName,nameOf(defenderName)+" has no Pokémon left in play.");
      if(!game.winner&&defender.active)note(nameOf(defenderName)+" sent out "+def(defender.active.card).name+".");
    }
    selection=null;
    if(!game.winner&&sideName==="player"){
      advanceToCpu();
    }else render();
  }
  function endPlayerTurn(){
    if(!game||game.winner||game.activeSide!=="player")return;
    note("You ended your turn.");
    advanceToCpu();
  }
  function advanceToCpu(){
    if(game.winner){render();return;}
    game.activeSide="cpu";game.turn++;
    game.cpu.attachedThisTurn=false;game.cpu.retreatedThisTurn=false;
    drawFor("cpu");
    if(!game.winner)runCpu();
    if(!game.winner){
      game.activeSide="player";game.turn++;game.round++;
      game.player.attachedThisTurn=false;game.player.retreatedThisTurn=false;
      drawFor("player");
      if(!game.winner)note("Your turn! Draw a card and play or attack.");
    }
    selection=null;render();
  }
  function runCpu(){
    const cpu=game.cpu;
    if(game.winner)return;
    // Evolve any eligible Pokémon; use a one-evolution-per-Pokémon-per-turn rule.
    for(const card of [...cpu.hand]){
      const targets=[cpu.active,...cpu.bench];
      const match=targets.findIndex(mon=>canEvolve(mon,card));
      if(match>=0)evolveAt("cpu",match===0?-1:match-1,card.uid);
    }
    for(const card of [...cpu.hand]){
      if(def(card).kind==="pokemon"&&def(card).stage===0&&cpu.bench.length<(difficulty==="hard"?5:difficulty==="easy"?2:3))playBasic("cpu",card.uid);
    }
    if(cpu.active&&cpu.active.damage>=30){
      const potion=cpu.hand.find(c=>c.id==="potion");
      if(potion)playTrainer("cpu",potion.uid);
    }
    const bill=cpu.hand.find(c=>c.id==="bill");
    if(bill)playTrainer("cpu",bill.uid);
    if(!game.winner&&!cpu.attachedThisTurn){
      const energy=cpu.hand.find(c=>def(c).kind==="energy");
      if(energy){
        // Prefer bringing the Active Pokémon online, then support the Bench.
        let choice=-1;
        if(cpu.active&&cpu.active.energy>=Math.max(...def(cpu.active.card).attacks.map(a=>a.cost))){
          choice=cpu.bench.findIndex(b=>def(b.card).type===cpu.type);
        }
        attachEnergy("cpu",energy.uid,choice>=0?choice:-1);
      }
    }
    if(game.winner)return;
    const options=def(cpu.active.card).attacks.map((a,i)=>({...a,index:i})).filter(a=>a.cost<=cpu.active.energy).sort((a,b)=>b.damage-a.damage);
    if(options.length){
      const choice=difficulty==="easy"?options[options.length-1]:options[0];
      performAttack("cpu",choice.index);
    }
    else note("Rival Trainer ended the turn without attacking.");
  }
  function begin(type){
    if(type!=="custom"&&!DECKS[type])return;
    difficulty=$("ptcg-difficulty")?.value||"normal";
    try{
      nextUid=0;selection=null;
      const enemyTypes=Object.keys(DECKS).filter(t=>t!==type);
      const enemyType=enemyTypes[Math.floor(Math.random()*enemyTypes.length)];
      const player=side(type),cpu=side(enemyType);
      game={player,cpu,round:1,turn:1,activeSide:"player",winner:null,log:[],message:"Choose a card from your hand. The first Trainer cannot attack on turn one.",playerType:type,cpuType:enemyType};
      $("ptcg-deck-select").hidden=true;$("ptcg-arena").hidden=false;
      note("Battle started! "+(type==="custom"?"Collection Deck":TYPES[type].name)+" vs "+TYPES[enemyType].name+" · "+difficulty+" rival. You go first.");
      $("ptcg-arena").scrollIntoView({block:"start",behavior:"smooth"});
      render();showStats();
    }catch(error){
      console.error("Pokémon Card Arena setup error",error);
      $("ptcg-status").textContent="Could not start the game. Please try again.";
      $("ptcg-deck-select").hidden=false;$("ptcg-arena").hidden=true;
      game=null;
    }
  }
  function artNode(card){
    const cardDef=def(card),wrap=document.createElement("div");
    wrap.className="ptcg-card-art";
    const fallback=document.createElement("span");fallback.textContent=cardDef.emoji||"🃏";
    wrap.append(fallback);
    const image=document.createElement("img");
    image.loading="lazy";image.decoding="async";image.alt="";
    image.addEventListener("error",()=>image.remove(),{once:true});
    image.src=base(cardDef.picture);
    wrap.append(image);
    return wrap;
  }
  function visual(card,mon=null,click=null,selected=false){
    const d=def(card),node=document.createElement(click?"button":"div");
    node.className="ptcg-card"+(selected?" ptcg-selected":"")+(mon?" ptcg-"+(click?"active-card":"benched"):"");
    node.dataset.type=d.type;node.dataset.kind=d.kind;
    if(click){node.type="button";node.addEventListener("click",click);node.setAttribute("aria-pressed",String(selected));}
    node.setAttribute("aria-label",d.name+(mon?", "+Math.max(0,d.hp-mon.damage)+" of "+d.hp+" HP, "+mon.energy+" Energy":""));
    const head=document.createElement("div");head.className="ptcg-card-top";
    const title=document.createElement("strong");title.textContent=d.name;
    const hp=document.createElement("b");hp.textContent=d.kind==="pokemon"?(mon?Math.max(0,d.hp-mon.damage)+"/"+d.hp:d.hp)+" HP":d.kind.toUpperCase();
    head.append(title,hp);
    const footer=document.createElement("div");footer.className="ptcg-card-footer";
    if(d.kind==="pokemon"){
      const attacks=d.attacks.map(a=>a.label+" "+a.damage).join(" · ");
      footer.textContent=attacks;
      const more=document.createElement("small");
      more.textContent=(d.stage?"Stage "+d.stage:"Basic")+(mon?" · ⚡"+mon.energy:" · "+TYPES[d.type].name);
      footer.append(more);
    }else footer.textContent=d.kind==="energy"?"Attach once each turn":d.description;
    node.append(head,artNode(card),footer);
    return node;
  }
  function emptySlot(text){
    const e=document.createElement("div");e.className="ptcg-empty-slot";e.textContent=text;return e;
  }
  function renderSide(sideName){
    const p=game[sideName];
    const active=$("ptcg-"+sideName+"-active");
    active.replaceChildren(p.active?visual(p.active.card,p.active,sideName==="player"?()=>{selection={zone:"active"};render();}:null,sideName==="player"&&selection?.zone==="active"):emptySlot("NO ACTIVE"));
    if(p.active?.card&&sideName==="player"){
      active.firstElementChild.classList.add("ptcg-active-card");
    }
    const bench=$("ptcg-"+sideName+"-bench");bench.replaceChildren();
    p.bench.forEach((mon,i)=>{
      bench.append(visual(mon.card,mon,sideName==="player"?()=>{selection={zone:"bench",index:i};render();}:null,sideName==="player"&&selection?.zone==="bench"&&selection.index===i));
    });
    for(let i=p.bench.length;i<5;i++)bench.append(emptySlot("OPEN"));
    $("ptcg-"+sideName+"-prizes").textContent=String(p.prizes.length);
    $("ptcg-"+sideName+"-meta").textContent="Deck "+p.deck.length+" · Hand "+p.hand.length+" · Discard "+p.discard.length;
  }
  function action(label,callback,disabled=false){
    const button=document.createElement("button");
    button.type="button";button.className="button "+(disabled?"secondary":"primary");
    button.textContent=label;button.disabled=disabled;
    button.addEventListener("click",callback);
    $("ptcg-actions").append(button);
  }
  function renderSelected(){
    const details=$("ptcg-details"),actions=$("ptcg-actions");
    details.replaceChildren();actions.replaceChildren();
    if(!game||game.winner){
      details.textContent=game?.winner?"The duel has finished. Choose Rematch or Change Deck.":"Pick a starter to begin.";
      return;
    }
    const p=game.player,playerTurn=game.activeSide==="player";
    if(!selection){details.textContent="Select a card in your hand or a Pokémon on your field. Attach Energy to power attacks; evolve your team to increase damage.";return;}
    if(selection.zone==="hand"){
      const card=p.hand.find(c=>c.uid===selection.uid);
      if(!card){selection=null;details.textContent="Choose a card.";return;}
      const d=def(card);details.textContent=d.name+" · "+(d.kind==="pokemon"?(d.stage?"Stage "+d.stage+" evolves from "+d.from:"Basic Pokémon")+" · "+d.hp+" HP":d.kind==="energy"?"Attach Energy to a matching Pokémon.":d.description);
      if(d.kind==="pokemon"){
        if(d.stage===0)action("Put on Bench",()=>playBasic("player",card.uid),!playerTurn||p.bench.length>=5);
        else{
          if(p.active&&def(p.active.card).name===d.from)action("Evolve Active",()=>evolveAt("player",-1,card.uid),!playerTurn||!canEvolve(p.active,card));
          for(const [index,mon] of p.bench.entries()){
            if(def(mon.card).name===d.from)action("Evolve "+def(mon.card).name+" (Bench "+(index+1)+")",()=>evolveAt("player",index,card.uid),!playerTurn||!canEvolve(mon,card));
          }
        }
      }else if(d.kind==="energy"){
        if(p.active)action("Attach to Active",()=>attachEnergy("player",card.uid,-1),!playerTurn||p.attachedThisTurn);
        p.bench.forEach((mon,index)=>{
          action("Attach to Bench "+(index+1),()=>attachEnergy("player",card.uid,index),!playerTurn||p.attachedThisTurn);
        });
      }else if(d.kind==="trainer"){
        if(d.id==="switch")p.bench.forEach((mon,index)=>action("Switch to "+def(mon.card).name,()=>playTrainer("player",card.uid,index),!playerTurn));
        else action("Play "+d.name,()=>playTrainer("player",card.uid),!playerTurn||(d.id==="potion"&&p.active?.damage===0));
      }
    }else{
      const mon=selection.zone==="active"?p.active:p.bench[selection.index];
      if(!mon){selection=null;details.textContent="Choose a Pokémon.";return;}
      const d=def(mon.card);
      details.textContent=d.name+" · "+Math.max(0,d.hp-mon.damage)+" / "+d.hp+" HP · "+mon.energy+" Energy attached. "+(selection.zone==="active"?"Attacking ends your turn.":"This Pokémon is waiting on the Bench.");
      if(selection.zone==="active"){
        d.attacks.forEach((move,index)=>action(move.label+" · "+move.damage+" DMG · "+move.cost+" Energy",()=>performAttack("player",index),!playerTurn||game.round===1||mon.energy<move.cost));
        if(game.round===1)action("First-turn attacks unavailable",()=>{},true);
      }else{
        action("Retreat to "+d.name,()=>retreat(selection.index),!playerTurn||p.retreatedThisTurn||!p.active||p.active.energy<1);
      }
    }
    if(!actions.children.length)details.textContent+=" No action is available right now.";
  }
  function render(){
    if(!game)return;
    $("ptcg-player-title").textContent=nameOf("player");
    $("ptcg-matchup").textContent=(game.playerType==="custom"?"🃏 Collection Deck":TYPES[game.playerType].emoji+" "+TYPES[game.playerType].name)+" vs "+TYPES[game.cpuType].emoji+" "+TYPES[game.cpuType].name+" · "+difficulty.toUpperCase()+" CPU";
    $("ptcg-turn-label").textContent=game.winner?"MATCH OVER":game.activeSide==="player"?"TURN "+game.round+" · YOUR MOVE":"RIVAL TURN";
    $("ptcg-end-turn").disabled=!!game.winner||game.activeSide!=="player";
    $("ptcg-status").textContent=game.message;
    renderSide("cpu");renderSide("player");
    const hand=$("ptcg-hand");hand.replaceChildren();
    game.player.hand.forEach(card=>hand.append(visual(card,null,()=>{selection={zone:"hand",uid:card.uid};render();},selection?.zone==="hand"&&selection.uid===card.uid)));
    $("ptcg-hand-count").textContent=game.player.hand.length+" cards";
    if(!game.player.hand.length)hand.append(emptySlot("Your hand is empty"));
    renderSelected();
    const log=$("ptcg-log");log.replaceChildren();
    game.log.slice(0,15).forEach(message=>{const li=document.createElement("li");li.textContent=message;log.append(li);});
    const result=$("ptcg-result");result.hidden=!game.winner;
    if(game.winner)result.textContent=game.winner==="player"?"🏆 You won the Pokémon Card Arena duel!":"Rival Trainer wins this round. Try a rematch!";
    showStats();
  }
  window.CToonPokemonArena={setCustomDeck(ids){if(!Array.isArray(ids)||ids.length!==60||ids.some(id=>!CARDS[id]))return false;customDeck=ids.slice();return true;},playCustom(){if(customDeck)begin("custom");},supportedCards(){return Object.values(CARDS).map(c=>({id:c.id,name:c.name,kind:c.kind,stage:c.stage||0,base_number:c.picture}));}};
  showStats();
  $("ptcg-deck-select").addEventListener("click",event=>{
    const btn=event.target.closest("button[data-deck]");
    if(btn)begin(btn.dataset.deck);
  });
  $("ptcg-end-turn").addEventListener("click",endPlayerTurn);
  $("ptcg-new-game").addEventListener("click",()=>{if(game)begin(game.playerType);});
  $("ptcg-change-deck").addEventListener("click",()=>{
    game=null;selection=null;
    $("ptcg-arena").hidden=true;$("ptcg-deck-select").hidden=false;
    $("ptcg-deck-select").scrollIntoView({behavior:"smooth",block:"start"});
  });
  const userName=$("header-player-name");
  if(userName&&typeof MutationObserver!=="undefined"){
    new MutationObserver(()=>{if(game)$("ptcg-player-title").textContent=nameOf("player");})
      .observe(userName,{childList:true,subtree:true,characterData:true});
  }
})();