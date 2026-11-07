// Empty roster by owner request. No default, saved-avatar, or CPU fighters are instantiated.
const canvas=document.getElementById('fight');
const ctx=canvas.getContext('2d');
const roster=[];
document.getElementById('fighter-roster').replaceChildren();
document.getElementById('selected-fighter').textContent='No fighters added yet.';
document.getElementById('fight-message').textContent='NO FIGHTERS YET';
document.getElementById('fight-status').textContent='All characters have been removed. The arena is ready for future fighters.';
const startButton=document.getElementById('start'),pauseButton=document.getElementById('pause');
startButton.disabled=true;pauseButton.disabled=true;
startButton.title='Add fighters before starting a match';
for(const button of document.querySelectorAll('[data-key]'))button.disabled=true;
const ground=445;
function draw(){const sky=ctx.createLinearGradient(0,0,0,540);sky.addColorStop(0,'#11144e');sky.addColorStop(.75,'#593a96');sky.addColorStop(1,'#172654');ctx.fillStyle=sky;ctx.fillRect(0,0,960,540);ctx.fillStyle='#8d5aff';for(let i=0;i<12;i++){const h=100+(i*41)%150;ctx.fillRect(i*88,ground-h,70,h);ctx.fillStyle='#70dfff';for(let y=ground-h+15;y<ground-12;y+=25)ctx.fillRect(i*88+15,y,10,8);ctx.fillStyle='#8d5aff'}ctx.fillStyle='#24204d';ctx.fillRect(0,ground,960,95);ctx.strokeStyle='#ff5bd5';ctx.lineWidth=3;for(let i=0;i<11;i++){ctx.beginPath();ctx.moveTo(480,ground);ctx.lineTo(i*130-180,540);ctx.stroke()}for(let y=ground+25;y<540;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke()}}

draw();
