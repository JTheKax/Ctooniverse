import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {ctoonImageUrl} from './ctoon-image-url.js';

const SUPABASE_URL='https://hsxdyxdazsdmpucyhqly.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS';
const db=createClient(SUPABASE_URL,PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
const panel=$('ctoon-fusion-machine'),status=$('fusion-status'),fileInput=$('fusion-art-file');
const result=$('fusion-result-art');
let catalog=[],sets=[],generatedBlob=null,generatedUrl='',customUrl='';
let uploading=false,generating=false,selectionVersion=0;
const field=id=>$(id).value;
const say=(message,isError=false)=>{status.textContent=message;status.dataset.error=String(isError)};
const current=id=>catalog.find(row=>row.id===field(id));
const resolveImage=item=>ctoonImageUrl(item?.image_path)||'ctooniverse-logo.png';

function selectItems(selectId,searchId){
 const target=$(selectId),old=target.value;
 const search=field(searchId).trim().toLowerCase();
 const matches=catalog.filter(item=>(item.name+' '+(item.series||'')).toLowerCase().includes(search));
 target.replaceChildren(new Option('Choose a CToon…',''));
 for(const item of matches)target.add(new Option(item.name+' · '+(item.series||'CTooniverse'),item.id));
 if(matches.some(item=>item.id===old))target.value=old;
}
function setNames(){
 for(const [id,slot] of [['fusion-a','a'],['fusion-b','b']]){
  const item=current(id),image=$('fusion-'+slot+'-art');
  $('fusion-'+slot+'-name').textContent=item?.name||'Select a source';
  image.src=resolveImage(item);image.alt=(item?.name||'CToon')+' artwork';
  image.onerror=()=>{image.onerror=null;image.src='ctooniverse-logo.png'};
 }
}
function clearGenerated(){
 generatedBlob=null;
 if(generatedUrl)URL.revokeObjectURL(generatedUrl);
 generatedUrl='';
}
function clearCustomPreview(){
 if(customUrl)URL.revokeObjectURL(customUrl);
 customUrl='';
}
function updateResult(){
 const custom=fileInput.files[0];
 const source=custom?customUrl:generatedUrl;
 result.hidden=!source;
 $('fusion-result-empty').hidden=!!source;
 if(source){result.src=source;result.alt=custom?'Custom single-character fusion artwork':'AI-created single fusion character artwork'}
 else result.removeAttribute('src');
 $('fusion-download').disabled=!generatedBlob;
}
function selectionChanged(resetName=false){
 selectionVersion++;
 clearGenerated();
 setNames();
 const a=current('fusion-a'),b=current('fusion-b');
 if(resetName)$('fusion-name').value=a&&b?a.name+' + '+b.name:'';
 updateResult();
 if(!a||!b)say('Choose two CToons, then click Fuse into One Character.');
 else if(a.id===b.id)say('Choose two different CToons for this fusion.',true);
 else if(fileInput.files[0])say('Custom artwork selected. You may create the fusion or generate a new one-character design.');
 else say('Ready! Click Fuse into One Character to generate one original character from both CToons.');
}
function resetForNewSources(){
 fileInput.value='';
 clearCustomPreview();
 selectionChanged(true);
}
async function verifyOwner(){
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)return false;
 const check=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
 return !check.error&&!!check.data;
}
async function getAllCatalog(){
 const gathered=[];
 for(let start=0;;start+=500){
  const {data,error}=await db.from('ctoon_catalog')
   .select('id,name,series,parent_series,image_path').order('name').order('id').range(start,start+499);
  if(error)throw error;
  gathered.push(...(data||[]));
  if(!data||data.length<500)break;
 }
 return gathered;
}
async function load(){
 try{
  if(!await verifyOwner()){panel.hidden=true;return}
  const [all,registered]=await Promise.all([
   getAllCatalog(),db.from('ctoon_series').select('name,category').order('name')
  ]);
  if(registered.error)throw registered.error;
  catalog=all;sets=registered.data||[];
  panel.hidden=false;
  selectItems('fusion-a','fusion-search-a');selectItems('fusion-b','fusion-search-b');
  const series=$('fusion-series'),old=series.value;
  series.replaceChildren(new Option('Choose a registered subseries',''));
  for(const row of sets)series.add(new Option(row.name,row.name));
  series.value=sets.some(x=>x.name===old)?old:sets.find(x=>x.name.toLowerCase()==='ctoon fusions')?.name||'';
  selectionChanged(false);
 }catch(error){panel.hidden=false;say('Unable to load fusion sources: '+(error.message||error),true)}
}

