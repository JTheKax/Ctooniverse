"use strict";
/* CToon Jam Rebuilt — independent v2 engine.
   Preserves existing tracks, hosted Golden audio, chart JSON and v1 score keys.
   The legacy ctoon-jam.js is intentionally retained as a non-running backup. */
(() => {
  const $=id=>document.getElementById(id);
  const cv=$("jam-board"),ctx=cv.getContext("2d");
  if(!ctx){$("jam-message").textContent="A browser with Canvas 2D support is required.";return;}
  const laneButtons=[...document.querySelectorAll("[data-lane]")];
  const strumButtons=[...document.querySelectorAll("[data-strum]")];
  const colors=["#60ee88","#ff5679","#ffe164","#4dbdff","#fa9d45"];
  const keys=["a","s","d","j","k"];
  const songs={
    neon:{title:"Neon Rush",bpm:118,bars:20,seed:1,root:52,wave:"sawtooth",scale:[0,3,5,7,10,12,15,17],progression:[0,5,3,7]},
    pixel:{title:"Pixel Thunder",bpm:146,bars:24,seed:3,root:50,wave:"square",scale:[0,2,5,7,9,12,14,17],progression:[0,7,5,3]},
    starlight:{title:"Starlight Solo",bpm:104,bars:20,seed:4,root:53,wave:"triangle",scale:[0,2,4,7,9,12,14,16],progression:[0,4,5,7]},
    golden:{title:"Golden · HUNTR/X",bpm:123,bars:95,seed:2,featured:true,
      path:"tracks/4c25e71528734dac8763825b46ed23d2.mp3"}
  };
  const radioUrl="https://hsxdyxdazsdmpucyhqly.supabase.co/storage/v1/object/public/site-music/";
  const nativeAudio=$("jam-radio-audio");
  const AC=window.AudioContext||window.webkitAudioContext;
  const els={
    song:$("jam-song"),diff:$("jam-difficulty"),style:$("jam-play-style"),
    picker:$("jam-song-picker"),list:$("jam-picker-list"),count:$("jam-picker-count"),
    search:$("jam-picker-search"),pdiff:$("jam-picker-difficulty"),pstyle:$("jam-picker-style"),
    ptitle:$("jam-picker-title"),pmeta:$("jam-picker-meta"),pbest:$("jam-picker-best"),part:$("jam-picker-art"),
    play:$("jam-play"),pause:$("jam-pause"),hype:$("jam-hype"),
    status:$("jam-message"),best:$("jam-best"),overlay:$("jam-overlay"),
    overlayAction:$("jam-overlay-action"),judge:$("jam-judgement"),load:$("jam-song-load"),
    loadbar:$("jam-song-load-bar"),loadfill:$("jam-song-load-fill"),loadvalue:$("jam-song-load-value"),
    loadstatus:$("jam-song-load-status"),sync:$("jam-sync-offset"),syncvalue:$("jam-sync-value"),
    chartstatus:$("jam-chart-status"),audioStatus:$("jam-audio-status"),radioPanel:$("jam-radio-player-panel"),
    progress:$("jam-progress"),stage:$("jam-game-screen")
  };
  const safeStorage={
    get(k){try{return localStorage.getItem(k)}catch{return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch{}}
  };
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const fmt=x=>Math.round(x).toLocaleString("en-US");
  let chosen=songs[safeStorage.get("ctoon-jam-last-song-v1")]?safeStorage.get("ctoon-jam-last-song-v1"):"neon";
  let difficulty="normal",style=safeStorage.get("ctoon-jam-play-style-v1")==="tap"?"tap":"strum";
  if(!safeStorage.get("ctoon-jam-play-style-v1")&&window.matchMedia?.("(pointer: coarse)").matches)style="tap";
  let filter="all",phase="library",notes=[],cursor=0,held=new Set(),holds=[];
  let score=0,combo=0,maxCombo=0,judged=0,accuracyPoints=0,rock=75,charge=0,hypeEnd=0,eligible=true;
  let totalTime=90,noticeUntil=0,lastHud=0,run=0,raf=0,beatTimer=0,beatIndex=0;
  let synth=null,gain=null,startAt=0,offset=0,chartReady=null,chartCache=null;
  let ignoreSeek=false,lastTime=0;
  let songFilters=[...document.querySelectorAll("[data-song-filter]")];
  const isFeatured=()=>!!songs[chosen].featured;
  const bestKey=()=> "ctoon-jam-best-v1-"+chosen+"-"+difficulty;
  const offsetKey=()=> "ctoon-jam-chart-offset-v1:"+chosen;
  const durationEstimate=track=>track.featured?192:(track.bars*4+4)*60/track.bpm;
  const time=()=>isFeatured()?nativeAudio.currentTime||0:synth?synth.currentTime-startAt:0;
  const isPlaying=()=>phase==="playing";
  function onScreen(message){els.status.textContent=message;}
  function overlay(title,message,action){
    els.overlay.hidden=false;
    els.overlay.querySelector("strong").textContent=title;
    els.overlay.querySelector("span").textContent=message;
    els.overlayAction.hidden=!action;
    els.overlayAction.textContent=action||"";
  }
  function say(message,color="#98eeff"){
    els.judge.textContent=message;els.judge.style.color=color;noticeUntil=performance.now()+500;
  }
  function setLoading(label){
    els.load.hidden=false;els.loadbar.classList.add("is-indeterminate");
    els.loadbar.setAttribute("aria-valuetext",label);
    els.loadbar.removeAttribute("aria-valuenow");
    els.loadfill.style.width="30%";els.loadvalue.textContent="…";
    els.loadstatus.textContent=label;
  }
  function clearLoading(){els.load.hidden=true;}
  function hideOverlay(){els.overlay.hidden=true;els.overlayAction.hidden=true;}
  function applyOffset(){
    offset=clamp(Number(safeStorage.get(offsetKey())||0),-2,2)||0;
    els.sync.value=String(offset);
    els.syncvalue.textContent=(offset>=0?"+":"")+offset.toFixed(2)+"s";
  }
  function record(){
    try{return JSON.parse(safeStorage.get(bestKey())||"null")}catch{return null}
  }
  function refreshBest(){
    const v=record();
    const t=v&&Number.isFinite(v.score)?fmt(v.score)+" points · "+(Number(v.accuracy)||0)+"% accuracy":"No personal best yet";
    els.best.textContent=t;
    els.pbest.textContent=t;
  }
  function header(){
    $("jam-stage-song").textContent=songs[chosen].title;
    $("jam-stage-mode").textContent=difficulty.toUpperCase()+" · "+phase.toUpperCase();
    const activeHype=isPlaying()&&time()<hypeEnd;
    const multiplier=Math.min(4,1+Math.floor(combo/10))*(activeHype?2:1);
    $("jam-score").textContent=fmt(score);
    $("jam-combo").textContent=fmt(combo);
    $("jam-multiplier").textContent="×"+multiplier;
    $("jam-accuracy").textContent=judged?Math.round(100*accuracyPoints/judged)+"%":"—";
    $("jam-rock-fill").style.width=rock+"%";
    $("jam-hype-fill").style.width=(activeHype?100:charge)+"%";
    els.hype.disabled=!isPlaying()||charge<50||activeHype;
    els.hype.classList.toggle("is-active",activeHype);
    els.hype.textContent=activeHype?"★ HYPE ACTIVE":"★ Activate Hype (Space)";
    const pct=clamp(100*Math.max(0,time())/Math.max(1,totalTime),0,100);
    $("jam-progress-fill").style.width=pct+"%";
    els.progress.setAttribute("aria-valuenow",String(Math.round(pct)));
    els.pause.disabled=!["playing","paused"].includes(phase);
    els.pause.textContent=phase==="paused"?"▶ Resume":"⏸ Pause";
    els.play.textContent=phase==="library"?"▶ Play Selected Song":"↻ Restart Song";
  }
  function buildGenerated(track){
    const out=[],beat=60/track.bpm;
    const add=(at,lane,duration=0)=>out.push({at,lane,duration,judged:false});
    for(let i=0;i<track.bars*4;i++){
      const lane=(i*3+Math.floor(i/4)+track.seed)%5;
      const at=(i+4)*beat+offset;
      add(at,lane,i%12===6?beat*1.6:i%16===11?beat*.9:0);
      if(difficulty!=="easy"&&i%8===4)add(at,(lane+2)%5);
      if(difficulty==="hard"&&i%16===10)add(at,(lane+4)%5);
      if(difficulty!=="easy"&&(difficulty==="hard"||i%2===1))add(at+beat*.5,(lane+2+(i%2))%5);
    }
    return out.sort((a,b)=>a.at-b.at||a.lane-b.lane);
  }
  function validateChart(obj){
    if(!obj||obj.format!=="ctoon-jam-chart"||obj.version!==1||
       obj.sourceStoragePath!==songs.golden.path||!obj.difficultyNotes)return false;
    return ["easy","normal","hard"].every(mode=>Array.isArray(obj.difficultyNotes[mode])&&
      obj.difficultyNotes[mode].length>0&&obj.difficultyNotes[mode].length<10000&&
      obj.difficultyNotes[mode].every(row=>Array.isArray(row)&&(row.length===2||row.length===3)&&
        Number.isFinite(row[0])&&row[0]>=0&&row[0]<=900&&Number.isInteger(row[1])&&row[1]>=0&&row[1]<=4&&
        (row.length!==3||(Number.isFinite(row[2])&&row[2]>=0&&row[2]<=15))));
  }
  async function loadChart(){
    if(chartCache)return chartCache;
    if(chartReady)return chartReady;
    chartReady=(async()=>{
      try{
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),5000);
        try{
          const r=await fetch("ctoon-jam-charts/4c25e71528734dac8763825b46ed23d2.json",{signal:controller.signal});
          if(!r.ok)throw Error("HTTP "+r.status);
          const data=await r.json();
          if(!validateChart(data))throw Error("Invalid chart format");
          chartCache=data;return data;
        }finally{clearTimeout(timeout);}
      }catch(error){
        console.warn("CToon Jam practice chart unavailable:",error);
        return null;
      }finally{chartReady=null;}
    })();
    return chartReady;
  }
  function chartNotes(chart){
    const duration=Number.isFinite(nativeAudio.duration)?nativeAudio.duration:192;
    const shift=(Number(chart.offsetSeconds)||0)+offset;
    return chart.difficultyNotes[difficulty].map(([at,lane,duration=0])=>({at:at+shift,lane,duration,judged:false}))
      .filter(n=>n.at>=0&&n.at<Math.max(15,duration-.2))
      .sort((a,b)=>a.at-b.at||a.lane-b.lane);
  }
  function setChartForRun(ticket){
    if(!isFeatured())return;
    els.chartstatus.textContent="Loading Golden practice chart in parallel with audio…";
    loadChart().then(chart=>{
      if(ticket!==run||!isFeatured()||!["playing","loading","paused","buffering"].includes(phase))return;
      if(!chart){els.chartstatus.textContent="Chart unavailable. Generated practice notes active.";eligible=false;return;}
      const t=time(),oldJudged=judged;
      const replacement=chartNotes(chart);
      if(!replacement.length)return;
      for(const n of replacement)if(n.at<t+.02)n.judged=true;
      notes=replacement;cursor=0;holds=[];
      if(t>.3||oldJudged>0)eligible=false;
      els.chartstatus.textContent="Practice chart loaded · "+notes.length+" notes"+(eligible?"":" · score not ranked on this run");
      paint();
    });
  }
  function renderLibrary(){
    const search=(els.search.value||"").trim().toLowerCase();
    const found=Object.entries(songs).filter(([id,s])=>
      (filter==="all"||(filter==="arcade"&&!s.featured)||(filter==="featured"&&s.featured))&&
      (id+" "+s.title).toLowerCase().includes(search));
    els.list.replaceChildren();
    for(const [id,s] of found){
      const b=document.createElement("button");b.type="button";b.className="jam-song-item";
      b.dataset.songId=id;b.classList.toggle("is-selected",chosen===id);
      b.setAttribute("aria-pressed",String(chosen===id));
      const art=document.createElement("span");art.className="jam-song-item-art";art.dataset.theme=id;
      art.setAttribute("aria-hidden","true");art.textContent=s.featured?"★":"♫";
      const info=document.createElement("span");info.className="jam-song-item-copy";
      const title=document.createElement("strong");title.textContent=s.title;
      const sub=document.createElement("small");
      sub.textContent=(s.featured?"FEATURED RECORDING":"ARCADE ORIGINAL")+" · "+s.bpm+" BPM";
      info.append(title,sub);
      const arrow=document.createElement("span");arrow.className="jam-song-item-arrow";
      arrow.textContent=chosen===id?"✓":"›";arrow.setAttribute("aria-hidden","true");
      b.append(art,info,arrow);b.addEventListener("click",()=>selectSong(id));
      els.list.append(b);
    }
    if(!found.length){const p=document.createElement("p");p.className="jam-picker-empty";p.textContent="No songs match your search.";els.list.append(p);}
    els.count.textContent=found.length+" / "+Object.keys(songs).length+" TRACKS";
    songFilters.forEach(b=>{const on=b.dataset.songFilter===filter;b.classList.toggle("is-active",on);b.setAttribute("aria-pressed",String(on));});
    const track=songs[chosen];
    els.ptitle.textContent=track.title;
    els.pmeta.textContent=(track.featured?"Featured recording · hosted MP3":"Original arcade music · generated in browser")+" · "+track.bpm+" BPM";
    els.part.dataset.theme=chosen;els.part.textContent=track.featured?"★":"♫";
    els.pdiff.value=difficulty;els.pstyle.value=style;
    refreshBest();header();
  }
  function selectSong(id){
    if(!songs[id])return;
    chosen=id;els.song.value=id;
    safeStorage.set("ctoon-jam-last-song-v1",id);
    applyOffset();renderLibrary();paint();
    if(id==="golden")loadChart();
  }
  function setPlayStyle(mode){
    style=mode==="tap"?"tap":"strum";
    els.style.value=style;els.pstyle.value=style;
    els.stage.classList.toggle("is-strum",style==="strum");
    safeStorage.set("ctoon-jam-play-style-v1",style);
    clearHeld();
  }
  function selectDifficulty(mode){
    difficulty=["easy","normal","hard"].includes(mode)?mode:"normal";
    els.diff.value=difficulty;els.pdiff.value=difficulty;
    refreshBest();renderLibrary();paint();
  }
  function clearHeld(){
    held.clear();holds=[];
    laneButtons.forEach(b=>b.classList.remove("is-held","is-pressed"));
  }
  function stopLoops(){
    cancelAnimationFrame(raf);raf=0;
    if(beatTimer){clearInterval(beatTimer);beatTimer=0;}
  }
  function stopAudio(){
    stopLoops();
    nativeAudio.pause();
    nativeAudio.onplaying=nativeAudio.onwaiting=nativeAudio.onpause=nativeAudio.onended=
      nativeAudio.onerror=nativeAudio.onseeked=nativeAudio.onloadedmetadata=null;
    if(synth){const old=synth;synth=null;old.close().catch(()=>{});}
    gain=null;
  }
  function resetRun(){
    notes=[];cursor=0;score=0;combo=0;maxCombo=0;judged=0;accuracyPoints=0;
    rock=75;charge=0;hypeEnd=0;eligible=true;lastHud=0;
    clearHeld();els.judge.textContent="";totalTime=durationEstimate(songs[chosen]);
  }
  function openLibrary(focus=false){
    ++run;stopAudio();resetRun();phase="library";els.picker.hidden=false;
    els.radioPanel.hidden=true;clearLoading();hideOverlay();
    els.song.disabled=false;els.diff.disabled=false;els.style.disabled=false;
    onScreen("Choose a song, difficulty, and control style. Nothing loads until you press Play.");
    renderLibrary();paint();
    if(focus)els.search.focus();
  }
  function setPhase(next){
    phase=next;header();
    if(next==="playing")hideOverlay();
  }
  function voice(midi,when,duration,type="triangle",volume=.045){
    if(!synth||!gain)return;
    const o=synth.createOscillator(),v=synth.createGain();
    o.type=type;o.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),when);
    v.gain.setValueAtTime(.0001,when);
    v.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.014);
    v.gain.exponentialRampToValueAtTime(.0001,when+Math.max(.08,duration));
    o.connect(v);v.connect(gain);o.start(when);o.stop(when+Math.max(.09,duration)+.04);
  }
  function beat(i,when){
    const track=songs[chosen],span=60/track.bpm,bar=Math.floor(i/4);
    const chord=track.progression[bar%track.progression.length];
    if(i%4===0)voice(track.root-12+chord,when,span*3.6,"triangle",.095);
    if(i%4===0||i%4===2)voice(42,when,.14,"sine",.16);
    else voice(75,when,.09,"triangle",.025);
    if(i>=4&&i<4+track.bars*4){
      const pos=i-4;
      const pitch=track.root+12+track.scale[(pos*3+Math.floor(pos/4)+track.seed)%track.scale.length];
      voice(pitch,when,span*.48,track.wave,.047);
      if(pos%2===1)voice(pitch-5,when+span*.5,span*.24,track.wave,.024);
    }
  }
  function schedule(){
    if(!isPlaying()||!synth)return;
    const track=songs[chosen],span=60/track.bpm,maxBeat=4+track.bars*4;
    while(beatIndex<maxBeat&&startAt+beatIndex*span<synth.currentTime+.25){
      beat(beatIndex,startAt+beatIndex*span);beatIndex++;
    }
  }
  async function startSynth(ticket){
    if(!AC){onScreen("This browser does not support Web Audio.");overlay("AUDIO UNAVAILABLE","Try a modern browser or a different track.","↻ Retry");setPhase("error");return;}
    try{
      const source=new AC();synth=source;
      gain=source.createGain();gain.gain.value=$("jam-mute").checked?0:.45;gain.connect(source.destination);
      const resume=source.resume();
      await Promise.race([resume,new Promise((_,reject)=>setTimeout(()=>reject(Error("Audio was blocked; tap Retry.")),4500))]);
      if(ticket!==run)return;
      startAt=source.currentTime+.12;beatIndex=0;
      phase="playing";clearLoading();hideOverlay();
      els.radioPanel.hidden=true;
      onScreen("Now playing "+songs[chosen].title+". "+(style==="tap"?"Tap the colored lanes!":"Hold frets and strum!"));
      schedule();beatTimer=setInterval(schedule,60);
      header();raf=requestAnimationFrame(frame);
    }catch(error){
      if(ticket!==run)return;
      stopAudio();phase="error";clearLoading();
      onScreen("Could not start synthesizer: "+error.message);
      overlay("AUDIO UNAVAILABLE","Tap Retry to try again.","↻ Retry");
      header();paint();
    }
  }
  function startFeatured(ticket){
    const media=nativeAudio;
    els.radioPanel.hidden=false;
    els.audioStatus.textContent="Connecting to the selected recording…";
    els.chartstatus.textContent="Preparing practice chart…";
    const url=radioUrl+songs.golden.path;
    if(media.getAttribute("src")!==url){media.src=url;media.preload="auto";media.load();}
    else {ignoreSeek=true;try{media.currentTime=0;}catch{}}
    media.muted=$("jam-mute").checked;
    const valid=()=>ticket===run&&chosen==="golden";
    media.onplaying=()=>{
      if(!valid())return;
      if(phase==="playing")return;
      phase="playing";clearLoading();hideOverlay();
      onScreen("Golden is playing. Follow the falling notes!");
      els.audioStatus.textContent="Audio playing · chart follows the music.";
      header();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
    };
    media.onwaiting=()=>{
      if(!valid()||phase!=="playing")return;
      phase="buffering";cancelAnimationFrame(raf);raf=0;
      overlay("BUFFERING AUDIO","The notes will resume with the recording.");
      setLoading("Waiting for more audio…");header();
    };
    media.onpause=()=>{
      if(!valid()||["complete","library","error"].includes(phase))return;
      if(phase==="playing"||phase==="buffering"){
        phase="paused";cancelAnimationFrame(raf);raf=0;
        overlay("PAUSED","Press Resume or Play on the audio controls.");header();
      }
    };
    media.onloadedmetadata=()=>{
      if(!valid())return;
      if(Number.isFinite(media.duration)&&media.duration>0)totalTime=media.duration;
      header();
    };
    media.onseeked=()=>{
      if(!valid())return;
      if(ignoreSeek){ignoreSeek=false;return;}
      eligible=false;
      for(const n of notes)n.judged=n.at<time()-.2;
      cursor=0;while(cursor<notes.length&&notes[cursor].judged)cursor++;
      holds=[];combo=0;
      onScreen("Practice seek mode: notes resynced; scores will not be recorded for this run.");
      header();paint();
    };
    media.onerror=()=>{
      if(!valid())return;
      phase="error";cancelAnimationFrame(raf);raf=0;clearLoading();
      onScreen("The recording could not load. Check your connection, retry, or choose another song.");
      els.audioStatus.textContent="Playback unavailable. Use Retry Audio or choose another song.";
      overlay("TRACK UNAVAILABLE","This recording could not load.","↻ Retry");
      header();
    };
    media.onended=()=>{if(valid())finish();};
    notes=buildGenerated(songs.golden);setChartForRun(ticket);
    try{
      const attempt=media.play();
      if(attempt?.catch)attempt.catch(error=>{
        if(!valid()||error?.name==="AbortError")return;
        phase="error";clearLoading();
        const message=error?.name==="NotAllowedError"?"Your browser requires another tap to play audio.":"The browser could not start audio.";
        onScreen(message);overlay("TAP TO START",message,"▶ Start Audio");header();
      });
    }catch(error){if(valid()){phase="error";clearLoading();overlay("TAP TO START","Use the audio player to begin.","▶ Start Audio");}}
  }
  function start(){
    const ticket=++run;
    stopAudio();resetRun();
    phase="loading";els.picker.hidden=true;
    els.song.disabled=true;els.diff.disabled=true;
    totalTime=durationEstimate(songs[chosen]);
    notes=buildGenerated(songs[chosen]);
    setLoading(isFeatured()?"Connecting to recording…":"Starting arcade audio…");
    overlay("GET READY",isFeatured()?"The song begins when its audio is ready.":"Loading the stage.");
    header();paint();
    if(isFeatured())startFeatured(ticket);else startSynth(ticket);
  }
  function hitNote(note,difference){
    note.judged=true;held;
    const quality=difference<=.085?"PERFECT":difference<=.15?"GREAT":"GOOD";
    const weight=quality==="PERFECT"?1:quality==="GREAT"?.75:.5;
    judged++;accuracyPoints+=weight;combo++;maxCombo=Math.max(maxCombo,combo);
    const hype=time()<hypeEnd,boost=Math.min(4,1+Math.floor(combo/10))*(hype?2:1);
    score+=Math.round(100*weight*boost);rock=clamp(rock+1.4,0,100);
    if(!hype)charge=clamp(charge+2.5,0,100);
    if(note.duration>=.2)holds.push({note,last:note.at});
    say(quality+(combo>1?" · "+combo+" COMBO":""),quality==="PERFECT"?"#aafff1":quality==="GREAT"?"#ffe57b":"#fff");
  }
  function miss(){
    judged++;combo=0;rock=clamp(rock-2,0,100);
    say("MISS","#ff7c97");
  }
  function findAtLane(lane,t){
    let match=null,nearest=.22;
    for(let i=cursor;i<notes.length;i++){
      const n=notes[i];
      if(n.at>t+.22)break;
      if(n.judged||n.lane!==lane)continue;
      const diff=Math.abs(n.at-t);
      if(diff<=nearest){match=n;nearest=diff;}
    }
    return match?{note:match,diff:nearest}:null;
  }
  function hit(lane){
    if(!isPlaying())return;
    const t=time(),found=findAtLane(lane,t);
    if(!found){say("OFF BEAT","#b4b8dc");return;}
    hitNote(found.note,found.diff);header();
  }
  function strum(){
    if(!isPlaying()||style!=="strum"||time()<0)return;
    let nearest=null,diff=.22;
    const t=time();
    for(let i=cursor;i<notes.length;i++){
      const n=notes[i];if(n.at>t+.22)break;if(n.judged)continue;
      const d=Math.abs(n.at-t);if(d<=diff){nearest=n;diff=d;}
    }
    if(!nearest){combo=0;rock=clamp(rock-1,0,100);say("OVERSTRUM","#ff8098");header();return;}
    const chord=[];
    for(let i=cursor;i<notes.length;i++){
      const n=notes[i];if(n.at>nearest.at+.025)break;
      if(!n.judged&&Math.abs(n.at-nearest.at)<=.025)chord.push(n);
    }
    const needed=new Set(chord.map(n=>n.lane));
    if(needed.size!==held.size||[...needed].some(lane=>!held.has(lane))){
      combo=0;rock=clamp(rock-1,0,100);say("WRONG FRETS","#ff8098");header();return;
    }
    chord.forEach(n=>hitNote(n,Math.abs(n.at-t)));
    if(chord.length>1)say("CHORD! · "+combo+" COMBO","#9ffff2");
    header();
  }
  function press(lane){
    if(held.has(lane))return;
    held.add(lane);laneButtons[lane].classList.add("is-held");
    if(style==="tap")hit(lane);
    paint();
  }
  function release(lane){held.delete(lane);laneButtons[lane].classList.remove("is-held");paint();}
  function activateHype(){
    if(!isPlaying()||charge<50||time()<hypeEnd)return;
    charge=0;hypeEnd=time()+8;say("HYPE MODE!","#ffe0ff");header();
  }
  function checkNotes(t){
    while(cursor<notes.length){
      const n=notes[cursor];
      if(n.judged){cursor++;continue;}
      if(t-n.at<=.22)break;
      n.judged=true;miss();cursor++;
    }
    if(holds.length){
      const next=[];
      for(const h of holds){
        const end=h.note.at+h.note.duration;
        if(!held.has(h.note.lane))continue;
        const ticks=Math.floor((Math.min(end,t)-h.last)/.1);
        if(ticks>0){score+=ticks*10;h.last+=ticks*.1;}
        if(t<end)next.push(h);
      }
      holds=next;
    }
    if(rock<=0&&!isFeatured())finish(true);
  }
  function saveBest(){
    if(!eligible)return;
    const accuracy=judged?Math.round(100*accuracyPoints/judged):0;
    const old=record();
    if(!old||score>Number(old.score||0)){
      safeStorage.set(bestKey(),JSON.stringify({score,accuracy}));
    }
  }
  function finish(failed=false){
    if(!["playing","buffering","paused"].includes(phase))return;
    phase="complete";stopLoops();
    if(isFeatured())nativeAudio.pause();
    else if(synth)synth.suspend().catch(()=>{});
    clearHeld();clearLoading();
    if(!failed)saveBest();
    const accuracy=judged?Math.round(100*accuracyPoints/judged):0;
    const heading=failed?"ROCK METER EMPTY":eligible?"SONG COMPLETE!":"PRACTICE COMPLETE!";
    overlay(heading,fmt(score)+" points · "+accuracy+"% accuracy · "+maxCombo+" best combo",
      "♫ Choose Another Song");
    onScreen(failed?"Try again to keep your streak alive!":"Finished "+songs[chosen].title+". "+(eligible?"Your personal best was updated if you beat it.":"Practice run; score not ranked."));
    els.song.disabled=false;els.diff.disabled=false;els.style.disabled=false;
    refreshBest();header();paint();
  }
  function frame(){
    if(!isPlaying())return;
    const t=time();
    if(!isFeatured())schedule();
    checkNotes(t);
    if(!isPlaying())return;
    if(performance.now()>noticeUntil)els.judge.textContent="";
    if(performance.now()-lastHud>70){header();lastHud=performance.now();}
    paint();
    if(!isFeatured()&&t>totalTime+.45){finish();return;}
    if(isFeatured()&&nativeAudio.ended){finish();return;}
    raf=requestAnimationFrame(frame);
  }
  function paint(){
    const box=cv.getBoundingClientRect(),w=Math.max(1,box.width),h=Math.max(1,box.height);
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
    if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,"#101a52");bg.addColorStop(.6,"#110b36");bg.addColorStop(1,"#05071b");
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const center=w/2,far=h*.08,hitY=h*.78,topW=w*.28,bottomW=w*.91;
    function widthAt(y){return topW+(bottomW-topW)*clamp((y-far)/(hitY-far),0,1);}
    function xAt(lane,y){return center+(lane/5-.5)*widthAt(y);}
    ctx.beginPath();ctx.moveTo(xAt(0,far),far);ctx.lineTo(xAt(5,far),far);
    ctx.lineTo(xAt(5,h),h);ctx.lineTo(xAt(0,h),h);ctx.closePath();
    const road=ctx.createLinearGradient(0,far,0,h);
    road.addColorStop(0,"#191e59");road.addColorStop(1,"#121139");
    ctx.fillStyle=road;ctx.fill();
    for(let lane=0;lane<5;lane++){
      ctx.beginPath();ctx.moveTo(xAt(lane,far),far);ctx.lineTo(xAt(lane+1,far),far);
      ctx.lineTo(xAt(lane+1,h),h);ctx.lineTo(xAt(lane,h),h);
      ctx.fillStyle=lane%2?"#37245c44":"#4366aa22";ctx.fill();
    }
    for(let lane=0;lane<=5;lane++){
      ctx.beginPath();ctx.moveTo(xAt(lane,far),far);ctx.lineTo(xAt(lane,h),h);
      ctx.lineWidth=lane===0||lane===5?2.4:1.4;
      ctx.strokeStyle=lane===0||lane===5?"#70dfff":"#728be0aa";
      ctx.stroke();
    }
    const t=phase==="library"?0:time(),approach=2.0;
    const beatSecs=60/songs[chosen].bpm;
    for(let i=0;i<14;i++){
      const b=Math.floor((t+approach)/beatSecs)-i;
      const offsetSecs=b*beatSecs-t;
      const p=1-offsetSecs/approach;
      if(p<0||p>1.2)continue;
      const y=far+(hitY-far)*Math.pow(p,1.55);
      ctx.beginPath();ctx.moveTo(xAt(0,y),y);ctx.lineTo(xAt(5,y),y);
      ctx.strokeStyle=b%4===0?"#b3c7ff90":"#7a83bb40";ctx.lineWidth=b%4===0?2:1;ctx.stroke();
    }
    for(const n of notes){
      if(n.judged||n.at<t-.25||n.at>t+approach)continue;
      const p=clamp(1-(n.at-t)/approach,0,1.1);
      const y=far+(hitY-far)*Math.pow(p,1.6);
      const a=xAt(n.lane,y),b=xAt(n.lane+1,y),size=clamp((b-a)*.66,9,52);
      const cx=(a+b)/2,thickness=clamp(8+p*17,8,24);
      if(n.duration>.2){
        const pEnd=clamp(1-(n.at+n.duration-t)/approach,0,1.1);
        const ey=far+(hitY-far)*Math.pow(pEnd,1.6);
        ctx.fillStyle=colors[n.lane]+"66";
        ctx.fillRect(cx-size*.24,Math.min(y,ey),size*.48,Math.abs(y-ey));
      }
      ctx.shadowBlur=18;ctx.shadowColor=colors[n.lane];
      ctx.fillStyle=colors[n.lane];
      ctx.fillRect(cx-size/2,y-thickness/2,size,thickness);
      ctx.shadowBlur=0;ctx.fillStyle="#ffffff91";
      ctx.fillRect(cx-size/2+3,y-thickness/2+3,Math.max(2,size-6),3);
    }
    ctx.fillStyle="#ffffff12";ctx.fillRect(xAt(0,hitY),hitY-5,xAt(5,hitY)-xAt(0,hitY),10);
    for(let lane=0;lane<5;lane++){
      const a=xAt(lane,hitY),b=xAt(lane+1,hitY),cx=(a+b)/2,r=Math.min(24,(b-a)*.25);
      ctx.beginPath();ctx.arc(cx,hitY,r,0,Math.PI*2);
      ctx.fillStyle=held.has(lane)?colors[lane]:"#171a42";
      ctx.shadowBlur=held.has(lane)?23:6;ctx.shadowColor=colors[lane];
      ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=3;ctx.strokeStyle=colors[lane];ctx.stroke();
      ctx.font="bold "+Math.max(11,Math.min(18,r))+"px system-ui";
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle=held.has(lane)?"#101020":"#d4e4ff";ctx.fillText(keys[lane].toUpperCase(),cx,hitY);
    }
    ctx.textAlign="center";ctx.fillStyle="#a8bdff99";ctx.font="800 12px system-ui";
    ctx.fillText("CTOON JAM • LIVE NOTE HIGHWAY",center,Math.max(24,far*.65));
  }
  async function pause(){
    if(phase==="playing"){
      if(isFeatured()){nativeAudio.pause();}
      else{
        phase="paused";stopLoops();
        try{await synth?.suspend();}catch{}
        overlay("PAUSED","Press Resume to keep playing.");onScreen("Song paused.");header();
      }
    }else if(phase==="paused"){
      if(isFeatured()){
        try{await nativeAudio.play();}catch{onScreen("Tap the built-in audio player's Play button.");}
      }else if(synth){
        try{
          await synth.resume();phase="playing";hideOverlay();beatTimer=setInterval(schedule,60);
          raf=requestAnimationFrame(frame);onScreen("Back on stage!");header();
        }catch{onScreen("Audio could not resume. Restart the song.");}
      }
    }
  }
  function fullscreenRefresh(){
    const active=!!document.fullscreenElement||document.body.classList.contains("jam-theater-view");
    $("jam-expand").textContent=active?"⤢ Exit Fullscreen":"⛶ Fullscreen";
    $("jam-expand").setAttribute("aria-pressed",String(active));
    paint();
  }
  async function toggleFullscreen(){
    if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}fullscreenRefresh();return;}
    if(document.body.classList.contains("jam-theater-view")){document.body.classList.remove("jam-theater-view");fullscreenRefresh();return;}
    try{if(els.stage.requestFullscreen){await els.stage.requestFullscreen();fullscreenRefresh();return;}}catch{}
    document.body.classList.add("jam-theater-view");fullscreenRefresh();
  }
  // Explicit user actions. Nothing plays until a Play button is pressed.
  $("jam-picker-start").addEventListener("click",()=>{
    difficulty=els.pdiff.value;setPlayStyle(els.pstyle.value);
    els.diff.value=difficulty;start();
  });
  els.play.addEventListener("click",()=>{if(!els.picker.hidden){difficulty=els.pdiff.value;setPlayStyle(els.pstyle.value);els.diff.value=difficulty;}start();});
  els.pause.addEventListener("click",pause);
  els.hype.addEventListener("click",activateHype);
  els.overlayAction.addEventListener("click",()=>{
    if(phase==="complete"){openLibrary(true);return;}
    if(isFeatured()&&phase==="error"){
      nativeAudio.play().catch(()=>start());
      return;
    }
    if(phase==="paused"){pause();return;}
    start();
  });
  $("jam-song-library").addEventListener("click",()=>openLibrary(true));
  $("jam-results-library").addEventListener("click",()=>openLibrary(true));
  $("jam-retry-audio").addEventListener("click",start);
  els.search.addEventListener("input",renderLibrary);
  for(const b of songFilters)b.addEventListener("click",()=>{filter=b.dataset.songFilter;renderLibrary()});
  els.pdiff.addEventListener("change",()=>selectDifficulty(els.pdiff.value));
  els.pstyle.addEventListener("change",()=>setPlayStyle(els.pstyle.value));
  els.diff.addEventListener("change",()=>selectDifficulty(els.diff.value));
  els.style.addEventListener("change",()=>setPlayStyle(els.style.value));
  els.song.addEventListener("change",()=>selectSong(els.song.value));
  $("jam-mute").addEventListener("change",()=>{
    nativeAudio.muted=$("jam-mute").checked;
    if(gain&&synth)gain.gain.setTargetAtTime($("jam-mute").checked?0:.45,synth.currentTime,.015);
  });
  els.sync.addEventListener("input",()=>{
    const old=offset;offset=clamp(Number(els.sync.value)||0,-2,2);
    els.syncvalue.textContent=(offset>=0?"+":"")+offset.toFixed(2)+"s";
    safeStorage.set(offsetKey(),String(offset));
    const delta=offset-old;for(const n of notes)if(!n.judged)n.at+=delta;
    if(["playing","paused","buffering"].includes(phase)){
      eligible=false;onScreen("Timing changed during song — practice mode only until restart.");
    }
    paint();
  });
  for(const button of laneButtons){
    const lane=Number(button.dataset.lane);
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();try{button.setPointerCapture(event.pointerId)}catch{}
      press(lane);
    });
    const released=()=>release(lane);
    button.addEventListener("pointerup",released);
    button.addEventListener("pointercancel",released);
    button.addEventListener("lostpointercapture",released);
    button.addEventListener("click",event=>{if(event.detail===0){press(lane);release(lane);}});
    button.addEventListener("contextmenu",event=>event.preventDefault());
  }
  for(const button of strumButtons){
    button.addEventListener("pointerdown",event=>{event.preventDefault();strum();button.classList.add("is-pressed");});
    button.addEventListener("pointerup",()=>button.classList.remove("is-pressed"));
    button.addEventListener("pointercancel",()=>button.classList.remove("is-pressed"));
    button.addEventListener("click",event=>{if(event.detail===0)strum();});
  }
  document.addEventListener("keydown",event=>{
    if(event.target.closest?.("input,select,textarea,button,nav")||!els.picker.hidden)return;
    if(event.code==="Escape"){event.preventDefault();if(document.body.classList.contains("jam-theater-view")){document.body.classList.remove("jam-theater-view");fullscreenRefresh();}else if(!event.repeat)pause();return;}
    if(event.code==="Space"){event.preventDefault();if(!event.repeat)activateHype();return;}
    if(["ArrowUp","ArrowDown","Enter"].includes(event.code)){
      event.preventDefault();if(!event.repeat)strum();return;
    }
    const lane=keys.indexOf(event.key.toLowerCase());
    if(lane>=0){event.preventDefault();if(!event.repeat)press(lane);}
  });
  document.addEventListener("keyup",event=>{
    const lane=keys.indexOf(event.key.toLowerCase());
    if(lane>=0){event.preventDefault();release(lane);}
  });
  window.addEventListener("blur",()=>{clearHeld();paint();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&isPlaying())pause();});
  window.addEventListener("pagehide",()=>{++run;stopAudio();});
  $("jam-expand").addEventListener("click",toggleFullscreen);
  document.addEventListener("fullscreenchange",fullscreenRefresh);
  window.addEventListener("resize",paint);
  nativeAudio.preload="none";
  els.song.value=chosen;
  els.diff.value=difficulty;
  setPlayStyle(style);applyOffset();resetRun();phase="library";
  els.picker.hidden=false;els.radioPanel.hidden=true;clearLoading();hideOverlay();
  onScreen("Choose a song to start. Arcade originals load instantly; featured audio streams only when selected.");
  renderLibrary();paint();
})();
