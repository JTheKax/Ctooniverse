// Original procedurally composed arcade themes for CToon Showdown.
// No third-party audio files, remote requests, or copyrighted recordings.
'use strict';
const THEMES=Object.freeze({
 neon:{
  name:'Neon Knockout',bpm:146,leadType:'sawtooth',
  bass:[38,null,38,45,38,null,41,45,36,null,36,43,36,43,45,41],
  lead:[74,null,77,81,null,79,77,null,74,77,79,74,72,null,74,null,
        77,null,81,84,null,82,81,77,79,null,77,74,76,79,77,null],
  chords:[[50,57,62],[48,55,60],[46,53,58],[48,55,60]]
 },
 pixel:{
  name:'Pixel Rumble',bpm:164,leadType:'square',
  bass:[40,40,null,47,40,40,43,47,38,38,null,45,38,45,47,43],
  lead:[76,79,83,79,76,null,74,76,79,83,86,83,79,null,76,null,
        74,76,79,81,83,81,79,76,74,71,74,76,79,76,74,null],
  chords:[[52,59,64],[50,57,62],[48,55,60],[50,57,62]]
 }
});
const clampVolume=value=>Math.max(0,Math.min(100,Number(value)||0));
const hz=midi=>440*Math.pow(2,(midi-69)/12);

export function createBattleAudio(themeControl,volumeControl,statusControl){
 let context=null,master=null,noise=null,playing=false,paused=false,nextAt=0,step=0;
 const storageKey='ctoon-showdown-battle-audio-v1';
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(saved&&Object.hasOwn(THEMES,saved.theme))themeControl.value=saved.theme;
  else if(saved?.theme==='off')themeControl.value='off';
  if(saved&&Number.isFinite(saved.volume))volumeControl.value=String(clampVolume(saved.volume));
 }catch(_){}
 const selected=()=>THEMES[themeControl.value]||THEMES.neon;
 function updateLabel(){
  if(statusControl)statusControl.textContent=themeControl.value==='off'
   ?'MUSIC OFF · COUNTDOWN SOUNDS ON'
   :selected().name.toUpperCase()+' · ORIGINAL SHOWDOWN THEME';
  if(master)master.gain.setTargetAtTime(.42*clampVolume(volumeControl.value)/100,context.currentTime,.02);
  const output=document.getElementById('battle-music-volume-value');
  if(output)output.textContent=clampVolume(volumeControl.value)+'%';
 }
 function save(){
  try{localStorage.setItem(storageKey,JSON.stringify({theme:themeControl.value,volume:clampVolume(volumeControl.value)}))}catch(_){}
 }
 themeControl.addEventListener('change',()=>{
  step=0;
  if(context)nextAt=context.currentTime+.09;
  updateLabel();save();
 });
 volumeControl.addEventListener('input',()=>{updateLabel();save()});
 updateLabel();

 function ensure(){
  if(context)return true;
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  if(!AudioEngine){
   if(statusControl)statusControl.textContent='AUDIO NOT SUPPORTED · VISUAL COUNTDOWN STILL WORKS';
   return false;
  }
  try{
   context=new AudioEngine();
   master=context.createGain();
   master.gain.value=.42*clampVolume(volumeControl.value)/100;
   master.connect(context.destination);
   const length=Math.round(context.sampleRate*.18);
   noise=context.createBuffer(1,length,context.sampleRate);
   const channel=noise.getChannelData(0);
   let seed=1234567;
   for(let i=0;i<channel.length;i++){
    seed=(1664525*seed+1013904223)>>>0;
    channel[i]=(seed/2147483647)-1;
   }
   return true;
  }catch(error){
   console.warn('Battle audio unavailable:',error);
   if(statusControl)statusControl.textContent='AUDIO UNAVAILABLE · VISUAL COUNTDOWN STILL WORKS';
   return false;
  }
 }
 function prepare(){
  if(!ensure())return;
  paused=false;
  if(context.state!=='running')context.resume().catch(error=>console.warn('Tap to enable battle sound:',error));
 }
 function tone(note,at,duration,type='square',level=.15){
  if(!context||!master)return;
  const osc=context.createOscillator(),gain=context.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(hz(note),at);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,at+Math.max(.05,duration));
  osc.connect(gain);gain.connect(master);
  osc.start(at);osc.stop(at+Math.max(.05,duration)+.012);
 }
 function percussion(at,kind){
  if(!context||!master)return;
  if(kind==='kick'){
   const osc=context.createOscillator(),gain=context.createGain();
   osc.type='sine';
   osc.frequency.setValueAtTime(160,at);
   osc.frequency.exponentialRampToValueAtTime(45,at+.15);
   gain.gain.setValueAtTime(.32,at);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.19);
   osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+.2);
  }else{
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=noise;filter.type='highpass';filter.frequency.value=kind==='snare'?1250:5200;
   gain.gain.setValueAtTime(kind==='snare'?.10:.035,at);
   gain.gain.exponentialRampToValueAtTime(.0001,at+(kind==='snare'?.12:.055));
   source.connect(filter);filter.connect(gain);gain.connect(master);
   source.start(at);source.stop(at+(kind==='snare'?.13:.065));
  }
 }
 function playStep(at){
  const theme=selected(),i=step%16,j=step%32,beat=60/theme.bpm/4;
  if(i%4===0)percussion(at,'kick');
  if(i%8===4)percussion(at,'snare');
  if(i%2===0)percussion(at,'hat');
  const bass=theme.bass[i],lead=theme.lead[j];
  if(bass!==null)tone(bass,at,beat*1.7,'triangle',.18);
  if(lead!==null)tone(lead,at,beat*(j%4===0?2.3:1.25),theme.leadType,.11);
  if(j%8===0){
   const chord=theme.chords[Math.floor(j/8)%4];
   for(const note of chord)tone(note,at,beat*5.2,'sine',.023);
  }
 }
 function tick(){
  if(!playing||paused||!context||context.state!=='running')return;
  if(nextAt<context.currentTime-.2)nextAt=context.currentTime+.035;
  let safety=0;
  while(nextAt<context.currentTime+.22&&safety++<8){
   if(themeControl.value!=='off')playStep(nextAt);
   nextAt+=60/selected().bpm/4;
   step=(step+1)%32;
  }
 }
 function startTheme(){
  if(!context)prepare();
  if(!context)return;
  playing=true;step=0;nextAt=context.currentTime+.055;
 }
 function stopTheme(){playing=false;step=0;}
 function cue(value){
  if(!context)return;
  const at=context.currentTime+.025;
  if(value==='fight'){
   tone(76,at,.20,'sawtooth',.17);
   tone(83,at+.13,.33,'sawtooth',.2);
   tone(88,at+.27,.46,'square',.13);
  }else{
   const note=Number(value)===1?76:Number(value)===2?72:69;
   tone(note,at,.16,'square',.14);
  }
 }
 function pause(){
  paused=true;
  if(context?.state==='running')context.suspend().catch(()=>{});
 }
 function resume(){
  paused=false;
  if(context){
   context.resume().then(()=>{nextAt=context.currentTime+.055}).catch(()=>{});
  }
 }
 return {prepare,startTheme,stopTheme,tick,cue,pause,resume};
}
