"use strict";
/* Cartoon-style illustrated destination banners.
   Decorative only: never changes auth, controls, page state or game availability.
   Use DOM text nodes so content cannot be interpreted as markup. */
(() => {
  const path=(location.pathname.split("/").pop()||"index.html").toLowerCase();
  const major={
    "index.html":"home","ctoons.html":"ctoons","games.html":"games","cards.html":"cards",
    "shop.html":"shop","watch.html":"theater","community.html":"community",
    "account.html":"account","owner.html":"owner"
  };
  const aliases={
    "ctoon-set.html":"ctoons","anime.html":"ctoons","misc.html":"ctoons","movies.html":"ctoons",
    "clothing.html":"shop",
    "forums.html":"community","guild.html":"community","support.html":"community",
    "login.html":"account","avatar-maker.html":"account",
    "coin-management.html":"owner","owner-subseries.html":"owner",
    "owner-redeem-codes.html":"owner","owner-music-management.html":"owner",
    "owner-clash-card-maker.html":"owner","owner-fighters.html":"owner"
  };
  const variant=major[path]||aliases[path];
  if(!variant)return;
  const main=document.querySelector("main#main,main");
  if(!main||main.querySelector(".ct-page-banner"))return;

  const config={
    home:{
      eyebrow:"✦ WELCOME TO THE CARTOON GALAXY ✦",
      title:"Enter the Universe!",
      description:"A whole world of CToons, cartoons, and creative adventures.",
      icon:"🌎",stamp:"THE UNIVERSE AWAITS",
      chips:["COLLECT","DISCOVER","CONNECT"],
      badge:"WELCOME",
      ornaments:["✦","★","✧"]
    },
    ctoons:{
      eyebrow:"✦ OPEN THE COLLECTOR'S VAULT ✦",
      title:"The CToon Vault",
      description:"Every CToon gets its moment in the spotlight.",
      icon:"🎴",stamp:"A–Z COLLECTION",
      chips:["DISPLAY WINDOWS","ALL SUBSERIES","A–Z"],
      badge:"THE COLLECTION",
      ornaments:["✦","✧","★"]
    },
    games:{
      eyebrow:"✦ CTOONIVERSE ARCADE ✦",
      title:"The Arcade Frontier",
      description:"A cleared game floor, ready for a brand-new lineup.",
      icon:"🕹️",stamp:"FRESH START",
      chips:["0 ACTIVE MODES","ARCADE RESET","NEW BEGINNINGS"],
      badge:"ARCADE",
      ornaments:["★","✶","✧"]
    },
    cards:{
      eyebrow:"✦ OPEN THE CARD VAULT ✦",title:"The Cards Hub",
      description:"A new home for card designs, decks and future battles.",
      icon:"🃏",stamp:"CARDS",chips:["CARD PREVIEWS","COLLECT","PLAY"],
      badge:"CARDS",ornaments:["✦","♠","✧"]
    },
    shop:{
      eyebrow:"✦ STEP INSIDE THE MARKETPLACE ✦",
      title:"The Neon Shop",
      description:"Browse departments, discover styles, and find your favorites.",
      icon:"🛍️",stamp:"SHOP THE UNIVERSE",
      chips:["CLOTHING","CARDS","COLLECTIBLES"],
      badge:"MARKETPLACE",
      ornaments:["✦","✧","★"]
    },
    theater:{
      eyebrow:"✦ LIGHTS • CAMERA • CTOONS ✦",
      title:"The Silver Screen",
      description:"A cartoon movie palace with a marquee made to shine.",
      icon:"🎬",stamp:"THE GRAND SHOW",
      chips:["THEATER","CARTOONS","MOVIE MAGIC"],
      badge:"SPOTLIGHT",
      ornaments:["★","✦","✧"]
    },
    community:{
      eyebrow:"✦ STEP INTO THE SOCIAL HUB ✦",
      title:"The Toon Town Square",
      description:"Find your people, share ideas, and join the conversation.",
      icon:"💬",stamp:"THE COMMUNITY",
      chips:["GLOBAL CHAT","PLAYERS","GUILD"],
      badge:"CONNECT",
      ornaments:["✧","★","✦"]
    },
    account:{
      eyebrow:"✦ YOUR PERSONAL CORNER OF THE UNIVERSE ✦",
      title:"Player Headquarters",
      description:"Your profile, your creativity, and your CToon journey.",
      icon:"🌟",stamp:"PLAYER ZONE",
      chips:["PROFILE","COINS","PERSONALIZE"],
      badge:"PLAYER HQ",
      ornaments:["✦","★","✧"]
    },
    owner:{
      eyebrow:"✦ CTOONIVERSE CONTROL CENTER ✦",
      title:"Behind the Magic",
      description:"The creative headquarters for building the universe.",
      icon:"👑",stamp:"OWNER TOOLS",
      chips:["MANAGE","CUSTOMIZE","CREATE"],
      badge:"OWNER",
      ornaments:["★","✦","✧"]
    }
  };
  const design=config[variant];
  if(!design)return;
  const el=(tag,className,textValue)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(textValue!==undefined)node.textContent=textValue;
    return node;
  };

  const banner=el("section","ct-page-banner");
  banner.dataset.ctBanner=variant;
  banner.setAttribute("aria-label",design.badge+" illustrated section banner");
  const sparkfield=el("div","ct-banner-sparkfield");
  sparkfield.setAttribute("aria-hidden","true");
  for(let i=0;i<9;i++){
    const star=el("span","ct-banner-spark",design.ornaments[i%design.ornaments.length]);
    star.style.setProperty("--spark-index",String(i));
    sparkfield.append(star);
  }
  banner.append(sparkfield);

  const body=el("div","ct-banner-body");
  const text=el("div","ct-banner-copy");
  text.append(el("p","ct-banner-eyebrow",design.eyebrow));
  text.append(el("p","ct-banner-title",design.title));
  text.append(el("p","ct-banner-description",design.description));
  const chips=el("div","ct-banner-chips");
  chips.setAttribute("aria-label","Section highlights");
  for(const word of design.chips)chips.append(el("span","ct-banner-chip",word));
  text.append(chips);
  body.append(text);

  const art=el("div","ct-banner-art");
  art.setAttribute("aria-hidden","true");
  art.append(el("span","ct-banner-sunburst"));
  art.append(el("span","ct-banner-orbit ct-banner-orbit-one"));
  art.append(el("span","ct-banner-orbit ct-banner-orbit-two"));
  art.append(el("span","ct-banner-character",design.icon));
  art.append(el("span","ct-banner-sparkle ct-banner-sparkle-a","✦"));
  art.append(el("span","ct-banner-sparkle ct-banner-sparkle-b","★"));
  art.append(el("span","ct-banner-art-tag",design.stamp));
  body.append(art);
  banner.append(body);

  const footer=el("div","ct-banner-bottom");
  footer.setAttribute("aria-hidden","true");
  footer.append(el("span","ct-banner-bottom-star","✦"));
  footer.append(el("span","ct-banner-bottom-label",design.badge));
  footer.append(el("span","ct-banner-bottom-line"));
  footer.append(el("span","ct-banner-bottom-label","CTOONIVERSE"));
  footer.append(el("span","ct-banner-bottom-star","✦"));
  banner.append(footer);

  // Theater has its own very large marquee: keep that attraction first.
  if(variant==="theater"){
    const marquee=main.querySelector(":scope > .theater-grand-marquee");
    if(marquee)marquee.insertAdjacentElement("afterend",banner);
    else main.prepend(banner);
  }else main.prepend(banner);
})();
