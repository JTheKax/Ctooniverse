(()=>{
 const select=document.getElementById('czone-background'),status=document.getElementById('czone-background-status');
 if(!select)return;
 const image='images/czone/traverse-town.png';
 const key='ctooniverse-czone-background';
 function apply(choice){
  document.body.classList.toggle('czone-traverse-town',choice==='traverse-town');
  select.value=choice;
  status.textContent=choice==='traverse-town'?'Traverse Town background selected.':'Neon Arcade background selected.';
 }
 const saved=localStorage.getItem(key);
 apply(saved==='traverse-town'?'traverse-town':'arcade');
 select.addEventListener('change',()=>{
  const choice=select.value;
  if(choice!=='traverse-town'){localStorage.setItem(key,'arcade');apply('arcade');return}
  const test=new Image();
  test.onload=()=>{localStorage.setItem(key,choice);apply(choice)};
  test.onerror=()=>{select.value=localStorage.getItem(key)||'arcade';status.textContent='Traverse Town image is awaiting upload. Keep using Neon Arcade for now.'};
  test.src=image;
 });
})();