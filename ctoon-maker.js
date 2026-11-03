import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const el=id=>document.getElementById(id), form=el('ctoon-maker-form'), status=el('ctoon-maker-status'), list=el('ctoon-maker-list'), preview=el('ctoon-maker-preview');
let drafts=[],editing=-1,authorized=false;
const fields=['title','set','series','image','rarity','description'];
function safeImage(v){return /^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.png$|^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.(jpg|jpeg|webp)$/i.test(v)&&!v.includes('..')&&!v.startsWith('/')&&!v.includes('//')}
function read(){return Object.fromEntries(fields.map(k=>[k,el('ctoon-maker-'+k).value.trim()]))}
function render(){list.replaceChildren();preview.replaceChildren();drafts.forEach((d,i)=>{const p=document.createElement('p'),b=document.createElement('button');b.type='button';b.textContent='Edit';b.className='button secondary';b.addEventListener('click',()=>{editing=i;fields.forEach(k=>el('ctoon-maker-'+k).value=d[k]||'');showPreview(d);form.scrollIntoView({block:'center'});});p.append(document.createTextNode((i+1)+'. '+d.title+' ('+d.set+') — '),b);list.append(p)});}
function showPreview(d){preview.replaceChildren();const h=document.createElement('h4');h.textContent=d.title;preview.append(h);if(safeImage(d.image)){const img=document.createElement('img');img.src='public/images/ctoons/'+d.image;img.alt=d.title;img.loading='lazy';img.style.cssText='display:block;max-width:260px;width:100%;height:auto;margin:1rem auto';preview.append(img)}}
async function verify(){const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;const {data,error:e}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();return !e&&!!data}
async function init(){authorized=await verify();if(!authorized){status.textContent='Owner verification required to use this editor.';form.hidden=true;return}form.hidden=false;status.textContent='Drafts stay in this browser until exported. They are not published.';try{const data=JSON.parse(localStorage.getItem('ctoon-maker-drafts-v1')||'[]');if(Array.isArray(data))drafts=data.slice(0,200)}catch{}render()}
function persist(){try{localStorage.setItem('ctoon-maker-drafts-v1',JSON.stringify(drafts))}catch{status.textContent='Local storage is full. Export your drafts now.'}render()}
form.addEventListener('submit',e=>{e.preventDefault();if(!authorized)return;const d=read();if(!safeImage(d.image)){status.textContent='Enter a safe image filename, such as kingdom-hearts-traverse-town.png';return}if(editing<0)drafts.push(d);else drafts[editing]=d;editing=-1;persist();showPreview(d);status.textContent='Draft saved in this browser. Not published.';form.reset()});
el('ctoon-maker-new').addEventListener('click',()=>{editing=-1;form.reset();preview.replaceChildren();status.textContent='New draft ready.'});
el('ctoon-maker-export').addEventListener('click',()=>{if(!authorized)return;const blob=new Blob([JSON.stringify(drafts,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ctoon-drafts.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
el('ctoon-maker-import').addEventListener('change',async e=>{if(!authorized)return;const file=e.target.files[0];if(!file||file.size>1000000){status.textContent='Choose a JSON file smaller than 1 MB.';return}try{const data=JSON.parse(await file.text());if(!Array.isArray(data)||data.length>200||!data.every(d=>d&&fields.every(k=>typeof d[k]==='string'&&d[k].length<=500)&&safeImage(d.image)))throw Error('Invalid draft file');drafts=data;persist();status.textContent='Drafts imported. Not published.'}catch{status.textContent='Could not import drafts. Check the JSON format.'}e.target.value=''});
db.auth.onAuthStateChange(()=>setTimeout(init,0));init();

const existingWebsiteCtoons=[
{title:'Traverse Town Jewelry',set:'Kingdom Hearts',series:'Kingdom Hearts',image:'kingdom-hearts-traverse-town.png',rarity:'Common',description:'Hand-drawn Traverse Town Jewelry floating island. Coming Soon.'}
];
function renderExisting(){
 const holder=el('ctoon-maker-existing');holder.replaceChildren();
 for(const entry of existingWebsiteCtoons){
  const p=document.createElement('p'),btn=document.createElement('button');
  btn.type='button';btn.className='button secondary';btn.textContent='Edit '+entry.title;
  btn.addEventListener('click',()=>{
   if(!authorized){status.textContent='Owner verification required.';return}
   const found=drafts.findIndex(d=>d.image===entry.image);
   const d=found>=0?drafts[found]:{...entry};
   if(found<0){drafts.push(d);persist();editing=drafts.length-1}else editing=found;
   fields.forEach(k=>el('ctoon-maker-'+k).value=d[k]||'');
   showPreview(d);status.textContent='Editing '+d.title+'. Saving updates your draft, not the published page.';
   form.scrollIntoView({block:'center'});
  });
  p.append(btn);holder.append(p);
 }
}
renderExisting();
