import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const el=id=>document.getElementById(id),say=s=>el('pack-admin-status').textContent=s;
let packs=[],ctoons=[],selected=null,authorized=false;
async function check(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();return !!data}
function reset(){selected=null;el('pack-admin-form').reset();el('pack-admin-price').value=100;el('pack-admin-draws').value=1;say('Ready to create a pack.');}
async function load(){
 if(!authorized)return;
 const [p,c]=await Promise.all([db.from('ctoon_packs').select('*').order('name'),db.from('ctoon_catalog').select('id,name,series').order('name')]);
 if(p.error||c.error){say('Unable to load: '+(p.error||c.error).message);return}
 packs=p.data||[];ctoons=c.data||[];
 const select=el('pack-admin-select'),ctoon=el('pack-admin-ctoon'),list=el('pack-admin-list');
 select.replaceChildren();ctoon.replaceChildren();list.replaceChildren();
 for(const item of ctoons){const o=new Option(item.name+' — '+(item.series||''),item.id);ctoon.add(o)}
 for(const pack of packs){
  select.add(new Option(pack.name,pack.id));
  const row=document.createElement('p'),button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent='Edit '+pack.name;
  button.onclick=()=>{selected=pack.id;el('pack-admin-name').value=pack.name;el('pack-admin-description').value=pack.description;el('pack-admin-price').value=pack.price_coins;el('pack-admin-draws').value=pack.draw_count;el('pack-admin-active').checked=pack.is_active;select.value=pack.id;loadItems();say('Editing '+pack.name)};
  row.append(button,document.createTextNode(pack.is_active?' · Published':' · Coming Soon'));list.append(row);
 }
 if(selected&&packs.some(x=>x.id===selected))select.value=selected;
 await loadItems();
 say('Loaded '+packs.length+' packs and '+ctoons.length+' CToons.');
}
async function loadItems(){
 const id=el('pack-admin-select').value,holder=el('pack-admin-items');holder.replaceChildren();if(!id)return;
 const {data,error}=await db.from('ctoon_pack_items').select('ctoon_id,weight').eq('pack_id',id);
 if(error){say(error.message);return}
 for(const item of data||[]){
  const row=document.createElement('p'),name=ctoons.find(x=>x.id===item.ctoon_id)?.name||item.ctoon_id,button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent='Remove';
  button.onclick=async()=>{if(!confirm('Remove '+name+' from this pack?'))return;const {error}=await db.from('ctoon_pack_items').delete().eq('pack_id',id).eq('ctoon_id',item.ctoon_id);if(error)say(error.message);else loadItems()};
  row.append(document.createTextNode(name+' · weight '+item.weight+' '),button);holder.append(row);
 }
}
el('pack-admin-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!authorized)return;
 const values={name:el('pack-admin-name').value.trim(),description:el('pack-admin-description').value.trim(),price_coins:Number(el('pack-admin-price').value),draw_count:Number(el('pack-admin-draws').value),is_active:el('pack-admin-active').checked};
 if(!values.name||!Number.isInteger(values.price_coins)||values.price_coins<0||!Number.isInteger(values.draw_count)||values.draw_count<1||values.draw_count>10){say('Check pack name, price, and reward count.');return}
 const {data,error}=selected?await db.from('ctoon_packs').update(values).eq('id',selected).select('id').single():await db.from('ctoon_packs').insert(values).select('id').single();
 if(error){say('Save failed: '+error.message);return}selected=data.id;await load();say('Pack saved.');
});
el('pack-admin-new').onclick=reset;
el('pack-admin-select').onchange=loadItems;
el('pack-admin-add').onclick=async()=>{
 if(!authorized)return;const pack_id=el('pack-admin-select').value,ctoon_id=el('pack-admin-ctoon').value,weight=Number(el('pack-admin-weight').value);
 if(!pack_id||!ctoon_id||!Number.isInteger(weight)||weight<1||weight>10000){say('Select a pack and CToon with a valid weight.');return}
 const {error}=await db.from('ctoon_pack_items').upsert({pack_id,ctoon_id,weight},{onConflict:'pack_id,ctoon_id'});
 if(error)say(error.message);else{await loadItems();say('Pack reward saved.')}
};
async function init(){authorized=await check();el('pack-admin-form').hidden=!authorized;if(!authorized){say('Owner sign-in required.');return}await load()}
db.auth.onAuthStateChange(()=>setTimeout(init,0));init();
