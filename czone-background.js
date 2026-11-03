(()=>{
 const select=document.getElementById('czone-background');
 const status=document.getElementById('czone-background-status');
 const preview=document.querySelector('.czone-preview');
 if(!select||!status||!preview)return;
 const image=new URL('images/czone/traverse-town.png',document.baseURI).href;
 const key='ctooniverse-czone-background';
 let request=0;
 function apply(choice){
  const traverse=choice==='traverse-town';
  select.value=choice;
  document.body.classList.toggle('czone-traverse-town',traverse);
  preview.classList.toggle('czone-scene-traverse',traverse);
  // Apply the image to My Display itself, not the page background.
  preview.style.setProperty('background-image',traverse?
   'linear-gradient(180deg,rgba(4,8,27,.12),rgba(4,8,27,.28)),url("'+image+'")':
   'linear-gradient(145deg,rgba(16,28,81,.87),rgba(39,15,87,.89))','important');
  preview.style.setProperty('background-size','100% 100%','important');
  preview.style.setProperty('background-position','center center','important');
  preview.style.setProperty('background-repeat','no-repeat','important');
  preview.style.setProperty('background-color','#080d24','important');
  status.textContent=traverse?'Traverse Town is showing in My Display.':'Neon Arcade is showing in My Display.';
 }
 function choose(choice){
  const token=++request;
  if(choice!=='traverse-town'){localStorage.setItem(key,'arcade');apply('arcade');return}
  status.textContent='Loading Traverse Town background…';
  const test=new Image();
  test.onload=()=>{if(token!==request)return;localStorage.setItem(key,choice);apply(choice)};
  test.onerror=()=>{if(token!==request)return;const previous=localStorage.getItem(key)==='traverse-town'?'arcade':(localStorage.getItem(key)||'arcade');apply(previous);status.textContent='Traverse Town image could not be loaded. Check images/czone/traverse-town.png.'};
  test.src=image;
 }
 select.addEventListener('change',()=>choose(select.value));
 choose(localStorage.getItem(key)==='traverse-town'?'traverse-town':'arcade');
})();