async function generate(){
 if(generating||uploading)return;
 const a=current('fusion-a'),b=current('fusion-b');
 if(!a||!b||a.id===b.id){say('Choose two different CToons to fuse.',true);return}
 if(!await verifyOwner()){say('Owner authorization expired. Please sign in again.',true);return}
 const {data:{session}}=await db.auth.getSession();
 if(!session?.access_token){say('Sign in as the owner to generate a fusion.',true);return}
 const version=selectionVersion;
 generating=true;$('fusion-redraw').disabled=true;$('fusion-create').disabled=true;
 say('Creating ONE new character using traits from both sources…');
 try{
  const response=await fetch(SUPABASE_URL+'/functions/v1/ctoon-fuse-person',{
   method:'POST',
   headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY,
    'Authorization':'Bearer '+session.access_token},
   body:JSON.stringify({left_id:a.id,right_id:b.id})
  });
  if(!response.ok){
   const error=await response.json().catch(()=>({}));
   throw new Error(error.error||('Image generation failed (HTTP '+response.status+').'));
  }
  const blob=await response.blob();
  if(blob.type!=='image/webp'||blob.size===0||blob.size>5*1024*1024)
   throw new Error('The generated image is missing or exceeds the 5 MB limit.');
  if(version!==selectionVersion)return; // Never show a fusion from outdated selections.
  clearGenerated();clearCustomPreview();fileInput.value='';
  generatedBlob=blob;generatedUrl=URL.createObjectURL(blob);
  updateResult();
  say('One fused character is ready! Review the result, download it, or create the new CToon. Originals remain unchanged.');
 }catch(error){
  if(version===selectionVersion)say('Could not generate fusion: '+(error?.message||error),true);
 }finally{generating=false;$('fusion-redraw').disabled=false;$('fusion-create').disabled=false}
}

$('fusion-a').addEventListener('change',()=>{
 const a=current('fusion-a');
 if(a&&sets.some(x=>x.name===a.series)&&!field('fusion-series'))$('fusion-series').value=a.series;
 resetForNewSources();
});
$('fusion-b').addEventListener('change',resetForNewSources);
for(const [searchId,selectId] of [['fusion-search-a','fusion-a'],['fusion-search-b','fusion-b']]){
 $(searchId).addEventListener('input',()=>{selectItems(selectId,searchId);resetForNewSources()});
}
$('fusion-redraw').addEventListener('click',generate);
fileInput.addEventListener('change',()=>{
 clearCustomPreview();
 const file=fileInput.files[0];
 if(file)customUrl=URL.createObjectURL(file);
 selectionChanged(false);
});
$('fusion-download').addEventListener('click',()=>{
 if(!generatedBlob){say('Generate a one-character fusion before downloading.',true);return}
 const link=document.createElement('a');
 link.download='ctoon-fused-character.webp';link.href=generatedUrl;link.click();
});
$('fusion-form').addEventListener('submit',async event=>{
 event.preventDefault();if(uploading||generating)return;
 const left=current('fusion-a'),right=current('fusion-b'),name=field('fusion-name').trim();
 if(!left||!right||left.id===right.id){say('Select two different CToons.',true);return}
 if(!name||name.length>90){say('Enter a fusion name up to 90 characters.',true);return}
 const price=Number(field('fusion-price')),rarity=field('fusion-rarity'),series=field('fusion-series');
 if(!Number.isSafeInteger(price)||price<0||price>1000000||!sets.some(x=>x.name===series)){
  say('Choose a registered subseries and a valid coin price.',true);return;
 }
 const file=fileInput.files[0]||generatedBlob;
 if(!file){say('Generate the single-character fusion or upload a completed fusion image before saving.',true);return}
 if(file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){
  say('Fusion artwork must be a PNG, JPEG, or WebP no larger than 5 MB.',true);return;
 }
 if(!await verifyOwner()){say('Owner authorization expired. Sign in again.',true);return}
 uploading=true;$('fusion-create').disabled=true;$('fusion-redraw').disabled=true;let objectName='';
 try{
  const ext=file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':'png';
  objectName='fusions/'+crypto.randomUUID()+'.'+ext;
  say('Uploading the new fused character artwork…');
  const {error:uploadError}=await db.storage.from('ctoon-fusions').upload(objectName,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
  if(uploadError)throw uploadError;
  const {data:{publicUrl}}=db.storage.from('ctoon-fusions').getPublicUrl(objectName);
  say('Adding the new fused character to the live catalog…');
  const {data,error}=await db.rpc('owner_create_ctoon_fusion',{
   p_left_ctoon:left.id,p_right_ctoon:right.id,p_name:name,p_image_path:publicUrl,
   p_rarity:rarity,p_price_coins:price,p_series:series
  });
  if(error)throw error;
  objectName='';
  $('ctoon-maker-reload')?.click();
  window.dispatchEvent(new CustomEvent('ctoon-catalog-updated',{detail:{id:data}}));
  $('fusion-name').value='';fileInput.value='';
  clearGenerated();clearCustomPreview();updateResult();
  await load();
  say('Fusion created! "'+name+'" is now in the catalog (Sold Out by default). Both original CToons were kept.');
 }catch(error){
  if(objectName)await db.storage.from('ctoon-fusions').remove([objectName]).catch(()=>{});
  say('Could not create fusion: '+(error?.message||'Unknown error'),true);
 }finally{uploading=false;$('fusion-create').disabled=false;$('fusion-redraw').disabled=false}
});
load();
