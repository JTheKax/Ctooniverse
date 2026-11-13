import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const el=id=>document.getElementById(id);
const form=el('ctoon-maker-form'),status=el('ctoon-maker-status'),holder=el('ctoon-maker-existing'),preview=el('ctoon-maker-preview');
const fields={name:el('ctoon-maker-title'),parent_series:el('ctoon-maker-set'),series:el('ctoon-maker-series'),image_path:el('ctoon-maker-image'),rarity:el('ctoon-maker-rarity'),price_coins:el('ctoon-maker-price'),is_for_sale:el('ctoon-maker-sale')};
let authorized=false,rows=[],seriesRows=[],editingId=null,requestId=0;
const say=message=>{status.textContent=message};
const deleteButton=el('ctoon-maker-delete');
function syncDeleteButton(){deleteButton.hidden=!authorized||editingId===null;deleteButton.disabled=!authorized||editingId===null;}

const cleanImage=value=>{
 const v=value.trim();
 if(/^https:\/\//i.test(v)){try{const u=new URL(v);return /\.(png|jpe?g|webp)(\?.*)?$/i.test(u.pathname)?v:null}catch{return null}}
 const path=v.startsWith('public/images/ctoons/')?v:'public/images/ctoons/'+v;
 return /^public\/images\/ctoons\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpe?g|webp)$/i.test(path)&&!path.includes('..')?path:null;
};
function showPreview(){
 preview.replaceChildren();
 const path=cleanImage(fields.image_path.value);
 if(!path)return;
 const img=document.createElement('img');img.src=path;img.alt='CToon artwork preview';img.style.cssText='display:block;max-width:260px;width:100%;height:auto;margin:1rem auto';img.addEventListener('error',()=>{preview.textContent='Artwork not found at '+path+'. Upload it to GitHub first.'},{once:true});preview.append(img);
}
function reset(){
 editingId=null;syncDeleteButton();form.reset();fields.price_coins.value=100;fields.parent_series.value='Cartoon & Anime';el('ctoon-maker-save').textContent='Create CToon';preview.replaceChildren();say('Ready to create a CToon. New entries default to Coming Soon.');
}
function edit(item){
 editingId=item.id;syncDeleteButton();
 for(const key of ['name','parent_series','series','rarity','price_coins'])fields[key].value=item[key]??'';
 fields.image_path.value=item.image_path||'';
 fields.is_for_sale.checked=!!item.is_for_sale;
 el('ctoon-maker-save').textContent='Save CToon Changes';
 showPreview();say('Editing '+item.name+'. Save Changes updates the live catalog.');form.scrollIntoView({block:'start'});
}
function render(){
 const search=el('ctoon-maker-search').value.trim().toLowerCase();
 holder.replaceChildren();
 const matches=rows.filter(x=>(x.name+' '+(x.series||'')+' '+(x.parent_series||'')).toLowerCase().includes(search));
 const summary=document.createElement('p');summary.textContent='Showing '+matches.length+' of '+rows.length+' CToons';holder.append(summary);
 for(const item of matches){
  const row=document.createElement('div');row.className='music-admin-row';
  const label=document.createElement('span');label.textContent=item.name+' — '+(item.series||'Uncategorized')+' · '+(item.is_for_sale?'For sale':'Coming Soon');
  const button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent='Edit';button.addEventListener('click',()=>edit(item));row.append(label,button);holder.append(row);
 }
}
async function verify(){
 try{const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;const result=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();return !result.error&&!!result.data}catch{return false}
}
async function load(){
 const current=++requestId;
 if(!authorized)return;
 const {data,error}=await db.from('ctoon_catalog').select('id,name,parent_series,series,image_path,rarity,price_coins,is_for_sale').order('name');
 if(current!==requestId)return;
 if(error){say('Could not load catalog: '+error.message);return}
 rows=data||[];
 const sets=await db.from('ctoon_series').select('name,category').order('name');
 if(sets.error){say('Could not load registered sets: '+sets.error.message);return}
 seriesRows=sets.data||[];updateSetOptions();
 render();say('Loaded '+rows.length+' CToons from the live catalog.');
}
function updateSetOptions(){
 const options=el('ctoon-maker-series-options');options.replaceChildren();
 for(const set of seriesRows){const option=document.createElement('option');option.value=set.name;options.append(option)}
}

