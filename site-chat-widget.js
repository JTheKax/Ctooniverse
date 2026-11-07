// Shared global chat dock, available across CTooniverse pages.
if(!document.getElementById('global-chat-form')){
 const dock=document.createElement('aside');dock.className='site-chat-dock';dock.setAttribute('aria-label','Global player chat');
 dock.innerHTML='<button type="button" class="site-chat-toggle" aria-expanded="false" aria-controls="site-chat-panel">💬 Global Chat</button><section id="site-chat-panel" class="global-chat site-chat-panel" hidden><h2>🌐 Global Chat</h2><div id="global-chat-messages" class="global-chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div><form id="global-chat-form"><label for="global-chat-input">Message</label><div class="global-chat-compose"><input id="global-chat-input" maxlength="400" placeholder="Chat with players…" autocomplete="off" required><button type="submit" class="button">Send</button></div></form><p id="global-chat-status" role="status"></p></section>';
 document.body.append(dock);
 const toggle=dock.querySelector('.site-chat-toggle'),panel=dock.querySelector('#site-chat-panel');
 toggle.addEventListener('click',()=>{const opening=panel.hidden;panel.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));if(opening)dock.querySelector('#global-chat-input').focus()});
 import('./global-chat.js?v=1').catch(()=>{dock.querySelector('#global-chat-status').textContent='Chat could not load.'});
}
