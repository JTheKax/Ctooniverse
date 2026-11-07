(()=>{'use strict';
const $=id=>document.getElementById(id);
const templates=[
 {name:'Spark Fox',attack:3,hp:5,icon:'✦',trait:'swift'},
 {name:'Moss Guardian',attack:2,hp:9,icon:'❀',trait:'shield'},
 {name:'Storm Owl',attack:4,hp:4,icon:'⚡',trait:'swift'},
 {name:'Crystal Crab',attack:2,hp:8,icon:'◆',trait:'shield'},
 {name:'Blaze Dragon',attack:5,hp:6,icon:'♨',trait:'power'},
 {name:'Moon Sprite',attack:2,hp:6,icon:'☾',trait:'heal'}
];
const names={rex:'Rookie Rex',vex:'Violet Vex',phantom:'Neon Phantom'};
let players=[],turn=0,mode='rex',ended=false,history=[],selected=null;
const label=i=>i===0?'Player 1':mode==='local'?'Player 2':names[mode];
const log=t=>{history.unshift(t);history=history.slice(0,50)};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const draw=p=>{if(p.deck.length&&p.hand.length<8)p.hand.push(p.deck.pop())};
function newCard(t){return {...t,maxHp:t.hp,level:1,shield:0}};
function card(data,onClick,disabled=false){
 const b=document.createElement('button');b.type='button';b.className='tcg-card';b.disabled=disabled;
 if(onClick)b.addEventListener('click',onClick);else b.disabled=true;
 const art=document.createElement('div');art.className='tcg-card-art';art.textContent=data.icon;
 const name=document.createElement('strong');name.textContent=data.name+(data.level>1?' ★'+data.level:'');
 const stats=document.createElement('span');stats.textContent='⚔ '+data.attack+'   ♥ '+data.hp+(data.shield?'   ◈ '+data.shield:'');
 const ability=document.createElement('small');ability.textContent=data.trait==='heal'?'Heal +1':data.trait==='shield'?'Shield +1':data.trait==='swift'?'Quick strike':'Power';
 b.append(art,name,stats,ability);return b;
}
function render(){
 for(let i=0;i<2;i++){
  const p=players[i];$('p'+i+'title').textContent=label(i)+(turn===i&&!ended?' • Playing':'');
  $('p'+i+'stats').textContent='♥ '+p.life+' HP  |  Deck: '+p.deck.length+'  |  Hand: '+p.hand.length;
  const field=$('p'+i+'field');field.replaceChildren();field.classList.add('clash-lanes');
  for(let lane=0;lane<5;lane++){
   const slot=document.createElement('div');slot.className='clash-lane';
   const caption=document.createElement('small');caption.textContent='Lane '+(lane+1);slot.append(caption);
   const c=p.field[lane];
   if(c)slot.append(card(c,i===turn&&!ended&&(i===0||mode==='local')?()=>place(lane):null));
   else{const blank=document.createElement('button');blank.type='button';blank.className='clash-empty';blank.textContent='＋';blank.disabled=i!==turn||ended||(i===1&&mode!=='local');blank.onclick=()=>place(lane);slot.append(blank)}
   field.append(slot);
  }
  const hand=$('p'+i+'hand');hand.replaceChildren();
  if(i===turn&&!ended&&(i===0||mode==='local')){
   p.hand.forEach((c,j)=>{const b=card(c,()=>{selected=j;render()},false);if(selected===j)b.classList.add('selected');hand.append(b)});
  }else hand.textContent=mode==='local'&&i!==turn?'Hand hidden until this player’s turn':p.hand.length+' cards hidden';
 }
 $('clash-status').textContent=ended?'Match finished. Start a new match.':label(turn)+' — select a card, then tap an empty lane to play it or an occupied lane to combine. End Turn to attack.';
 $('end-turn').disabled=ended||(turn===1&&mode!=='local');
 $('clash-log').replaceChildren(...history.map(x=>{const li=document.createElement('li');li.textContent=x;return li}));
}
function place(lane){
 if(ended||(turn===1&&mode!=='local')||selected===null)return;
 const p=players[turn],c=p.hand[selected];if(!c)return;
 if(p.field[lane]){
  const old=p.field[lane];old.attack+=Math.max(1,Math.ceil(c.attack/2));old.maxHp+=Math.max(2,Math.ceil(c.hp/2));old.hp+=Math.max(2,Math.ceil(c.hp/2));old.level++;old.name=old.level===2?old.name+' Fusion':old.name;old.trait=c.trait;log(label(turn)+' combined '+c.name+' in lane '+(lane+1));
 }else{p.field[lane]=newCard(c);log(label(turn)+' played '+c.name+' in lane '+(lane+1))}
 p.hand.splice(selected,1);selected=null;render();
}
function damage(target,amount){let remaining=amount;if(target.shield){const absorbed=Math.min(target.shield,remaining);target.shield-=absorbed;remaining-=absorbed}target.hp-=remaining}
function combat(){
 const attacker=players[turn],defender=players[1-turn];
 for(let i=0;i<5;i++){
  const c=attacker.field[i];if(!c)continue;
  if(c.trait==='heal')attacker.life=Math.min(30,attacker.life+1);
  if(c.trait==='shield')c.shield=Math.min(3,c.shield+1);
  const d=defender.field[i];
  if(d){damage(d,c.attack);log(c.name+' hit '+d.name+' for '+c.attack);if(d.hp<=0){defender.field[i]=null;log(d.name+' was defeated')}}
  else{defender.life-=c.attack;log(c.name+' dealt '+c.attack+' direct damage')}
  if(defender.life<=0){ended=true;log(label(turn)+' wins!');break}
 }
}
function endTurn(){
 if(ended)return;
 combat();if(ended){render();return}
 turn=1-turn;selected=null;draw(players[turn]);log(label(turn)+' starts their turn');render();
 if(turn===1&&mode!=='local')setTimeout(npcTurn,350);
}
function npcTurn(){
 if(ended||turn!==1||mode==='local')return;
 const p=players[1];
 const count=mode==='phantom'?2:1;
 for(let k=0;k<count&&p.hand.length;k++){
  let lanes=p.field.map((x,i)=>x?null:i).filter(x=>x!==null);
  if(!lanes.length)lanes=p.field.map((_,i)=>i);
  const lane=mode==='rex'?lanes[0]:lanes[Math.floor(Math.random()*lanes.length)];
  let index=0;
  if(mode==='phantom')index=p.hand.reduce((best,c,i)=>c.attack>p.hand[best].attack?i:best,0);
  const c=p.hand.splice(index,1)[0];
  if(p.field[lane]){const old=p.field[lane];old.attack+=Math.ceil(c.attack/2);old.hp+=Math.ceil(c.hp/2);old.maxHp+=Math.ceil(c.hp/2);old.level++;log(names[mode]+' combined cards')}
  else{p.field[lane]=newCard(c);log(names[mode]+' played '+c.name)}
 }
 combat();if(!ended){turn=0;draw(players[0]);log('Your turn begins')}render();
}
function start(){
 mode=$('clash-opponent').value;players=[0,1].map(()=>{const deck=shuffle(Array.from({length:24},(_,i)=>newCard(templates[i%templates.length])));const p={life:30,deck,hand:[],field:Array(5).fill(null)};for(let i=0;i<4;i++)draw(p);return p});
 turn=0;ended=false;selected=null;history=[];log('New five-lane Clash match started');render();
}
$('new-game').onclick=start;$('clash-opponent').onchange=start;$('end-turn').onclick=endTurn;
start();
})();