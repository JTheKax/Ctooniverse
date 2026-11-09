"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("jam-board"), pen = canvas.getContext("2d");
  const controls = [...document.querySelectorAll("[data-lane]")];
  const playBtn = $("jam-play"), pauseBtn = $("jam-pause"), hypeBtn = $("jam-hype");
  const songSelect = $("jam-song"), difficultySelect = $("jam-difficulty"), muteInput = $("jam-mute");
  const playStyleSelect=$("jam-play-style"), strumButtons=[...document.querySelectorAll("[data-strum]")];
  const overlay = $("jam-overlay"), judgement = $("jam-judgement");
  const status = $("jam-message"), best = $("jam-best");
  const syncInput = $("jam-sync-offset"), syncValue = $("jam-sync-value"), chartStatus = $("jam-chart-status");
  const gameStage = document.querySelector(".jam-stage");
  const radioPanel = $("jam-radio-player-panel"), radioControl = $("jam-radio-audio"),
        audioStatus = $("jam-audio-status"), retryAudio = $("jam-retry-audio");
  const songLoad = $("jam-song-load"), loadBar = $("jam-song-load-bar"),
        loadFill = $("jam-song-load-fill"), loadValue = $("jam-song-load-value"),
        loadStatus = $("jam-song-load-status");
  let loadHideTimer = null;
  const colors = ["#61ea82","#fd6384","#ffe16a","#65bfff","#ff9f42"];
  const keys = ["a","s","d","j","k"];
  const songs = {
    neon: {title:"Neon Rush",bpm:118,bars:20,root:52,seed:1,wave:"sawtooth",scale:[0,3,5,7,10,12,15,17],progression:[0,5,3,7]},
    pixel: {title:"Pixel Thunder",bpm:146,bars:24,root:50,seed:3,wave:"square",scale:[0,2,5,7,9,12,14,17],progression:[0,7,5,3]},
    starlight: {title:"Starlight Solo",bpm:104,bars:20,root:53,seed:4,wave:"triangle",scale:[0,2,4,7,9,12,14,16],progression:[0,4,5,7]},
    golden: {title:"Golden · HUNTR/X",radio:true,path:"tracks/4c25e71528734dac8763825b46ed23d2.mp3",bpm:123,bars:95,root:52,seed:2,wave:"triangle",scale:[0,3,5,7,10,12,15,17],progression:[0,5,3,7]}
  };
  // Dedicated recording; never imports the sitewide radio song library.
  const radioBase="https://hsxdyxdazsdmpucyhqly.supabase.co/storage/v1/object/public/site-music/";
  const AC = window.AudioContext || window.webkitAudioContext;
  let audio = null, master = null, noiseBuffer = null;
  let radioAudio = null, isRadio = false, loadSerial = 0, appliedOffset = 0;
  // Retain loaded charts in memory so replaying or switching difficulties is instant.
  const chartRequests = new Map();
  let track = songs.neon, notes = [], state = "ready", startAt = 0;
  let beatNext = 0, raf = 0, score = 0, combo = 0, judged = 0, weighted = 0, health = 75;
  let charge = 0, hypeEnd = 0, feedbackUntil = 0;
  let totalTime = 0, activeDifficulty = "normal";
  // Keep rendering and missed-note checks proportional to the visible song section.
  let missCursor = 0, lastHudFrame = 0;
  const heldFrets=new Set();
  let activeSustains=[];
  const isGuitarMode=()=>playStyleSelect?.value==="strum";
  function resetFrets(){
    heldFrets.clear();activeSustains=[];
    for(const button of controls)button.classList.remove("is-held");
  }
  function applyPlayStyle(){
    gameStage?.classList.toggle("is-strum",isGuitarMode());
    try{localStorage.setItem("ctoon-jam-play-style-v1",playStyleSelect.value)}catch{}
  }

  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  function showSongLoading(message, percent=null) {
    if(!songLoad || !loadBar || !loadFill || !loadValue || !loadStatus)return;
    if(loadHideTimer!==null){clearTimeout(loadHideTimer);loadHideTimer=null;}
    songLoad.hidden=false;
    const known=Number.isFinite(percent);
    const value=known?clamp(Math.floor(percent),0,100):0;
    songLoad.classList.toggle("is-indeterminate",!known);
    loadFill.style.width=known?value+"%":"35%";
    loadValue.textContent=known?value+"%":"…";
    loadStatus.textContent=message;
    loadBar.setAttribute("aria-valuetext",message);
    if(known)loadBar.setAttribute("aria-valuenow",String(value));
    else loadBar.removeAttribute("aria-valuenow");
  }
  function hideSongLoading(delay=0,serial=loadSerial) {
    if(loadHideTimer!==null){clearTimeout(loadHideTimer);loadHideTimer=null;}
    if(!songLoad)return;
    if(!delay){songLoad.hidden=true;return;}
    loadHideTimer=setTimeout(()=>{if(serial===loadSerial)songLoad.hidden=true;loadHideTimer=null;},delay);
  }
  function songBufferedPercent(media) {
    if(!Number.isFinite(media.duration)||media.duration<=0)return null;
    let end=0;
    try{
      for(let i=0;i<media.buffered.length;i++){
        if(media.buffered.start(i)<=.2)end=Math.max(end,media.buffered.end(i));
      }
    }catch{return null;}
    return clamp(100*end/media.duration,0,100);
  }
  const beatSeconds = () => 60 / track.bpm;
  const songTime = () => isRadio ? (radioAudio ? radioAudio.currentTime : 0) : (audio ? audio.currentTime - startAt : -3);
  const fmt = number => number.toLocaleString("en-US");
  const keyForScore = () => "ctoon-jam-best-v1-" + songSelect.value + "-" + difficultySelect.value;
  function offsetKey() { return "ctoon-jam-chart-offset-v1:"+songSelect.value; }
  function readOffset() {
    let value=0;
    try {value=Number(localStorage.getItem(offsetKey())||0);}catch{}
    return Number.isFinite(value)?clamp(Math.round(value*20)/20,-2,2):0;
  }
  function setupOffset() {
    appliedOffset=readOffset();
    if(syncInput){syncInput.value=String(appliedOffset);syncInput.disabled=!isRadio;}
    if(syncValue)syncValue.textContent=(appliedOffset>=0?"+":"")+appliedOffset.toFixed(2)+"s";
  }
  function getTrackChart(song) {
    if(!song || !song.radio)return Promise.resolve(null);
    const key=song.path;
    if(!chartRequests.has(key)){
      const request=loadTrackChart(song).then(result=>{
        // Missing/failed files may become available later; do not cache failures forever.
        if(!result)chartRequests.delete(key);
        return result;
      });
      chartRequests.set(key,request);
    }
    return chartRequests.get(key);
  }
  async function loadTrackChart(song) {
    const match=/^tracks\/([a-z0-9_-]+)\.(mp3|ogg|wav)$/i.exec(song.path||"");
    if(!match)return null;
    // A missing abort API must not prevent the song from starting.
    const controller=typeof AbortController==="function"?new AbortController():null;
    const timeout=controller?setTimeout(()=>controller.abort(),5000):null;
    try{
      const options={cache:"default"};
      if(controller)options.signal=controller.signal;
      const response=await fetch("ctoon-jam-charts/"+match[1]+".json?v=3",options);
      if(!response.ok)return null;
      const data=await response.json();
      if(data.format!=="ctoon-jam-chart"||data.version!==1||data.sourceStoragePath!==song.path||
         !Number.isFinite(data.bpm)||data.bpm<50||data.bpm>220||!data.difficultyNotes)return null;
      for(const difficulty of ["easy","normal","hard"]){
        const rows=data.difficultyNotes[difficulty];
        if(!Array.isArray(rows)||rows.length===0||rows.length>10000)return null;
        if(rows.some(row=>!Array.isArray(row)||(row.length!==2&&row.length!==3)||!Number.isFinite(row[0])||row[0]<0||row[0]>900||
           !Number.isInteger(row[1])||row[1]<0||row[1]>4||(row.length===3&&(!Number.isFinite(row[2])||row[2]<0||row[2]>15))))return null;
      }
      return data;
    }catch(error){
      console.warn("CToon Jam chart not available:",song.title,error);
      return null;
    }finally{if(timeout!==null)clearTimeout(timeout);}
  }
  function notesFromChart(chart,duration) {
    const offset=(Number(chart.offsetSeconds)||0)+appliedOffset;
    const limit=Number.isFinite(duration)&&duration>0?duration-.2:390;
    const raw=chart.difficultyNotes[activeDifficulty]||chart.difficultyNotes.normal;
    return raw.map(([seconds,lane,duration=0])=>({at:seconds+offset,lane,duration,judged:false}))
              .filter(note=>note.at>=0&&note.at<limit)
              .sort((a,b)=>a.at-b.at);
  }

  function makeNotes(){
    const result=[],beatLen=beatSeconds(),level=difficultySelect.value;
    const add=(at,lane,duration=0)=>result.push({at,lane,duration,judged:false});
    for(let i=0;i<track.bars*4;i++){
      const lane=(i*3+Math.floor(i/4)+track.seed)%5;
      const at=(i+4)*beatLen;
      add(at,lane,i%12===6?beatLen*1.6:i%16===11?beatLen*.9:0);
      if(level!=="easy"&&i%8===4)add(at,(lane+2)%5);
      if(level==="hard"&&i%16===10)add(at,(lane+4)%5);
      if(level!=="easy"&&(level==="hard"||i%2===1))add(at+beatLen*.5,(lane+2+(i%2))%5);
    }
    result.sort((a,b)=>a.at-b.at||a.lane-b.lane);
    return result;
  }
  function makeNoise() {
    const length = Math.ceil(audio.sampleRate*.16);
    noiseBuffer = audio.createBuffer(1,length,audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random()*2-1) * (1-i/length);
  }
  function freq(midi) { return 440*Math.pow(2,(midi-69)/12); }
  function voice(pitch,when,duration,type="triangle",volume=.07) {
    if (!audio || !master) return;
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq(pitch),when);
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,when+Math.max(.05,duration));
    osc.connect(gain);gain.connect(master);
    osc.start(when);osc.stop(when+Math.max(.05,duration)+.02);
  }
  function drum(when,snare=false,hat=false) {
    if (!audio || !master) return;
    if (!snare && !hat) {
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.type="sine";
      osc.frequency.setValueAtTime(140,when);
      osc.frequency.exponentialRampToValueAtTime(48,when+.14);
      gain.gain.setValueAtTime(.20,when);
      gain.gain.exponentialRampToValueAtTime(.0001,when+.19);
      osc.connect(gain);gain.connect(master);osc.start(when);osc.stop(when+.2);
      return;
    }
    const source=audio.createBufferSource(),gain=audio.createGain(),filter=audio.createBiquadFilter();
    source.buffer=noiseBuffer;filter.type="highpass";filter.frequency.value=hat?5000:1350;
    gain.gain.setValueAtTime(hat?.035:.10,when);
    gain.gain.exponentialRampToValueAtTime(.0001,when+(hat?.07:.14));
    source.connect(filter);filter.connect(gain);gain.connect(master);
    source.start(when);source.stop(when+(hat?.075:.15));
  }
  function scheduleBeat(i,when) {
    const step=beatSeconds(), bar=Math.floor(i/4), chord=track.progression[bar%track.progression.length];
    drum(when,i%4===1 || i%4===3);
    drum(when+step*.5,false,true);
    if (i%4===0) {
      voice(track.root-12+chord,when,step*3.7,"triangle",.085);
      voice(track.root-5+chord,when,step*3.7,"triangle",.035);
    }
    if (i>=4 && i<4+track.bars*4) {
      const pos=i-4;
      const pitch=track.root+12+track.scale[(pos*3+Math.floor(pos/4)+track.seed)%track.scale.length];
      voice(pitch,when,step*.46,track.wave,.045);
      if (pos%2===1) voice(pitch-5,when+step*.5,step*.25,track.wave,.028);
    }
  }
  function scheduleMusic() {
    const maxBeat=4+track.bars*4;
    while (beatNext < maxBeat && startAt+beatNext*beatSeconds() <= audio.currentTime+.25) {
      scheduleBeat(beatNext,startAt+beatNext*beatSeconds());
      beatNext++;
    }
  }

  function showOverlay(heading,message) {
    overlay.hidden=false;
    overlay.querySelector("strong").textContent=heading;
    overlay.querySelector("span").textContent=message;
  }
  function hideOverlay() { overlay.hidden=true; }
  function refreshBest() {
    let stored=null;
    try { stored=JSON.parse(localStorage.getItem(keyForScore()) || "null"); } catch {}
    best.textContent=stored && typeof stored.score === "number"
      ? track.title+" · "+difficultySelect.value.toUpperCase()+" · "+fmt(stored.score)+" points · "+stored.accuracy+"% accuracy"
      : "No completed run yet for "+track.title+" on "+difficultySelect.value+".";
  }
  function updateHud() {
    $("jam-score").textContent=fmt(score);
    $("jam-combo").textContent=fmt(combo);
    const hypeActive=state==="playing" && hypeEnd>0 && songTime()<hypeEnd;
    const multiplier=Math.min(4,1+Math.floor(combo/10)) * (hypeActive?2:1);
    $("jam-multiplier").textContent="×"+multiplier;
    $("jam-accuracy").textContent=judged ? Math.round(100*weighted/judged)+"%" : "—";
    $("jam-rock-fill").style.width=health+"%";
    $("jam-hype-fill").style.width=(hypeActive?100:charge)+"%";
    hypeBtn.textContent=hypeActive?"★ HYPE MODE ACTIVE":"★ Activate Hype (Space)";
    hypeBtn.classList.toggle("is-active",hypeActive);
    hypeBtn.disabled=state!=="playing" || hypeActive || charge<50;
    const progress=clamp(100*Math.max(0,songTime())/Math.max(1,totalTime),0,100);
    $("jam-progress-fill").style.width=progress+"%";
    $("jam-progress").setAttribute("aria-valuenow",String(Math.round(progress)));
  }
  function feedback(label,color) {
    judgement.textContent=label;
    judgement.style.color=color;
    feedbackUntil=performance.now()+430;
  }
  function registerMiss() {
    judged++;combo=0;health=clamp(health-2,0,100);
    feedback("MISS","#ff718b");
  }
  function hit(lane) {
    if (state!=="playing" || (isRadio ? !radioAudio : !audio)) return;
    const t=songTime();
    let candidate=null,bestDiff=Infinity;
    for (let i=missCursor;i<notes.length;i++) {
      const note=notes[i];
      if(note.at>t+.22)break;
      if (note.judged || note.lane!==lane) continue;
      const offset=Math.abs(t-note.at);
      if(offset<bestDiff && offset<=.22){candidate=note;bestDiff=offset;}
      if(note.at>t+.22) break;
    }
    if(!candidate){feedback("OFF BEAT","#9296bf");return;}
    awardNote(candidate,bestDiff,t);
  }
  function awardNote(candidate,bestDiff,t){
    candidate.judged=true;
    if(candidate.duration>=.2)activeSustains.push({note:candidate,lastAt:candidate.at});

    const quality=bestDiff<=.085?"PERFECT":bestDiff<=.15?"GREAT":"GOOD";
    const value=quality==="PERFECT"?1:quality==="GREAT"?.75:.5;
    combo++;judged++;weighted+=value;
    const hypeActive=hypeEnd>0 && t<hypeEnd;
    const multiplier=Math.min(4,1+Math.floor(combo/10))*(hypeActive?2:1);
    score+=Math.round(value*100*multiplier);
    health=clamp(health+1.5,0,100);
    if(!hypeActive) charge=clamp(charge+2.5,0,100);
    feedback(quality+(combo>1?" · "+combo+" COMBO":""),quality==="PERFECT"?"#98fbf7":quality==="GREAT"?"#f7e879":"#fff");
    if (!isRadio && audio && master) voice(track.root+12+track.scale[candidate.lane%track.scale.length],audio.currentTime,.13,"triangle",.04);
    updateHud();
  }

  // Guitar mode: held frets must match the chord at the next strikeline.
  function strum(){
    if(!isGuitarMode()||state!=="playing")return;
    const t=songTime();
    if(t<0)return;
    let closest=null,diff=Infinity;
    for(let i=missCursor;i<notes.length;i++){
      const n=notes[i];
      if(n.at>t+.22)break;
      if(n.judged)continue;
      const d=Math.abs(t-n.at);
      if(d<=.22&&d<diff){closest=n;diff=d;}
    }
    if(!closest){combo=0;health=clamp(health-1.5,0,100);feedback("OVERSTRUM","#ff8198");updateHud();return;}
    const group=[];
    for(let i=missCursor;i<notes.length;i++){
      const n=notes[i];
      if(n.at>closest.at+.025)break;
      if(!n.judged&&Math.abs(n.at-closest.at)<=.025)group.push(n);
    }
    const needed=new Set(group.map(n=>n.lane));
    if(needed.size!==heldFrets.size||[...needed].some(lane=>!heldFrets.has(lane))){
      combo=0;health=clamp(health-1.5,0,100);feedback("WRONG FRETS","#ff8198");updateHud();return;
    }
    for(const n of group)awardNote(n,Math.abs(t-n.at),t);
    if(group.length>1)feedback("CHORD! · "+combo+" STREAK","#94fbff");
  }
  function updateSustains(t){
    if(!activeSustains.length)return;
    const next=[];
    for(const hold of activeSustains){
      const end=hold.note.at+hold.note.duration;
      if(!heldFrets.has(hold.note.lane))continue;
      const ticks=Math.floor((Math.min(end,t)-hold.lastAt)/.1);
      if(ticks>0){
        score+=ticks*10*Math.min(4,1+Math.floor(combo/10))*(hypeEnd>t?2:1);
        hold.lastAt+=ticks*.1;
      }
      if(t<end)next.push(hold);
    }
    activeSustains=next;
  }
  function pressFret(lane){
    if(heldFrets.has(lane))return;
    heldFrets.add(lane);controls[lane]?.classList.add("is-held");
    if(!isGuitarMode())hit(lane);
  }
  function releaseFret(lane){
    heldFrets.delete(lane);controls[lane]?.classList.remove("is-held");
  }
  function activateHype() {

    if (state!=="playing" || charge<50 || (hypeEnd>0 && songTime()<hypeEnd)) return;
    charge=0;hypeEnd=songTime()+8;
    feedback("HYPE MODE!","#f9c8ff");updateHud();
  }
  function saveBest() {
    const accuracy=judged?Math.round(100*weighted/judged):0;
    let previous=null;
    try {previous=JSON.parse(localStorage.getItem(keyForScore())||"null");}catch{}
    if (!previous || score>previous.score) {
      try {localStorage.setItem(keyForScore(),JSON.stringify({score,accuracy}));}catch{}
    }
  }
  function finishSong(failed=false) {
    if(!["playing","paused","buffering"].includes(state))return;
    state="finished";
    cancelAnimationFrame(raf);
    if(radioAudio){radioAudio.pause();}
    hideSongLoading();
    resetFrets();
    if(audio&&audio.state==="running")audio.suspend().catch(()=>{});
    songSelect.disabled=false;difficultySelect.disabled=false;pauseBtn.disabled=true;
    if(playStyleSelect)playStyleSelect.disabled=false;
    playBtn.disabled=false;playBtn.textContent="↻ Play Again";
    if(!failed)saveBest();
    const accuracy=judged?Math.round(100*weighted/judged):0;
    showOverlay(failed?"ROCK METER EMPTY":"SONG COMPLETE!",fmt(score)+" points · "+accuracy+"% accuracy · Best combo "+fmt(maxCombo));
    status.textContent=failed?"The crowd needs another try. Restart the track!":"Great performance! Select another track or try for a higher score.";
    refreshBest();updateHud();draw();
  }
  let maxCombo=0;
  function checkMisses(t) {
    // Notes are ordered; never rescan the entire song on every animation frame.
    while(missCursor<notes.length){
      const note=notes[missCursor];
      if(note.judged){missCursor++;continue;}
      if(t-note.at<=.22)break;
      note.judged=true;registerMiss();missCursor++;
    }
    maxCombo=Math.max(maxCombo,combo);
    // Let streamed songs finish even if players miss many notes.
    if(health<=0 && !isRadio)finishSong(true);
  }
  function draw(){
    const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
    if(!w||!h)return;
    const dpr=Math.min(window.innerWidth<=650?1.5:2,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    }
    pen.setTransform(dpr,0,0,dpr);pen.clearRect(0,0,w,h);
    const backdrop=pen.createLinearGradient(0,0,0,h);
    backdrop.addColorStop(0,"#24104c");backdrop.addColorStop(.48,"#0d0f30");backdrop.addColorStop(1,"#060919");
    pen.fillStyle=backdrop;pen.fillRect(0,0,w,h);
    const t=Math.max(-2,songTime()),top=h*.045,hitY=h*.80,center=w*.5;
    const bottomWidth=Math.min(w*.96,740),topWidth=bottomWidth*.4;
    const widthAt=y=>topWidth+(bottomWidth-topWidth)*Math.pow(clamp((y-top)/(hitY-top),0,1),1.12);
    const edge=(lane,y)=>center+(lane/5-.5)*widthAt(y);
    const speed=2.85;
    const yAt=time=>top+(hitY-top)*Math.pow(clamp(1-(time-t)/speed,0,1),1.45);
    const bgGlow=pen.createRadialGradient(center,top,4,center,top,h*.95);
    bgGlow.addColorStop(0,"#945aff55");bgGlow.addColorStop(1,"#19123b00");
    pen.fillStyle=bgGlow;pen.fillRect(0,0,w,h);
    // Five-lane trapezoid gives notes a genuine descending perspective.
    for(let lane=0;lane<5;lane++){
      pen.beginPath();pen.moveTo(edge(lane,top),top);pen.lineTo(edge(lane+1,top),top);
      pen.lineTo(edge(lane+1,h),h);pen.lineTo(edge(lane,h),h);pen.closePath();
      pen.fillStyle=lane%2?"#212342":"#111832";pen.fill();
      pen.beginPath();pen.moveTo(edge(lane,top),top);pen.lineTo(edge(lane,h),h);
      pen.strokeStyle="#b8a6f958";pen.lineWidth=2;pen.stroke();
    }
    pen.beginPath();pen.moveTo(edge(5,top),top);pen.lineTo(edge(5,h),h);
    pen.strokeStyle="#b8a6f958";pen.lineWidth=2;pen.stroke();
    pen.beginPath();pen.moveTo(edge(0,top),top);pen.lineTo(edge(5,top),top);
    pen.lineTo(edge(5,h),h);pen.lineTo(edge(0,h),h);pen.closePath();
    pen.strokeStyle="#966cf5";pen.lineWidth=3;pen.stroke();
    const beat=beatSeconds();
    const first=Math.ceil(Math.max(0,t)/beat)*beat;
    for(let i=0;i<12;i++){
      const next=first+i*beat;
      if(next>t+speed)break;
      const y=yAt(next);
      pen.beginPath();pen.moveTo(edge(0,y),y);pen.lineTo(edge(5,y),y);
      pen.strokeStyle=i%4===0?"#dbcfff74":"#a6b0ea33";
      pen.lineWidth=i%4===0?2:1;pen.stroke();
    }
    // Only draw visible chart notes, avoiding full-song 60fps scans.
    for(let i=Math.max(0,missCursor-5);i<notes.length;i++){
      const note=notes[i];
      if(note.at>t+speed+.02)break;
      if(note.judged||note.at<t-.25)continue;
      const y=yAt(note.at),x=(edge(note.lane,y)+edge(note.lane+1,y))*.5;
      const laneWidth=widthAt(y)/5;
      if(note.duration>0){
        const farY=yAt(note.at+note.duration);
        const farX=(edge(note.lane,farY)+edge(note.lane+1,farY))*.5;
        pen.beginPath();pen.moveTo(x,y);pen.lineTo(farX,farY);
        pen.strokeStyle=colors[note.lane]+"ba";pen.lineWidth=Math.max(6,laneWidth*.3);
        pen.shadowColor=colors[note.lane];pen.shadowBlur=12;pen.stroke();pen.shadowBlur=0;
      }
      const rx=Math.max(6,laneWidth*.36),ry=Math.max(4.5,rx*.38);
      pen.fillStyle="#040615";pen.beginPath();pen.ellipse(x,y+ry*.45,rx*1.16,ry*1.22,0,0,2*Math.PI);pen.fill();
      pen.fillStyle=colors[note.lane];pen.shadowColor=colors[note.lane];pen.shadowBlur=18;
      pen.beginPath();pen.ellipse(x,y,rx,ry,0,0,2*Math.PI);pen.fill();pen.shadowBlur=0;
      pen.strokeStyle="#ffffff9c";pen.lineWidth=Math.max(1,rx*.1);pen.stroke();
      pen.fillStyle="#fffc";pen.beginPath();pen.ellipse(x,y-ry*.35,rx*.57,ry*.2,0,0,2*Math.PI);pen.fill();
    }
    for(const hold of activeSustains){
      const note=hold.note,end=note.at+note.duration;
      if(t>=end||!heldFrets.has(note.lane))continue;
      const farY=yAt(end),farX=(edge(note.lane,farY)+edge(note.lane+1,farY))*.5;
      const nearX=(edge(note.lane,hitY)+edge(note.lane+1,hitY))*.5;
      pen.beginPath();pen.moveTo(farX,farY);pen.lineTo(nearX,hitY);
      pen.strokeStyle=colors[note.lane]+"d4";pen.lineWidth=Math.max(7,widthAt(hitY)/5*.18);
      pen.shadowColor=colors[note.lane];pen.shadowBlur=16;pen.stroke();pen.shadowBlur=0;
    }
    // Fixed strikeline and illuminated fret receptors.
    pen.beginPath();pen.moveTo(edge(0,hitY),hitY);pen.lineTo(edge(5,hitY),hitY);
    pen.strokeStyle="#f0faff";pen.lineWidth=6;pen.shadowColor="#66d8ff";pen.shadowBlur=22;pen.stroke();pen.shadowBlur=0;
    for(let lane=0;lane<5;lane++){
      const x=(edge(lane,hitY)+edge(lane+1,hitY))*.5;
      const radius=Math.min(27,widthAt(hitY)/5*.29);
      pen.fillStyle=heldFrets.has(lane)?"#ffffff":colors[lane];
      pen.shadowColor=colors[lane];pen.shadowBlur=heldFrets.has(lane)?34:13;
      pen.beginPath();pen.ellipse(x,hitY+18,radius,11,0,0,2*Math.PI);pen.fill();pen.shadowBlur=0;
      pen.strokeStyle=colors[lane];pen.lineWidth=3;pen.stroke();
      pen.fillStyle="#f7f7ff";pen.font="900 "+Math.max(12,Math.min(19,w/30))+"px system-ui";pen.textAlign="center";
      pen.fillText(keys[lane].toUpperCase(),x,Math.min(h-12,hitY+59));
    }
    if(state==="playing"&&hypeEnd>0&&t<hypeEnd){
      pen.fillStyle="#e09bff12";pen.fillRect(0,0,w,h);
      pen.fillStyle="#ffe1ff";pen.font="900 19px system-ui";pen.textAlign="center";
      pen.fillText("★ HYPE MODE ★",center,top+33);
    }
    if(state==="playing"&&t<0){
      pen.fillStyle="#fff";pen.font="900 42px system-ui";pen.textAlign="center";
      pen.shadowColor="#58d6ff";pen.shadowBlur=16;pen.fillText("GET READY!",center,h*.28);pen.shadowBlur=0;
    }
  }
  function tick() {
    // The static note highway is already painted while loading; don't spin at 60fps.
    if(state!=="playing")return;
    const t=songTime();
    if(!isRadio)scheduleMusic();
    checkMisses(t);
    updateSustains(t);
    if(state!=="playing")return;
    if(performance.now()>feedbackUntil)judgement.textContent="";
    maxCombo=Math.max(maxCombo,combo);
    const frameTime=performance.now();
    if(frameTime-lastHudFrame>=50){updateHud();lastHudFrame=frameTime;}
    draw();
    if(isRadio){if(radioAudio && radioAudio.ended){finishSong();return;}}
    else if(t>totalTime+.65){finishSong();return;}
    raf=requestAnimationFrame(tick);
  }
  // All radio playback is driven by the browser's native audio element.
  // The note highway never waits on a dangling media.play() Promise.
  async function startSong(forceReload=false) {
    const current=++loadSerial;
    resetFrets();
    cancelAnimationFrame(raf);
    if(radioAudio){
      const previous=radioAudio;
      previous.onplaying=null;previous.onpause=null;previous.onwaiting=null;
      previous.onstalled=null;previous.onerror=null;previous.onended=null;previous.oncanplay=null;
      previous.onloadedmetadata=null;previous.onseeked=null;
      previous.onprogress=null;previous.ondurationchange=null;previous.onloadeddata=null;
      previous.pause();
      // Preserve the MP3 URL and buffered bytes for a fast replay.
      radioAudio=null;
    }
    if(audio){audio.close().catch(()=>{});audio=null;}
    master=null;
    track=songs[songSelect.value]||songs.neon;
    isRadio=!!track.radio;
    activeDifficulty=difficultySelect.value;
    setupOffset();
    if(playStyleSelect)playStyleSelect.disabled=false;
    if(radioPanel)radioPanel.hidden=!isRadio;
    if(chartStatus)chartStatus.textContent=isRadio?"Loading song chart in parallel…":"Playing original arcade chart.";
    const chartPromise=isRadio?getTrackChart(track):Promise.resolve(null);
    state="loading";
    showSongLoading(isRadio?"Connecting to "+track.title+"…":"Preparing "+track.title+"…");
    // Never lock the restart button while waiting for network audio.
    playBtn.disabled=false;playBtn.textContent="↻ Retry Start";
    pauseBtn.disabled=true;songSelect.disabled=false;difficultySelect.disabled=false;
    score=0;combo=0;maxCombo=0;judged=0;weighted=0;health=75;charge=0;hypeEnd=0;beatNext=0;
    notes=makeNotes();missCursor=0;lastHudFrame=0;
    if(isRadio&&appliedOffset)for(const note of notes)note.at+=appliedOffset;
    totalTime=isRadio?180:(4+track.bars*4)*beatSeconds();
    showOverlay("GETTING SONG READY",isRadio?"Audio player is available above. You can press its Play button if playback does not begin.":"Preparing original arcade track…");
    judgement.textContent="";
    status.textContent="Preparing "+track.title+"…";
    draw();updateHud();
    if(isRadio){
      const media=radioControl;
      if(!media){state="ready";cancelAnimationFrame(raf);status.textContent="Golden player is unavailable.";showOverlay("PLAYER UNAVAILABLE","Refresh the game page and try again.");return;}
      radioAudio=media;
      media.preload="auto";
      media.volume=.75;
      media.muted=muteInput.checked;
      const sourceUrl=radioBase+encodeURI(track.path);
      const canReuse=!forceReload && media.getAttribute("src")===sourceUrl && !media.error;
      if(!canReuse){
        media.src=sourceUrl;
        // An explicit Retry Audio can force a new attempt after a network failure.
        if(forceReload)media.load();
      }else if(media.readyState>=1){
        try{media.currentTime=0;}catch{}
      }
      audioStatus.textContent=canReuse?"Song ready from previous load. Starting…":"Connecting to "+track.title+"…";
      let started=false;
      let loadingTimeout=null;
      let loadedChart=null;
      const valid=()=>current===loadSerial && radioAudio===media;
      const refreshAudioLoading=(message)=>{
        if(!valid() || !["loading","buffering","ready"].includes(state))return;
        const ready=media.readyState>=3 && state!=="buffering";
        showSongLoading(message||(state==="buffering"?"Buffering audio…":ready?"Ready to play · streaming in background":"Loading "+track.title+"…"),songBufferedPercent(media));
      };
      refreshAudioLoading();
      // Display real notes while the MP3 buffers instead of an empty highway.
      chartPromise.then(chart=>{
        if(!valid() || state==="finished")return;
        loadedChart=chart;
        if(chart){
          track.bpm=chart.bpm;
          const duration=Number.isFinite(media.duration)&&media.duration>0?media.duration:undefined;
          const prepared=notesFromChart(chart,duration);
          const t=media.currentTime||0;
          for(const note of prepared)if(note.at<t-.22)note.judged=true;
          notes=prepared;missCursor=0;
          if(chartStatus)chartStatus.textContent="Loaded "+activeDifficulty+" chart · "+track.bpm+" BPM · "+notes.length+" notes · timing draft.";
        }else if(chartStatus){
          chartStatus.textContent="Chart unavailable — using practice notes.";
        }
        draw();updateHud();
      }).catch(error=>{
        if(valid()&&chartStatus)chartStatus.textContent="Chart unavailable — using practice notes.";
        console.warn("CToon Jam chart error:",error);
      });
      const enterPlaying=()=>{
        if(!valid())return;
        if(state==="playing")return;
        if(state==="paused" || state==="buffering"){
          state="playing";
          hideOverlay();hideSongLoading();pauseBtn.disabled=false;pauseBtn.textContent="Pause";
          status.textContent="Audio resumed. Continue playing!";
          audioStatus.textContent="Golden is playing.";
          cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
          return;
        }
        if(state!=="loading" && state!=="ready")return;
        if(loadingTimeout!==null){clearTimeout(loadingTimeout);loadingTimeout=null;}
        started=true;
        const duration=Number.isFinite(media.duration)&&media.duration>0?media.duration:180;
        totalTime=duration;
        track.bars=Math.max(1,Math.min(240,Math.floor((duration-4*beatSeconds())/(4*beatSeconds()))));
        // Preserve a chart that loaded before audio playback was allowed.
        notes=loadedChart?notesFromChart(loadedChart,duration):makeNotes();missCursor=0;
        if(!loadedChart && appliedOffset)for(const note of notes)note.at+=appliedOffset;
        const now=media.currentTime||0;
        for(const note of notes)if(note.at<now-.22)note.judged=true;
        state="playing";hideSongLoading();playBtn.disabled=false;playBtn.textContent="↻ Restart Song";
        pauseBtn.disabled=false;pauseBtn.textContent="Pause";
        songSelect.disabled=true;difficultySelect.disabled=true;
        if(playStyleSelect)playStyleSelect.disabled=true;
        hideOverlay();
        audioStatus.textContent="Now streaming "+track.title+".";
        status.textContent="Now playing "+track.title+" · "+activeDifficulty.toUpperCase()+". Hold frets and strum, or use Tap Style next song.";
        // Also restart rendering when playback begins after a timeout or blocked autoplay.
        cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
        draw();updateHud();
      };
      const errorMessage=()=>{
        if(loadingTimeout!==null){clearTimeout(loadingTimeout);loadingTimeout=null;}
        const err=media.error;
        showSongLoading("Audio loading failed · choose Retry Audio");
        const reason=err&&err.code===4?"The recording format or URL is unsupported."
          :err&&err.code===3?"The browser could not decode this MP3."
          :err&&err.code===2?"The network connection interrupted audio loading."
          :"Audio could not be loaded.";
        audioStatus.textContent=reason+" Press Retry Audio or the player's Play button.";
        status.textContent=reason+" Try a different song if it keeps failing.";
        if(["loading","buffering","playing","paused"].includes(state)){
          state="ready";
          if(playStyleSelect)playStyleSelect.disabled=false;
          cancelAnimationFrame(raf);
          showOverlay("AUDIO LOAD FAILED",reason+" Use Retry Audio above or select another song.");
          playBtn.disabled=false;playBtn.textContent="↻ Retry Start";
          pauseBtn.disabled=true;songSelect.disabled=false;difficultySelect.disabled=false;
        }
      };
      media.onplaying=enterPlaying;
      media.onloadedmetadata=()=>{
        if(valid()&&Number.isFinite(media.duration)&&media.duration>0){
          totalTime=media.duration;updateHud();
        }
        refreshAudioLoading();
      };
      media.ondurationchange=()=>refreshAudioLoading();
      media.onprogress=()=>refreshAudioLoading();
      media.onloadeddata=()=>refreshAudioLoading();
      media.onseeked=()=>{
        if(!valid())return;
        // Skipping ahead shouldn't count skipped notes as misses.
        for(const note of notes)if(note.at<media.currentTime-.22)note.judged=true;
        draw();updateHud();
      };
      media.oncanplay=()=>{
        if(valid()&&state==="loading"){
          audioStatus.textContent="Audio is ready. Press Play in the player if the song has not started.";
          refreshAudioLoading("Ready to play · audio streaming");
        }
      };
      media.onwaiting=()=>{
        if(!valid())return;
        audioStatus.textContent="Waiting for more audio to buffer…";
        if(state==="playing"){
          state="buffering";cancelAnimationFrame(raf);
          showOverlay("AUDIO BUFFERING","Playback will resume with the music when enough audio loads.");
          refreshAudioLoading("Buffering "+track.title+"…");
        }
      };
      media.onstalled=()=>{
        if(valid()){audioStatus.textContent="Golden audio stalled. Try Play or Retry Audio.";refreshAudioLoading("Audio stalled · waiting for connection");}
      };
      media.onpause=()=>{
        if(!valid())return;
        if(state==="playing"||state==="buffering"){
          state="paused";cancelAnimationFrame(raf);
          pauseBtn.textContent="Resume";showOverlay("PAUSED","Press Play in the song player or Resume to continue.");
          status.textContent="Golden paused.";
        }
      };
      media.onerror=()=>{if(valid())errorMessage();};
      media.onended=()=>{if(valid()&&["playing","paused","buffering"].includes(state))finishSong();};
      // Show a specific, actionable message if play() takes too long.
      loadingTimeout=setTimeout(()=>{
        if(valid()&&state==="loading"&&!started){
          state="ready";
          cancelAnimationFrame(raf);
          showOverlay("AUDIO STILL LOADING","Try pressing Play in the visible audio player, or tap Retry Audio. You can also choose another song.");
          audioStatus.textContent="This recording is taking too long to start. Use the player controls or Retry Audio.";
          status.textContent="Waiting for "+track.title+" to stream. The song has not begun yet.";
          refreshAudioLoading("Still loading · tap Play or Retry Audio if needed");
          playBtn.textContent="↻ Retry Start";
        }
      },12000);
      // This is called directly inside the song selection gesture for mobile support.
      try{
        const promise=media.play();
        if(promise&&typeof promise.then==="function"){
          promise.then(()=>{
            if(valid()&&!media.paused)enterPlaying();
          }).catch(error=>{
            if(!valid())return;
            if(error&&error.name==="AbortError")return;
            state="ready";cancelAnimationFrame(raf);
            const blocked=error&&error.name==="NotAllowedError";
            refreshAudioLoading(blocked?"Tap Play in the audio player to start":"Waiting for audio · tap Play or Retry Audio");
            audioStatus.textContent=blocked
              ?"Autoplay was blocked. Tap Play in the song audio player."
              :"The browser could not start audio. Tap Play or Retry Audio.";
            status.textContent=blocked?"Tap the song player's Play button to begin.":"Try Play in the radio player or select a different song.";
            showOverlay("TAP PLAY TO START",blocked?"Your browser requires a direct tap on the audio player.":"Use the player above to start this recording.");
            if(loadingTimeout!==null){clearTimeout(loadingTimeout);loadingTimeout=null;}
          });
        }
      }catch(error){
        if(valid()){
          state="ready";cancelAnimationFrame(raf);
          audioStatus.textContent="Browser audio error: "+(error.message||"unable to play");
          refreshAudioLoading("Tap Play in the audio player to start");
          showOverlay("TAP PLAY TO START","Use Play in the visible radio player or Retry Audio.");
          if(loadingTimeout!==null){clearTimeout(loadingTimeout);loadingTimeout=null;}
        }
      }
      return;
    }
    // The original synthesizer tracks still use the existing Web Audio engine.
    try{
      if(!AC)throw new Error("This browser does not support Web Audio.");
      audio=new AC();
      master=audio.createGain();master.gain.value=muteInput.checked?0:.46;master.connect(audio.destination);
      makeNoise();
      // Some mobile browsers leave resume() pending until a fresh user tap.
      let resumeTimeout;
      try{
        await Promise.race([
          audio.resume(),
          new Promise((_,reject)=>{
            resumeTimeout=setTimeout(()=>reject(new Error("Audio did not start. Tap Retry Start to try again.")),7000);
          })
        ]);
      }finally{clearTimeout(resumeTimeout);}
      if(current!==loadSerial)return;
      startAt=audio.currentTime+1.3;
    }catch(error){
      if(current!==loadSerial)return;
      state="ready";cancelAnimationFrame(raf);
      if(audio){audio.close().catch(()=>{});audio=null;}
      showSongLoading("Could not prepare this track");
      const message=error&&error.message?error.message:"Audio unavailable";
      status.textContent="Could not start "+track.title+": "+message;
      showOverlay("PLAYBACK UNAVAILABLE","Press Retry Start or choose another track.");
      playBtn.textContent="▶ Retry Start";
      draw();updateHud();return;
    }
    if(current!==loadSerial)return;
    state="playing";showSongLoading("Song ready!",100);hideSongLoading(1000,current);songSelect.disabled=true;difficultySelect.disabled=true;
    if(playStyleSelect)playStyleSelect.disabled=true;
    pauseBtn.disabled=false;pauseBtn.textContent="Pause";playBtn.textContent="↻ Restart Song";
    hideOverlay();
    status.textContent="Playing "+track.title+" · "+activeDifficulty.toUpperCase()+". Hold frets and strum at the hit line!";
    updateHud();draw();
    raf=requestAnimationFrame(tick);
  }
  async function togglePause() {
    if(isRadio){
      if(!radioAudio)return;
      if(state==="playing"||state==="buffering"){
        radioAudio.pause();
      }else if(state==="paused"||state==="loading"||state==="ready"){
        try{await radioAudio.play();}
        catch(error){audioStatus.textContent="Could not resume. Tap Play in the audio player.";}
      }
      return;
    }
    if(!audio)return;
    if(state==="playing"){
      state="paused";cancelAnimationFrame(raf);
      try{await audio.suspend();}catch{}
      pauseBtn.textContent="Resume";showOverlay("PAUSED","Press Resume to continue where you left off.");
      status.textContent="Paused.";updateHud();draw();
    }else if(state==="paused"){
      try{await audio.resume();}catch{status.textContent="Unable to resume audio.";return;}
      state="playing";pauseBtn.textContent="Pause";hideOverlay();status.textContent="Back on stage!";
      raf=requestAnimationFrame(tick);
    }
  }
  if(retryAudio)retryAudio.addEventListener("click",()=>{if(songSelect.value==="golden")startSong(true);});
  playBtn.addEventListener("click",()=>startSong());
  pauseBtn.addEventListener("click",togglePause);
  hypeBtn.addEventListener("click",activateHype);
  muteInput.addEventListener("change",()=>{
    if(isRadio&&radioAudio)radioAudio.muted=muteInput.checked;
    if(audio && master)master.gain.setTargetAtTime(muteInput.checked?0:.46,audio.currentTime,.02);
  });
  if(syncInput)syncInput.addEventListener("input",()=>{
    if(!isRadio)return;
    const next=clamp(Number(syncInput.value)||0,-2,2);
    const difference=next-appliedOffset;
    appliedOffset=next;
    if(syncValue)syncValue.textContent=(next>=0?"+":"")+next.toFixed(2)+"s";
    try{localStorage.setItem(offsetKey(),String(next));}catch{}
    for(const note of notes)if(!note.judged)note.at+=difference;
    activeSustains=[];
    draw();
  });
  songSelect.addEventListener("change",()=>{
    track=songs[songSelect.value]||songs.neon;
    refreshBest();
    // Choosing a song should begin play, rather than leaving the game waiting on Start.
    startSong();
    gameStage?.scrollIntoView({block:"start",behavior:"smooth"});
  });
  difficultySelect.addEventListener("change",()=>{
    track=songs[songSelect.value]||songs.neon;
    refreshBest();draw();updateHud();
  });

  if(playStyleSelect){
    try{
      const saved=localStorage.getItem("ctoon-jam-play-style-v1");
      playStyleSelect.value=(saved==="tap"||saved==="strum")?saved:
        (window.matchMedia&&window.matchMedia("(pointer: coarse)").matches?"tap":"strum");
    }catch{playStyleSelect.value=(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches?"tap":"strum");}
    applyPlayStyle();
    playStyleSelect.addEventListener("change",()=>{
      resetFrets();applyPlayStyle();draw();
      status.textContent=isGuitarMode()?"Hold A S D J K and strum ↑/↓ or Enter.":"Tap the fret buttons when notes cross the line.";
    });
  }
  for(const button of controls){
    const lane=Number(button.dataset.lane);
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();
      try{button.setPointerCapture(event.pointerId)}catch{}
      pressFret(lane);draw();
    });
    const release=()=>{releaseFret(lane);draw();};
    button.addEventListener("pointerup",release);
    button.addEventListener("pointercancel",release);
    button.addEventListener("lostpointercapture",release);
    button.addEventListener("click",event=>{
      if(event.detail===0){pressFret(lane);releaseFret(lane);draw();}
    });
    button.addEventListener("contextmenu",event=>event.preventDefault());
  }
  for(const button of strumButtons){
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();strum();button.classList.add("is-pressed");
    });
    const release=()=>button.classList.remove("is-pressed");
    button.addEventListener("pointerup",release);
    button.addEventListener("pointercancel",release);
    button.addEventListener("click",event=>{if(event.detail===0)strum();});
  }
  document.addEventListener("keydown",event=>{
    const tag=event.target&&event.target.tagName;
    if(tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA")return;
    if(event.code==="Escape"){event.preventDefault();if(!event.repeat)togglePause();return;}
    if(event.code==="Space"){event.preventDefault();if(!event.repeat)activateHype();return;}
    if(event.code==="ArrowUp"||event.code==="ArrowDown"||event.code==="Enter"){
      event.preventDefault();if(!event.repeat)strum();return;
    }
    const lane=keys.indexOf(event.key.toLowerCase());
    if(lane>=0){event.preventDefault();if(!event.repeat){pressFret(lane);draw();}}
  });
  document.addEventListener("keyup",event=>{
    const lane=keys.indexOf(event.key.toLowerCase());
    if(lane>=0){event.preventDefault();releaseFret(lane);draw();}
  });
  window.addEventListener("blur",()=>{resetFrets();draw();});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden && state==="playing")togglePause();
  });
  window.addEventListener("resize",draw);

  // Fetch the small chart during browser idle time, never blocking the game or MP3.
  // Warm the dedicated recording while the player selects a song.
  // Mobile browsers may ignore preload until a tap; playback still starts on a user gesture.
  if(radioControl && songs.golden) {
    radioControl.preload="auto";
    radioControl.src=radioBase+encodeURI(songs.golden.path);
    radioControl.load();
  }

  const warmChart=()=>{getTrackChart(songs.golden).catch(()=>{});};
  if(typeof requestIdleCallback==="function")requestIdleCallback(warmChart,{timeout:1800});
  else setTimeout(warmChart,800);
  try {refreshBest();updateHud();draw();}
  catch(error){console.warn("CToon Jam stage initialization failed:",error);status.textContent="The note board may need a reload.";}
})();