import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const cards=[['Spark Fox','✦',3,5],['Moss Guardian','❀',2,9],['Storm Owl','⚡',4,4],['Crystal Crab','◆',2,8],['Blaze Dragon','♨',5,6],['Moon Sprite','☾',2,6]];
let matchId=null,userId=null,match=null,chosen=0,busy=false;
const status=$('online-status'),button=$('online-find'),board=$('online-board'),play=$('online-play'),end=$('online-end'),picker=$('online-card');
for(let i=0;i<cards.length;i++){const option=document.createElement('option');option.value=i;option.textContent=cards[i][0]+' ⚔'+cards[i][2]+' ♥'+cards[i][3];picker.append(option)}
const say=s=>status.textContent=s;
function render(){
 if(!match)return;
 const host=match.host_id===userId,own=host?match.host_lanes:match.guest_lanes,enemy=host?match.guest_lanes:match.host_lanes,turn=match.turn_id===userId;
 const ownHp=host?match.host_hp:match.guest_hp,enemyHp=host?match.guest_hp:match.host_hp;
 board.replaceChildren();
 for(const [label,lanes,hp] of [['Opponent',enemy,enemyHp],['Your cards',own,ownHp]]){
  const section=document.createElement('section');section.className='panel';
  const h=document.createElement('h3');h.textContent=label+' ♥ '+hp;section.append(h);
  const row=document.createElement('div');row.className='clash-lanes';
  lanes.forEach((c,i)=>{const slot=document.createElement('div');slot.className='clash-lane';const title=document.createElement('small');title.textContent='Lane '+(i+1);slot.append(title);
   const tile=document.createElement('div');tile.className='tcg-card';if(c){const art=document.createElement('div');art.className='tcg-card-art';art.textContent=cards[c.card]?.[1]||'★';const name=document.createElement('strong');name.textContent=cards[c.card]?.[0]||'Card';const stats=document.createElement('span');stats.textContent='⚔ '+c.attack+' ♥ '+c.hp;tile.append(art,name,stats)}else tile.textContent='Empty';
   slot.append(tile);if(label==='Your cards'){const choose=document.createElement('button');choose.type='button';choose.textContent='Play / Combine';choose.disabled=!turn||busy;choose.onclick=()=>playCard(i);slot.append(choose)}row.append(slot)});
  section.append(row);board.append(section)
 }
 play.hidden=match.status!=='playing';end.disabled=!turn||busy;
 if(match.status==='finished')say(match.winner_id===userId?'You won!':'Opponent won. Start a new match to play again.');
 else say(turn?'Your turn — choose a card and lane, then end your turn.':'Waiting for opponent’s turn…');
}
async function load(){
 if(!matchId)return;
 const {data,error}=await db.from('clash_matches').select('*').eq('id',matchId).maybeSingle();
 if(error){say(error.message);return}if(!data)return;
 match=data;
 if(data.status==='waiting'){say('Looking for another player… Keep this page open.');board.replaceChildren();play.hidden=true}
 else render();
}
async function action(fn,args){if(busy)return;busy=true;try{const {error}=await db.rpc(fn,args);if(error)throw error;await load()}catch(e){say(e.message||'Action failed')}finally{busy=false;renderIfReady()}}
function renderIfReady(){if(match?.status==='playing')render()}
async function playCard(lane){await action('clash_play_card',{p_match:matchId,p_lane:lane,p_card:Number(picker.value)})}
end.onclick=()=>action('clash_end_turn',{p_match:matchId});
button.onclick=async()=>{button.disabled=true;say('Finding an opponent…');try{const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)throw Error('Sign in to play online.');userId=user.id;const {data,error}=await db.rpc('clash_find_match');if(error)throw error;matchId=data;button.textContent='Matchmaking active';await load()}catch(e){say(e.message||'Could not join matchmaking');button.disabled=false}};
setInterval(()=>{if(matchId&&!document.hidden)load()},2500);
