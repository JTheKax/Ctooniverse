"use strict";
(()=>{if(document.getElementById('ctoon-music-player'))return;
const root=document.createElement('aside');root.id='ctoon-music-player';root.className='ctoon-music-player ctoon-radio-nightstage';root.setAttribute('aria-label','Website music player');
root.innerHTML='<div id="music-controls" class="music-controls"><div class="music-heading"><span class="music-brand"><span class="music-live-dot" aria-hidden="true"></span> CTOON RADIO <small>✦ NIGHT STAGE // VOL. 01 ✦</small></span></div><div class="music-now-playing"><div class="music-disc" aria-hidden="true"><span>♫</span></div><div class="music-song-info"><span class="music-kicker">NOW PLAYING</span><p class="music-track">No music uploaded yet</p><div class="music-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><label class="music-choice-label" for="music-sort-choice">Organize songs</label><select id="music-sort-choice" class="music-song-choice"><option value="title">Alphabetical (A–Z)</option><option value="artist">By Artist (A–Z)</option></select><label class="music-choice-label" for="music-song-choice">Choose a song</label><select id="music-song-choice" class="music-song-choice" disabled><option value="">Loading songs…</option></select><audio preload="none"></audio><div class="music-actions"><button type="button" class="music-play" disabled>▶ Play</button><button type="button" class="music-skip" aria-label="Skip to next song" disabled>⏭ Skip</button><button type="button" class="music-repeat" aria-label="Repeat current song" aria-pressed="false" disabled>🔁 Repeat: Off</button><button type="button" class="music-mute" aria-label="Mute music" disabled>♫</button><label class="music-volume-label">Volume <input class="music-volume" type="range" min="0" max="100" value="50" disabled aria-label="Music volume"></label></div><p class="music-hint">Music will be available when a track is added.</p></div>';
document.body.append(root);
/* Decorative stage styling is independent of the authenticated music library. */
if(!document.querySelector('link[data-ctoon-radio-nightstage]')){
  const stageStyles=document.createElement('link');
  stageStyles.rel='stylesheet';
  stageStyles.href='ctoon-radio-stage.css?v=night-stage-20261114-v1';
  stageStyles.dataset.ctoonRadioNightstage='true';
  document.head.append(stageStyles);
}
/* Group existing sort/song controls to avoid overlapping radio grid areas. */
const radioLibrary=document.createElement('div');
radioLibrary.className='music-library';
const sortLabel=root.querySelector('label[for="music-sort-choice"]');
const songLabel=root.querySelector('label[for="music-song-choice"]');
const sortSelect=root.querySelector('#music-sort-choice');
const songSelect=root.querySelector('#music-song-choice');
const nowPlaying=root.querySelector('.music-now-playing');
if(sortLabel&&songLabel&&sortSelect&&songSelect&&nowPlaying){
  radioLibrary.append(sortLabel,sortSelect,songLabel,songSelect);
  nowPlaying.after(radioLibrary);
}
const stageHeading=root.querySelector('.music-heading');
if(stageHeading){
  const stars=document.createElement('span');
  stars.className='radio-stage-stars';
  stars.setAttribute('aria-hidden','true');
  stars.textContent='✦ ✧ ✦';
  stageHeading.append(stars);
}
const panel=root.querySelector('.music-controls'),audio=root.querySelector('audio'),play=root.querySelector('.music-play'),skip=root.querySelector('.music-skip'),repeat=root.querySelector('.music-repeat'),mute=root.querySelector('.music-mute'),volume=root.querySelector('.music-volume'),label=root.querySelector('.music-track'),choice=root.querySelector('#music-song-choice'),sortChoice=root.querySelector('#music-sort-choice'),hint=root.querySelector('.music-hint');
audio.volume=.5;
let tracks=[];let index=0;
const parts=title=>{const match=title.match(/^(.+?)\s+[-–—]\s+(.+)$/);return match?{artist:match[1].trim(),song:match[2].trim()}:{artist:'Unknown Artist',song:title.trim()}};
const compare=new Intl.Collator(undefined,{sensitivity:'base',numeric:true});
function sortTracks(){
 const selected=tracks[index]?.storage_path;
 tracks.sort((a,b)=>{const x=parts(a.title),y=parts(b.title);return sortChoice.value==='artist'?(compare.compare(x.artist,y.artist)||compare.compare(x.song,y.song)):(compare.compare(x.song,y.song)||compare.compare(x.artist,y.artist))});
 index=Math.max(0,tracks.findIndex(t=>t.storage_path===selected));
 choice.replaceChildren();
 let group=null,lastArtist=null;
 tracks.forEach((track,i)=>{
  const parsed=parts(track.title);
  if(sortChoice.value==='artist'){
   if(parsed.artist!==lastArtist){group=document.createElement('optgroup');group.label=parsed.artist;choice.append(group);lastArtist=parsed.artist}
  }
  const option=document.createElement('option');option.value=String(i);option.textContent=sortChoice.value==='artist'?parsed.song:track.title;
  (group||choice).append(option);
 });
 choice.value=String(index);
}
let selectTrack=()=>{};let repeatOne=false;
// Radio playback starts only when the listener presses Play.
const advance=async()=>{if(!tracks.length)return;const wasPlaying=!audio.paused;index=(index+1)%tracks.length;selectTrack();if(wasPlaying){try{await audio.play()}catch(_){hint.textContent='Press Play to hear the next song.'}}};
skip.addEventListener('click',advance);
sortChoice.addEventListener('change',()=>{if(!tracks.length)return;sortTracks();choice.value=String(index)});
repeat.addEventListener('click',()=>{repeatOne=!repeatOne;repeat.setAttribute('aria-pressed',String(repeatOne));repeat.textContent=repeatOne?'🔂 Repeat: On':'🔁 Repeat: Off';});
choice.addEventListener('change',async()=>{const wasPlaying=!audio.paused;index=Number(choice.value);if(!Number.isInteger(index)||index<0||index>=tracks.length)return;selectTrack();if(wasPlaying){try{await audio.play()}catch(_){hint.textContent='Press Play to start the selected song.'}}});
const sync=()=>{root.classList.toggle('is-playing',!audio.paused);play.textContent=audio.paused?'▶ Play':'❚❚ Pause';mute.textContent=audio.muted?'🔇':'♫';};
play.addEventListener('click',async()=>{if(!audio.src)return;try{if(audio.paused)await audio.play();else audio.pause();}catch(_){hint.textContent='Playback was blocked. Press Play again.'}sync();});
mute.addEventListener('click',()=>{audio.muted=!audio.muted;sync();});
volume.addEventListener('input',()=>{audio.volume=Number(volume.value)/100;if(audio.volume>0)audio.muted=false;sync();});
audio.addEventListener('play',sync);audio.addEventListener('pause',sync);
audio.addEventListener('error',()=>{hint.textContent='This audio file could not be loaded.';play.disabled=true;});
async function loadMusic(){
 hint.textContent='Loading music library…';
 try{
  const response=await fetch('https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/site_music_tracks?select=title,storage_path&enabled=eq.true&order=sort_order.asc,created_at.asc',{headers:{apikey:'sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS',Authorization:'Bearer sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS'},cache:'no-store'});
  if(!response.ok)throw new Error('Music service returned '+response.status);
  const data=await response.json();
  tracks=Array.isArray(data)?data.filter(t=>t&&typeof t.title==='string'&&t.storage_path.startsWith('tracks/')&&['mp3','ogg','wav'].includes(t.storage_path.split('.').pop().toLowerCase())):[];
  if(!tracks.length){hint.textContent='No published tracks found. Please try refreshing.';return}
  sortTracks();choice.disabled=false;skip.disabled=false;repeat.disabled=false;
  selectTrack=()=>{const t=tracks[index];label.textContent=t.title;choice.value=String(index);audio.src='https://hsxdyxdazsdmpucyhqly.supabase.co/storage/v1/object/public/site-music/'+t.storage_path;play.disabled=false;mute.disabled=false;volume.disabled=false;hint.textContent='Press Play to listen.'};
  // Choose a random song without starting playback.
  index=Math.floor(Math.random()*tracks.length);
  selectTrack();
  audio.addEventListener('ended',()=>{if(repeatOne){audio.currentTime=0;audio.play().catch(()=>{hint.textContent='Press Play to repeat this song.'});return}index=(index+1)%tracks.length;selectTrack();audio.play().catch(()=>{hint.textContent='Press Play for the next song.'})});
 }catch(error){hint.textContent='Unable to load music: '+error.message;label.textContent='Music temporarily unavailable'}
}
loadMusic();

})();