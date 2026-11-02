"use strict";
(()=>{if(document.getElementById('ctoon-music-player'))return;
const root=document.createElement('aside');root.id='ctoon-music-player';root.className='ctoon-music-player';root.setAttribute('aria-label','Website music player');
root.innerHTML='<button class="music-toggle" type="button" aria-expanded="false" aria-controls="music-controls">♫ Music</button><div id="music-controls" class="music-controls" hidden><div class="music-heading">♫ CTooniverse Radio <button type="button" class="music-close" aria-label="Close music player">×</button></div><p class="music-track">No music uploaded yet</p><audio preload="none"></audio><div class="music-actions"><button type="button" class="music-play" disabled>▶ Play</button><button type="button" class="music-mute" aria-label="Mute music" disabled>♫</button><label class="music-volume-label">Volume <input class="music-volume" type="range" min="0" max="100" value="50" disabled aria-label="Music volume"></label></div><p class="music-hint">Music will be available when a track is added.</p></div>';
document.body.append(root);
const toggle=root.querySelector('.music-toggle'),panel=root.querySelector('.music-controls'),close=root.querySelector('.music-close'),audio=root.querySelector('audio'),play=root.querySelector('.music-play'),mute=root.querySelector('.music-mute'),volume=root.querySelector('.music-volume'),label=root.querySelector('.music-track'),hint=root.querySelector('.music-hint');
const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
toggle.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>setOpen(false));
audio.volume=.5;
let tracks=[];
const sync=()=>{play.textContent=audio.paused?'▶ Play':'❚❚ Pause';mute.textContent=audio.muted?'🔇':'♫';};
play.addEventListener('click',async()=>{if(!audio.src)return;try{if(audio.paused)await audio.play();else audio.pause();}catch(_){hint.textContent='Playback was blocked. Press Play again.'}sync();});
mute.addEventListener('click',()=>{audio.muted=!audio.muted;sync();});
volume.addEventListener('input',()=>{audio.volume=Number(volume.value)/100;if(audio.volume>0)audio.muted=false;sync();});
audio.addEventListener('play',sync);audio.addEventListener('pause',sync);
audio.addEventListener('error',()=>{hint.textContent='This audio file could not be loaded.';play.disabled=true;});
fetch('https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/site_music_tracks?select=title,storage_path&enabled=eq.true&order=sort_order.asc,created_at.asc',{headers:{apikey:'sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS'},cache:'no-store'}).then(r=>r.ok?r.json():[]).then(data=>{tracks=Array.isArray(data)?data.filter(t=>t&&typeof t.title==='string'&&/^tracks\/[a-zA-Z0-9_-]+\.(mp3|ogg|wav)$/.test(t.storage_path)):[];if(!tracks.length)return;let index=0;const select=()=>{const t=tracks[index];label.textContent=t.title;audio.src='https://hsxdyxdazsdmpucyhqly.supabase.co/storage/v1/object/public/site-music/'+t.storage_path;play.disabled=false;mute.disabled=false;volume.disabled=false;hint.textContent='Press Play to listen.'};select();audio.addEventListener('ended',()=>{index=(index+1)%tracks.length;select();audio.play().catch(()=>{});});}).catch(()=>{});

})();