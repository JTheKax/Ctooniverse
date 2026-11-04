import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.getElementById('sets-grid'),status=document.getElementById('sets-status');
const categories=['Cartoons','Anime','Movies','Video Games','Misc'];
async function load(){
 try{
  const {data:catalog,error}=await db.from('ctoon_catalog').select('id,name,series,parent_series').order('name');
  if(error)throw error;
  const {data:{user}}=await db.auth.getUser();let owned=new Set();
  if(user){const r=await db.from('player_ctoons').select('ctoon_id').eq('user_id',user.id).gt('quantity',0);if(!r.error)owned=new Set((r.data||[]).map(x=>x.ctoon_id))}
  grid.replaceChildren();
  const groups=new Map();
  for(const item of catalog||[]){const category=item.parent_series||'Misc',series=item.series||'Uncategorized',key=category+' / '+series;if(!groups.has(key))groups.set(key,{category,series,items:[]});groups.get(key).items.push(item)}
  const ordered=[...categories,...new Set([...groups.values()].map(x=>x.category).filter(x=>!categories.includes(x)))];
  for(const category of ordered){
   const section=document.createElement('section');section.className='shop-department';section.style.textAlign='left';
   const title=document.createElement('h2');title.textContent=category;section.append(title);
   const matches=[...groups.values()].filter(g=>g.category===category).sort((a,b)=>a.series.localeCompare(b.series));
   if(!matches.length){const p=document.createElement('p');p.textContent='CToon sets Coming Soon';section.append(p)}
   for(const group of matches){
    const collected=group.items.filter(x=>owned.has(x.id)).length,pct=Math.round(collected/group.items.length*100);
    const row=document.createElement('div');row.style.marginBottom='1rem';
    const link=document.createElement('a');link.href='ctoons.html?category='+encodeURIComponent(category)+'&series='+encodeURIComponent(group.series)+'#ctoon-catalog-filters';link.textContent=group.series+' — '+group.items.length+' CToons';link.style.fontWeight='bold';
    const count=document.createElement('p');count.textContent=user?collected+' / '+group.items.length+' owned ('+pct+'%)':'Sign in to track collection';
    const bar=document.createElement('progress');bar.max=group.items.length;bar.value=collected;bar.style.width='100%';bar.setAttribute('aria-label',group.series+' completion');
    row.append(link,count,bar);section.append(row);
   }
   grid.append(section);
  }
  status.textContent=(catalog||[]).length+' CToons across '+groups.size+' sets.';
 }catch(e){status.textContent='Unable to load sets: '+e.message}
}
db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
