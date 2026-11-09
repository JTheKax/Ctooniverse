"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("jam-board"), pen = canvas.getContext("2d");
  const controls = [...document.querySelectorAll("[data-lane]")];
  const playBtn = $("jam-play"), pauseBtn = $("jam-pause"), hypeBtn = $("jam-hype");
  const songSelect = $("jam-song"), difficultySelect = $("jam-difficulty"), muteInput = $("jam-mute");
  const overlay = $("jam-overlay"), judgement = $("jam-judgement");
  const status = $("jam-message"), best = $("jam-best");
  const syncInput = $("jam-sync-offset"), syncValue = $("jam-sync-value"), chartStatus = $("jam-chart-status");
  const gameStage = document.querySelector(".jam-stage");
  const radioPanel = $("jam-radio-player-panel"), radioControl = $("jam-radio-audio"),
        audioStatus = $("jam-audio-status"), retryAudio = $("jam-retry-audio");
  const colors = ["#61ea82","#fd6384","#ffe16a","#65bfff","#d99aff"];
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
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
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
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetch("ctoon-jam-charts/"+match[1]+".json?v=2",{signal:controller.signal,cache:"force-cache"});
      if(!response.ok)return null;
      const data=await response.json();
      if(data.format!=="ctoon-jam-chart"||data.version!==1||data.sourceStoragePath!==song.path||
         !Number.isFinite(data.bpm)||data.bpm<50||data.bpm>220||!data.difficultyNotes)return null;
      for(const difficulty of ["easy","normal","hard"]){
        const rows=data.difficultyNotes[difficulty];
        if(!Array.isArray(rows)||rows.length===0||rows.length>10000)return null;
        if(rows.some(row=>!Array.isArray(row)||row.length!==2||!Number.isFinite(row[0])||row[0]<0||row[0]>900||
           !Number.isInteger(row[1])||row[1]<0||row[1]>4))return null;
      }
      return data;
    }catch(error){
      console.warn("CToon Jam chart not available:",song.title,error);
      return null;
    }finally{clearTimeout(timeout);}
  }
  function notesFromChart(chart,duration) {
    const offset=(Number(chart.offsetSeconds)||0)+appliedOffset;
    const limit=Number.isFinite(duration)&&duration>0?duration-.2:390;
    const raw=chart.difficultyNotes[activeDifficulty]||chart.difficultyNotes.normal;
    return raw.map(([seconds,lane])=>({at:seconds+offset,lane,judged:false}))
              .filter(note=>note.at>=0&&note.at<limit);
  }

  function makeNotes() {
    const result = [], beatLen = beatSeconds();
    const level = difficultySelect.value;
    for (let i = 0; i < track.bars * 4; i++) {
      const lane = (i * 3 + Math.floor(i / 4) + track.seed) % 5;
      const at = (i + 4) * beatLen;
      result.push({at,lane,judged:false});
      if (level !== "easy" && (level === "hard" || i % 2 === 1)) {
        result.push({at:at+beatLen*.5,lane:(lane+2+(i%2))%5,judged:false});
      }
      if (level === "hard" && i % 8 === 4) {
        result.push({at,lane:(lane+2)%5,judged:false});
      }
    }
    result.sort((a,b)=>a.at-b.at);
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
    for (const note of notes) {
      if (note.judged || note.lane!==lane) continue;
      const offset=Math.abs(t-note.at);
      if(offset<bestDiff && offset<=.22){candidate=note;bestDiff=offset;}
      if(note.at>t+.22) break;
    }
    if(!candidate){feedback("OFF BEAT","#9296bf");return;}
    candidate.judged=true;
    const quality=bestDiff<=.085?"PERFECT":bestDiff<=.15?"GREAT":"GOOD";
    const value=quality==="PERFECT"?1:quality==="GREAT"?.75:.5;
    combo++;judged++;weighted+=value;
    const hypeActive=hypeEnd>0 && t<hypeEnd;
    const multiplier=Math.min(4,1+Math.floor(combo/10))*(hypeActive?2:1);
    score+=Math.round(value*100*multiplier);
    health=clamp(health+1.5,0,100);
    if(!hypeActive) charge=clamp(charge+2.5,0,100);
    feedback(quality+(combo>1?" · "+combo+" COMBO":""),quality==="PERFECT"?"#98fbf7":quality==="GREAT"?"#f7e879":"#fff");
    if (!isRadio && audio && master) voice(track.root+12+track.scale[lane%track.scale.length],audio.currentTime,.13,"triangle",.04);
    updateHud();
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
    if(audio&&audio.state==="running")audio.suspend().catch(()=>{});
    songSelect.disabled=false;difficultySelect.disabled=false;pauseBtn.disabled=true;
    playBtn.disabled=false;playBtn.textContent="↻ Play Again";
    if(!failed)saveBest();
    const accuracy=judged?Math.round(100*weighted/judged):0;
    showOverlay(failed?"ROCK METER EMPTY":"SONG COMPLETE!",fmt(score)+" points · "+accuracy+"% accuracy · Best combo "+fmt(maxCombo));
    status.textContent=failed?"The crowd needs another try. Restart the track!":"Great performance! Select another track or try for a higher score.";
    refreshBest();updateHud();draw();
  }
  let maxCombo=0;
  function checkMisses(t) {
    for (const note of notes) {
      if(note.judged)continue;
      if(t-note.at>.22) {
        note.judged=true;registerMiss();
      } else if (note.at>t) break;
    }
    maxCombo=Math.max(maxCombo,combo);
    // Let streamed songs finish even if players miss many notes.
    if(health<=0 && !isRadio)finishSong(true);
  }
  function draw() {
    const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
    if(!w||!h)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    }
    pen.setTransform(dpr,0,0,dpr);pen.clearRect(0,0,w,h);
    const backdrop=pen.createLinearGradient(0,0,0,h);
    backdrop.addColorStop(0,"#220e50");backdrop.addColorStop(.48,"#100e2f");backdrop.addColorStop(1,"#080a23");
    pen.fillStyle=backdrop;pen.fillRect(0,0,w,h);
    const t=Math.max(-2,songTime()),top=24,hitY=h*.79;
    for(let i=0;i<30;i++){
      const x=(i*97+43)%Math.max(1,w),y=(i*151+22)%Math.max(1,h*.65);
      pen.fillStyle=i%3===0?"#cba1fd88":"#6ae1ff77";
      pen.fillRect(x,y,i%5===0?3:2,i%5===0?3:2);
    }
    const width=Math.min(w*.90,620),left=(w-width)/2,laneW=width/5;
    pen.fillStyle="#0e1137e5";pen.fillRect(left,top,width,h-top);
    for(let lane=0;lane<5;lane++){
      pen.fillStyle=lane%2?"#252044bb":"#171a43bb";pen.fillRect(left+lane*laneW,top,laneW,h-top);
      pen.fillStyle=colors[lane]+"20";pen.fillRect(left+lane*laneW,hitY-13,laneW,30);
      pen.strokeStyle=colors[lane]+"77";pen.lineWidth=2;pen.beginPath();pen.moveTo(left+lane*laneW,top);pen.lineTo(left+lane*laneW,h);pen.stroke();
    }
    pen.strokeStyle="#967dffb0";pen.strokeRect(left,top,width,h-top);
    // Show incoming notes from the first frame, including while radio audio buffers.
    const speed=2.85;
    pen.lineWidth=2;
    for(let beat=0;beat<9;beat++){
      const offset=beat*beatSeconds();
      const next=Math.ceil(Math.max(0,t)/beatSeconds())*beatSeconds()+offset;
      const y=hitY-(next-t)/speed*(hitY-top);
      if(y>=top&&y<=hitY){pen.strokeStyle="#ffffff18";pen.beginPath();pen.moveTo(left,y);pen.lineTo(left+width,y);pen.stroke();}
    }
    for(const note of notes){
      if(note.judged)continue;
      const ahead=note.at-t;
      if(ahead>speed+.1||ahead<-.27)continue;
      const x=left+(note.lane+.5)*laneW,y=hitY-ahead/speed*(hitY-top);
      const rx=Math.min(30,laneW*.34),ry=11;
      pen.shadowColor=colors[note.lane];pen.shadowBlur=20;
      pen.fillStyle=colors[note.lane];
      pen.beginPath();pen.ellipse(x,y,rx,ry,0,0,2*Math.PI);pen.fill();
      pen.shadowBlur=0;
      pen.fillStyle="#ffffffaa";pen.beginPath();pen.ellipse(x,y-3,rx*.58,ry*.32,0,0,2*Math.PI);pen.fill();
    }
    pen.fillStyle="#fff";pen.shadowColor="#a5eaff";pen.shadowBlur=17;
    pen.fillRect(left,hitY-4,width,7);pen.shadowBlur=0;
    for(let lane=0;lane<5;lane++){
      const x=left+(lane+.5)*laneW;
      pen.fillStyle=colors[lane];pen.beginPath();pen.ellipse(x,hitY+14,Math.min(18,laneW*.25),8,0,0,2*Math.PI);pen.fill();
      pen.fillStyle="#fff";pen.font="bold "+Math.max(12,Math.min(20,laneW*.21))+"px system-ui";pen.textAlign="center";pen.fillText(keys[lane].toUpperCase(),x,Math.min(h-14,hitY+52));
    }
    if(state==="playing"&&hypeEnd>0&&t<hypeEnd){
      pen.fillStyle="#df8cff12";pen.fillRect(left,top,width,h-top);
      pen.strokeStyle="#efbaff";pen.lineWidth=3;pen.strokeRect(left,top,width,h-top);
    }
    if(state==="playing"&&t<0){
      pen.fillStyle="#fff";pen.font="900 45px system-ui";pen.textAlign="center";pen.shadowColor="#54cfff";pen.shadowBlur=16;
      pen.fillText("READY!",w/2,h*.25);pen.shadowBlur=0;
    }
  }
  function tick() {
    if(state==="loading"){
      draw();
      raf=requestAnimationFrame(tick);
      return;
    }
    if(state!=="playing")return;
    const t=songTime();
    if(!isRadio)scheduleMusic();
    checkMisses(t);
    if(state!=="playing")return;
    if(performance.now()>feedbackUntil)judgement.textContent="";
    maxCombo=Math.max(maxCombo,combo);
    updateHud();
    draw();
    if(isRadio){if(radioAudio && radioAudio.ended){finishSong();return;}}
    else if(t>totalTime+.65){finishSong();return;}
    raf=requestAnimationFrame(tick);
  }
  // All radio playback is driven by the browser's native audio element.
  // The note highway never waits on a dangling media.play() Promise.
  async function startSong() {
    const current=++loadSerial;
    cancelAnimationFrame(raf);
    if(radioAudio){
      const previous=radioAudio;
      previous.onplaying=null;previous.onpause=null;previous.onwaiting=null;
      previous.onstalled=null;previous.onerror=null;previous.onended=null;previous.oncanplay=null;
      previous.onloadedmetadata=null;previous.onseeked=null;
      previous.pause();previous.removeAttribute("src");previous.load();
      radioAudio=null;
    }
    if(audio){audio.close().catch(()=>{});audio=null;}
    master=null;
    track=songs[songSelect.value]||songs.neon;
    isRadio=!!track.radio;
    activeDifficulty=difficultySelect.value;
    setupOffset();
    if(radioPanel)radioPanel.hidden=!isRadio;
    if(chartStatus)chartStatus.textContent=isRadio?"Loading song chart in parallel…":"Playing original arcade chart.";
    const chartPromise=isRadio?getTrackChart(track):Promise.resolve(null);
    state="loading";
    // Never lock the restart button while waiting for network audio.
    playBtn.disabled=false;playBtn.textContent="↻ Retry Start";
    pauseBtn.disabled=true;songSelect.disabled=false;difficultySelect.disabled=false;
    score=0;combo=0;maxCombo=0;judged=0;weighted=0;health=75;charge=0;hypeEnd=0;beatNext=0;
    notes=makeNotes();
    if(isRadio&&appliedOffset)for(const note of notes)note.at+=appliedOffset;
    totalTime=isRadio?180:(4+track.bars*4)*beatSeconds();
    showOverlay("GETTING SONG READY",isRadio?"Audio player is available above. You can press its Play button if playback does not begin.":"Preparing original arcade track…");
    judgement.textContent="";
    status.textContent="Preparing "+track.title+"…";
    draw();updateHud();
    raf=requestAnimationFrame(tick);
    if(isRadio){
      const media=radioControl;
      if(!media){state="ready";cancelAnimationFrame(raf);status.textContent="Golden player is unavailable.";showOverlay("PLAYER UNAVAILABLE","Refresh the game page and try again.");return;}
      radioAudio=media;
      media.preload="metadata";
      media.volume=.75;
      media.muted=muteInput.checked;
      media.src=radioBase+encodeURI(track.path);
      media.load();
      audioStatus.textContent="Connecting to Golden. You can use Play in the player.";
      let started=false;
      let loadingTimeout=null;
      const valid=()=>current===loadSerial && radioAudio===media;
      const enterPlaying=()=>{
        if(!valid())return;
        if(state==="playing")return;
        if(state==="paused" || state==="buffering"){
          state="playing";
          hideOverlay();pauseBtn.disabled=false;pauseBtn.textContent="Pause";
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
        notes=makeNotes();
        if(appliedOffset)for(const note of notes)note.at+=appliedOffset;
        const now=media.currentTime||0;
        for(const note of notes)if(note.at<now-.22)note.judged=true;
        // A slow chart must not block the already-streaming audio.
        chartPromise.then(chart=>{
          if(!valid()||!["playing","paused","buffering"].includes(state))return;
          if(chart){
            track.bpm=chart.bpm;
            const actualDuration=Number.isFinite(media.duration)&&media.duration>0?media.duration:duration;
            const loadedNotes=notesFromChart(chart,actualDuration);
            const at=media.currentTime||0;
            for(const note of loadedNotes)if(note.at<at-.22)note.judged=true;
            notes=loadedNotes;
            if(chartStatus)chartStatus.textContent="Loaded "+activeDifficulty+" chart · "+track.bpm+" BPM · "+notes.length+" notes · timing draft.";
          }else if(chartStatus)chartStatus.textContent="Chart unavailable — using practice notes.";
          draw();
        }).catch(error=>{
          if(valid()&&chartStatus)chartStatus.textContent="Chart unavailable — using practice notes.";
          console.warn("CToon Jam chart error:",error);
        });
        state="playing";playBtn.disabled=false;playBtn.textContent="↻ Restart Song";
        pauseBtn.disabled=false;pauseBtn.textContent="Pause";
        songSelect.disabled=true;difficultySelect.disabled=true;
        hideOverlay();
        audioStatus.textContent="Now streaming "+track.title+".";
        status.textContent="Now playing "+track.title+" · "+activeDifficulty.toUpperCase()+". Use the five fret buttons or A S D J K.";
        // Also restart rendering when playback begins after a timeout or blocked autoplay.
        cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
        draw();updateHud();
      };
      const errorMessage=()=>{
        if(loadingTimeout!==null){clearTimeout(loadingTimeout);loadingTimeout=null;}
        const err=media.error;
        const reason=err&&err.code===4?"The recording format or URL is unsupported."
          :err&&err.code===3?"The browser could not decode this MP3."
          :err&&err.code===2?"The network connection interrupted audio loading."
          :"Audio could not be loaded.";
        audioStatus.textContent=reason+" Press Retry Audio or the player's Play button.";
        status.textContent=reason+" Try a different song if it keeps failing.";
        if(["loading","buffering","playing","paused"].includes(state)){
          state="ready";
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
      };
      media.onseeked=()=>{
        if(!valid())return;
        // Skipping ahead shouldn't count skipped notes as misses.
        for(const note of notes)if(note.at<media.currentTime-.22)note.judged=true;
        draw();updateHud();
      };
      media.oncanplay=()=>{
        if(valid()&&state==="loading"){
          audioStatus.textContent="Audio is ready. Press Play in the player if the song has not started.";
        }
      };
      media.onwaiting=()=>{
        if(!valid())return;
        audioStatus.textContent="Waiting for more audio to buffer…";
        if(state==="playing"){
          state="buffering";cancelAnimationFrame(raf);
          showOverlay("AUDIO BUFFERING","Playback will resume with the music when enough audio loads.");
        }
      };
      media.onstalled=()=>{
        if(valid())audioStatus.textContent="Golden audio stalled. Try Play or Retry Audio.";
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
          playBtn.textContent="↻ Retry Start";
        }
      },6000);
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
      makeNoise();await audio.resume();
      if(current!==loadSerial)return;
      startAt=audio.currentTime+1.3;
    }catch(error){
      if(current!==loadSerial)return;
      state="ready";cancelAnimationFrame(raf);
      if(audio){audio.close().catch(()=>{});audio=null;}
      const message=error&&error.message?error.message:"Audio unavailable";
      status.textContent="Could not start "+track.title+": "+message;
      showOverlay("PLAYBACK UNAVAILABLE","Press Retry Start or choose another track.");
      playBtn.textContent="▶ Retry Start";
      draw();updateHud();return;
    }
    if(current!==loadSerial)return;
    state="playing";songSelect.disabled=true;difficultySelect.disabled=true;
    pauseBtn.disabled=false;pauseBtn.textContent="Pause";playBtn.textContent="↻ Restart Song";
    hideOverlay();
    status.textContent="Playing "+track.title+" · "+activeDifficulty.toUpperCase()+". Hit notes on the fret line!";
    updateHud();draw();
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
  if(retryAudio)retryAudio.addEventListener("click",()=>{if(songSelect.value==="golden")startSong();});
  playBtn.addEventListener("click",startSong);
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

  function flashButton(lane) {
    const button=controls[lane];if(!button)return;
    button.classList.add("is-pressed");
    clearTimeout(button._flash);
    button._flash=setTimeout(()=>button.classList.remove("is-pressed"),100);
  }
  for(const button of controls) {
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();
      const lane=Number(button.dataset.lane);
      flashButton(lane);hit(lane);
    });
    button.addEventListener("click",event=>{if(event.detail===0){const lane=Number(button.dataset.lane);flashButton(lane);hit(lane);}});
    button.addEventListener("contextmenu",event=>event.preventDefault());
  }
  document.addEventListener("keydown",event=>{
    const tag=event.target && event.target.tagName;
    if(tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA"||(tag==="BUTTON"&&event.code==="Space"))return;
    if(event.code==="Space" && !event.repeat){event.preventDefault();activateHype();return;}
    const lane=keys.indexOf(event.key.toLowerCase());
    if(lane>=0&&!event.repeat){event.preventDefault();flashButton(lane);hit(lane);}
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden && state==="playing")togglePause();
  });
  window.addEventListener("resize",draw);

  try {refreshBest();updateHud();draw();}
  catch(error){console.warn("CToon Jam stage initialization failed:",error);status.textContent="The note board may need a reload.";}
})();