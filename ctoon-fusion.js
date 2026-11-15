import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {ctoonImageUrl} from './ctoon-image-url.js';

const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const panel=$('ctoon-fusion-machine'),canvas=$('fusion-canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const status=$('fusion-status'),fileInput=$('fusion-art-file');
let catalog=[],sets=[],previewReady=false,renderVersion=0,uploading=false,objectPreview='';
const field=id=>$(id).value;
const say=(message,isError=false)=>{status.textContent=message;status.dataset.error=String(isError)};
const current=(id)=>catalog.find(row=>row.id===field(id));
const resolveImage=item=>ctoonImageUrl(item?.image_path)||'ctooniverse-logo.png';

function selectItems(selectId,searchId){
 const target=$(selectId),old=target.value;
 const text=field(searchId).trim().toLowerCase();
 const found=catalog.filter(x=>(x.name+' '+(x.series||'')).toLowerCase().includes(text));
 target.replaceChildren(new Option('Choose a CToon…',''));
 for(const item of found){
  target.add(new Option(item.name+' · '+(item.series||'CTooniverse'),item.id));
 }
 if(found.some(x=>x.id===old))target.value=old;
}
function setNames(){
 for(const [id,slot] of [['fusion-a','a'],['fusion-b','b']]){
  const item=current(id);const image=$('fusion-'+slot+'-art');
  $('fusion-'+slot+'-name').textContent=item?.name||'Select a source';
  image.src=resolveImage(item);image.alt=(item?.name||'CToon')+' artwork';
  image.onerror=()=>{image.onerror=null;image.src='ctooniverse-logo.png'};
 }
}
function image(url){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.crossOrigin='anonymous';
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error('A source image could not be loaded for the composite. Upload custom fusion artwork instead.'));
  img.src=url;
 });
}
function drawContained(img,x,y,w,h){
 const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
 const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
 ctx.drawImage(img,x+(w-width)/2,y+(h-height)/2,width,height);
}
function compose(a,b){
 const w=canvas.width,h=canvas.height;
 const back=ctx.createLinearGradient(0,0,w,h);
 back.addColorStop(0,'#192f8c');back.addColorStop(.55,'#44227c');back.addColorStop(1,'#0b2b62');
 ctx.fillStyle=back;ctx.fillRect(0,0,w,h);
 const halo=ctx.createRadialGradient(w/2,h*.46,10,w/2,h*.46,310);
 halo.addColorStop(0,'#fff4c18a');halo.addColorStop(.48,'#80dbff55');halo.addColorStop(1,'#140a3a00');
 ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
 for(let i=0;i<32;i++){
  const angle=(i/32)*Math.PI*2;
  ctx.beginPath();ctx.moveTo(w/2,h*.48);
  ctx.lineTo(w/2+580*Math.cos(angle),h*.48+580*Math.sin(angle));
  ctx.strokeStyle=i%2?'#92e8ff2c':'#f1ccff30';ctx.lineWidth=5;ctx.stroke();
 }
 // Layer the two ORIGINAL characters into one split, glowing fusion portrait.
 // This composite is deliberately an owner-editable starting point, not AI-generated hybrid art.
 ctx.save();ctx.beginPath();ctx.rect(0,0,w*.54,h);ctx.clip();
 drawContained(a,-34,92,w*.98,h*.74);ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(w*.46,0,w*.54,h);ctx.clip();
 drawContained(b,40,92,w*.98,h*.74);ctx.restore();
 const seam=ctx.createLinearGradient(w*.43,0,w*.57,0);
 seam.addColorStop(0,'#95edff00');seam.addColorStop(.5,'#e8e2ffd0');seam.addColorStop(1,'#cb8aff00');
 ctx.fillStyle=seam;ctx.fillRect(w*.40,76,w*.2,h*.77);
 ctx.lineWidth=10;ctx.strokeStyle='#6be6ffd4';ctx.shadowColor='#ad9eff';ctx.shadowBlur=21;
 ctx.beginPath();ctx.moveTo(w*.51,h*.14);ctx.lineTo(w*.47,h*.31);ctx.lineTo(w*.54,h*.48);ctx.lineTo(w*.48,h*.65);ctx.lineTo(w*.52,h*.83);ctx.stroke();ctx.shadowBlur=0;
 const bottom=ctx.createLinearGradient(0,h*.78,0,h);
 bottom.addColorStop(0,'#0c143000');bottom.addColorStop(1,'#0a124ce8');
 ctx.fillStyle=bottom;ctx.fillRect(0,h*.78,w,h*.22);
 ctx.strokeStyle='#dfc276';ctx.lineWidth=9;ctx.strokeRect(6,6,w-12,h-12);
}
async function render(){
 const version=++renderVersion;
 previewReady=false;setNames();
 const a=current('fusion-a'),b=current('fusion-b');
 if(!a||!b){say('Choose any two different CToons to power up the machine.');return}
 if(a.id===b.id){say('Choose two different CToons for this fusion.',true);return}
 if(!field('fusion-name').trim())$('fusion-name').value=a.name+' + '+b.name;
 if(!fileInput.files.length){say('Combining source artwork…');
  try{
   const images=await Promise.all([image(resolveImage(a)),image(resolveImage(b))]);
   if(version!==renderVersion)return;
   compose(...images);previewReady=true;
   say('Fusion preview ready. Save the blended artwork, or choose a custom PNG/JPG/WebP for a fully redesigned hybrid.');
  }catch(error){
   if(version!==renderVersion)return;
   say(error.message,true);
  }
 }else say('Custom fusion artwork selected. Ready to create.');
}
function showCustomFile(){
 if(objectPreview)URL.revokeObjectURL(objectPreview);
 objectPreview='';
 const file=fileInput.files[0],node=$('fusion-custom-art');
 node.hidden=!file;canvas.hidden=!!file;
 if(file){objectPreview=URL.createObjectURL(file);node.src=objectPreview;node.alt='Custom fusion artwork preview'}
 render();
}
function canvasBlob(){
 return new Promise((resolve,reject)=>{
  try{canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The fusion image could not be saved.')), 'image/png')}
  catch(error){reject(error)}
 });
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
  say('Choose any two CToons from '+catalog.length+' available catalog entries.');
 }catch(error){panel.hidden=false;say('Unable to load the fusion sources: '+(error.message||error),true)}
}