async function init(){
 authorized=await verify();form.hidden=!authorized;syncDeleteButton();
 el('ctoon-maker-search').disabled=!authorized;el('ctoon-maker-reload').disabled=!authorized;
 if(!authorized){holder.replaceChildren();say('Sign in with an Owner account to manage CToons.');return}
 await load();
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!authorized)return;
 const name=fields.name.value.trim(),series=fields.series.value.trim(),parent_series=seriesRows.find(x=>x.name===series)?.category||'Cartoon & Anime',image_path=cleanImage(fields.image_path.value),rarity=fields.rarity.value,price_coins=Number(fields.price_coins.value),is_for_sale=fields.is_for_sale.checked;
 if(!name||!parent_series||!series||!image_path||!Number.isSafeInteger(price_coins)||price_coins<0||price_coins>1000000){say('Enter a name, subseries, valid PNG/JPG/WebP artwork path and a whole-number price.');return}
 if(!seriesRows.some(x=>x.name===series)){say('Select a registered CToon set from the list.');return}
 const existing=rows.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.series?.toLowerCase()===series.toLowerCase()&&x.id!==editingId);
 if(existing){say('A CToon with this name already exists in '+series+'. Edit the existing entry instead.');return}
 const button=el('ctoon-maker-save');button.disabled=true;say(editingId?'Saving changes…':'Creating CToon…');
 const values={name,parent_series,series,image_path,rarity,price_coins,is_for_sale};
 try{
  const request=editingId?db.from('ctoon_catalog').update(values).eq('id',editingId).select('id').single():db.from('ctoon_catalog').insert(values).select('id').single();
  const {data,error}=await request;if(error||!data)throw error||new Error('No catalog row was saved');
  reset();await load();say('CToon saved to the live catalog successfully.');
 }catch(error){say('Save failed: '+(error?.message||'Unknown error'))}finally{button.disabled=false}
});
deleteButton.addEventListener('click',async()=>{
 if(!authorized||editingId===null)return;
 const item=rows.find(row=>String(row.id)===String(editingId));
 if(!item){say('Select an existing CToon before deleting.');return}
 if(!window.confirm('Permanently delete "'+item.name+'" from the live CToon catalog? This cannot be undone.'))return;
 const typed=window.prompt('To confirm deletion, type the CToon name exactly: '+item.name);
 if(typed!==item.name){say('Deletion canceled. The CToon was not changed.');return}
 deleteButton.disabled=true;el('ctoon-maker-save').disabled=true;say('Deleting '+item.name+'…');
 try{
  if(!await verify())throw new Error('Owner authorization expired. Sign in again.');
  const {data,error}=await db.from('ctoon_catalog').delete().eq('id',item.id).select('id');
  if(error)throw error;
  if(!data||data.length!==1)throw new Error('Deletion was not confirmed. Check owner delete permissions and try again.');
  reset();await load();say('Deleted '+item.name+' from the live CToon catalog. Artwork files remain in GitHub.');
 }catch(error){say('Delete failed: '+(error?.message||'Unknown error'))}
 finally{el('ctoon-maker-save').disabled=false;syncDeleteButton()}
});
el('ctoon-maker-new').addEventListener('click',reset);
el('ctoon-maker-reload').addEventListener('click',load);
el('ctoon-maker-search').addEventListener('input',render);
fields.image_path.addEventListener('change',showPreview);
el('ctoon-maker-export').addEventListener('click',()=>{
 if(!authorized)return;
 const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='ctoon-catalog-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
db.auth.onAuthStateChange(()=>setTimeout(init,0));
init();
