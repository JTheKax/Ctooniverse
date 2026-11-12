/* CTooniverse Prize Wheel — preview-only arcade experience.
 * The authenticated Supabase RPC atomically enforces the 3-spin UTC-day limit.
 * The displayed prize is a demonstration: no coins or CToons are credited. */
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const prizes=[
 {name:'500 COINS',short:'500 COINS',icon:'🪙'},
 {name:'CTOON PACK',short:'CTOON PACK',icon:'🎁'},
 {name:'RANDOM CTOON',short:'RANDOM',icon:'❔'},
 {name:'250 COINS',short:'250 COINS',icon:'🪙'},
 {name:'MYSTERY PRIZE',short:'MYSTERY',icon:'🌟'},
 {name:'SPIN TICKET',short:'TICKET',icon:'🎟️'},
 {name:'100 COINS',short:'100 COINS',icon:'🪙'},
 {name:'BONUS PRIZE',short:'BONUS',icon:'🎁'}
];
const $=id=>document.getElementById(id);
const wheel=$('prize-wheel-disc'),labels=$('prize-wheel-labels'),button=$('prize-wheel-spin');
const result=$('prize-wheel-result'),counter=$('prize-wheel-counter'),number=$('wheel-spins-number');
const lights=[...document.querySelectorAll('.wheel-spin-light')],machine=$('wheel-machine');
const recent=$('wheel-recent'),sound=$('prize-wheel-sound'),accountLink=$('wheel-account-link');
const MAX_SPINS=3;
let rotation=0,busy=false,remaining=0,signedIn=false,verified=false,requestId=0,soundOn=false,audioContext=null,checkError=null;
const formatCount=n=>Math.max(0,Math.min(MAX_SPINS,Number(n)||0));
const setMessage=(message,tone='info')=>{result.textContent=message;result.dataset.tone=tone;};
const setButton=()=>{
 button.disabled=busy||!verified||!signedIn||remaining<=0;
 button.textContent=busy?'🎡 SPINNING…':!verified?'CHECKING SPINS…':!signedIn?'SIGN IN TO SPIN':remaining===0?'NO SPINS LEFT':'🎡 SPIN THE WHEEL';
};
function displayCounter(){
 number.textContent=String(verified&&signedIn?remaining:0);
 for(let i=0;i<lights.length;i++)lights[i].classList.toggle('is-available',verified&&signedIn&&i<remaining);
 counter.textContent=checkError||(!verified?'Checking your daily spins…':!signedIn?
  'Sign in to claim your 3 daily preview spins.':
  remaining+' of '+MAX_SPINS+' spins available today · Reset: 00:00 UTC.');
 accountLink.hidden=!!signedIn;
 setButton();
}
function populateWheel(){
 prizes.forEach((prize,i)=>{
  const angle=(i*45+22.5)*Math.PI/180;
  const label=document.createElement('span');label.className='prize-wheel-label';
  label.style.left=(50+33*Math.sin(angle))+'%';
  label.style.top=(50-33*Math.cos(angle))+'%';
  const icon=document.createElement('span');icon.className='wheel-icon';icon.textContent=prize.icon;
  const name=document.createElement('span');name.textContent=prize.short;
  label.append(icon,name);labels.append(label);
 });
 const options=$('wheel-prize-list');
 if(options)prizes.forEach(prize=>{
  const item=document.createElement('li');
  const icon=document.createElement('span');icon.className='prize-emoji';icon.textContent=prize.icon;
  const name=document.createElement('span');name.textContent=prize.name;
  item.append(icon,name);options.append(item);
 });
}
function tone(frequency,duration=.12,offset=0){
 if(!soundOn)return;
 try{
  const Ctor=window.AudioContext||window.webkitAudioContext;
  if(!Ctor)return;
  audioContext??=new Ctor();
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
  const start=audioContext.currentTime+offset;
  oscillator.type='triangle';oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(.045,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(gain);gain.connect(audioContext.destination);
  oscillator.start(start);oscillator.stop(start+duration+.01);
 }catch(error){console.warn('Wheel audio not available',error);}
}
sound.addEventListener('click',()=>{
 soundOn=!soundOn;sound.setAttribute('aria-pressed',String(soundOn));
 sound.textContent=soundOn?'🔊 SOUND ON':'🔇 SOUND OFF';
 if(soundOn)tone(660);
});
function showRecent(prize){
 if(recent.children.length===1&&recent.firstElementChild?.dataset.empty)recent.replaceChildren();
 const li=document.createElement('li');
 li.textContent=prize.icon+' '+prize.name+' · Preview only';
 recent.prepend(li);
 while(recent.children.length>4)recent.lastElementChild.remove();
}
async function check(){
 if(busy)return;
 const id=++requestId;
 verified=false;signedIn=false;remaining=0;checkError=null;displayCounter();
 try{
  const auth=await db.auth.getUser();
  if(id!==requestId||busy)return;
  if(auth.error)throw auth.error;
  const user=auth.data?.user;
  if(!user){verified=true;setMessage('Sign in to use your three daily preview spins. No rewards are credited.');return;}
  signedIn=true;
  const today=new Date().toISOString().slice(0,10);
  const {data,error}=await db.from('prize_wheel_daily_spins').select('used').eq('user_id',user.id).eq('spin_date',today).maybeSingle();
  if(id!==requestId||busy)return;
  if(error)throw error;
  remaining=formatCount(MAX_SPINS-Number(data?.used||0));
  verified=true;
  if(!remaining&&result.dataset.tone!=='success')setMessage('All three preview spins have been used today. They reset at midnight UTC.');
 }catch(error){
  if(id!==requestId)return;
  remaining=0;signedIn=false;verified=false;
  checkError='Could not verify daily spins: '+(error?.message||'Connection error');
  setMessage('Unable to verify spins. Reload the page and try again.','error');
 }finally{if(id===requestId&&!busy)displayCounter();}
}
function randomIndex(){
 const bits=new Uint32Array(1);
 if(window.crypto?.getRandomValues){window.crypto.getRandomValues(bits);return bits[0]%prizes.length;}
 return Math.floor(Math.random()*prizes.length);
}
async function spin(){
 if(busy||!verified||!signedIn||remaining<=0)return;
 busy=true;button.disabled=true;setButton();
 setMessage('Confirming your daily spin…');machine.classList.add('is-spinning');
 try{
  // This RPC increments the signed-in user's spin count only when fewer than 3 were used.
  const {data,error}=await db.rpc('use_prize_wheel_spin');
  if(error)throw error;
  if(!Number.isInteger(Number(data))||Number(data)<0||Number(data)>=MAX_SPINS)
   throw new Error('Unexpected remaining spin count');
  remaining=formatCount(data);
  displayCounter();
  const index=randomIndex(),prize=prizes[index];
  const finalAngle=(360-(index*45+22.5))%360;
  const currentAngle=((rotation%360)+360)%360;
  rotation+=360*5+((finalAngle-currentAngle+360)%360);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=reduced?150:5200;
  wheel.style.transitionDuration=duration+'ms';
  setMessage('The wheel is spinning… 🎡');tone(523,.2);tone(659,.2,.24);
  // Render the starting position before animating to the new one.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  wheel.style.transform='rotate('+rotation+'deg)';
  await new Promise(resolve=>setTimeout(resolve,duration+130));
  setMessage('🎉 '+prize.name+'! This is a preview result only — no coins, CToons, tickets or other rewards were added.','success');
  showRecent(prize);
  tone(784,.17);tone(988,.18,.18);tone(1175,.27,.36);
 }catch(error){
  console.warn('Prize Wheel spin failed',error);
  setMessage('Spin unavailable: '+(error?.message||'Connection error')+'. Your daily balance will be checked again.','error');
 }finally{
  busy=false;machine.classList.remove('is-spinning');
  await check();
  setButton();
 }
}
button.addEventListener('click',spin);
db.auth.onAuthStateChange(()=>{setTimeout(check,0);});
window.addEventListener('pageshow',()=>check());
populateWheel();displayCounter();check();
