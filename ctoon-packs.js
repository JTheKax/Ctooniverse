import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.getElementById('pack-grid'),status=document.getElementById('pack-status');
async function load(){
 grid.replaceChildren();status.textContent='Loading packs…';
 try{
  const {data:{user}}=await db.auth.getUser();
  if(!user){status.textContent='Sign in to browse and open CToon packs.';return}
  const {data,error}=await db.from('ctoon_packs').select('id,name,description,price_coins,draw_count,is_active').eq('is_active',true).order('name');
  if(error)throw error;
  if(!data?.length){status.textContent='CToon packs are Coming Soon. The Owner has not released any packs yet.';return}
  status.textContent=data.length+' available CToon packs.';
  for(const pack of data){
   const card=document.createElement('article');card.className='shop-department';
   const title=document.createElement('h3');title.textContent='🎁 '+pack.name;
   const description=document.createElement('p');description.textContent=pack.description||'Mystery CToon rewards';
   const details=document.createElement('p');details.textContent=pack.draw_count+' CToon'+(pack.draw_count===1?'':'s')+' · '+pack.price_coins.toLocaleString()+' Cartoon Coins';
   const button=document.createElement('button');button.className='button primary';button.type='button';button.textContent='Open Pack';
   const result=document.createElement('p');result.setAttribute('role','status');
   button.addEventListener('click',async()=>{
    if(!confirm('Spend '+pack.price_coins+' Cartoon Coins to open '+pack.name+'?'))return;
    button.disabled=true;result.textContent='Opening pack…';
    try{
     const {data:opening,error}=await db.rpc('open_ctoon_pack',{p_pack_id:pack.id});
     if(error)throw error;
     const ids=opening.ctoon_ids||[];
     const {data:items,error:catalogError}=await db.from('ctoon_catalog').select('id,name').in('id',[...new Set(ids)]);
     const names=new Map((items||[]).map(item=>[item.id,item.name]));
     result.textContent='You received: '+ids.map(id=>names.get(id)||'CToon').join(', ')+'. Remaining balance: '+Number(opening.balance).toLocaleString()+' coins.';
     if(catalogError)result.textContent='Pack opened successfully! Check My Collection for your rewards.';
     window.dispatchEvent(new Event('ctoon-profile-updated'));
    }catch(error){result.textContent='Could not open pack: '+(error?.message||'Unknown error')}
    finally{button.disabled=false}
   });
   card.append(title,description,details,button,result);grid.append(card);
  }
 }catch(error){status.textContent='Unable to load packs: '+(error?.message||'Unknown error')}
}
db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
