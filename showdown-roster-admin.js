import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const TABLE='showdown_reboot_fighters';
const form=$('fighter-form'),status=$('owner-status'),list=$('manager-roster');
let roster=[],editingSlot=null;
const label=text=>{status.textContent=text};
const filled=()=>new Set(roster.map(f=>f.slot));
const nextSlot=()=>{const taken=filled();let slot=1;while(taken.has(slot))slot++;return slot};
function clearForm(){
 editingSlot=null;form.reset();$('fighter-slot').readOnly=false;$('fighter-slot').value=String(nextSlot());
 $('fighter-enabled').checked=true;$('fighter-accent').value='#69d8ff';
 $('editor-title').textContent='Add a New Fighter';$('save-fighter').textContent='Publish Fighter';
}
function editFighter(f){
 editingSlot=f.slot;
 $('fighter-slot').value=String(f.slot);$('fighter-slot').readOnly=true;
 $('fighter-id').value=f.fighter_id;$('fighter-name').value=f.name;
 $('fighter-series').value=f.series;$('fighter-portrait').value=f.portrait||'';
 $('fighter-accent').value=f.accent||'#69d8ff';$('fighter-enabled').checked=!!f.enabled;
 $('editor-title').textContent='Edit Fighter — Slot '+String(f.slot).padStart(3,'0');
 $('save-fighter').textContent='Save Changes';
 form.scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
 const q=$('owner-search').value.trim().toLowerCase();
 const view=roster.filter(f=>!q||String(f.slot).includes(q)||f.name.toLowerCase().includes(q)||f.series.toLowerCase().includes(q));
 list.replaceChildren();
 $('roster-summary').textContent=roster.filter(f=>f.enabled).length+' published · '+roster.length+' assigned';
 if(!view.length){const text=document.createElement('p');text.textContent=roster.length?'No matches for this search.':'No reboot fighters yet. The first 200 slots are empty and ready.';list.append(text);return}
 const frag=document.createDocumentFragment();
 for(const f of view){
  const row=document.createElement('article');row.className='manager-row';
  const heading=document.createElement('strong');heading.textContent='SLOT '+String(f.slot).padStart(3,'0')+' · '+f.name;
  const sub=document.createElement('span');sub.textContent=f.series+' · '+(f.enabled?'Published':'Draft / hidden');
  const actions=document.createElement('div');actions.className='manager-actions';
  const edit=document.createElement('button');edit.className='arcade-btn alt';edit.type='button';edit.textContent='Edit';
  edit.addEventListener('click',()=>editFighter(f));
  const remove=document.createElement('button');remove.className='arcade-btn delete';remove.type='button';remove.textContent='Remove';
  remove.addEventListener('click',()=>removeFighter(f));
  actions.append(edit,remove);row.append(heading,sub,actions);frag.append(row);
 }
 list.append(frag);
}
async function refresh(){
 const {data,error}=await db.from(TABLE).select('slot,fighter_id,name,series,portrait,accent,enabled').order('slot',{ascending:true});
 if(error)throw error;
 roster=Array.isArray(data)?data:[];
 render();if(editingSlot===null)$('fighter-slot').value=String(nextSlot());
}
async function removeFighter(f){
 if(!window.confirm('Remove '+f.name+' from slot '+f.slot+'? This deletes only this reboot roster entry.'))return;
 try{
  label('Removing fighter…');
  const {error}=await db.from(TABLE).delete().eq('slot',f.slot);
  if(error)throw error;
  if(editingSlot===f.slot)clearForm();
  await refresh();label('Slot '+f.slot+' is empty again.');
 }catch(err){label('Could not remove fighter: '+err.message)}
}
$('fighter-name').addEventListener('input',()=>{
 if(editingSlot!==null||$('fighter-id').value.trim())return;
 $('fighter-id').value=$('fighter-name').value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
});
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const slot=Number($('fighter-slot').value),id=$('fighter-id').value.trim().toLowerCase();
 if(!Number.isSafeInteger(slot)||slot<1){label('Slot must be a positive whole number.');return}
 if(!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)){label('Fighter ID must use lowercase letters, numbers, underscores or hyphens.');return}
 const name=$('fighter-name').value.trim(),series=$('fighter-series').value.trim();
 if(!name||!series){label('Character name and series are required.');return}
 const other=roster.find(f=>f.slot===slot&&f.slot!==editingSlot);
 if(other){label('Slot '+slot+' already belongs to '+other.name+'. Choose an empty slot.');return}
 $('save-fighter').disabled=true;label('Saving fighter…');
 try{
  const row={slot,fighter_id:id,name,series,portrait:$('fighter-portrait').value.trim()||null,
   accent:$('fighter-accent').value,enabled:$('fighter-enabled').checked,updated_at:new Date().toISOString()};
  const {error}=await db.from(TABLE).upsert(row,{onConflict:'slot'});
  if(error)throw error;
  editingSlot=null;
  await refresh();
  clearForm();
  label(name+' saved to slot '+slot+'. Public roster capacity will expand automatically as needed.');
 }catch(err){label('Save failed: '+err.message)}
 finally{$('save-fighter').disabled=false}
});
$('clear-fighter').addEventListener('click',clearForm);
$('refresh-fighters').addEventListener('click',async()=>{try{await refresh();label('Roster list refreshed.')}catch(err){label('Refresh failed: '+err.message)}});
$('owner-search').addEventListener('input',render);
async function init(){
 try{
  const auth=await db.auth.getUser();
  if(auth.error||!auth.data.user)throw new Error('Sign in to your owner account first.');
  const {data,error}=await db.from('site_owners').select('user_id').eq('user_id',auth.data.user.id).maybeSingle();
  if(error||!data)throw new Error('Owner access is required to edit fighters.');
  $('owner-editor').hidden=false;
  clearForm();await refresh();
  label('Owner verified. The new Showdown roster is ready for your first fighter.');
 }catch(err){label(err.message)}
}
init();
