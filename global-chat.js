import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljJQTS'.replace('FlJQTS','FljQTS'));
const messages=document.getElementById('global-chat-messages'),form=document.getElementById('global-chat-form'),input=document.getElementById('global-chat-input'),status=document.getElementById('global-chat-status');
let signedIn=false,lastSignature='',loading=false;
async function refresh(){
 if(loading)return;loading=true;
 try{
  const {data:{user}}=await db.auth.getUser();
  signedIn=!!user;input.disabled=!signedIn;form.querySelector('button').disabled=!signedIn;
  if(!signedIn){messages.replaceChildren();lastSignature='';status.textContent='Sign in to read and send global chat messages.';return;}
  const {data,error}=await db.from('global_chat_messages').select('id,player_name,is_owner,message,created_at').order('created_at',{ascending:false}).limit(75);
  if(error){status.textContent='Chat is unavailable right now.';return;}
  const rows=(data||[]).reverse();const signature=rows.map(x=>x.id).join(',');
  if(signature===lastSignature)return;
  const atBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<70;
  lastSignature=signature;messages.replaceChildren();
  for(const row of rows){
   const item=document.createElement('div');item.className='global-chat-message'+(row.is_owner?' is-owner':'');
   const meta=document.createElement('div');meta.className='global-chat-meta';
   const name=document.createElement('strong');name.textContent=(row.is_owner?'♛ ':'')+row.player_name;
   const time=document.createElement('time');time.dateTime=row.created_at;time.textContent=new Date(row.created_at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
   const body=document.createElement('p');body.textContent=row.message;
   meta.append(name,time);item.append(meta,body);messages.append(item);
  }
  if(atBottom)messages.scrollTop=messages.scrollHeight;
  status.textContent=rows.length?'':'No messages yet. Start the conversation!';
 }catch{status.textContent='Could not refresh chat.'}finally{loading=false}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!signedIn)return;
 const message=input.value.trim();if(!message)return;
 const button=form.querySelector('button');button.disabled=true;status.textContent='Sending…';
 try{
  const {error}=await db.rpc('send_global_chat_message',{p_message:message});
  if(error){status.textContent=error.message;return;}
  input.value='';status.textContent='';lastSignature='';await refresh();
 }finally{button.disabled=!signedIn}
});
db.auth.onAuthStateChange(()=>{lastSignature='';setTimeout(refresh,0)});
refresh();setInterval(()=>{if(!document.hidden)refresh()},5000);
