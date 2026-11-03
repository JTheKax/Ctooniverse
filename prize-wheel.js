import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const prizes=['25 COINS','TRY AGAIN','50 COINS','MYSTERY','100 COINS','BONUS SPIN','10 COINS','RARE CTOON'];
const wheel=document.getElementById('prize-wheel-disc'),labels=document.getElementById('prize-wheel-labels'),button=document.getElementById('prize-wheel-spin'),result=document.getElementById('prize-wheel-result'),counter=document.getElementById('prize-wheel-counter');
prizes.forEach((prize,i)=>{const span=document.createElement('span');span.className='prize-wheel-label';const angle=i*45+22.5;span.style.transform='translate(-50%,-50%) rotate('+angle+'deg) translateY(-112px) rotate('+(-angle)+'deg)';span.textContent=prize;labels.append(span)});
let rotation=0,busy=false,remaining=0;
async function check(){
 if(busy)return;button.disabled=true;counter.textContent='Checking daily spins…';
 try{
  const {data:{user}}=await db.auth.getUser();
  if(!user){remaining=0;counter.textContent='Sign in to use your 3 daily spins.';result.textContent='Sign in to spin. Rewards are previews only.';return}
  const today=new Date().toISOString().slice(0,10);
  const {data,error}=await db.from('prize_wheel_daily_spins').select('used').eq('user_id',user.id).eq('spin_date',today).maybeSingle();
  if(error)throw error;
  remaining=Math.max(0,3-Number(data?.used||0));counter.textContent=remaining+' of 3 spins remaining today (resets at midnight UTC).';
  button.disabled=remaining===0;
  if(!remaining)result.textContent='You have used all 3 spins today. Come back tomorrow!';
 }catch(e){counter.textContent='Unable to check spins: '+(e?.message||'Connection error')}
 finally{if(remaining>0&&!busy)button.disabled=false}
}
button.addEventListener('click',async()=>{
 if(busy||remaining<=0)return;busy=true;button.disabled=true;result.textContent='Claiming your spin…';
 try{
  const {data,error}=await db.rpc('use_prize_wheel_spin');if(error)throw error;
  remaining=Number(data);counter.textContent=remaining+' of 3 spins remaining today (resets at midnight UTC).';
  result.textContent='Spinning…';
  const array=new Uint32Array(1);crypto.getRandomValues(array);const index=array[0]%prizes.length,target=(360-(index*45+22.5))%360,current=((rotation%360)+360)%360;
  rotation+=1800+((target-current+360)%360);wheel.style.transform='rotate('+rotation+'deg)';
  setTimeout(()=>{result.textContent='Landed on '+prizes[index]+'! Preview only — no reward has been credited.';busy=false;button.disabled=remaining===0},4600);
 }catch(e){result.textContent='Spin unavailable: '+(e?.message||'Connection error');busy=false;await check()}
});
db.auth.onAuthStateChange(()=>setTimeout(check,0));window.addEventListener('pageshow',check);check();
