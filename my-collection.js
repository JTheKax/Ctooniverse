import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.getElementById('collection-grid'),message=document.getElementById('collection-message'),summary=document.getElementById('collection-summary');
const unique=document.getElementById('collection-unique'),total=document.getElementById('collection-total');
let sequence=0;
const say=(value)=>{message.textContent=value;};
function empty(text,linkText,link){
 grid.replaceChildren();const box=document.createElement('div');box.className='collection-empty';
 const p=document.createElement('p');p.textContent=text;box.append(p);
 if(link){const a=document.createElement('a');a.className='button primary';a.href=link;a.textContent=linkText;box.append(a)}
 grid.append(box);
}
function render(item,quantity){
 const card=document.createElement('article');card.className='ctoon-shop-card collection-card';
 const art=document.createElement('div');art.className='ctoon-shop-art';
 const badge=document.createElement('span');badge.className='ctoon-shop-owned is-owned';badge.textContent='Owned ×'+quantity;art.append(badge);
 const img=document.createElement('img');img.loading='lazy';img.alt=item.name+' artwork';img.src=item.image_path||'ctooniverse-logo.png';img.addEventListener('error',()=>{img.src='ctooniverse-logo.png'},{once:true});art.append(img);
 const details=document.createElement('div');details.className='ctoon-shop-details';
 const name=document.createElement('div');name.className='ctoon-shop-name';name.textContent=item.name;
 const rarity=document.createElement('span');rarity.className='ctoon-shop-rarity';rarity.textContent=(item.rarity||'Common').slice(0,1).toUpperCase();rarity.title=item.rarity||'Common';name.append(' ',rarity);
 const series=document.createElement('p');series.className='collection-series';series.textContent=item.series||'CTooniverse';
 const count=document.createElement('p');count.className='collection-quantity';count.textContent='Copies owned: '+quantity;
 details.append(name,series,count);card.append(art,details);return card;
}
async function load(){
 const current=++sequence;grid.replaceChildren();summary.hidden=true;say('Loading your collection…');
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(current!==sequence)return;
  if(authError||!user){say('Sign in to view your collection.');empty('Your personal collection is available after you sign in.','Sign In','login.html');return}
  const {data:owned,error:ownedError}=await db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',user.id).gt('quantity',0);
  if(ownedError)throw ownedError;
  if(current!==sequence)return;
  if(!owned?.length){say('No CToons collected yet.');empty('Your collection is empty. Visit the Shop to collect your first CToon!','Browse CToons','shop.html#ctoon-store');return}
  const ids=[...new Set(owned.map(x=>x.ctoon_id))];
  const {data:catalog,error:catalogError}=await db.from('ctoon_catalog').select('id,name,rarity,image_path,series').in('id',ids);
  if(catalogError)throw catalogError;
  if(current!==sequence)return;
  const byId=new Map((catalog||[]).map(item=>[item.id,item]));
  let copies=0,shown=0;
  for(const row of owned){
   const item=byId.get(row.ctoon_id);if(!item)continue;
   const count=Number(row.quantity)||0;copies+=count;shown++;grid.append(render(item,count));
  }
  unique.textContent=shown.toLocaleString();total.textContent=copies.toLocaleString();summary.hidden=false;
  say(shown?'Showing '+shown+' owned CToon'+(shown===1?'':'s')+'.':'No available CToon details found.');
 }catch(e){say('Unable to load collection: '+(e?.message||'Unknown error'));empty('Please refresh to try again.')}
}
db.auth.onAuthStateChange(()=>setTimeout(load,0));
window.addEventListener('pageshow',load);
window.addEventListener('ctoon-profile-updated',load);
load();
