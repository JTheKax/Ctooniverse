import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const panel=document.getElementById('site-operating-controls');
if(panel){
  const buttons=[...panel.querySelectorAll('button[data-site-mode]')];
  const message=document.getElementById('owner-site-status-message');
  const onlineButton=buttons.find(b=>b.dataset.siteMode==='online');
  const maintenanceButton=buttons.find(b=>b.dataset.siteMode==='maintenance');
  let current='unknown',ownerId=null,busy=false;
  function render(mode,text){
    current=mode;
    if(text)message.textContent=text;
    for(const button of buttons){
      button.setAttribute('aria-pressed',String(button.dataset.siteMode===mode));
      button.disabled=busy||!ownerId;
    }
  }
  async function verifyAndRefresh(){
    if(busy)return;
    buttons.forEach(button=>button.disabled=true);
    message.textContent='Verifying owner access and current site status…';
    try{
      const {data:{user},error:authError}=await db.auth.getUser();
      if(authError||!user){ownerId=null;render('unknown','Sign in with your owner account to change website status.');return;}
      const {data:owner,error:ownerError}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
      if(ownerError||!owner){ownerId=null;render('unknown','Owner verification failed. This account cannot change website status.');return;}
      ownerId=user.id;
      const {data:row,error:readError}=await db.from('site_operational_status').select('mode,updated_at').eq('id',1).maybeSingle();
      if(readError||!row)throw readError||new Error('Status record unavailable');
      render(row.mode,row.mode==='online'
        ?'CTooniverse is currently marked Online.'
        :'CTooniverse is currently marked Maintenance. The site remains accessible for administration.');
    }catch(error){
      render('unknown','Unable to check website status: '+(error?.message||'Connection unavailable'));
    }
  }
  async function setMode(mode){
    if(busy||!ownerId||!['online','maintenance'].includes(mode)||mode===current)return;
    if(mode==='maintenance'&&!window.confirm('Mark CTooniverse as under maintenance? Players will see a yellow Maintenance indicator. The website will remain accessible.'))return;
    busy=true;render(current,'Updating website status…');
    try{
      // Recheck identity on every write. Row Level Security independently restricts UPDATE to site_owners.
      const {data:{user},error:authError}=await db.auth.getUser();
      if(authError||!user||user.id!==ownerId)throw new Error('Owner session is no longer verified');
      const {data:owner,error:ownerError}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
      if(ownerError||!owner)throw new Error('Owner access is required');
      const {data,error}=await db.from('site_operational_status')
        .update({mode,updated_at:new Date().toISOString(),updated_by:user.id})
        .eq('id',1).select('mode,updated_at').single();
      if(error)throw error;
      if(data.mode!==mode)throw new Error('The change was not confirmed');
      current=mode;
      message.textContent=mode==='online'?'Online status saved. Players will see the green button.':
        'Maintenance status saved. Players will see the yellow button.';
      window.dispatchEvent(new Event('site-operational-status-updated'));
      try{localStorage.setItem('ctoon-site-operational-status-updated',String(Date.now()));}catch{}
    }catch(error){
      message.textContent='Could not update website status: '+(error?.message||'Connection unavailable');
    }finally{
      busy=false;render(current);
    }
  }
  onlineButton?.addEventListener('click',()=>setMode('online'));
  maintenanceButton?.addEventListener('click',()=>setMode('maintenance'));
  db.auth.onAuthStateChange(()=>setTimeout(verifyAndRefresh,0));
  window.addEventListener('pageshow',verifyAndRefresh);
  verifyAndRefresh();
}
