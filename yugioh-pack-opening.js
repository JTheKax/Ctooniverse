/* CTooniverse booster-opening presentation.
 * The trusted database RPC determines rewards before this animation runs.
 * This module never chooses a card, spends coins, or modifies a collection.
 */
const TIERS=["Common","Uncommon","Rare","Epic","Legendary"];
function element(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
function button(className,text,label){
 const node=element("button",className,text);
 node.type="button";
 if(label)node.setAttribute("aria-label",label);
 return node;
}
function tierFor(reward){
 const tier=reward&&reward.tier;
 return TIERS.includes(tier)?tier:"";
}
function cardFace(reward,artwork){
 const card=reward.card||{};
 const tier=tierFor(reward);
 const item=element("div","ycp-face-details");
 if(tier)item.append(element("span","ycp-rarity ycp-rarity-"+tier.toLowerCase(),tier));
 else item.append(element("span","ycp-rarity","New Card"));
 const frame=artwork(card.art_image_id);
 frame.classList.add("ycp-card-art");
 item.append(frame,element("strong","ycp-card-name",card.name||"Card #"+reward.id),
  element("small","ycp-card-type",card.card_type||"Yu-Gi-Oh! Card"));
 return item;
}
export function playPackOpening({pack,rewards,artwork}){
 if(!Array.isArray(rewards)||!rewards.length)return Promise.resolve();
 return new Promise((resolve)=>{
  const reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dialog=element("dialog","ycp-dialog");
  dialog.setAttribute("aria-label",pack.name+" booster pack opening");
  const shell=element("div","ycp-shell");
  const header=element("header","ycp-header");
  const heading=element("div","ycp-heading");
  heading.append(element("span","ycp-eyebrow","✦ CTOONIVERSE BOOSTER OPENING ✦"),
   element("h2","",pack.name));
  const close=button("ycp-close","×","Close opening and view your cards");
  header.append(heading,close);
  const message=element("p","ycp-message","Your rewards are saved. Tap the pack to tear it open!");
  message.id="ycp-announcement";
  message.setAttribute("role","status");
  message.setAttribute("aria-live","polite");
  const stage=element("div","ycp-stage");
  const packStage=element("div","ycp-pack-stage");
  const burst=element("span","ycp-burst");
  burst.setAttribute("aria-hidden","true");
  const foil=button("ycp-foil","", "Tear open "+pack.name);
  foil.dataset.theme=/^(gold|plum|azure|violet)$/.test(pack.theme||"")?pack.theme:"violet";
  const foilTop=element("span","ycp-foil-top","✦ CTOONIVERSE ✦");
  const foilArt=artwork(pack.hero_art_image_id||pack.hero_image_id);
  foilArt.classList.add("ycp-foil-art");
  const foilName=element("span","ycp-foil-name",pack.name);
  const foilBottom=element("span","ycp-foil-bottom",rewards.length+" RANDOM CARDS");
  foil.append(foilTop,foilArt,foilName,foilBottom);
  const ripHint=element("div","ycp-rip-hint","TAP TO RIP OPEN");
  packStage.append(burst,foil,ripHint);
  const cardsStage=element("div","ycp-cards-stage");
  cardsStage.hidden=true;
  const counter=element("p","ycp-counter","");
  const flip=button("ycp-flip","", "Flip to reveal card");
  const flipInner=element("span","ycp-flip-inner");
  const back=element("span","ycp-card-back");
  back.append(element("span","ycp-back-orbit","✦"),element("strong","","CTOONIVERSE"),
   element("small","","DUEL CARD"));
  const front=element("span","ycp-card-front");
  flipInner.append(back,front);
  flip.append(flipInner);
  const tierText=element("p","ycp-tier-text","Tap the card to reveal your pull");
  const progress=element("div","ycp-progress");
  progress.setAttribute("aria-label","Cards revealed");
  const dots=rewards.map((_,i)=>{
   const dot=element("span","ycp-dot","?");
   dot.setAttribute("aria-label","Card "+(i+1)+" unrevealed");
   progress.append(dot);
   return dot;
  });
  cardsStage.append(counter,flip,tierText,progress);
  const allStage=element("div","ycp-all-stage");
  allStage.hidden=true;
  const allHeading=element("h3","","Pack Complete!");
  const allText=element("p","ycp-all-text","");
  const allCards=element("div","ycp-all-cards");
  allStage.append(allHeading,allText,allCards);
  stage.append(packStage,cardsStage,allStage);
  const footer=element("div","ycp-actions");
  const primary=button("ycp-primary","Tear Open Pack");
  const skip=button("ycp-secondary","Reveal All");
  footer.append(primary,skip);
  shell.append(header,message,stage,footer);
  dialog.append(shell);
  document.body.append(dialog);
  let mode="sealed",index=0,flipped=false,timeout=0;
  const revealed=new Set();
  let settled=false;
  function done(){
   if(dialog.open&&typeof dialog.close==="function")dialog.close();
   else cleanup();
  }
  function cleanup(){
   if(settled)return;
   settled=true;
   clearTimeout(timeout);
   dialog.remove();
   resolve();
  }
  dialog.addEventListener("close",cleanup,{once:true});
  close.addEventListener("click",done);
  function showCard(i){
   mode="cards";index=i;flipped=false;
   packStage.hidden=true;allStage.hidden=true;cardsStage.hidden=false;
   flip.className="ycp-flip";
   flip.setAttribute("aria-label","Flip to reveal card "+(i+1)+" of "+rewards.length);
   front.replaceChildren();
   counter.textContent="CARD "+(i+1)+" OF "+rewards.length;
   tierText.textContent="Tap the card to reveal your pull";
   primary.textContent="Flip Card";
   message.textContent="The pack is open! Reveal each card one at a time.";
   refreshDots();
  }
  function refreshDots(){
   dots.forEach((dot,i)=>{
    const visible=revealed.has(i);
    dot.className="ycp-dot"+(visible?" is-revealed":"")+(i===index?" is-current":"");
    dot.textContent=visible?"✦":"?";
    dot.setAttribute("aria-label","Card "+(i+1)+(visible?" revealed":" unrevealed"));
   });
  }
  function tear(){
   if(mode!=="sealed")return;
   mode="opening";
   primary.disabled=true;
   foil.disabled=true;
   packStage.classList.add("is-ripping");
   message.textContent="Breaking the seal…";
   timeout=setTimeout(()=>{
    timeout=0;primary.disabled=false;
    showCard(0);
   },reduced?40:900);
  }
  function reveal(){
   if(mode!=="cards"||flipped)return;
   flipped=true;
   const reward=rewards[index];
   const tier=tierFor(reward);
   front.replaceChildren(cardFace(reward,artwork));
   flip.className="ycp-flip is-flipped"+(tier?" tier-"+tier.toLowerCase():"");
   flip.setAttribute("aria-label","Revealed "+(reward.card?.name||"Card #"+reward.id));
   revealed.add(index);
   refreshDots();
   tierText.textContent=(tier?(tier==="Legendary"?"★ LEGENDARY PULL! ★":tier.toUpperCase()+" PULL!")+" · ":"")+
    (reward.card?.name||"Card #"+reward.id);
   message.textContent=tier==="Legendary"?"A legendary card!":tier==="Epic"?"An epic card!":"Card revealed!";
   primary.textContent=index===rewards.length-1?"See All Cards":"Next Card";
  }
  function advance(){
   if(mode==="sealed"){tear();return;}
   if(mode==="opening")return;
   if(mode==="cards"){
    if(!flipped){reveal();return;}
    if(index+1<rewards.length){showCard(index+1);return;}
    showAll();return;
   }
   if(mode==="all")done();
  }
  function showAll(){
   clearTimeout(timeout);timeout=0;
   mode="all";
   packStage.hidden=true;cardsStage.hidden=true;allStage.hidden=false;
   allCards.replaceChildren();
   const counts={};
   for(const reward of rewards){
    const tier=tierFor(reward);
    if(tier)counts[tier]=(counts[tier]||0)+1;
    const item=element("div","ycp-result-card"+(tier?" tier-"+tier.toLowerCase():""));
    item.append(cardFace(reward,artwork));
    allCards.append(item);
   }
   const highlights=["Legendary","Epic","Rare"].filter(t=>counts[t]).map(t=>counts[t]+" "+t).join(" · ");
   allText.textContent=rewards.length+" cards added to your collection."+
    (highlights?" Highlights: "+highlights+".":"");
   message.textContent="All rewards are saved in your Yu-Gi-Oh! collection.";
   primary.disabled=false;
   primary.textContent="View My Cards";
   skip.hidden=true;
  }
  foil.addEventListener("click",tear);
  flip.addEventListener("click",()=>{if(!flipped)reveal();else advance();});
  primary.addEventListener("click",advance);
  skip.addEventListener("click",showAll);
  dialog.addEventListener("cancel",()=>{ /* Escape closes; result list remains available. */ });
  try{dialog.showModal();}catch(_){dialog.setAttribute("open","");}
  foil.focus({preventScroll:true});
 });
}
