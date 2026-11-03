"use strict";
(()=>{if(document.getElementById('ctoon-music-player'))return;
const root=document.createElement('aside');root.id='ctoon-music-player';root.className='ctoon-music-player';root.setAttribute('aria-label','Website music player');
root.innerHTML='<button class="music-toggle" type="button" aria-expanded="false" aria-controls="music-controls">♫ RADIO</button><div id="music-controls" class="music-controls" hidden><div class="music-heading"><span class="music-brand"><span class="music-live-dot" aria-hidden="true"></span> CTOONIVERSE <small>RADIO // PLAYER 01</small></span><button type="button" class="music-close" aria-label="Close music player">×</button></div><div class="music-now-playing"><div class="music-disc" aria-hidden="true"><span>♫</span></div><div class="music-song-info"><span class="music-kicker">NOW PLAYING</span><p class="music-track">No music uploaded yet</p><div class="music-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><label class="music-choice-label" for="music-song-choice">Choose a song</label><select id="music-song-choice" class="music-song-choice" disabled><option value="">Loading songs…</option></select><audio preload="none"></audio><div class="music-actions"><button type="button" class="music-play" disabled>▶ Play</button><button type="button" class="music-skip" aria-label="Skip to next song" disabled>⏭ Skip</button><button type="button" class="music-repeat" aria-label="Repeat current song" aria-pressed="false" disabled>🔁 Repeat: Off</button><button type="button" class="music-mute" aria-label="Mute music" disabled>♫</button><label class="music-volume-label">Volume <input class="music-volume" type="range" min="0" max="100" value="50" disabled aria-label="Music volume"></label></div><p class="music-hint">Music will be available when a track is added.</p></div>';
document.body.append(root);
const toggle=root.querySelector('.music-toggle'),panel=root.querySelector('.music-controls'),close=root.querySelector('.music-close'),audio=root.querySelector('audio'),play=root.querySelector('.music-play'),skip=root.querySelector('.music-skip'),repeat=root.querySelector('.music-repeat'),mute=root.querySelector('.music-mute'),volume=root.querySelector('.music-volume'),label=root.querySelector('.music-track'),choice=root.querySelector('.music-song-choice'),hint=root.querySelector('.music-hint');
const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
toggle.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>setOpen(false));
audio.volume=.5;
let tracks=[];let index=0;let selectTrack=()=>{};let repeatOne=false;
let autoplayPending=true;
const tryAutoplay=async()=>{if(!autoplayPending||!tracks.length||!audio.paused)return;try{await audio.play();autoplayPending=false;hint.textContent='Now playing automatically.'}catch(_){hint.textContent='Autoplay is blocked by your browser. Click anywhere or press a key to start the radio.'}};
const resumeAutoplay=()=>{if(autoplayPending)void tryAutoplay()};
document.addEventListener('pointerdown',resumeAutoplay,{capture:true});
document.addEventListener('keydown',resumeAutoplay,{capture:true});
const advance=async()=>{if(!tracks.length)return;const wasPlaying=!audio.paused;index=(index+1)%tracks.length;selectTrack();if(wasPlaying){try{await audio.play()}catch(_){hint.textContent='Press Play to hear the next song.'}}};
skip.addEventListener('click',advance);
repeat.addEventListener('click',()=>{repeatOne=!repeatOne;repeat.setAttribute('aria-pressed',String(repeatOne));repeat.textContent=repeatOne?'🔂 Repeat: On':'🔁 Repeat: Off';});
choice.addEventListener('change',async()=>{const wasPlaying=!audio.paused;index=Number(choice.value);if(!Number.isInteger(index)||index<0||index>=tracks.length)return;selectTrack();if(wasPlaying){try{await audio.play()}catch(_){hint.textContent='Press Play to start the selected song.'}}});
const sync=()=>{root.classList.toggle('is-playing',!audio.paused);play.textContent=audio.paused?'▶ Play':'❚❚ Pause';mute.textContent=audio.muted?'🔇':'♫';};
play.addEventListener('click',async()=>{autoplayPending=false;if(!audio.src)return;try{if(audio.paused)await audio.play();else audio.pause();}catch(_){hint.textContent='Playback was blocked. Press Play again.'}sync();});
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
  choice.replaceChildren();tracks.forEach((track,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=track.title;choice.append(option)});choice.disabled=false;skip.disabled=false;repeat.disabled=false;
  selectTrack=()=>{const t=tracks[index];label.textContent=t.title;choice.value=String(index);audio.src='https://hsxdyxdazsdmpucyhqly.supabase.co/storage/v1/object/public/site-music/'+t.storage_path;play.disabled=false;mute.disabled=false;volume.disabled=false;hint.textContent='Press Play to listen.'};
  selectTrack();
  void tryAutoplay();
  audio.addEventListener('ended',()=>{if(repeatOne){audio.currentTime=0;audio.play().catch(()=>{hint.textContent='Press Play to repeat this song.'});return}index=(index+1)%tracks.length;selectTrack();audio.play().catch(()=>{hint.textContent='Press Play for the next song.'})});
 }catch(error){hint.textContent='Unable to load music: '+error.message;label.textContent='Music temporarily unavailable'}
}
loadMusic();

})();