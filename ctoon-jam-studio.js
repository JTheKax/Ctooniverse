"use strict";
/* CToon Jam Chart Studio — local-only, validated five-lane chart authoring.
   Official charts, audio, site-wide songs and existing high scores are never mutated. */
(() => {
 const $=id=>document.getElementById(id);
 const canvas=$("cs-grid"),ctx=canvas.getContext("2d");
 const meta={
  neon:{title:"Neon Rush",bpm:118,bars:20,seed:1},
  pixel:{title:"Pixel Thunder",bpm:146,bars:24,seed:3},
  starlight:{title:"Starlight Solo",bpm:104,bars:20,seed:4},
  nebula:{title:"Nebula Drive",bpm:132,bars:24,seed:6},
  clockwork:{title:"Clockwork Chaos",bpm:155,bars:28,seed:7},
  sunset:{title:"Sunset Circuit",bpm:112,bars:24,seed:8},
  golden:{title:"Golden · HUNTR/X",bpm:123,bars:95,seed:2,
   featured:true,path:"tracks/4c25e71528734dac8763825b46ed23d2.mp3"}
 };
 const colors=["#58ed83","#ff5c79","#ffe45c","#5aaeff","#ff9c4d"];
 const names=["Green · A","Red · S","Yellow · D","Blue · J","Orange · K"];
 const store={
  get(key){try{return localStorage.getItem(key)}catch{return null}},
  set(key,value){try{localStorage.setItem(key,value);return true}catch{return false}},
  remove(key){try{localStorage.removeItem(key);return true}catch{return false}}
 };
 const modes=["easy","normal","hard"];
 const storedSong=store.get("ctoon-jam-last-song-v1");
 const storedMode=store.get("ctoon-jam-last-difficulty-v1");
 let song=meta[storedSong]?storedSong:"neon";
 let mode=modes.includes(storedMode)?storedMode:"normal";
 let notes=[],dirty=false,start=0,loadSerial=0;
 const maxNotes=2500;
 const key=()=> "ctoon-jam-local-chart-v1:"+song+":"+mode;
 const fmt=t=>Number(t.toFixed(3));
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const pageSpan=()=>Number($("cs-bars").value)*4*60/meta[song].bpm;
 const snapSeconds=()=>60/meta[song].bpm/Number($("cs-snap").value);
 const message=t=>$("cs-status").textContent=t;
 const sorted=()=>notes.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 function validRow(n){
  return Array.isArray(n)&&(n.length===2||n.length===3)&&
   Number.isFinite(n[0])&&n[0]>=0&&n[0]<=900&&
   Number.isInteger(n[1])&&n[1]>=0&&n[1]<=4&&
   (n.length===2||(Number.isFinite(n[2])&&n[2]>=0&&n[2]<=8));
 }
 function validate(rows){
  if(!Array.isArray(rows)||rows.length>maxNotes)return null;
  const clean=[];
  for(const n of rows){
   if(!validRow(n))return null;
   const row=[fmt(n[0]),n[1]];
   if(n.length===3&&n[2]>0)row.push(fmt(n[2]));
   clean.push(row);
  }
  clean.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  for(let i=1;i<clean.length;i++){
   if(clean[i][1]===clean[i-1][1]&&Math.abs(clean[i][0]-clean[i-1][0])<.025)return null;
  }
  return clean;
 }
 function readSaved(){
  const raw=store.get(key());
  if(!raw)return null;
  try{
   const data=JSON.parse(raw);
   if(data?.format!=="ctoon-jam-local-chart"||data.version!==1||
      data.songId!==song||data.difficulty!==mode)return null;
   return validate(data.notes);
  }catch{return null;}
 }
 function setDirty(){
  dirty=true;render();message("Unsaved chart changes. Select Save Local Chart before returning to the game.");
 }
 function refreshSelection(){
  $("cs-song").value=song;$("cs-difficulty").value=mode;
  store.set("ctoon-jam-last-song-v1",song);
  store.set("ctoon-jam-last-difficulty-v1",mode);
 }
 function switchChart(nextSong,nextMode){
  if(dirty&&!confirm("Discard unsaved changes to this chart?")){refreshSelection();return;}
  song=nextSong;mode=nextMode;start=0;$("cs-start").value="0";
  loadSerial++;
  refreshSelection();
  const saved=readSaved();
  notes=saved||[];dirty=false;
  render();message(saved?"Loaded your saved custom chart.":"No custom chart saved yet. Build notes or load a starter pattern.");
 }
 function addNote(time,lane,length=0,toggle=false){
  time=fmt(clamp(time,0,900));length=fmt(clamp(length,0,8));
  if(!Number.isFinite(time)||!Number.isInteger(lane)||lane<0||lane>4||!Number.isFinite(length))return;
  const index=notes.findIndex(n=>n[1]===lane&&Math.abs(n[0]-time)<.025);
  if(index>=0){
   if(toggle)notes.splice(index,1);
   else notes[index]=length>0?[time,lane,length]:[time,lane];
  }else{
   if(notes.length>=maxNotes){message("This chart has reached its "+maxNotes+"-note limit.");return;}
   notes.push(length>0?[time,lane,length]:[time,lane]);
  }
  sorted();setDirty();
 }
 function dropNote(time,lane){
  const index=notes.findIndex(n=>n[1]===lane&&Math.abs(n[0]-time)<.025);
  if(index<0)return;
  notes.splice(index,1);setDirty();
 }
 function makeStarter(){
  const track=meta[song],beat=60/track.bpm;
  const out=[];
  for(let i=0;i<track.bars*4;i++){
   const lane=(i*3+Math.floor(i/4)+track.seed)%5;
   const at=fmt((i+4)*beat);
   out.push([at,lane]);
   if(mode!=="easy"&&i%8===4)out.push([at,(lane+2)%5]);
   if(mode==="hard"&&i%16===10)out.push([at,(lane+4)%5]);
   if(mode!=="easy"&&(mode==="hard"||i%2===1))out.push([fmt(at+beat*.5),(lane+2+(i%2))%5]);
  }
  return validate(out);
 }
 async function loadBase(){
  if(dirty&&!confirm("Replace unsaved notes with the starter chart?"))return;
  const ticket=++loadSerial;
  $("cs-base").disabled=true;
  message("Preparing starter chart…");
  try{
   let base=null;
   if(meta[song].featured){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{
     const res=await fetch("ctoon-jam-charts/4c25e71528734dac8763825b46ed23d2.json",{signal:controller.signal});
     if(!res.ok)throw Error("Chart file unavailable");
     const chart=await res.json();
     if(chart.format!=="ctoon-jam-chart"||chart.version!==1||chart.sourceStoragePath!==meta[song].path)throw Error("Unexpected chart file");
     base=validate(chart.difficultyNotes?.[mode]);
     if(!base?.length)throw Error("Starter chart is empty or invalid");
    }finally{clearTimeout(timeout);}
   }else base=makeStarter();
   if(ticket!==loadSerial)return;
   if(!base){message("Starter pattern was invalid. Your chart was not changed.");return;}
   notes=base;sorted();setDirty();
   message("Loaded "+notes.length+" starter practice notes. Edit them, then Save Local Chart.");
  }catch(e){if(ticket===loadSerial)message("Could not load starter: "+(e.message||"network error")+". Your chart was not changed.");}
  finally{if(ticket===loadSerial)$("cs-base").disabled=false;}
 }
 function persist(){
  if(!notes.length){message("Add at least one note before saving. Use Delete Local Chart to clear a saved chart.");return;}
  const good=validate(notes);
  if(!good){message("Invalid note timing or duplicate position. Check your chart.");return;}
  const content={
   format:"ctoon-jam-local-chart",version:1,songId:song,difficulty:mode,
   notes:good,updatedAt:new Date().toISOString()
  };
  if(!store.set(key(),JSON.stringify(content))){message("Could not save. Browser storage may be full or disabled.");return;}
  notes=good;dirty=false;
  render();message("Saved "+notes.length+" notes for "+meta[song].title+" on "+mode+". Open CToon Jam to play your custom practice chart.");
 }
 function clearChart(){
  if(!confirm("Delete your local "+meta[song].title+" / "+mode+" custom chart? Your old high scores will remain."))return;
  if(!store.remove(key())){message("Browser storage could not be cleared.");return;}
  notes=[];dirty=false;
  render();message("Local custom chart deleted. The original game chart is unchanged.");
 }
 function exportChart(){
  const content={format:"ctoon-jam-local-chart",version:1,songId:song,difficulty:mode,notes:validate(notes)||[],updatedAt:new Date().toISOString()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:"application/json"}));
  try{
   const a=document.createElement("a");
   a.href=url;a.download="ctoon-jam-"+song+"-"+mode+"-chart.json";
   document.body.append(a);a.click();a.remove();
   message("Exported chart JSON. Export contains note positions, not copyrighted audio.");
  }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }
 async function importChart(file){
  if(!file)return;
  if(file.size>250000){message("Chart file too large. Limit: 250 KB.");return;}
  try{
   const text=await file.text();
   const parsed=JSON.parse(text);
   if(parsed?.format!=="ctoon-jam-local-chart"||parsed.version!==1){
    throw Error("Only CToon Jam local chart JSON can be imported");
   }
   if(parsed.songId!==song||parsed.difficulty!==mode){
    throw Error("Select "+String(parsed.songId||"the chart's song")+" / "+String(parsed.difficulty||"its difficulty")+" first");
   }
   const rows=validate(parsed.notes);
   if(!rows?.length)throw Error("The chart needs at least one valid note");
   if(dirty&&!confirm("Replace your unsaved notes with the imported chart?"))return;
   notes=rows;setDirty();
   message("Imported "+rows.length+" notes. Press Save Local Chart to apply them in the game.");
  }catch(e){message("Import failed: "+(e.message||"invalid file"));}
 }
 function paint(){
  if(!ctx)return;
  const box=canvas.getBoundingClientRect();
  const w=Math.max(1,box.width),h=Math.max(1,box.height),dpr=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
   canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle="#0b1236";ctx.fillRect(0,0,w,h);
  const left=Math.min(78,w*.19),right=12,top=35,bottom=19;
  const laneH=(h-top-bottom)/5,view=pageSpan();
  const xmin=left,xmax=w-right;
  for(let lane=0;lane<5;lane++){
   const y=top+lane*laneH;
   ctx.fillStyle=lane%2?"#1c1c49":"#202957";
   ctx.fillRect(left,y,xmax-left,laneH);
   ctx.fillStyle=colors[lane];
   ctx.fillRect(left-7,y+3,4,laneH-6);
   ctx.fillStyle="#e4e9ff";
   ctx.font="800 "+Math.max(11,Math.min(16,laneH*.25))+"px system-ui";
   ctx.textAlign="left";ctx.textBaseline="middle";
   ctx.fillText("ASDJK"[lane],Math.max(8,left-45),y+laneH*.5);
  }
  const span=60/meta[song].bpm/Number($("cs-snap").value);
  const startIndex=Math.ceil(start/span),endIndex=Math.floor((start+view)/span);
  for(let i=startIndex;i<=endIndex;i++){
   const t=i*span,x=left+(t-start)/view*(xmax-left);
   if(x<left-.01||x>xmax+.01)continue;
   const major=i%Number($("cs-snap").value)===0;
   ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,h-bottom);
   ctx.strokeStyle=major?"#9cbbf67d":"#9cbbf626";
   ctx.lineWidth=major?1.6:1;ctx.stroke();
   if(major){
    ctx.fillStyle="#ccdbff";ctx.font="750 11px system-ui";ctx.textAlign="center";
    ctx.fillText(t.toFixed(1)+"s",x,17);
   }
  }
  ctx.lineWidth=1;
  for(let lane=0;lane<=5;lane++){
   const y=top+lane*laneH;
   ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(xmax,y);
   ctx.strokeStyle="#6e78c47e";ctx.stroke();
  }
  const inView=notes.filter(n=>n[0]>=start-.01&&n[0]<=start+view+.01);
  for(const n of inView){
   const [t,lane,len=0]=n;
   const x=left+(t-start)/view*(xmax-left),y=top+lane*laneH+laneH*.14;
   const width=Math.max(8,len/view*(xmax-left));
   ctx.fillStyle=colors[lane];ctx.shadowColor=colors[lane];ctx.shadowBlur=9;
   ctx.fillRect(x-4,y,width+8,laneH*.72);ctx.shadowBlur=0;
   ctx.strokeStyle="#fff9";ctx.lineWidth=1.5;ctx.strokeRect(x-4,y,width+8,laneH*.72);
  }
  ctx.textAlign="left";ctx.fillStyle="#abdfff";ctx.font="900 12px system-ui";
  ctx.fillText(meta[song].title+" · "+mode.toUpperCase()+" · "+meta[song].bpm+" BPM",Math.max(10,left),h-3);
 }
 function render(){
  $("cs-count").textContent=notes.length.toLocaleString()+" NOTES";
  $("cs-state").textContent=dirty?"Unsaved chart edits. Save to play them.":store.get(key())?"Saved local custom chart ready for practice.":"No local chart saved for this song / difficulty.";
  $("cs-save").disabled=!dirty||notes.length===0;
  $("cs-export").disabled=notes.length===0;
  $("cs-start").value=String(fmt(start));
  const view=pageSpan(),visible=notes.filter(n=>n[0]>=start&&n[0]<start+view);
  $("cs-view-count").textContent=String(visible.length);
  const holder=$("cs-notes");holder.replaceChildren();
  if(!visible.length){
   const p=document.createElement("p");p.className="cs-help";p.textContent="No notes in this section.";holder.append(p);
  }else{
   for(const row of visible.slice(0,40)){
    const div=document.createElement("div");div.className="cs-note";
    const text=document.createElement("span");
    text.textContent=names[row[1]]+" · "+row[0].toFixed(3)+"s"+(row[2]?" · hold "+row[2]+"s":"");
    const btn=document.createElement("button");btn.type="button";btn.textContent="Remove";
    btn.setAttribute("aria-label","Remove "+names[row[1]]+" note at "+row[0]+" seconds");
    btn.addEventListener("click",()=>dropNote(row[0],row[1]));
    div.append(text,btn);holder.append(div);
   }
   if(visible.length>40){const p=document.createElement("p");p.className="cs-help";p.textContent="Showing first 40 notes. Move the timeline to see more.";holder.append(p);}
  }
  paint();
 }
 function setStart(n){
  start=fmt(clamp(Number(n)||0,0,895));
  render();
 }
 $("cs-song").value=song;$("cs-difficulty").value=mode;
 $("cs-song").addEventListener("change",()=>switchChart($("cs-song").value,mode));
 $("cs-difficulty").addEventListener("change",()=>switchChart(song,$("cs-difficulty").value));
 $("cs-snap").addEventListener("change",render);
 $("cs-bars").addEventListener("change",render);
 $("cs-start").addEventListener("change",()=>setStart($("cs-start").value));
 $("cs-prev").addEventListener("click",()=>setStart(start-pageSpan()));
 $("cs-next").addEventListener("click",()=>setStart(start+pageSpan()));
 canvas.addEventListener("click",event=>{
  const rect=canvas.getBoundingClientRect();
  const w=rect.width,h=rect.height,left=Math.min(78,w*.19),right=12,top=35,bottom=19;
  const x=event.clientX-rect.left,y=event.clientY-rect.top;
  if(x<left||x>w-right||y<top||y>h-bottom)return;
  const lane=Math.floor((y-top)/(h-top-bottom)*5);
  if(lane<0||lane>4)return;
  const sec=start+(x-left)/(w-right-left)*pageSpan();
  const step=snapSeconds(),snapped=fmt(Math.round(sec/step)*step);
  addNote(snapped,lane,0,true);
 });
 $("cs-add-form").addEventListener("submit",event=>{
  event.preventDefault();
  const time=Number($("cs-time").value),lane=Number($("cs-lane").value),length=Number($("cs-length").value);
  if(!Number.isFinite(time)||time<0||time>900||!Number.isInteger(lane)||
     lane<0||lane>4||!Number.isFinite(length)||length<0||length>8){
   message("Check note time, lane and hold length.");return;
  }
  addNote(time,lane,length);
 });
 $("cs-base").addEventListener("click",loadBase);
 $("cs-save").addEventListener("click",persist);
 $("cs-export").addEventListener("click",exportChart);
 $("cs-import").addEventListener("change",async()=>{
  const input=$("cs-import"),file=input.files?.[0];
  await importChart(file);input.value="";
 });
 $("cs-clear").addEventListener("click",clearChart);
 window.addEventListener("resize",paint);
 window.addEventListener("beforeunload",event=>{
  if(!dirty)return;
  event.preventDefault();event.returnValue="";
 });
 const saved=readSaved();
 notes=saved||[];render();
 message(saved?"Your saved local chart is ready for editing.":"Choose a note cell or load the starter practice pattern to begin.");
})();
