import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.getElementById('sets-grid'),status=document.getElementById('sets-status');
const categories=['Cartoon & Anime','Video Games'];
async function load(){
 try{
  const [setsResult,catalogResult,authResult]=await Promise.all([
   db.from('ctoon_series').select('name,category,slug').order('name'),
   db.from('ctoon_catalog').select('id,name,series,parent_series'),
   db.auth.getUser()
  ]);
  if(setsResult.error)throw setsResult.error;
  if(catalogResult.error)throw catalogResult.error;
  const user=authResult.data?.user;let owned=new Set();
  if(user){const r=await db.from('player_ctoons').select('ctoon_id').eq('user_id',user.id).gt('quantity',0);if(!r.error)owned=new Set((r.data||[]).map(x=>x.ctoon_id))}
  const rows=setsResult.data||[],catalog=catalogResult.data||[];
  grid.replaceChildren();
  for(const category of categories){
   const section=document.createElement('section');section.className='shop-department';section.style.textAlign='left';
   const title=document.createElement('h2');title.textContent=category;section.append(title);
   for(const set of rows.filter(x=>x.category===category).sort((a,b)=>a.name.localeCompare(b.name))){
    const matches=catalog.filter(x=>x.series?.toLowerCase()===set.name.toLowerCase());
    const count=matches.filter(x=>owned.has(x.id)).length;
    const row=document.createElement('div');row.style.marginBottom='1rem';
    const link=document.createElement('a');link.href='ctoon-set.html?category='+encodeURIComponent(category==='Cartoon & Anime'?'Cartoons':'Video Games')+'&series='+encodeURIComponent(set.name);
    link.textContent=set.name+' — '+matches.length+' CToons';link.style.fontWeight='bold';
    const detail=document.createElement('p');detail.textContent=matches.length?(user?count+' / '+matches.length+' owned':'Sign in to track collection'):'Coming Soon';
    const browse=document.createElement('a');browse.href=link.href;browse.className='button secondary';browse.textContent='View Set & Checklist';
    row.append(link,detail);
    if(matches.length){const bar=document.createElement('progress');bar.max=matches.length;bar.value=count;bar.style.width='100%';bar.setAttribute('aria-label',set.name+' completion');row.append(bar)}
    row.append(browse);section.append(row);
   }
   grid.append(section);
  }
  status.textContent=rows.length+' CToon sets · '+catalog.length+' collectible CToons.';
 }catch(e){status.textContent='Unable to load sets: '+e.message}
}
db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
