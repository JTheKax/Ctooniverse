import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.getElementById('collection-grid'),message=document.getElementById('collection-message'),summary=document.getElementById('collection-summary');
const unique=document.getElementById('collection-unique'),total=document.getElementById('collection-total');
let sequence=0;
const duplicateSection=document.getElementById('collection-duplicates'),duplicateList=document.getElementById('collection-duplicates-list'),duplicateSummary=document.getElementById('collection-duplicates-summary');
function renderDuplicates(items){const duplicates=items.filter(x=>x.quantity>1);duplicateList.replaceChildren();const extra=duplicates.reduce((n,x)=>n+x.quantity-1,0);duplicateSummary.textContent=extra+' extra copies across '+duplicates.length+' CToons. Duplicates are preserved for future trading.';for(const row of duplicates){const p=document.createElement('p');p.textContent=row.item.name+' — '+row.quantity+' owned ('+(row.quantity-1)+' extra)';duplicateList.append(p)}duplicateSection.hidden=false;}
const progress=document.getElementById('collection-progress'),progressList=document.getElementById('collection-progress-list'),progressTotal=document.getElementById('collection-progress-total');
function renderProgress(catalog,owned){
 progressList.replaceChildren();
 const sets=new Map();
 for(const item of catalog){
  const category=item.parent_series||'Misc',name=item.series||'Uncategorized',key=category+' / '+name;
  if(!sets.has(key))sets.set(key,{category,name,total:0,owned:0});
  const group=sets.get(key);group.total++;if((owned.get(item.id)||0)>0)group.owned++;
 }
 const totalOwned=catalog.filter(item=>(owned.get(item.id)||0)>0).length;
 const percent=catalog.length?Math.round(totalOwned/catalog.length*100):0;
 progressTotal.textContent=totalOwned+' / '+catalog.length+' unique CToons collected ('+percent+'% complete)';
 for(const group of [...sets.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name))){
  const box=document.createElement('div');box.className='ctoon-count-group';
  const label=document.createElement('p');const pct=group.total?Math.round(group.owned/group.total*100):0;
  label.textContent=group.category+' / '+group.name+' — '+group.owned+'/'+group.total+' ('+pct+'%)';
  const bar=document.createElement('progress');bar.max=group.total;bar.value=group.owned;bar.style.cssText='width:100%;height:14px;accent-color:#9e70ff';bar.setAttribute('aria-label',group.name+' collection completion');
  box.append(label,bar);progressList.append(box);
 }
 progress.hidden=false;
}

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
const tools=document.getElementById('collection-tools'),search=document.getElementById('collection-search'),seriesFilter=document.getElementById('collection-series-filter'),rarityFilter=document.getElementById('collection-rarity-filter'),sort=document.getElementById('collection-sort');
let rows=[];
const rarityOrder=['Common','Uncommon','Rare','Epic','Legendary'];
const preview=document.createElement('dialog');preview.className='ctoon-editor-dialog ctoon-preview-dialog';document.body.append(preview);
function inspect(item,quantity){
 preview.replaceChildren();
 const heading=document.createElement('h2');heading.textContent=item.name;
 const img=document.createElement('img');img.className='ctoon-preview-image';img.src=item.image_path||'ctooniverse-logo.png';img.alt=item.name+' artwork';
 const detail=document.createElement('p');detail.textContent=(item.series||'CTooniverse')+' · '+(item.rarity||'Common')+' · Owned ×'+quantity;
 const close=document.createElement('button');close.className='button secondary';close.textContent='Close';close.onclick=()=>preview.close();
 preview.append(heading,img,detail,close);preview.showModal();
}
function showRows(){
 const query=search.value.trim().toLocaleLowerCase(),series=seriesFilter.value,rarity=rarityFilter.value;
 const visible=rows.filter(({item})=>(!query||item.name.toLocaleLowerCase().includes(query))&&(!series||item.series===series)&&(!rarity||item.rarity===rarity));
 visible.sort((a,b)=>sort.value==='quantity'?b.quantity-a.quantity||a.item.name.localeCompare(b.item.name):sort.value==='rarity'?(rarityOrder.indexOf(a.item.rarity)-rarityOrder.indexOf(b.item.rarity))||a.item.name.localeCompare(b.item.name):sort.value==='name-desc'?b.item.name.localeCompare(a.item.name):a.item.name.localeCompare(b.item.name));
 grid.replaceChildren();
 for(const {item,quantity} of visible){
  const card=render(item,quantity);card.classList.add('ctoon-inspectable');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','View '+item.name+' details');
  card.addEventListener('click',()=>inspect(item,quantity));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(item,quantity)}});
  grid.append(card);
 }
 say('Showing '+visible.length+' of '+rows.length+' owned CToons.');
 if(!visible.length)empty('No CToons match your filters.');
}
for(const control of [search,seriesFilter,rarityFilter,sort])control.addEventListener('input',showRows);
async function load(){
 const current=++sequence;grid.replaceChildren();summary.hidden=true;tools.hidden=true;progress.hidden=true;duplicateSection.hidden=true;rows=[];say('Loading your collection…');
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(current!==sequence)return;
  if(authError||!user){say('Sign in to view your collection.');empty('Your personal collection is available after you sign in.','Sign In','login.html');return}
  const {data:owned,error:ownedError}=await db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',user.id).gt('quantity',0);
  if(ownedError)throw ownedError;
  if(current!==sequence)return;
  const {data:catalog,error:catalogError}=await db.from('ctoon_catalog').select('id,name,rarity,image_path,series,parent_series').order('name');
  if(catalogError)throw catalogError;
  if(current!==sequence)return;
  const ownedMap=new Map((owned||[]).map(x=>[x.ctoon_id,Number(x.quantity)||0]));
  renderProgress(catalog||[],ownedMap);
  if(!owned?.length){say('No CToons collected yet. Your set progress is shown above.');empty('Your collection is empty. Visit the Shop to collect your first CToon!','Browse CToons','shop.html#ctoon-store');return}
  const byId=new Map((catalog||[]).map(item=>[item.id,item]));
  rows=owned.map(row=>({item:byId.get(row.ctoon_id),quantity:Number(row.quantity)||0})).filter(row=>row.item&&row.quantity>0);
  const copies=rows.reduce((n,row)=>n+row.quantity,0);
  unique.textContent=rows.length.toLocaleString();total.textContent=copies.toLocaleString();summary.hidden=false;
  for(const [control,values] of [[seriesFilter,[...new Set(rows.map(x=>x.item.series).filter(Boolean))]],[rarityFilter,[...new Set(rows.map(x=>x.item.rarity).filter(Boolean))]]]){
   control.replaceChildren(new Option(control===seriesFilter?'All series':'All rarities',''));
   for(const value of values.sort((a,b)=>a.localeCompare(b)))control.add(new Option(value,value));
  }
  renderDuplicates(rows);tools.hidden=false;showRows();
 }catch(e){say('Unable to load collection: '+(e?.message||'Unknown error'));empty('Please refresh to try again.')}
}
db.auth.onAuthStateChange(()=>setTimeout(load,0));
window.addEventListener('pageshow',load);
window.addEventListener('ctoon-profile-updated',load);
load();
