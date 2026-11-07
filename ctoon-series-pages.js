import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.querySelector('.ctoon-subseries-grid');
const category=document.body.dataset.ctoonCategory;
const logoFiles={
 'animal crossing':'animal-crossing-ctoon-set.png',
 'courage the cowardly dog':'courage-the-cowardly-dog-ctoon-set.png',
 'disney':'disney-ctoon-set.png',
 'final fantasy':'final-fantasy-ctoon-set.png',
 'king of the hill':'king-of-the-hill-ctoon-set.png',
 "luigi's mansion":'luigis-mansion-ctoon-set.png',
 'luigis mansion':'luigis-mansion-ctoon-set.png',
 'mucha lucha':'mucha-lucha-ctoon-set.png',
 'resident evil':'resident-evil-ctoon-set.png',
 'super mario':'super-mario-ctoon-set.png',
 'the legend of zelda':'the-legend-of-zelda-ctoon-set.png',
 'legend of zelda':'the-legend-of-zelda-ctoon-set.png',
 'the simpsons':'the-simpsons-ctoon-set.png',
 'simpsons':'the-simpsons-ctoon-set.png',
 'wwe 2k':'wwe-2k-ctoon-set.png',
 'dead rising':'dead-rising-ctoon-set.png',
 'fallout':'fallout-ctoon-set.png',
 'kingdom hearts':'kingdom-hearts-ctoon-set.png',
 'spongebob squarepants':'spongebob-squarepants-ctoon-set.jpg',
 'yu-gi-oh':'yu-gi-oh-ctoon-set.png',
 'yu-gi-oh!':'yu-gi-oh-ctoon-set.png'
};
if(grid&&category){
 const {data,error}=await db.from('ctoon_series').select('name,slug').eq('category',category).order('name');
 if(error){const msg=document.createElement('p');msg.textContent='Unable to refresh sets. Showing saved page links.';grid.before(msg)}
 else{
  const fragment=document.createDocumentFragment();
  for(const set of data||[]){
   const card=document.createElement('a');
   card.href='ctoon-set.html?category='+encodeURIComponent(category==='Cartoon & Anime'?'Cartoons':'Video Games')+'&series='+encodeURIComponent(set.name);
   card.className='ctoon-series-card';
   card.style.cssText='display:block;max-width:220px;width:100%;box-sizing:border-box;padding:.6rem;border:2px solid #8a65e8;border-radius:18px;background:rgba(17,12,48,.88);text-align:center;color:inherit;text-decoration:none';
   const name=String(set.name||'').trim();
   const key=name.toLowerCase().replace(/\s+/g,' ');
   const logo=logoFiles[key]||logoFiles[String(set.slug||'').replace(/-/g,' ')];
   const artwork=document.createElement('div');
   artwork.style.cssText='width:100%;height:150px;display:flex;align-items:center;justify-content:center;border-radius:10px;overflow:hidden;background:rgba(60,37,112,.45)';
   const fallback=document.createElement('span');
   fallback.textContent=name;
   fallback.style.cssText='font-weight:800;font-size:1.1rem;overflow-wrap:anywhere;padding:8px';
   artwork.append(fallback);
   if(logo){
    const img=document.createElement('img');
    img.src='public/images/ctoon-set-logos/'+logo;
    img.alt=name+' CToon Set logo';
    img.loading='lazy';
    img.style.cssText='display:block;width:100%;height:100%;object-fit:contain';
    img.addEventListener('load',()=>artwork.replaceChildren(img));
   }
   const title=document.createElement('h3');title.textContent=name+' CToon Set';
   const tag=document.createElement('span');tag.className='coming-tag';tag.textContent='VIEW SET';
   card.append(artwork,title,tag);fragment.append(card);
  }
  grid.replaceChildren(fragment);
 }
}
