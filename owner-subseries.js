"use strict";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.58.0";
const db=createClient("https://hsxdyxdazsdmpucyhqly.supabase.co","sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS");
const $=id=>document.getElementById(id);
const status=$("subseries-auth-status"),tools=$("subseries-owner-tools"),feedback=$("subseries-feedback");
const list=$("subseries-list"),form=$("subseries-create-form"),nameInput=$("subseries-name"),total=$("subseries-total");
const collator=new Intl.Collator(undefined,{sensitivity:"base",numeric:true});
let entries=[],busy=false;
function message(value,error=false){feedback.textContent=value;feedback.style.color=error?"#ff9aab":"#8af4cf";}
function slugify(value){return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,75);}
function clean(value){return value.trim().replace(/\s+/g," ");}
async function countCards(name){const {count,error}=await db.from("ctoon_catalog").select("id",{head:true,count:"exact"}).eq("series",name);if(error)throw error;return count||0;}
function lock(value){busy=value;form.querySelectorAll("input,select,button").forEach(el=>el.disabled=value);list.querySelectorAll("button,input").forEach(el=>el.disabled=value);}
async function load(){
 const {data,error}=await db.from("ctoon_series").select("id,name,category,slug").order("name",{ascending:true});
 if(error)throw error;entries=(data||[]).sort((a,b)=>collator.compare(a.name,b.name));
 draw();
}
function draw(){
 list.replaceChildren();total.textContent="("+entries.length+")";
 if(!entries.length){const p=document.createElement("p");p.textContent="No subseries yet. Add your first one above.";list.append(p);return;}
 for(const item of entries){
  const row=document.createElement("div");row.className="subseries-row";
  const info=document.createElement("div");info.className="subseries-info";
  const heading=document.createElement("strong");heading.textContent=item.name;
  info.append(heading);
  const actions=document.createElement("div");actions.className="subseries-actions";
  const rename=document.createElement("button");rename.type="button";rename.textContent="Rename";
  const remove=document.createElement("button");remove.type="button";remove.className="subseries-delete";remove.textContent="Delete";
  actions.append(rename,remove);row.append(info,actions);list.append(row);
  rename.addEventListener("click",async()=>{
   if(busy)return;
   const next=prompt("Rename subseries:",item.name);if(next===null)return;
   const title=clean(next);if(!title||title.length>90){message("Enter a name between 1 and 90 characters.",true);return;}
   if(entries.some(other=>other.id!==item.id&&other.name.toLowerCase()===title.toLowerCase())){message("That subseries already exists.",true);return;}
   const slug=slugify(title);if(!slug){message("Use a name containing letters or numbers.",true);return;}
   lock(true);
   try{
    if(await countCards(item.name))throw new Error("This subseries already has CToons. Rename it only after moving its CToons to avoid breaking their filters.");
    const {data,error}=await db.from("ctoon_series").update({name:title,slug}).eq("id",item.id).select("id");
    if(error)throw error;if(!data?.length)throw new Error("Rename was not saved.");
    await load();message("Renamed to "+title+".");
   }catch(error){message(error.message,true);}finally{lock(false);}
  });
  remove.addEventListener("click",async()=>{
   if(busy)return;
   if(!confirm('Permanently delete the subseries "'+item.name+'"? This does not delete CToon artwork.'))return;
   lock(true);
   try{
    if(await countCards(item.name))throw new Error("This subseries contains CToons. Move those CToons first before deleting the subseries.");
    const {data,error}=await db.from("ctoon_series").delete().eq("id",item.id).select("id");
    if(error)throw error;if(!data?.length)throw new Error("Delete was not saved.");
    await load();message("Deleted "+item.name+".");
   }catch(error){message(error.message,true);}finally{lock(false);}
  });
 }
}
form.addEventListener("submit",async event=>{
 event.preventDefault();if(busy)return;
 const name=clean(nameInput.value);
 if(!name||name.length>90){message("Enter a subseries name up to 90 characters.",true);return;}
 const slug=slugify(name);if(!slug){message("Use a name containing letters or numbers.",true);return;}
 if(entries.some(item=>item.name.toLowerCase()===name.toLowerCase())){message("That subseries already exists.",true);return;}
 lock(true);
 try{
  const {data,error}=await db.from("ctoon_series").insert({name,category:"Cartoon & Anime",slug}).select("id");
  if(error)throw error;if(!data?.length)throw new Error("Subseries was not saved.");
  await load();nameInput.value="";message("Added "+name+". It now appears in the CToons subseries dropdown.");
 }catch(error){message(error.message,true);}finally{lock(false);}
});
async function verify(){
 try{
  const {data:{user},error}=await db.auth.getUser();if(error||!user){status.textContent="Sign in to your Owner account to manage subseries.";return;}
  const {data,error:ownerError}=await db.from("site_owners").select("user_id").eq("user_id",user.id).maybeSingle();
  if(ownerError||!data){status.textContent="Owner access is required.";return;}
  status.textContent="Owner access verified.";tools.hidden=false;await load();
 }catch(error){status.textContent="Unable to verify owner access.";message(error.message,true);}
}
verify();