import {createClient} from "https://esm.sh/@supabase/supabase-js@2.58.0";
const db=createClient("https://hsxdyxdazsdmpucyhqly.supabase.co","sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS");
const root=document.getElementById("ptcg-custom-builder");
const status=document.getElementById("ptcg-builder-status");
const list=document.getElementById("ptcg-builder-cards");
const count=document.getElementById("ptcg-builder-count");
const play=document.getElementById("ptcg-play-custom");
const save=document.getElementById("ptcg-save-custom");
const reset=document.getElementById("ptcg-reset-custom");
const arena=window.CToonPokemonArena;
let user=null,available=new Map(),deck={},key="";
function say(message){status.textContent=message;}
function total(){return Object.values(deck).reduce((sum,n)=>sum+n,0);}
function valid(){
 const ids=Object.entries(deck).flatMap(([id,n])=>Array(n).fill(id));
 return ids.length===60&&ids.some(id=>available.get(id)?.kind==="pokemon"&&available.get(id)?.stage===0)&&ids.every(id=>available.has(id));
}
function draw(){
 list.replaceChildren();
 const cards=[...available.values()].sort((a,b)=>a.name.localeCompare(b.name));
 for(const card of cards){
  const row=document.createElement("label");row.className="ptcg-builder-row";
  const title=document.createElement("span");title.textContent=card.name+" · "+card.kind+" · owned "+card.owned;
  const input=document.createElement("input");input.type="number";input.min="0";input.max=String(Math.min(4,card.owned));input.step="1";input.value=String(deck[card.id]||0);
  input.setAttribute("aria-label","Copies of "+card.name);
  input.addEventListener("change",()=>{
   const n=Number(input.value);const max=Math.min(4,card.owned);
   deck[card.id]=Number.isFinite(n)?Math.max(0,Math.min(max,Math.trunc(n))):0;
   input.value=String(deck[card.id]);refresh();
  });
  row.append(title,input);list.append(row);
 }
 refresh();
}
function refresh(){
 count.textContent=total()+"/60 cards";
 const ready=valid();
 play.disabled=!ready;save.disabled=!ready;
 if(available.size)say(ready?"Deck ready! Save it or start a battle.":"Choose exactly 60 owned cards, including a Basic Pokémon. Maximum four copies of each.");
}
function restore(){
 try{const saved=JSON.parse(localStorage.getItem(key)||"{}");deck={};for(const [id,n] of Object.entries(saved)){if(available.has(id))deck[id]=Math.min(4,available.get(id).owned,Math.max(0,Math.trunc(Number(n)||0)));}}catch(_){deck={};}
}
async function load(){
 try{
  const auth=await db.auth.getUser();user=auth.data?.user;
  if(!user){say("Sign in to load your Pokémon card collection.");return;}
  key="ctooniverse-pokemon-custom-deck-v1:"+user.id;
  const supported=arena.supportedCards();
  const byNumber=new Map(supported.map(c=>[c.base_number,c]));
  const ids=new Map();
  let offset=0;
  while(true){
   const {data,error}=await db.from("pokemon_player_cards").select("card_id,quantity").eq("user_id",user.id).range(offset,offset+499);
   if(error)throw error;
   for(const item of data||[])ids.set(item.card_id,(ids.get(item.card_id)||0)+Number(item.quantity||0));
   if(!data||data.length<500)break;
   offset+=data.length;
  }
  const collected=[...ids.keys()];available.clear();
  for(let i=0;i<collected.length;i+=100){
   const {data,error}=await db.from("pokemon_card_catalog").select("id,base_number,set_id").in("id",collected.slice(i,i+100));
   if(error)throw error;
   for(const item of data||[]){
    if(item.set_id!=="base1")continue;
    const card=byNumber.get(Number(item.base_number));
    // The arena supports only its original Base Set subset; other printings remain owned but unplayable here.
    if(!card)continue;
    const existing=available.get(card.id);
    available.set(card.id,{...card,owned:(existing?.owned||0)+(ids.get(item.id)||0)});
   }
  }
  restore();draw();
  if(!available.size)say("Your collection has no cards supported by this simplified arena yet. Starter decks remain free.");
 }catch(error){say("Could not load your collection: "+(error.message||"Please try again."));}
}
save.addEventListener("click",()=>{if(!valid())return;try{localStorage.setItem(key,JSON.stringify(deck));say("Deck saved on this device for your signed-in account.");}catch(_){say("Unable to save on this device.");}});
play.addEventListener("click",()=>{
 if(!valid())return;
 const cards=Object.entries(deck).flatMap(([id,n])=>Array(n).fill(id));
 if(arena.setCustomDeck(cards))arena.playCustom();
});
reset.addEventListener("click",()=>{deck={};draw();});
db.auth.onAuthStateChange((_event,session)=>{if(session?.user?.id!==user?.id)load();});
load();