$('fusion-a').addEventListener('change',()=>{
 const a=current('fusion-a');
 if(a&&sets.some(x=>x.name===a.series)&&!field('fusion-series'))$('fusion-series').value=a.series;
 $('fusion-name').value='';render();
});
$('fusion-b').addEventListener('change',()=>{$('fusion-name').value='';render()});
for(const [searchId,selectId] of [['fusion-search-a','fusion-a'],['fusion-search-b','fusion-b']]){
 $(searchId).addEventListener('input',()=>{selectItems(selectId,searchId);render()});
}
$('fusion-redraw').addEventListener('click',render);
$('fusion-art-file').addEventListener('change',showCustomFile);
$('fusion-download').addEventListener('click',()=>{
 if(!previewReady){say('Choose two sources and generate a fusion preview first.',true);return}
 const link=document.createElement('a');
 link.download='ctoon-fusion-preview.png';link.href=canvas.toDataURL('image/png');link.click();
});
$('fusion-form').addEventListener('submit',async event=>{
 event.preventDefault();if(uploading)return;
 const left=current('fusion-a'),right=current('fusion-b'),name=field('fusion-name').trim();
 if(!left||!right||left.id===right.id){say('Select two distinct CToons.',true);return}
 if(!name||name.length>90){say('Enter a fusion name up to 90 characters.',true);return}
 const price=Number(field('fusion-price')),rarity=field('fusion-rarity'),series=field('fusion-series');
 if(!Number.isSafeInteger(price)||price<0||price>1000000||!sets.some(x=>x.name===series)){
  say('Choose a registered subseries and a valid coin price.',true);return;
 }
 const chosen=fileInput.files[0];
 if(!chosen&&!previewReady){say('Generate a valid fusion preview or provide custom artwork before saving.',true);return}
 if(chosen&&(chosen.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(chosen.type))){
  say('Custom artwork must be a PNG, JPEG, or WebP no larger than 5 MB.',true);return;
 }
 if(!await verifyOwner()){say('Owner authorization expired. Sign in again.',true);return}
 uploading=true;$('fusion-create').disabled=true;let objectName='';
 try{
  const file=chosen||await canvasBlob();
  const ext=file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':'png';
  objectName='fusions/'+crypto.randomUUID()+'.'+ext;
  say('Uploading fusion artwork securely…');
  const {error:uploadError}=await db.storage.from('ctoon-fusions').upload(objectName,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
  if(uploadError)throw uploadError;
  const {data:{publicUrl}}=db.storage.from('ctoon-fusions').getPublicUrl(objectName);
  say('Adding the new CToon to the live catalog…');
  const {data,error}=await db.rpc('owner_create_ctoon_fusion',{
   p_left_ctoon:left.id,p_right_ctoon:right.id,p_name:name,p_image_path:publicUrl,
   p_rarity:rarity,p_price_coins:price,p_series:series
  });
  if(error)throw error;
  objectName='';
  $('ctoon-maker-reload')?.click();
  window.dispatchEvent(new CustomEvent('ctoon-catalog-updated',{detail:{id:data}}));
  $('fusion-name').value='';fileInput.value='';
  if(objectPreview)URL.revokeObjectURL(objectPreview);
  objectPreview='';$('fusion-custom-art').hidden=true;canvas.hidden=false;
  await load();
  say('Fusion created! "'+name+'" is now in the CToon catalog (Sold Out by default). Original CToons were kept.');
 }catch(error){
  if(objectName)await db.storage.from('ctoon-fusions').remove([objectName]).catch(()=>{});
  say('Could not create fusion: '+(error?.message||'Unknown error'),true);
 }finally{uploading=false;$('fusion-create').disabled=false}
});
load();
