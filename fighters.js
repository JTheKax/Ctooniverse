// Empty roster by owner request. No default, saved-avatar, or CPU fighters are instantiated.
const canvas=document.getElementById('fight');
const ctx=canvas.getContext('2d');
// Reserved slots only: no characters, avatars, or opponents are loaded.
const roster=Array.from({length:120},(_,i)=>({slot:i+1,character:null}));
const grid=document.getElementById('fighter-roster');
const search=document.getElementById('roster-search'),group=document.getElementById('roster-group');
const sort=document.getElementById('roster-sort'),seriesFilter=document.getElementById('roster-series');
const pageSize=30;let page=0,selectedSlot=1;
// Future fighters may populate each slot with {name,series,portrait}. Empty slots stay unassigned.
function refreshSeries(){const previous=seriesFilter.value;const names=[...new Set(roster.map(item=>item.character?.series).filter(Boolean))].sort((a,b)=>a.localeCompare(b));seriesFilter.replaceChildren(new Option('All series','all'));for(const name of names)seriesFilter.add(new Option(name,name));seriesFilter.value=names.includes(previous)?previous:'all';}

const slotLabel=n=>'SLOT '+String(n).padStart(3,'0');
function selectSlot(n){selectedSlot=n;document.getElementById('selected-fighter').textContent=slotLabel(n);document.getElementById('preview-description').textContent='Empty fighter position '+n+' of '+roster.length+'. Ready for a future character.';document.getElementById('preview-symbol').textContent=String(n).padStart(3,'0');grid.querySelectorAll('button[data-slot]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.slot)===n)));}
function renderRoster(){
 const term=search.value.trim().toLowerCase();
 const section=group.value;
 refreshSeries();
 const filtered=roster.filter(item=>(section==='all'||Math.floor((item.slot-1)/30)===Number(section))&&(seriesFilter.value==='all'||item.character?.series===seriesFilter.value)&&(!term||[slotLabel(item.slot),String(item.slot),item.character?.name||'',item.character?.series||''].some(value=>value.toLowerCase().includes(term))));
 const compare=(a,b)=>a.localeCompare(b,undefined,{sensitivity:'base',numeric:true});
 if(sort.value==='alphabetical')filtered.sort((a,b)=>a.character&&b.character?compare(a.character.name||'',b.character.name||''):a.character?-1:b.character?1:a.slot-b.slot);
 else if(sort.value==='series')filtered.sort((a,b)=>a.character&&b.character?compare(a.character.series||'Uncategorized',b.character.series||'Uncategorized')||compare(a.character.name||'',b.character.name||''):a.character?-1:b.character?1:a.slot-b.slot);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages-1);
 grid.replaceChildren();
 for(const item of filtered.slice(page*pageSize,(page+1)*pageSize)){
  const button=document.createElement('button');button.type='button';button.className='roster-slot';button.style.setProperty('--slot-hue',String((item.slot*37)%360));button.dataset.slot=item.slot;button.setAttribute('aria-label',item.character?item.character.name+' — '+(item.character.series||'Uncategorized'):slotLabel(item.slot)+' — empty');button.setAttribute('aria-pressed',String(item.slot===selectedSlot));
  const symbol=document.createElement('span');symbol.className='slot-symbol';symbol.textContent=item.character?.portrait?'':item.character?item.character.name.slice(0,1).toUpperCase():'+';if(item.character?.portrait){const image=document.createElement('img');image.src=item.character.portrait;image.alt='';image.className='slot-portrait';symbol.append(image)}
  const number=document.createElement('span');number.className='slot-number';number.textContent=String(item.slot).padStart(3,'0');
  const gloss=document.createElement('span');gloss.className='slot-gloss';gloss.setAttribute('aria-hidden','true');button.append(gloss,symbol,number);button.onclick=()=>selectSlot(item.slot);button.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:e.key==='ArrowDown'?10:-10;const next=item.slot+step;if(next<1||next>roster.length)return;const nextPage=Math.floor((next-1)/pageSize);sort.value='slots';seriesFilter.value='all';if(group.value!=='all')group.value='all';search.value='';page=nextPage;renderRoster();selectSlot(next);grid.querySelector('[data-slot="'+next+'"]').focus();};grid.append(button);
 }
 if(!filtered.length){const empty=document.createElement('p');empty.textContent='No matching slots.';grid.append(empty)}
 document.getElementById('roster-page').textContent='Page '+(page+1)+' / '+pages;
 document.getElementById('roster-prev').disabled=page===0;document.getElementById('roster-next').disabled=page>=pages-1;
}
search.addEventListener('input',()=>{page=0;renderRoster()});
group.addEventListener('change',()=>{page=0;renderRoster()});
sort.addEventListener('change',()=>{page=0;renderRoster()});
seriesFilter.addEventListener('change',()=>{page=0;renderRoster()});
document.getElementById('roster-prev').onclick=()=>{page--;renderRoster()};
document.getElementById('roster-next').onclick=()=>{page++;renderRoster()};
renderRoster();selectSlot(1);
document.getElementById('fight-message').textContent='NO FIGHTERS YET';
document.getElementById('fight-status').textContent='All characters have been removed. The arena is ready for future fighters.';
const startButton=document.getElementById('start'),pauseButton=document.getElementById('pause');
startButton.disabled=true;pauseButton.disabled=true;
startButton.title='Add fighters before starting a match';
for(const button of document.querySelectorAll('[data-key]'))button.disabled=true;
const ground=445;
function draw(){const sky=ctx.createLinearGradient(0,0,0,540);sky.addColorStop(0,'#11144e');sky.addColorStop(.75,'#593a96');sky.addColorStop(1,'#172654');ctx.fillStyle=sky;ctx.fillRect(0,0,960,540);ctx.fillStyle='#8d5aff';for(let i=0;i<12;i++){const h=100+(i*41)%150;ctx.fillRect(i*88,ground-h,70,h);ctx.fillStyle='#70dfff';for(let y=ground-h+15;y<ground-12;y+=25)ctx.fillRect(i*88+15,y,10,8);ctx.fillStyle='#8d5aff'}ctx.fillStyle='#24204d';ctx.fillRect(0,ground,960,95);ctx.strokeStyle='#ff5bd5';ctx.lineWidth=3;for(let i=0;i<11;i++){ctx.beginPath();ctx.moveTo(480,ground);ctx.lineTo(i*130-180,540);ctx.stroke()}for(let y=ground+25;y<540;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke()}}

draw();
