// CToon Showdown Reboot — isolated roster and new 2D practice engine.
// The roster begins with 200 empty positions and automatically expands
// to the next page when a fighter is published beyond slot 200.
'use strict';
import {createBattleAudio} from './showdown-battle-audio.js?v=20261108-battle-music-v1';
import {createStoryMode} from './showdown-story.js?v=rift-crisis-20261110';
const API_URL='https://hsxdyxdazsdmpucyhqly.supabase.co';
const PUBLIC_KEY='sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS';
const START_SLOTS=200, PAGE_SIZE=25;
const $=id=>document.getElementById(id);
const rosterGrid=$('roster-grid'), banner=$('catalog-banner');
const search=$('roster-search'),series=$('roster-series'),kind=$('roster-state'),order=$('roster-sort');
const rosterShortcuts=[...document.querySelectorAll('[data-roster-filter]')];
const selection={page:0,slot:1,slots:START_SLOTS,fighters:new Map()};
// Alphabetical character names are the default; open roster slots follow published fighters.
if(order)order.value="name";
const account={db:null,user:null,owned:new Set(),balance:null,loading:true,busy:false};
const SPRITE_POSES=['idle','walk','run','punch','kick','guard','jump','crouch','special','hurt','ko'];
const previewAnimation={image:null,source:null,token:0,columns:3,rows:1,loaded:false,pose:'idle',poseStart:0,footAnchors:null};
const startBtn=$('start-match'),practiceBtn=$('training-match'),restartBtn=$('restart-match'),pauseBtn=$('pause-match');
const arena=$('arena'),ctx=arena.getContext('2d');
const rosterLayer=$('showdown-roster-layer'),arenaFrame=arena.closest('.arena-frame');
const arenaSection=arena.closest('.showdown-panel');
const quickStartBtn=$('quick-start-match'),returnRosterBtn=$('return-roster');
const arenaSelectBtn=$('arena-character-select'),inlineStage=$('in-game-stage');
const rosterExpandBtn=$('roster-fullscreen'),battleExpandBtn=$('battle-fullscreen');
const selectedFighterStatus=$('selected-fighter-status');
const battleAudio=createBattleAudio($('battle-music-theme'),$('battle-music-volume'),$('battle-music-status'));
const fightAnnouncement=$('fight-announcement');
function announceFight(label,phase=''){
 fightAnnouncement.textContent=label;
 fightAnnouncement.dataset.phase=phase;
}
// Built-in fighters are available even when the catalog is offline.
// Johnny is fighter 001; Samurai Jack uses the same full 3x11 action mapping.
const demoHero={slot:1,fighter_id:'johnny-bravo',name:'Johnny Bravo',series:'Johnny Bravo',accent:'#f7d345',
 portrait:'/images/showdown/johnny-bravo-pixel-portrait.png',portrait_fallback:'/images/showdown/johnny-bravo-roster-portrait.webp',
 preview_sheet:'/images/showdown/johnny-bravo-new-4x4.png?v=20261109',preview_columns:4,preview_rows:4};
const samuraiJack={slot:2,fighter_id:'samurai-jack',name:'Samurai Jack',series:'Samurai Jack',accent:'#a9e5ee',
 portrait:'/images/showdown/samurai-jack-pixel-portrait.png',portrait_fallback:'/images/showdown/samurai-jack-portrait.svg',
 preview_sheet:'/images/showdown/samurai-jack-4x4.png?v=20261109',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:true,unlock_method:'owner',unlock_cost:0,unlock_hint:'Locked fighter · unlock requirements coming soon.'};
const kimPossible={slot:3,fighter_id:'kim-possible',name:'Kim Possible',series:'Kim Possible',accent:'#ff8048',
 portrait:'/images/showdown/kim-possible-pixel-portrait.png',portrait_fallback:'/images/showdown/kim-possible-portrait.svg',
 preview_sheet:'/images/showdown/kim-possible-4x4.png?v=20261109',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:false,unlock_method:'free'};
const perfectCell={slot:4,fighter_id:'perfect-cell',name:'Perfect Cell',series:'Dragon Ball Z',accent:'#83e54f',
 portrait:'/images/showdown/perfect-cell-pixel-portrait.png',portrait_fallback:'/images/showdown/perfect-cell-portrait.png',
 preview_sheet:'/images/showdown/perfect-cell-4x4.png?v=20261110',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:true,unlock_method:'owner',unlock_cost:0,unlock_hint:'Locked fighter · unlock requirements coming soon.'};
const burter={slot:5,fighter_id:'burter',name:'Burter',series:'Dragon Ball Z',accent:'#4ca9ff',
 portrait:'/images/showdown/burter-roster-portrait.png?v=20261111-fixed',
 preview_sheet:'/images/showdown/burter-4x4.png?v=20261110',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:true,unlock_method:'owner',unlock_cost:0,unlock_hint:'Locked fighter · unlock requirements coming soon.'};
// The Flea uses the owner's transparent 4x4 sprite sheet for both preview and combat.
const theFlea={slot:6,fighter_id:'the-flea',name:'The Flea',series:'Mucha Lucha',accent:'#e5a348',
 portrait:'/images/showdown/the-flea-portrait.png?v=20261111',
 preview_sheet:'/images/showdown/the-flea-4x4.png?v=20261111',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:false,unlock_method:'free'};
// Nigel Uno (Numbuh 1) — owner-supplied portrait and 4x4 battle sprite atlas.
const nigelUno={slot:7,fighter_id:'nigel-uno',name:'Nigel Uno',series:'Codename: Kids Next Door',accent:'#e84b55',
 portrait:'/images/showdown/nigel-uno-portrait.png?v=20261111',
 preview_sheet:'/images/showdown/nigel-uno-4x4.png?v=20261111',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:false,unlock_method:'free'};
const courage={slot:8,fighter_id:'courage',name:'Courage',series:'Courage the Cowardly Dog',accent:'#e989d6',
 portrait:'/images/showdown/courage-portrait.png?v=20261111',
 preview_sheet:'/images/showdown/courage-4x4.png?v=20261111',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:false,unlock_method:'free'};
const jeice={slot:9,fighter_id:'jeice',name:'Jeice',series:'Dragon Ball Z',accent:'#fa5252',
 portrait:'/images/showdown/jeice-portrait.png?v=20261111',
 preview_sheet:'/images/showdown/jeice-4x4.png?v=20261111',preview_columns:4,preview_rows:4,
 enabled:true,unlockable:true,unlock_method:'owner',unlock_cost:0,unlock_hint:'Locked fighter · unlock requirements coming soon.'};
const oogieBoogie={slot:10,fighter_id:'oogie-boogie',name:'Oogie Boogie',series:'The Nightmare Before Christmas',accent:'#a6e45c',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:'/images/showdown/oogie-boogie-4x4.png?v=20261111',preview_sheet:'/images/showdown/oogie-boogie-4x4.png?v=20261111',preview_columns:4,preview_rows:4};
const buggyTheClown={slot:11,fighter_id:'buggy-the-clown',name:'Buggy the Clown',series:'One Piece',accent:'#e64d8d',enabled:true,coming_soon:false,unlockable:true,unlock_method:'owner',unlock_cost:0,unlock_hint:'Locked fighter · unlock requirements coming soon.',portrait:'/images/showdown/buggy-the-clown-portrait.webp?v=buggy-owner-20261112',portrait_fallback:'/images/showdown/buggy-the-clown-portrait.png',preview_sheet:'/images/showdown/buggy-the-clown-4x4.webp?v=buggy-owner-20261112',preview_columns:4,preview_rows:4};
const drDrakken={slot:12,fighter_id:'dr-drakken',name:'Dr. Drakken',series:'Kim Possible',accent:'#4d9bdb',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const captainHook={slot:13,fighter_id:'captain-hook',name:'Captain Hook',series:'Peter Pan',accent:'#cf414e',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const baymax={slot:14,fighter_id:'baymax',name:'Baymax',series:'Big Hero 6',accent:'#e2e9f3',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const antMan={slot:15,fighter_id:'ant-man',name:'Ant-Man',series:'Marvel',accent:'#d84d55',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const kingTriton={slot:16,fighter_id:'king-triton',name:'King Triton',series:'The Little Mermaid',accent:'#4fa9d9',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const jackSkellington={slot:17,fighter_id:'jack-skellington',name:'Jack Skellington',series:'The Nightmare Before Christmas',accent:'#d6d6ed',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const lilo={slot:18,fighter_id:'lilo',name:'Lilo',series:'Lilo & Stitch',accent:'#ed655e',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const jackSparrow={slot:19,fighter_id:'jack-sparrow',name:'Jack Sparrow',series:'Pirates of the Caribbean',accent:'#c8a36c',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const guldo={slot:20,fighter_id:'guldo',name:'Guldo',series:'Dragon Ball Z',accent:'#77b66a',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const majinBuu={slot:21,fighter_id:'majin-buu',name:'Majin Buu',series:'Dragon Ball Z',accent:'#e88abf',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const eddy={slot:22,fighter_id:'eddy',name:'Eddy',series:'Ed, Edd n Eddy',accent:'#f0c84e',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const raimundo={slot:23,fighter_id:'raimundo',name:'Raimundo',series:'Xiaolin Showdown',accent:'#e9a65c',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const captainUnderpants={slot:24,fighter_id:'captain-underpants',name:'Captain Underpants',series:'Captain Underpants',accent:'#e95454',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const shrek={slot:25,fighter_id:'shrek',name:'Shrek',series:'Shrek',accent:'#8db957',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const blackPanther={slot:26,fighter_id:'black-panther',name:'Black Panther',series:'Marvel',accent:'#7764ba',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const homerSimpson={slot:27,fighter_id:'homer-simpson',name:'Homer Simpson',series:'The Simpsons',accent:'#e7c94a',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const ericCartman={slot:28,fighter_id:'eric-cartman',name:'Eric Cartman',series:'South Park',accent:'#df5553',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const yugiMuto={slot:29,fighter_id:'yugi-muto',name:'Yugi Muto',series:'Yu-Gi-Oh!',accent:'#a978d7',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const crashBandicoot={slot:30,fighter_id:'crash-bandicoot',name:'Crash Bandicoot',series:'Crash Bandicoot',accent:'#e58d43',enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const aladdin={slot:31,fighter_id:"aladdin",name:"Aladdin",series:"Aladdin",accent:"#b78ce8",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const jafar={slot:32,fighter_id:"jafar",name:"Jafar",series:"Aladdin",accent:"#9b4bba",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const hercules={slot:33,fighter_id:"hercules",name:"Hercules",series:"Hercules",accent:"#d59c48",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const stitch={slot:34,fighter_id:"stitch",name:"Stitch",series:"Lilo & Stitch",accent:"#468de2",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const randyMarsh={slot:35,fighter_id:"randy-marsh",name:"Randy Marsh",series:"South Park",accent:"#6c8b7b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const towelie={slot:36,fighter_id:"towelie",name:"Towelie",series:"South Park",accent:"#a889d9",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const captainAmerica={slot:37,fighter_id:"captain-america",name:"Captain America",series:"Marvel",accent:"#507fc9",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const pussInBoots={slot:38,fighter_id:"puss-in-boots",name:"Puss in Boots",series:"Shrek",accent:"#e39a48",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const omi={slot:39,fighter_id:"omi",name:"Omi",series:"Xiaolin Showdown",accent:"#e3b54e",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const bloo={slot:40,fighter_id:"bloo",name:"Bloo",series:"Foster's Home for Imaginary Friends",accent:"#398fda",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const ben10={slot:41,fighter_id:"ben-10",name:"Ben Tennyson",series:"Ben 10",accent:"#70bf4b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const kimiko={slot:42,fighter_id:"kimiko",name:"Kimiko",series:"Xiaolin Showdown",accent:"#e66b8c",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const ed={slot:43,fighter_id:"ed",name:"Ed",series:"Ed, Edd n Eddy",accent:"#d6ae58",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const rolf={slot:44,fighter_id:"rolf",name:"Rolf",series:"Ed, Edd n Eddy",accent:"#70a4d2",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const pete={slot:45,fighter_id:"pete",name:"Pete",series:"Disney",accent:"#685e9c",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const maleficent={slot:46,fighter_id:"maleficent",name:"Maleficent",series:"Sleeping Beauty",accent:"#a765c6",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const genie={slot:47,fighter_id:"genie",name:"Genie",series:"Aladdin",accent:"#4c9de2",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const captainGinyu={slot:48,fighter_id:"captain-ginyu",name:"Captain Ginyu",series:"Dragon Ball Z",accent:"#9657bd",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const goku={slot:49,fighter_id:"goku",name:"Goku",series:"Dragon Ball Z",accent:"#ec913a",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const vegeta={slot:50,fighter_id:"vegeta",name:"Vegeta",series:"Dragon Ball Z",accent:"#4c77d5",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const raditz={slot:51,fighter_id:"raditz",name:"Raditz",series:"Dragon Ball Z",accent:"#a36b49",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const nappa={slot:52,fighter_id:"nappa",name:"Nappa",series:"Dragon Ball Z",accent:"#b58a59",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const recoome={slot:53,fighter_id:"recoome",name:"Recoome",series:"Dragon Ball Z",accent:"#c9786b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const piccolo={slot:54,fighter_id:"piccolo",name:"Piccolo",series:"Dragon Ball Z",accent:"#64ad62",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const frieza={slot:55,fighter_id:"frieza",name:"Frieza",series:"Dragon Ball Z",accent:"#b788df",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const dodoria={slot:56,fighter_id:"dodoria",name:"Dodoria",series:"Dragon Ball Z",accent:"#d7779b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const zarbon={slot:57,fighter_id:"zarbon",name:"Zarbon",series:"Dragon Ball Z",accent:"#61b8ad",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const appule={slot:58,fighter_id:"appule",name:"Appule",series:"Dragon Ball Z",accent:"#9a75c4",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const cui={slot:59,fighter_id:"cui",name:"Cui",series:"Dragon Ball Z",accent:"#b98bcd",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const krillin={slot:60,fighter_id:"krillin",name:"Krillin",series:"Dragon Ball Z",accent:"#e6a449",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const tien={slot:61,fighter_id:"tien",name:"Tien",series:"Dragon Ball Z",accent:"#79a8b8",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const yamcha={slot:62,fighter_id:"yamcha",name:"Yamcha",series:"Dragon Ball Z",accent:"#bb8c5b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const gohan={slot:63,fighter_id:"gohan",name:"Gohan",series:"Dragon Ball Z",accent:"#ad7fdb",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const edd={slot:64,fighter_id:"edd",name:"Edd",series:"Ed, Edd n Eddy",accent:"#e2ad5b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const sarah={slot:65,fighter_id:"sarah",name:"Sarah",series:"Ed, Edd n Eddy",accent:"#e8a2aa",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const jimmy={slot:66,fighter_id:"jimmy",name:"Jimmy",series:"Ed, Edd n Eddy",accent:"#91b6e1",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const johnny2x4={slot:67,fighter_id:"johnny-2x4",name:"Johnny & Plank",series:"Ed, Edd n Eddy",accent:"#78ba8d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const nazz={slot:68,fighter_id:"nazz",name:"Nazz",series:"Ed, Edd n Eddy",accent:"#e9b65f",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const kevin={slot:69,fighter_id:"kevin",name:"Kevin",series:"Ed, Edd n Eddy",accent:"#e47760",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const wilt={slot:70,fighter_id:"wilt",name:"Wilt",series:"Foster's Home for Imaginary Friends",accent:"#d45b58",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const eduardo={slot:71,fighter_id:"eduardo",name:"Eduardo",series:"Foster's Home for Imaginary Friends",accent:"#a877c6",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const clay={slot:72,fighter_id:"clay",name:"Clay",series:"Xiaolin Showdown",accent:"#c4a06d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const jackSpicer={slot:73,fighter_id:"jack-spicer",name:"Jack Spicer",series:"Xiaolin Showdown",accent:"#d74e61",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const chaseYoung={slot:74,fighter_id:"chase-young",name:"Chase Young",series:"Xiaolin Showdown",accent:"#71985d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const blossom={slot:75,fighter_id:"blossom",name:"Blossom",series:"The Powerpuff Girls",accent:"#ec739b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const bubbles={slot:76,fighter_id:"bubbles",name:"Bubbles",series:"The Powerpuff Girls",accent:"#67b8ed",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const buttercup={slot:77,fighter_id:"buttercup",name:"Buttercup",series:"The Powerpuff Girls",accent:"#70bf72",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const jimmyNeutron={slot:78,fighter_id:"jimmy-neutron",name:"Jimmy Neutron",series:"The Adventures of Jimmy Neutron, Boy Genius",accent:"#df9d58",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const spongebob={slot:79,fighter_id:"spongebob-squarepants",name:"SpongeBob SquarePants",series:"SpongeBob SquarePants",accent:"#f1d64f",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const patrickStar={slot:80,fighter_id:"patrick-star",name:"Patrick Star",series:"SpongeBob SquarePants",accent:"#e999b0",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const timmyTurner={slot:81,fighter_id:"timmy-turner",name:"Timmy Turner",series:"The Fairly OddParents",accent:"#dc7bb1",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const spiderMan={slot:82,fighter_id:"spider-man",name:"Spider-Man",series:"Marvel",accent:"#d64b53",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const thor={slot:83,fighter_id:"thor",name:"Thor",series:"Marvel",accent:"#7a9cd6",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const hulk={slot:84,fighter_id:"hulk",name:"Hulk",series:"Marvel",accent:"#65b35d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const doctorStrange={slot:85,fighter_id:"doctor-strange",name:"Doctor Strange",series:"Marvel",accent:"#b75d6d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const mantis={slot:86,fighter_id:"mantis",name:"Mantis",series:"Marvel",accent:"#75ad79",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const gamora={slot:87,fighter_id:"gamora",name:"Gamora",series:"Marvel",accent:"#5fba83",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const drax={slot:88,fighter_id:"drax",name:"Drax",series:"Marvel",accent:"#8f9a98",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const starLord={slot:89,fighter_id:"star-lord",name:"Star-Lord",series:"Marvel",accent:"#bd735f",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const groot={slot:90,fighter_id:"groot",name:"Groot",series:"Marvel",accent:"#9e8259",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const rocketRaccoon={slot:91,fighter_id:"rocket-raccoon",name:"Rocket Raccoon",series:"Marvel",accent:"#b98d5d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const peterGriffin={slot:92,fighter_id:"peter-griffin",name:"Peter Griffin",series:"Family Guy",accent:"#6eae79",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const loisGriffin={slot:93,fighter_id:"lois-griffin",name:"Lois Griffin",series:"Family Guy",accent:"#d9787a",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const luffy={slot:94,fighter_id:"monkey-d-luffy",name:"Monkey D. Luffy",series:"One Piece",accent:"#e85b4b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const zoro={slot:95,fighter_id:"roronoa-zoro",name:"Roronoa Zoro",series:"One Piece",accent:"#58a66b",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const nami={slot:96,fighter_id:"nami",name:"Nami",series:"One Piece",accent:"#e5a24d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const usopp={slot:97,fighter_id:"usopp",name:"Usopp",series:"One Piece",accent:"#a67a50",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const sanji={slot:98,fighter_id:"sanji",name:"Sanji",series:"One Piece",accent:"#e2c36d",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const chopper={slot:99,fighter_id:"chopper",name:"Chopper",series:"One Piece",accent:"#e99ab1",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const robin={slot:100,fighter_id:"robin",name:"Robin",series:"One Piece",accent:"#8b74c8",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const brook={slot:101,fighter_id:"brook",name:"Brook",series:"One Piece",accent:"#9c9ba9",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const franky={slot:102,fighter_id:"franky",name:"Franky",series:"One Piece",accent:"#65b7d6",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const jinbe={slot:103,fighter_id:"jinbe",name:"Jinbe",series:"One Piece",accent:"#4d91c5",enabled:false,coming_soon:true,unlockable:false,unlock_hint:'Coming Soon · Fighter in development',portrait:null,preview_sheet:null};
const demoCPU={...demoHero};
function noCoinCost(f){return f?.unlockable?{...f,unlock_method:'owner',unlock_cost:0,unlock_hint:'Locked fighter · unlock requirements coming soon.'}:f;}
function addBuiltInFighters(){
 for(const fighter of [demoHero,samuraiJack,kimPossible,perfectCell,burter,theFlea,nigelUno,courage,jeice,oogieBoogie,buggyTheClown,drDrakken,captainHook,baymax,antMan,kingTriton,jackSkellington,lilo,jackSparrow,guldo,majinBuu,eddy,raimundo,captainUnderpants,shrek,blackPanther,homerSimpson,ericCartman,yugiMuto,crashBandicoot,aladdin,jafar,hercules,stitch,randyMarsh,towelie,captainAmerica,pussInBoots,omi,bloo,ben10,kimiko,ed,rolf,pete,maleficent,genie,captainGinyu,goku,vegeta,raditz,nappa,recoome,piccolo,frieza,dodoria,zarbon,appule,cui,krillin,tien,yamcha,gohan,edd,sarah,jimmy,johnny2x4,nazz,kevin,wilt,eduardo,clay,jackSpicer,chaseYoung,blossom,bubbles,buttercup,jimmyNeutron,spongebob,patrickStar,timmyTurner,spiderMan,thor,hulk,doctorStrange,mantis,gamora,drax,starLord,groot,rocketRaccoon,peterGriffin,loisGriffin,luffy,zoro,nami,usopp,sanji,chopper,robin,brook,franky,jinbe]){
  const existing=[...selection.fighters.values()].find(item=>item.fighter_id===fighter.fighter_id);
  if(existing){if(fighter.fighter_id==='buggy-the-clown'){selection.fighters.set(existing.slot,noCoinCost({...existing,...fighter,slot:existing.slot}));continue;}if(fighter.coming_soon){selection.fighters.set(existing.slot,{...existing,...fighter,slot:existing.slot});continue;}if(fighter.fighter_id==='samurai-jack'||fighter.fighter_id==='kim-possible'||fighter.fighter_id==='perfect-cell'||fighter.fighter_id==='burter'||fighter.fighter_id==='the-flea'||fighter.fighter_id==='nigel-uno'||fighter.fighter_id==='courage'||fighter.fighter_id==='jeice')selection.fighters.set(existing.slot,noCoinCost({...existing,preview_sheet:fighter.preview_sheet,preview_columns:4,preview_rows:4,portrait:fighter.portrait,portrait_fallback:fighter.portrait_fallback,enabled:true,...(['perfect-cell','burter','samurai-jack','jeice'].includes(fighter.fighter_id)?{unlockable:fighter.unlockable,unlock_method:fighter.unlock_method,unlock_cost:fighter.unlock_cost,unlock_hint:fighter.unlock_hint}:{unlockable:false})}));continue;}
  let slot=fighter.slot;
  while(selection.fighters.has(slot))slot++;
  selection.fighters.set(slot,noCoinCost({...fighter,slot}));
 }
}
const johnnyArt={mode:'approved',testSheet:'/images/showdown/johnny-bravo-mugen-atlas.png'};
const johnnyArtMenu=$('johnny-art-mode');
const johnnyArtControl=$('johnny-art-control'),johnnyArtNotice=$('johnny-art-notice');
const combatSpriteCache=new Map();
const SPRITE_TIMEOUT_MS=4500;
// Reuse transparent-foot measurements between roster previews and battle sprites.
const footAnchorCache=new Map();
// Sprite atlas rows: idle, walk, run, punch, kick, guard, jump, crouch, special, hurt, KO.
// Johnny retains the owner's exact 64x64 source model: six animation frames per action.
function spriteSources(profile){
 if(!profile)return [];
 const isJohnny=profile.fighter_id==='johnny-bravo';
 const chosen=isJohnny?(johnnyArt.mode==='classic'?johnnyArt.testSheet:demoHero.preview_sheet):profile.preview_sheet;
 const url=safeImage(chosen);if(!url)return [];
 const sources=[url],u=new URL(url);
 function addStaticLocations(uri){
  if(uri.origin!==location.origin)return;
  if(uri.pathname.startsWith('/images/'))sources.push(uri.origin+'/public'+uri.pathname+uri.search);
  else if(uri.pathname.startsWith('/public/images/'))sources.push(uri.origin+uri.pathname.replace('/public/','/')+uri.search);
 }
 addStaticLocations(u);
 if(profile.fighter_id==='samurai-jack')for(const backup of ['/images/showdown/samurai-jack-atlas.svg','/public/images/showdown/samurai-jack-atlas.svg']){const candidate=safeImage(backup);if(candidate)sources.push(candidate);}
  // Keep the previous Buggy sheet as a reversible fallback if WebP cannot load.
  if(profile.fighter_id==='buggy-the-clown')for(const backup of ['/images/showdown/buggy-the-clown-4x4.png','/public/images/showdown/buggy-the-clown-4x4.png']){const candidate=safeImage(backup);if(candidate)sources.push(candidate);}
  if(isJohnny){
  // Preserve the prior Johnny atlas as a fallback if the supplied model is unavailable.
  if(johnnyArt.mode==='classic'){
   const approved=safeImage(demoHero.preview_sheet);
   if(approved){sources.push(approved);addStaticLocations(new URL(approved));}
  }
  for(const backup of ['/images/showdown/johnny-bravo-polished-atlas.svg','/public/images/showdown/johnny-bravo-polished-atlas.svg','/images/showdown/johnny-bravo-mugen-atlas.png','/public/images/showdown/johnny-bravo-mugen-atlas.png','/images/showdown/johnny-bravo-complete-v2.svg','/public/images/showdown/johnny-bravo-complete-v2.svg']){
   const candidate=safeImage(backup);if(candidate)sources.push(candidate);
  }
 }
 return [...new Set(sources)];
}
// Support both Johnny's padded 6x11 rig and the legacy 3x11 backups.
function spriteLayout(profile,source){
 const johnny=profile?.fighter_id==='johnny-bravo';
 const uploaded=/(?:johnny-bravo-new|samurai-jack|kim-possible|perfect-cell|burter|the-flea|nigel-uno|buggy-the-clown)-4x4\.(?:png|webp)/i.test(source);
 const polished=johnny&&/johnny-bravo-(?:polished-atlas|limbs-v3)\.svg/i.test(source);
  const legacyJack=/samurai-jack-atlas\.svg/i.test(source);
 return {columns:uploaded?4:polished?6:(johnny||legacyJack)?3:Math.max(1,Number(profile?.preview_columns)||3),
  rows:uploaded?4:(johnny||legacyJack)?11:Math.max(1,Number(profile?.preview_rows)||11),polished,uploaded};
}
// Measure the lowest visible sprite pixel in each frame; transparent padding
// otherwise makes Johnny's shoes hover above the arena ground.
function spriteFootAnchors(image,columns,rows){
 const fw=image.naturalWidth/columns,fh=image.naturalHeight/rows;
 if(!Number.isInteger(fw)||!Number.isInteger(fh)||!fw||!fh)return null;
 const cacheKey=(image.currentSrc||image.src)+'|'+columns+'x'+rows;
 if(footAnchorCache.has(cacheKey))return footAnchorCache.get(cacheKey);
 try{
  // Probe a bounded-size copy, never the entire source atlas. Large uploaded
  // sheets used to allocate full-resolution pixel buffers on the main thread.
  const cellW=Math.min(fw,96),cellH=Math.min(fh,128);
  const probe=document.createElement('canvas');
  probe.width=columns*cellW;probe.height=rows*cellH;
  const pen=probe.getContext('2d',{willReadFrequently:true});
  if(!pen)return null;
  pen.imageSmoothingEnabled=false;
  pen.drawImage(image,0,0,probe.width,probe.height);
  const pixels=pen.getImageData(0,0,probe.width,probe.height).data;
  const stride=probe.width;
  const anchors=Array.from({length:rows},(_,row)=>Array.from({length:columns},(_,column)=>{
   for(let py=cellH-1;py>=0;py--){
    let alphaIndex=((row*cellH+py)*stride+column*cellW)*4+3;
    for(let px=0;px<cellW;px++,alphaIndex+=4){
     if(pixels[alphaIndex]>24)return Math.min(fh,Math.round((py+1)*fh/cellH));
    }
   }
   return Math.min(fh,Math.round(fh*.73)); // A safe anchor for an empty sprite cell.
  }));
  footAnchorCache.set(cacheKey,anchors);
  return anchors;
 }catch(error){
  console.warn('Sprite ground measurement unavailable; using original anchor',error);
  return null;
 }
}
function cachedSprite(source,layout){
 let entry=combatSpriteCache.get(source);
 if(!entry){
  entry={image:new Image(),loaded:false,failed:false,columns:layout.columns,rows:layout.rows,polished:layout.polished,uploaded:layout.uploaded,footAnchors:null};
  entry.image.onload=()=>{
   entry.loaded=entry.image.naturalWidth>0&&entry.image.naturalHeight>0&&
    entry.image.naturalWidth%entry.columns===0&&entry.image.naturalHeight%entry.rows===0;
   entry.failed=!entry.loaded;
   if(entry.loaded&&(entry.polished||entry.uploaded))entry.footAnchors=spriteFootAnchors(entry.image,entry.columns,entry.rows);
  };
  entry.image.onerror=()=>{entry.failed=true;console.warn('Could not load sprite atlas:',source)};
  entry.image.decoding='async';combatSpriteCache.set(source,entry);entry.image.src=source;
   setTimeout(()=>{
    if(entry.loaded||entry.failed)return;
    entry.failed=true;
    entry.image.onload=null;entry.image.onerror=null;entry.image.src='';
    console.warn('Sprite atlas request timed out; trying backup:',source);
   },SPRITE_TIMEOUT_MS);
 }
 return entry;
}
function spriteAtlas(profile){
 if(!profile||Number(profile.preview_rows)<4||Number(profile.preview_columns)<3)return null;
 for(const source of spriteSources(profile)){
  const item=cachedSprite(source,spriteLayout(profile,source));
  if(item.loaded)return item;
  if(!item.failed)return null;
 }
 return null;
}
const JOHNNY_POSE_MAP=[
 [[0,0],[1,0],[0,2]], [[0,1],[1,1],[0,2]], [[0,0],[0,1],[2,1]],
 [[2,0],[3,0],[2,1]], [[2,2],[3,2],[2,2]], [[1,0],[1,2],[1,0]],
 [[3,1],[0,3],[2,3]], [[3,3],[1,1],[3,3]], [[2,0],[3,2],[2,3]],
 [[1,3],[0,3],[1,3]], [[1,3],[2,3],[2,3]]
];
const JACK_POSE_MAP=[[[0,0],[1,0],[3,3]],[[0,1],[1,1],[2,1]],[[2,0],[3,0],[0,2]],[[0,2],[2,1],[1,2]],[[2,2],[3,2],[1,2]],[[1,0],[2,0],[3,0]],[[1,2],[1,2],[3,1]],[[3,1],[0,3],[3,1]],[[3,0],[1,2],[2,2]],[[2,3],[3,2],[2,3]],[[2,3],[0,3],[0,3]]];
function jackSpriteCell(row,frame){const poses=JACK_POSE_MAP[Math.max(0,Math.min(10,row))];const cell=poses[Math.max(0,frame)%poses.length];return {frame:cell[0],row:cell[1]};}
const KIM_POSE_MAP=[[[0,0],[1,0],[2,0]],[[1,0],[2,0],[3,0]],[[1,1],[2,1],[3,1]],[[1,1],[2,1],[3,1]],[[0,2],[1,2],[2,2]],[[0,0],[3,1],[0,0]],[[1,2],[0,3],[1,3]],[[2,3],[2,3],[2,3]],[[2,1],[3,1],[0,2]],[[3,2],[3,3],[3,2]],[[3,2],[3,3],[3,3]]];
function kimSpriteCell(row,frame){const poses=KIM_POSE_MAP[Math.max(0,Math.min(10,row))];const cell=poses[Math.max(0,frame)%poses.length];return {frame:cell[0],row:cell[1]};}
// Map the supplied 4x4 Perfect Cell sheet onto all eleven battle pose categories.
const CELL_POSE_MAP=[
 [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[1,1],[2,1],[3,1]],
 [[0,2],[1,2],[2,2]], [[2,2],[3,2],[1,3]], [[0,0],[3,0],[0,0]],
 [[1,3],[2,3],[3,3]], [[0,3],[1,3],[0,3]], [[2,2],[3,2],[3,3]],
 [[2,3],[1,3],[2,3]], [[0,3],[0,3],[0,3]]
];
function cellSpriteCell(row,frame){
 const cells=CELL_POSE_MAP[Math.max(0,Math.min(10,row))];
 const cell=cells[Math.max(0,frame)%cells.length];
 return {frame:cell[0],row:cell[1]};
}
// Owner-supplied Burter sprite sheet uses four columns and four rows.
const BURTER_POSE_MAP=[
 [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[1,1],[3,1],[0,2]],
 [[2,0],[3,0],[2,1]], [[1,2],[2,2],[3,2]], [[0,0],[3,1],[0,0]],
 [[0,2],[1,2],[2,2]], [[2,3],[3,3],[2,3]], [[0,3],[1,3],[3,2]],
 [[1,3],[2,3],[1,3]], [[2,3],[2,3],[2,3]]
];
function burterSpriteCell(row,frame){
 const poses=BURTER_POSE_MAP[Math.max(0,Math.min(10,row))];
 const cell=poses[Math.max(0,frame)%poses.length];
 return {frame:cell[0],row:cell[1]};
}
// Map the owner's 16 Flea frames into eleven selectable combat animations.
const FLEA_POSE_MAP=[
 [[0,0],[1,0],[2,0]], // idle
 [[0,1],[1,1],[2,1]], // walk
 [[1,1],[2,1],[3,1]], // run
 [[0,2],[1,2],[2,2]], // punch
 [[2,2],[3,2],[3,1]], // kick
 [[3,0],[2,0],[3,0]], // guard
 [[0,3],[1,3],[2,3]], // jump
 [[0,1],[3,0],[0,1]], // crouch
 [[3,2],[0,3],[2,3]], // special
 [[1,3],[2,3],[1,3]], // hurt
 [[1,3],[1,3],[1,3]]  // KO
];
function fleaSpriteCell(row,frame){
 const poses=FLEA_POSE_MAP[Math.max(0,Math.min(10,row))];
 const pose=poses[Math.max(0,frame)%poses.length];
 return {frame:pose[0],row:pose[1]};
}
// Nigel's supplied 4x4 atlas: map 16 frames to the engine's eleven actions.
const NIGEL_POSE_MAP=[
 [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[1,1],[2,1],[3,1]],
 [[0,2],[1,2],[2,2]], [[2,2],[3,2],[3,1]], [[3,0],[2,0],[3,0]],
 [[0,3],[1,3],[2,3]], [[3,1],[0,3],[3,1]], [[3,2],[0,3],[2,3]],
 [[1,3],[2,3],[1,3]], [[1,3],[1,3],[1,3]]
];
// Courage's owner-supplied 4x4 action sprites.
const COURAGE_POSE_MAP=[
 [[0,0],[1,0],[2,0]],[[0,1],[1,1],[2,1]],[[1,1],[2,1],[3,1]],
 [[0,2],[1,2],[2,2]],[[2,2],[3,2],[3,1]],[[3,0],[2,0],[3,0]],
 [[0,3],[1,3],[2,3]],[[3,1],[0,1],[3,1]],[[3,2],[0,3],[2,3]],
 [[1,3],[2,3],[1,3]],[[1,3],[1,3],[1,3]]
];
// Oogie Boogie's supplied 4x4 atlas, mapped to eleven preview actions.
const OOGIE_POSE_MAP=[
 [[0,0],[1,0],[2,0]],[[1,0],[2,0],[1,1]],[[1,0],[2,0],[2,1]],
 [[2,1],[3,1],[1,2]],[[0,2],[1,2],[2,2]],[[0,1],[1,1],[0,1]],
 [[3,0],[3,2],[3,0]],[[0,1],[0,3],[0,1]],[[3,2],[3,3],[3,2]],
 [[1,2],[2,2],[1,2]],[[1,3],[1,3],[1,3]]
];
function oogieSpriteCell(row,frame){
 const poses=OOGIE_POSE_MAP[Math.max(0,Math.min(10,row))];
 const pose=poses[Math.max(0,frame)%poses.length];
 return {frame:pose[0],row:pose[1]};
}
// Jeice's supplied 4x4 atlas mapped to the engine's eleven actions.
const JEICE_POSE_MAP=[
 [[0,0],[1,0],[2,0]],[[0,1],[1,1],[2,1]],[[1,1],[2,1],[3,1]],
 [[0,2],[1,2],[2,2]],[[2,2],[3,2],[3,1]],[[3,0],[2,0],[3,0]],
 [[0,3],[1,3],[2,3]],[[3,1],[0,1],[3,1]],[[3,2],[0,3],[2,3]],
 [[1,3],[2,3],[1,3]],[[1,3],[1,3],[1,3]]
];
function jeiceSpriteCell(row,frame){
 const poses=JEICE_POSE_MAP[Math.max(0,Math.min(10,row))];
 const pose=poses[Math.max(0,frame)%poses.length];
 return {frame:pose[0],row:pose[1]};
}
// Buggy's 4x4 sheet: four standing variations, four movement poses,
// four attacks/reactions and four hurt/knockdown frames.
const BUGGY_POSE_MAP=[
 [[0,0],[1,0],[2,0]],              // idle
 [[0,1],[1,1],[2,1]],              // walk
 [[1,1],[2,1],[3,1]],              // run
 [[0,2],[1,2],[2,2]],              // punch
 [[2,1],[3,1],[1,3]],              // kick
 [[0,0],[1,2],[0,0]],              // guard
 [[1,1],[2,1],[3,1]],              // jump
 [[0,3],[1,1],[0,3]],              // crouch
 [[1,2],[2,2],[3,2]],              // special
 [[3,2],[0,3],[1,3]],              // hurt
 [[2,3],[3,3],[3,3]]               // KO
];
function buggySpriteCell(row,frame){
 const poses=BUGGY_POSE_MAP[Math.max(0,Math.min(10,row))];
 const cell=poses[Math.max(0,frame)%poses.length];
 return {frame:cell[0],row:cell[1]};
}
function courageSpriteCell(row,frame){
 const poses=COURAGE_POSE_MAP[Math.max(0,Math.min(10,row))];
 const pose=poses[Math.max(0,frame)%poses.length];
 return {frame:pose[0],row:pose[1]};
}
function nigelSpriteCell(row,frame){
 const poses=NIGEL_POSE_MAP[Math.max(0,Math.min(10,row))];
 const pose=poses[Math.max(0,frame)%poses.length];
 return {frame:pose[0],row:pose[1]};
}
function johnnySpriteCell(row,frame){
 const sequence=JOHNNY_POSE_MAP[Math.max(0,Math.min(10,row))]||JOHNNY_POSE_MAP[0];
 const pose=sequence[Math.max(0,frame)%sequence.length];
 return {frame:pose[0],row:pose[1]};
}
function spritePose(f,t,columns){
 let row=0,frame=Math.floor(t*5)%columns;
 if(f.hp<=0){row=10;frame=Math.min(columns-1,Math.floor(Math.max(0,t-(f.koAt??t))*8));}
 else if(f.stun>.02){row=9;frame=Math.min(columns-1,Math.floor(Math.max(0,t-(f.hurtAt??t))*20));}
 else if(f.attack>0){
  row=f.attackType==='kick'?4:f.attackType==='special'?8:3;
  const duration=moveFor(f,f.attackType)?.duration||.3;
  frame=Math.min(columns-1,Math.floor(Math.max(0,1-f.attack/duration)*columns));
 }
 else if(f.block){row=5;frame=Math.floor(t*6)%columns;}
 else if(f.y>2){row=6;frame=Math.min(columns-1,Math.floor(Math.max(0,t-(f.jumpAt??t))*8));}
 else if(f.crouch){row=7;frame=Math.floor(t*7)%columns;}
 else if(Math.abs(f.moveSpeed||0)>160){row=2;frame=Math.floor(t*13)%columns;}
 else if(Math.abs(f.moveSpeed||0)>8){row=1;frame=Math.floor(t*9)%columns;}
 if(columns===4&&f.profile?.fighter_id==='samurai-jack')return jackSpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='kim-possible')return kimSpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='perfect-cell')return cellSpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='burter')return burterSpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='the-flea')return fleaSpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='nigel-uno')return nigelSpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='courage')return courageSpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='jeice')return jeiceSpriteCell(row,frame);
  if(columns===4&&f.profile?.fighter_id==='buggy-the-clown')return buggySpriteCell(row,frame);
 if(columns===4&&f.profile?.fighter_id==='oogie-boogie')return oogieSpriteCell(row,frame);
 return columns===4&&f.profile?.fighter_id==='johnny-bravo'?johnnySpriteCell(row,frame):{row,frame};
}
const validColor=color=>/^#[0-9a-f]{6}$/i.test(color||'')?color:'#8d8cff';
const pad=n=>String(n).padStart(3,'0');
const text=(parent,name,value,className)=>{
  const el=document.createElement(name);if(className)el.className=className;
  el.textContent=value;parent.appendChild(el);return el;
};
const safeImage=url=>{
  if(typeof url!=='string'||url.length>1024)return null;
  try{const parsed=new URL(url,location.href);return ['https:','http:'].includes(parsed.protocol)?parsed.href:null}
  catch{return null}
};
const CHALLENGES={
 'samurai-jack':{label:'Win 10 Arcade matches',key:'arcade_wins',target:10},
 'perfect-cell':{label:'Complete a five-match Arcade run without losing a match',key:'perfect_run',target:1},
 'burter':{label:'Defeat Jeice 3 times in Arcade Mode',key:'jeice_defeats',target:3},
 'jeice':{label:'Defeat Burter 3 times in Arcade Mode',key:'burter_defeats',target:3}
};
const arcadeProgress={arcade_wins:0,jeice_defeats:0,burter_defeats:0,perfect_run:false};
const arcadeState={active:false,runId:null,hero:null,opponents:[],index:0,losses:0,saving:false,recorded:false,recordAttempted:false};
function challengeProgress(id){
 const spec=CHALLENGES[id];if(!spec)return null;
 const current=spec.key==='perfect_run'?(arcadeProgress.perfect_run?1:0):Math.min(spec.target,Number(arcadeProgress[spec.key])||0);
 return {...spec,current};
}
function showArcadeStatus(message){const el=$('arcade-status');if(el)el.textContent=message;}
function updateArcadeButtons(){
 const fighter=currentFighter(),available=!!fighter&&!isLocked(fighter);
 const start=$('arcade-start');if(start){start.disabled=!available||arcadeState.saving;start.textContent=available?'Start Arcade · 5 Matches':'Choose an unlocked fighter';}
 const next=$('arcade-next');if(next){next.hidden=!arcadeState.active||game.mode!=='finished'||arcadeState.index>=4;next.disabled=arcadeState.saving||!arcadeState.recorded;}
}
const isLocked=f=>!!f&&(f.enabled===false||!!f.coming_soon||!!f.unlockable&&!account.owned.has(f.fighter_id));
const isPlayable=f=>!!f&&f.enabled!==false&&!f.coming_soon&&!isLocked(f);
const fmtCoins=n=>Number(n).toLocaleString('en-US');
function currentFighter(){return selection.fighters.get(selection.slot)||null}
function updateAccountBar(){
 const label=$('fighter-account-status'),balance=$('fighter-balance'),signin=$('fighter-signin');
 if(account.loading){label.textContent='Checking player account…';balance.hidden=true;signin.hidden=true;return;}
 if(!account.user){
  label.textContent='Guest mode · Free fighters and training are available';
  balance.hidden=true;signin.hidden=false;return;
 }
 label.textContent=account.user.email?'Signed in · Fighter unlocks saved to your account':'Signed in · Fighter unlocks saved';
 balance.hidden=account.balance===null;
 if(account.balance!==null)balance.textContent=fmtCoins(account.balance)+' Cartoon Coins';
 signin.hidden=true;
}
async function refreshAccount(){
 if(!account.db)return;
 try{
  const {data:{user},error:authError}=await account.db.auth.getUser();
  if(authError)throw authError;
  account.user=user||null;
  account.owned=new Set();account.balance=null;Object.assign(arcadeProgress,{arcade_wins:0,jeice_defeats:0,burter_defeats:0,perfect_run:false});
  if(user){
   const [unlockResult,walletResult,progressResult]=await Promise.all([
    account.db.from('showdown_reboot_unlocks').select('fighter_id').eq('user_id',user.id),
    account.db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle(),
    account.db.from('showdown_arcade_progress').select('arcade_wins,jeice_defeats,burter_defeats,perfect_run').eq('user_id',user.id).maybeSingle()
   ]);
   if(unlockResult.error){
    console.warn('Fighter unlock verification unavailable:',unlockResult.error);
    $('showdown-status').textContent='Fighter unlocks could not be verified. Locked fighters remain locked.';
   }else account.owned=new Set((unlockResult.data||[]).map(item=>item.fighter_id));
   if(walletResult.error)console.warn('Coin wallet unavailable:',walletResult.error);
   else account.balance=walletResult.data?.balance??null;
   if(progressResult.error)console.warn('Arcade progress unavailable:',progressResult.error);
   else if(progressResult.data)Object.assign(arcadeProgress,progressResult.data);
  }
 }catch(error){
  console.warn('Fighter account refresh failed:',error);
  account.user=null;account.owned=new Set();account.balance=null;
  $('showdown-status').textContent='Account unlocks could not be loaded. Sign in again or reload to retry.';
 }finally{
  account.loading=false;
  updateAccountBar();renderRoster();selectSlot(selection.slot);
  storyMode.setAccount(account.user?.id||null);storyMode.syncFighters();
 }
}
async function initializePlayer(){
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
  account.db=createClient(API_URL,PUBLIC_KEY);
  await refreshAccount();
  account.db.auth.onAuthStateChange((event)=>{
   if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event))setTimeout(refreshAccount,0);
  });
 }catch(error){
  console.warn('Fighter login unavailable:',error);
  account.loading=false;updateAccountBar();renderRoster();selectSlot(selection.slot);
 }
}
async function purchaseSelected(){
 const fighter=currentFighter();
 if(!fighter||!isLocked(fighter)||fighter.unlock_method!=='coins'||account.busy)return;
 if(!account.user||!account.db){$('showdown-status').textContent='Sign in to purchase this fighter.';return;}
 const cost=Number(fighter.unlock_cost);
 if(!Number.isInteger(cost)||cost<=0){$('showdown-status').textContent='This fighter has no valid coin price.';return;}
 if(!confirm('Unlock '+fighter.name+' for '+fmtCoins(cost)+' Cartoon Coins?'))return;
 account.busy=true;selectSlot(selection.slot);$('showdown-status').textContent='Processing fighter unlock…';
 try{
  const {data,error}=await account.db.rpc('showdown_reboot_purchase',{p_fighter_id:fighter.fighter_id});
  if(error)throw error;
  if(!data?.unlocked)throw new Error('Purchase was not confirmed');
  account.owned.add(fighter.fighter_id);
  account.balance=data.balance;
  await refreshAccount();
  $('showdown-status').textContent=fighter.name+' unlocked permanently for this account!';
 }catch(error){
  $('showdown-status').textContent='Unlock failed: '+error.message;
 }finally{
  account.busy=false;updateAccountBar();renderRoster();selectSlot(selection.slot);
 }
}
$('unlock-fighter').addEventListener('click',purchaseSelected);
function setupPreviewAnimation(fighter){
 previewAnimation.token++;
 const token=previewAnimation.token;
 previewAnimation.image=null;previewAnimation.source=null;previewAnimation.loaded=false;previewAnimation.footAnchors=null;
 const canvas=$('preview-idle-canvas'),avatar=$('preview-avatar');
 canvas.hidden=true;avatar.hidden=false;
 const sources=spriteSources(fighter);if(!sources.length)return;
 const columns=Math.max(1,Math.min(12,Number(fighter.preview_columns)||3));
 const rows=Math.max(1,Math.min(32,Number(fighter.preview_rows)||1));
 let index=0;
 function tryNext(){
  if(token!==previewAnimation.token||index>=sources.length)return;
  const img=new Image();img.decoding='async';
  img.onload=()=>{
   if(token!==previewAnimation.token)return;
   if(!img.naturalWidth||!img.naturalHeight){tryNext();return;}
   const layout=spriteLayout(fighter,source);
   if(img.naturalWidth%layout.columns||img.naturalHeight%layout.rows){tryNext();return;}
   previewAnimation.image=img;previewAnimation.source=source;previewAnimation.loaded=true;
   previewAnimation.columns=layout.columns;previewAnimation.rows=layout.rows;
   previewAnimation.footAnchors=(layout.polished||layout.uploaded)?spriteFootAnchors(img,layout.columns,layout.rows):null;
   previewAnimation.poseStart=performance.now();
   avatar.hidden=true;canvas.hidden=false;
  };
  img.onerror=()=>{if(token===previewAnimation.token)tryNext()};
  const source=sources[index++];img.src=source;
 }
 tryNext();
}
function renderPreviewFrame(timestamp){
 if(!previewAnimation.loaded||!previewAnimation.image)return;
 const canvas=$('preview-idle-canvas');
 if(canvas.hidden)return;
 const p=canvas.getContext('2d'),img=previewAnimation.image;
 if(!p)return;
 const cols=previewAnimation.columns,rows=previewAnimation.rows;
 const fw=img.naturalWidth/cols,fh=img.naturalHeight/rows;
 if(!fw||!fh)return;
 const actionRow=Math.max(0,SPRITE_POSES.indexOf(previewAnimation.pose));
 const age=Math.max(0,timestamp-previewAnimation.poseStart);
 const isLoop=['idle','walk','run','guard','crouch'].includes(previewAnimation.pose);
 const interval=previewAnimation.pose==='run'?85:previewAnimation.pose==='walk'?115:190;
 const actionFrame=isLoop?Math.floor(age/interval)%cols:Math.min(cols-1,Math.floor((age%1400)/(1400/cols)));
 const uploaded=/(?:johnny-bravo-new|samurai-jack|kim-possible|perfect-cell|burter|the-flea|buggy-the-clown)-4x4\.(?:png|webp)/i.test(previewAnimation.source||'');
 const {row,frame}=uploaded?(selection.fighters.get(selection.slot)?.fighter_id==='samurai-jack'?jackSpriteCell(actionRow,actionFrame):selection.fighters.get(selection.slot)?.fighter_id==='kim-possible'?kimSpriteCell(actionRow,actionFrame):selection.fighters.get(selection.slot)?.fighter_id==='perfect-cell'?cellSpriteCell(actionRow,actionFrame):selection.fighters.get(selection.slot)?.fighter_id==='burter'?burterSpriteCell(actionRow,actionFrame):selection.fighters.get(selection.slot)?.fighter_id==='the-flea'?fleaSpriteCell(actionRow,actionFrame):selection.fighters.get(selection.slot)?.fighter_id==='buggy-the-clown'?buggySpriteCell(actionRow,actionFrame):johnnySpriteCell(actionRow,actionFrame)):{row:actionRow,frame:actionFrame};
 const polished=/johnny-bravo-(?:polished-atlas|limbs-v3)\.svg/i.test(previewAnimation.source||'');
 p.clearRect(0,0,canvas.width,canvas.height);
 p.save();p.imageSmoothingEnabled=!polished&&!uploaded;p.imageSmoothingQuality='high';
 if(uploaded){
  const scale=Math.min((canvas.width-28)/fw,(canvas.height-16)/fh);
  const feet=previewAnimation.footAnchors?.[row]?.[frame]??60;
  p.drawImage(img,frame*fw,row*fh,fw,fh,
   Math.round(canvas.width/2-fw*scale/2),Math.round(canvas.height-10-feet*scale),fw*scale,fh*scale);
 }else if(polished){
  // The approved sprite occupies 64px inside a padded 112px cell.
  // Anchor his feet so every frame shares the same baseline.
  const scale=Math.min((canvas.width-18)/84,(canvas.height-12)/66);
  const feet=previewAnimation.footAnchors?.[row]?.[frame]??82;
  const dx=Math.round(canvas.width/2-52*scale),dy=Math.round(canvas.height-8-feet*scale);
  p.drawImage(img,frame*fw,row*fh,fw,fh,dx,dy,fw*scale,fh*scale);
 }else{
  const scale=Math.min((canvas.width-25)/fw,(canvas.height-18)/fh);
  const dw=fw*scale,dh=fh*scale;
  p.shadowColor='#7fcfff';p.shadowBlur=15;
  p.drawImage(img,frame*fw,row*fh,fw,fh,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);
 }
 p.restore();
}
if(johnnyArtMenu){
 johnnyArtMenu.value=johnnyArt.mode;
 johnnyArtMenu.addEventListener('change',()=>{
  johnnyArt.mode=johnnyArtMenu.value==='classic'?'classic':'approved';
  const fighter=currentFighter();
  if(fighter?.fighter_id==='johnny-bravo')setupPreviewAnimation(fighter);
  else if(!fighter)setupPreviewAnimation(demoHero);
  if(johnnyArtNotice)johnnyArtNotice.hidden=johnnyArt.mode!=='classic'||fighter?.fighter_id!=='johnny-bravo';
  $('showdown-status').textContent=johnnyArt.mode==='classic'
    ?'Viewing the previous Johnny model. Switch back to New Johnny Model to use the newly supplied sprite.'
    :'Using your new Johnny Bravo sprite model for previews and battles.';
 });
}
const previewPoseMenu=$('preview-pose');
if(previewPoseMenu){
 previewPoseMenu.replaceChildren(...SPRITE_POSES.map(pose=>new Option(pose.toUpperCase(),pose)));
 previewPoseMenu.value=previewAnimation.pose;
 previewPoseMenu.addEventListener('change',()=>{
  previewAnimation.pose=SPRITE_POSES.includes(previewPoseMenu.value)?previewPoseMenu.value:'idle';
  previewAnimation.poseStart=performance.now();
 });
}
// Visible roster positions are alphabetical. Database slot IDs remain unchanged
// so saved fighters, unlocks, story mode, and combat references stay intact.
function alphabeticalSlotNumbers(){
 const occupied=[...selection.fighters.entries()].sort((a,b)=>
  (a[1].name||'').localeCompare(b[1].name||'',undefined,{sensitivity:'base'})||
  (a[1].fighter_id||'').localeCompare(b[1].fighter_id||'')||a[0]-b[0]);
 const numbers=new Map();
 occupied.forEach(([slot],index)=>numbers.set(slot,index+1));
 let next=occupied.length+1;
 for(let slot=1;slot<=selection.slots;slot++)if(!numbers.has(slot))numbers.set(slot,next++);
 return numbers;
}
function pageSlots(){
 const q=search.value.trim().toLowerCase().replace(/\s+/g,' ');
 const state=kind.value, group=series.value;
 const slotQuery=q.match(/^(?:slot\s*#?\s*)(\d+)$/);
 const displayNumbers=alphabeticalSlotNumbers();
 const matches=[];
 for(let n=1;n<=selection.slots;n++){
   const f=selection.fighters.get(n);
   if((state==='ready'&&!f)||(state==='empty'&&f)||
      (state==='playable'&&!isPlayable(f))||
      (state==='unlockable'&&(!f||!f.unlockable))||
      (state==='owned'&&(!f||!account.owned.has(f.fighter_id))))continue;
   if(group!=='all'&&(!f||f.series!==group))continue;
   if(q&&!((f?.name||'').toLowerCase().includes(q)||(f?.series||'').toLowerCase().includes(q)||
     (f?.fighter_id||'').toLowerCase().includes(q)|| (slotQuery?Number(slotQuery[1])===displayNumbers.get(n):(!Number.isNaN(Number(q))&&Number(q)===displayNumbers.get(n)))))continue;
   matches.push(n);
 }
 if(order?.value==='name'||order?.value==='series'){
  const byName=(a,b)=>(a.name||'').localeCompare(b.name||'');
  const bySeries=(a,b)=>(a.series||'').localeCompare(b.series||'')||byName(a,b);
  matches.sort((a,b)=>{
   const x=selection.fighters.get(a),y=selection.fighters.get(b);
   if(!x||!y)return x?-1:y?1:a-b;
   return (order.value==='series'?bySeries(x,y):byName(x,y))||a-b;
  });
 }
 return matches;
}
function updateSeries(){
 const value=series.value;
 series.replaceChildren();
 let option=document.createElement('option');option.value='all';option.textContent='All series';series.append(option);
 const distinct=[...new Set([...selection.fighters.values()].map(f=>f.series))].sort((a,b)=>a.localeCompare(b));
 for(const item of distinct){option=document.createElement('option');option.value=item;option.textContent=item;series.append(option)}
 series.value=distinct.includes(value)?value:'all';
}
function renderRoster(){
 const matches=pageSlots(),pages=Math.max(1,Math.ceil(matches.length/PAGE_SIZE));
 const displayNumbers=alphabeticalSlotNumbers();
 selection.page=Math.max(0,Math.min(selection.page,pages-1));
 const visible=matches.slice(selection.page*PAGE_SIZE,(selection.page+1)*PAGE_SIZE);
 const previousSelection=selection.slot;
 if(visible.length&&!visible.includes(selection.slot)){
  selection.slot=visible.find(n=>isPlayable(selection.fighters.get(n)))??
   visible.find(n=>selection.fighters.has(n))??visible[0];
 }
 rosterGrid.replaceChildren();
 const frame=document.createDocumentFragment();
 for(const n of visible){
  const fighter=selection.fighters.get(n);
  const visibleSlot=displayNumbers.get(n);
  const button=document.createElement('button');button.type='button';
  const locked=isLocked(fighter);
  button.className='fighter-slot'+(fighter?' occupied':'')+(locked?' locked':'')+(fighter?.unlockable&&!locked?' claimed':'');
  button.dataset.slot=String(n);
  button.style.setProperty('--fighter-accent',validColor(fighter?.accent));
  button.setAttribute('aria-pressed',String(selection.slot===n));
  button.setAttribute('aria-label',fighter?'Slot '+visibleSlot+': '+fighter.name+(fighter.coming_soon?', coming soon':locked?', locked':fighter.unlockable?', unlocked':', playable'):'Slot '+visibleSlot+': future fighter');
  text(button,'span',pad(visibleSlot),'slot-no');
  const art=document.createElement('span');art.className='slot-art';button.append(art);
  const mark=text(art,'span',fighter?fighter.name.slice(0,1).toUpperCase():'?','slot-symbol');
  if(fighter?.coming_soon){button.classList.add('coming-soon');const badge=text(button,'span','COMING SOON','slot-lock');badge.title='Coming Soon';}
  else if(locked){const badge=text(button,'span','🔒','slot-lock');badge.setAttribute('aria-hidden','true');badge.title='Unlockable fighter';}
  else if(fighter?.unlockable){const badge=text(button,'span','✓','slot-claimed');badge.setAttribute('aria-hidden','true');badge.title='Unlocked for your account';}
  const img=safeImage(fighter?.portrait);
  if(img){
   const portrait=document.createElement('img');portrait.src=img;portrait.alt='';
   portrait.loading=n===selection.slot?'eager':'lazy';
   portrait.onerror=()=>{const backup=safeImage(fighter?.portrait_fallback);if(backup&&portrait.src!==backup){portrait.onerror=()=>portrait.replaceWith(mark);portrait.src=backup;}else portrait.replaceWith(mark);};
   mark.replaceWith(portrait);
  }
  const footer=document.createElement('span');footer.className='slot-footer';button.append(footer);
  text(footer,'span',fighter?fighter.name:'OPEN SLOT','slot-label');
  text(footer,'span',fighter?(fighter.coming_soon?'COMING SOON':locked?'LOCKED':fighter.unlockable?'UNLOCKED':'READY'):'FUTURE','slot-status');
  text(button,'span','1P','slot-player-indicator').setAttribute('aria-hidden','true');
  button.addEventListener('click',()=>selectSlot(n));
  frame.append(button);
 }
 rosterGrid.append(frame);
 if(!matches.length)text(rosterGrid,'p','No roster slots match those filters.','notice');
 $('roster-page').textContent='PAGE '+(selection.page+1)+' / '+pages;
 const first=matches.length?selection.page*PAGE_SIZE+1:0;
 const last=Math.min(matches.length,(selection.page+1)*PAGE_SIZE);
 $('roster-results').textContent=matches.length?'FIGHTERS '+first+'–'+last+' OF '+matches.length:'NO MATCHING FIGHTERS';
 $('roster-page-bar').style.width=(((selection.page+1)/pages)*100)+'%';
 for(const chip of rosterShortcuts)chip.setAttribute('aria-pressed',String(chip.dataset.rosterFilter===kind.value));
 $('roster-prev').disabled=selection.page===0;
 $('roster-next').disabled=selection.page>=pages-1;
 $('roster-tally').textContent=selection.fighters.size+' / '+selection.slots+' listed';
 $('roster-capacity').textContent=String(selection.slots);
 const fighters=[...selection.fighters.values()];
 $('roster-locked').textContent=String(fighters.filter(f=>f.unlockable&&!f.coming_soon&&isLocked(f)).length);
 $('roster-ready').textContent=String(fighters.filter(isPlayable).length);
 $('roster-open').textContent=String(selection.slots-selection.fighters.size);
 if(selection.slot!==previousSelection)selectSlot(selection.slot);
}
function selectSlot(slot){
 selection.slot=slot;
 const fighter=currentFighter();
 const locked=isLocked(fighter);
 const testingJohnny=fighter?.fighter_id==='johnny-bravo';
 $('preview-idle-canvas').style.imageRendering=testingJohnny?'pixelated':'auto';
 if(johnnyArtControl)johnnyArtControl.hidden=!testingJohnny;
 if(johnnyArtNotice)johnnyArtNotice.hidden=!testingJohnny||johnnyArt.mode!=='classic';
 const avatar=$('preview-avatar');avatar.replaceChildren();
 avatar.style.setProperty('--fighter-accent',validColor(fighter?.accent));
 const uri=safeImage(fighter?.portrait);
 if(fighter&&uri){
   const img=document.createElement('img');img.src=uri;img.alt='';
   img.onerror=()=>{const backup=safeImage(fighter.portrait_fallback);if(backup&&img.src!==backup){img.onerror=()=>{avatar.replaceChildren();avatar.textContent=fighter.name.charAt(0).toUpperCase()};img.src=backup;}else{avatar.replaceChildren();avatar.textContent=fighter.name.charAt(0).toUpperCase();}};
   avatar.append(img);
 }else avatar.textContent=fighter?fighter.name.charAt(0).toUpperCase():'?';
 avatar.classList.toggle('is-empty',!fighter);
 $('preview-lock').hidden=!locked;
 $('preview-tag').textContent=fighter?.coming_soon?'COMING SOON':locked?'🔒 UNLOCKABLE':fighter?.unlockable?'✓ UNLOCKED':fighter?'READY TO FIGHT':'OPEN SLOT';
 $('preview-tag').classList.toggle('is-locked',locked);
 $('preview-tag').classList.toggle('is-ready',!!fighter&&!locked);
 document.querySelector('.preview-card').classList.toggle('is-locked',locked);
 const visibleSlot=alphabeticalSlotNumbers().get(slot)||slot;
 $('preview-title').textContent=fighter?fighter.name:'SLOT '+pad(visibleSlot);
 $('preview-slot').textContent='FIGHTER NO. '+pad(visibleSlot);
 $('preview-status-text').textContent=fighter?.coming_soon?'COMING SOON':locked?'LOCKED FIGHTER':fighter?.unlockable?'FIGHTER UNLOCKED':fighter?'READY FOR BATTLE':'FUTURE FIGHTER';
 $('preview-series').textContent=fighter?fighter.series:'This place is reserved for a future fighter.';
 $('preview-detail').textContent=locked?
   (fighter?.coming_soon?'This fighter is coming soon! Artwork and combat animations are in development.':'Unlock this character for your account before entering the arena.'):
   fighter?(testingJohnny?'Preview the PUNCH and KICK poses, then use J and K (or the mobile P and K buttons) to strike your opponent.':fighter.fighter_id==='samurai-jack'?'Katana fighter: J performs a sword strike, K kicks, and U unleashes a charged sword slash. Preview all 11 animations.':'Choose any of the 11 combat poses, then test the moves in the arena.'):
   'Start a Practice Mode match while new fighters are being created.';
 const note=$('preview-unlock-note');
 note.hidden=!locked;
 note.textContent=fighter?.coming_soon?fighter.name+' is coming soon. Artwork, animations and moves are in development.':locked?(fighter.unlock_method==='coins'&&fighter.unlock_cost?
  'Unlock price: '+fmtCoins(fighter.unlock_cost)+' Cartoon Coins'+(fighter.unlock_hint?' · '+fighter.unlock_hint:''):
  fighter.unlock_hint||'This fighter is awarded by the CTooniverse owner.'):'';
 const challenge=challengeProgress(fighter?.fighter_id);
 const challengePanel=$('fighter-challenge');
 if(challengePanel){
  challengePanel.hidden=!challenge;
  if(challenge){
   $('fighter-challenge-label').textContent=(locked?'Unlock objective: ':'Objective completed: ')+challenge.label;
   $('fighter-challenge-bar').style.width=(100*challenge.current/challenge.target)+'%';
   $('fighter-challenge-count').textContent=challenge.current+' / '+challenge.target+(account.user?'':' · Sign in to save progress');
  }
 }
 if(challenge)note.hidden=true;
 const buy=$('unlock-fighter');
 buy.hidden=!(locked&&fighter?.unlock_method==='coins');
 if(!buy.hidden){
  buy.textContent='Unlock for '+fmtCoins(fighter.unlock_cost||0)+' Coins';
  buy.disabled=account.loading||account.busy||!account.user||account.balance===null||account.balance<Number(fighter.unlock_cost);
  if(!account.user)note.textContent+=' Sign in to purchase.';
  else if(account.balance!==null&&account.balance<Number(fighter.unlock_cost))note.textContent+=' Not enough coins.';
 }
 setupPreviewAnimation(fighter);
 if(previewPoseMenu)previewPoseMenu.disabled=!fighter||!spriteSources(fighter).length;
 startBtn.disabled=!fighter||locked;
 startBtn.textContent=fighter?.coming_soon?'COMING SOON':locked?'🔒 FIGHTER LOCKED':fighter?'Fight as '+fighter.name:'Choose a fighter first';
 updateArcadeButtons();
 quickStartBtn.disabled=startBtn.disabled;
 quickStartBtn.textContent=fighter?.coming_soon?'COMING SOON':locked?'🔒 Locked':fighter?'FIGHT AS '+fighter.name:'Choose a fighter';
 selectedFighterStatus.textContent=fighter?.coming_soon?'COMING SOON · '+fighter.name:locked?'🔒 '+fighter.name+' · unlock required':fighter?'Selected: '+fighter.name:'Select a playable fighter';
 // Preserve keyboard focus when switching portraits instead of recreating the wall.
 for(const tile of rosterGrid.querySelectorAll('.fighter-slot'))
  tile.setAttribute('aria-pressed',String(Number(tile.dataset.slot)===slot));
}
function setPage(delta){
 selection.page+=delta;
 renderRoster();
 rosterGrid.scrollTop=0;
 if(window.matchMedia('(max-width: 900px)').matches)rosterLayer.scrollTop=0;
}
// Arcade shortcuts choose only fighters the current player can actually use.
// Clear visual filters so a surprise pick is always visible on its roster page.
function choosePlayableFighter(random=false){
 const playable=[...selection.fighters.values()].filter(isPlayable).sort((a,b)=>a.name.localeCompare(b.name));
 if(!playable.length){
  banner.textContent='No playable fighters available yet. Check your fighter unlocks or try Practice Mode.';
  return;
 }
 const currentIndex=playable.findIndex(f=>f.slot===selection.slot);
 let picked;
 if(random){
  const alternatives=playable.length>1?playable.filter(f=>f.slot!==selection.slot):playable;
  picked=alternatives[Math.floor(Math.random()*alternatives.length)];
 }else{
  picked=playable[(currentIndex+1+playable.length)%playable.length];
 }
 search.value='';
 series.value='all';
 kind.value='playable';
 selection.page=0;
 const matches=pageSlots();
 selection.page=Math.max(0,Math.floor(matches.indexOf(picked.slot)/PAGE_SIZE));
 renderRoster();
 selectSlot(picked.slot);
 const tile=[...rosterGrid.querySelectorAll('.fighter-slot')].find(item=>Number(item.dataset.slot)===picked.slot);
 if(tile){tile.focus({preventScroll:true});tile.scrollIntoView({block:'nearest',behavior:'smooth'});}
 banner.textContent=(random?'🎲 RANDOM CHALLENGER: ':'⚡ NEXT CHALLENGER: ')+picked.name+' — ready to fight!';
}
$('roster-random')?.addEventListener('click',()=>choosePlayableFighter(true));
$('roster-next-playable')?.addEventListener('click',()=>choosePlayableFighter(false));
document.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||event.defaultPrevented)return;
 const target=event.target;
 if(target?.closest?.('input,select,textarea,[contenteditable="true"]'))return;
 if(game.mode!=='idle')return;
 if(event.key.toLowerCase()==='r'){event.preventDefault();choosePlayableFighter(true);}
 if(event.key.toLowerCase()==='n'){event.preventDefault();choosePlayableFighter(false);}
});
$('roster-prev').addEventListener('click',()=>setPage(-1));
$('roster-next').addEventListener('click',()=>setPage(1));
for(const input of [search,series,kind,order])input.addEventListener('input',()=>{
 selection.page=0;renderRoster();
});
for(const chip of rosterShortcuts)chip.addEventListener('click',()=>{
 kind.value=chip.dataset.rosterFilter;
 selection.page=0;renderRoster();
});
rosterGrid.addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 const current=event.target.closest('.fighter-slot');
 if(!current)return;
 const matches=pageSlots(),index=matches.indexOf(Number(current.dataset.slot));
 if(index<0)return;
 const columns=window.matchMedia('(max-width: 370px)').matches?3:window.matchMedia('(max-width: 650px)').matches?4:5;
 const offset=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-columns:columns;
 const next=event.key==='Home'?0:event.key==='End'?matches.length-1:Math.max(0,Math.min(matches.length-1,index+offset));
 if(next===index)return;
 event.preventDefault();
 const slot=matches[next],page=Math.floor(next/PAGE_SIZE);
 if(selection.page!==page){selection.page=page;renderRoster();}
 selectSlot(slot);
 rosterGrid.querySelector('.fighter-slot[data-slot="'+slot+'"]')?.focus({preventScroll:true});
});
async function loadRoster(){
 banner.textContent='Loading published fighters…';
 try{
  const controller=typeof AbortController==='function'?new AbortController():null;
  const wait=controller?setTimeout(()=>controller.abort(),7000):null;
  const response=await fetch(API_URL+'/rest/v1/showdown_reboot_fighters?select=slot,fighter_id,name,series,portrait,accent,enabled,unlockable,unlock_hint,unlock_method,unlock_cost,preview_sheet,preview_columns,preview_rows&enabled=eq.true&order=slot.asc',{
   headers:{'apikey':PUBLIC_KEY,'Accept':'application/json'},cache:'no-store',signal:controller?.signal
  }).finally(()=>{if(wait!==null)clearTimeout(wait)});
  if(!response.ok)throw new Error('Catalog HTTP '+response.status);
  const fighters=await response.json();
  if(!Array.isArray(fighters))throw new Error('Unexpected catalog format');
  selection.fighters=new Map(fighters.filter(f=>Number.isSafeInteger(f.slot)&&f.slot>0).map(f=>{
    const ready=f.fighter_id==='oogie-boogie'?{...f,...oogieBoogie,slot:f.slot}:f.fighter_id==='buggy-the-clown'?{...f,...buggyTheClown,slot:f.slot}:f.fighter_id==='johnny-bravo'
      ?{...f,portrait:demoHero.portrait,portrait_fallback:demoHero.portrait_fallback,preview_sheet:demoHero.preview_sheet,preview_columns:4,preview_rows:4}
      :f.fighter_id==='samurai-jack'
      ?{...f,portrait:samuraiJack.portrait,portrait_fallback:samuraiJack.portrait_fallback,preview_sheet:samuraiJack.preview_sheet,preview_columns:4,preview_rows:4}
      :f.fighter_id==='kim-possible'
      ?{...f,portrait:kimPossible.portrait,portrait_fallback:kimPossible.portrait_fallback,preview_sheet:kimPossible.preview_sheet,preview_columns:4,preview_rows:4}
      :f.fighter_id==='perfect-cell'
      ?{...f,portrait:perfectCell.portrait,portrait_fallback:perfectCell.portrait_fallback,preview_sheet:perfectCell.preview_sheet,preview_columns:4,preview_rows:4}
      :f.fighter_id==='burter'
      ?{...f,portrait:burter.portrait,preview_sheet:burter.preview_sheet,preview_columns:4,preview_rows:4}
      :f.fighter_id==='the-flea'
      ?{...f,portrait:theFlea.portrait,preview_sheet:theFlea.preview_sheet,preview_columns:4,preview_rows:4}:f;
    return [ready.slot,noCoinCost(ready)];
   }));
   // Preserve owner-defined slots while adding the built-in fighters.
   addBuiltInFighters();
  storyMode.syncFighters();
  const maxSlot=selection.fighters.size?Math.max(...selection.fighters.keys()):0;
  selection.slots=Math.max(START_SLOTS,Math.ceil(maxSlot/PAGE_SIZE)*PAGE_SIZE);
  updateSeries();renderRoster();selectSlot(selection.slot);
  banner.textContent=selection.fighters.size?
    'Fresh roster ready! Choose a published fighter. Additional roster pages are added automatically as new slots are filled.':
    'Fresh start: all 200 slots are open. No old fighters have been imported. Try Practice Mode while you build your roster.';
 }catch(err){
  console.warn('CToon Showdown roster unavailable:',err);
  addBuiltInFighters();
   updateSeries();storyMode.syncFighters();
   banner.textContent='Online catalog unavailable. Free fighters are playable locally; locked fighters remain unavailable.';
  renderRoster();selectSlot(selection.slot);
 }
}
const keyAliases={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'up',w:'up',arrowdown:'down',s:'down',j:'punch',k:'kick',l:'guard',u:'special'};
const down=new Set();
const oneShots=new Set();
const buttons=[...document.querySelectorAll('[data-control]')];
const keyDown=event=>{
 if(game.mode==='idle')return; // Only accept fighting controls during a match, not while browsing the roster.
 if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],.roster-grid'))return;
 const key=keyAliases[event.key.toLowerCase()];
 if(!key)return;
 if(['arrowleft','arrowright','arrowup','arrowdown'].includes(event.key.toLowerCase()))event.preventDefault();
 if(!down.has(key))oneShots.add(key);
 down.add(key);
};
const keyUp=event=>{const key=keyAliases[event.key.toLowerCase()];if(key)down.delete(key)};
window.addEventListener('keydown',keyDown);
window.addEventListener('keyup',keyUp);
function releaseControls(){
 down.clear();oneShots.clear();
 for(const button of buttons)button.classList.remove('pressed');
}
window.addEventListener('blur',releaseControls);
// A mobile tab switch or screen lock must never leave a direction or attack held.
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)return;
 releaseControls();
 if(['countdown','fighting','between'].includes(game.mode)&&!game.paused)pauseBtn.click();
});
for(const button of buttons){
 const action=button.dataset.control;
 button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);if(!down.has(action))oneShots.add(action);down.add(action);button.classList.add('pressed')});
 const release=()=>{down.delete(action);button.classList.remove('pressed')};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
const GROUND=445,LEFT=68,RIGHT=892;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const game={mode:'idle',paused:false,hero:null,cpu:null,heroProfile:demoHero,cpuProfile:demoCPU,cpuDifficulty:1,timer:60,round:1,wins:[0,0],between:0,countdown:3,fightBanner:0,roundMessage:'',hitEffects:[],last:0,animClock:0};
function arcadeOpponentList(hero){
 const roster=[...selection.fighters.values()].filter(f=>f.enabled!==false&&!f.coming_soon&&f.fighter_id!==hero.fighter_id);
 const byId=id=>roster.find(f=>f.fighter_id===id);
 // Each run includes both locked rivals so their challenges are achievable.
 const chosen=[byId('jeice'),byId('burter')].filter(Boolean);
 const rest=roster.filter(f=>!chosen.some(x=>x.fighter_id===f.fighter_id)).sort(()=>Math.random()-.5);
 for(const f of rest){if(chosen.length>=5)break;chosen.push(f);}
 while(chosen.length<5&&roster.length)chosen.push(roster[chosen.length%roster.length]);
 return chosen.slice(0,5);
}
function startArcade(){
 const hero=currentFighter();
 if(!hero||isLocked(hero))return;
 storyMode.leave();
 const opponents=arcadeOpponentList(hero);
 if(opponents.length<5){showArcadeStatus('At least five CPU opponents are required for Arcade Mode.');return;}
 Object.assign(arcadeState,{active:true,runId:crypto.randomUUID(),hero,opponents,index:0,losses:0,saving:false,recorded:false,recordAttempted:false});
 startMatch(hero,opponents[0],1);
 showArcadeStatus('ARCADE MATCH 1 / 5 · '+hero.name+' vs '+opponents[0].name+(account.user?'':' · Guest results will not be saved.'));
 updateArcadeButtons();
}
async function arcadeMatchFinished(won){
 if(!arcadeState.active||arcadeState.recorded||arcadeState.saving)return;
 arcadeState.saving=true;updateArcadeButtons();
 if(!arcadeState.recordAttempted){if(!won)arcadeState.losses++;arcadeState.recordAttempted=true;}
 const match=arcadeState.index+1,opponent=arcadeState.opponents[arcadeState.index];
 try{
  if(account.user&&account.db){
   const {data,error}=await account.db.rpc('showdown_arcade_record_match',{
    p_run_id:arcadeState.runId,p_match:match,p_hero:arcadeState.hero.fighter_id,
    p_opponent:opponent.fighter_id,p_won:won
   });
   if(error)throw error;
   for(const key of ['arcade_wins','jeice_defeats','burter_defeats','perfect_run'])if(data[key]!==undefined)arcadeProgress[key]=data[key];
   const unlocked=Array.isArray(data.unlocked)?data.unlocked:[];
   unlocked.forEach(id=>account.owned.add(id));
   if(unlocked.length){
    const names=unlocked.map(id=>selection.fighters.size?[...selection.fighters.values()].find(f=>f.fighter_id===id)?.name||id:id);
    announceFight('FIGHTER UNLOCKED! '+names.join(', '),'result');
    showArcadeStatus('FIGHTER UNLOCKED! '+names.join(', ')+' · Permanently saved to your account.');
   }else showArcadeStatus(match===5?'ARCADE COMPLETE · '+(arcadeState.losses===0?'Perfect run!':'Run finished.'):'ARCADE MATCH '+match+' / 5 · '+(won?'Victory!':'Defeat.')+' Continue to the next opponent.');
   renderRoster();selectSlot(selection.slot);
  }else showArcadeStatus('Arcade match '+match+' / 5 complete · Sign in to save objectives and fighter unlocks.');
  arcadeState.recorded=true;
  const retry=$('arcade-retry-save');if(retry)retry.hidden=true;
 }catch(error){
  console.warn('Arcade progress save failed',error);
  showArcadeStatus('Could not save Arcade progress: '+error.message+' · Retry saving before continuing.');
  const retry=$('arcade-retry-save');if(retry)retry.hidden=false;
 }finally{arcadeState.saving=false;updateArcadeButtons();}
}
function nextArcadeMatch(){
 if(!arcadeState.active||!arcadeState.recorded||arcadeState.saving||arcadeState.index>=4)return;
 arcadeState.index++;arcadeState.recorded=false;arcadeState.recordAttempted=false;
 const opponent=arcadeState.opponents[arcadeState.index];
 startMatch(arcadeState.hero,opponent,1);
 showArcadeStatus('ARCADE MATCH '+(arcadeState.index+1)+' / 5 · '+arcadeState.hero.name+' vs '+opponent.name);
 updateArcadeButtons();
}
$('arcade-start')?.addEventListener('click',startArcade);
$('arcade-next')?.addEventListener('click',nextArcadeMatch);
$('arcade-retry-save')?.addEventListener('click',()=>{if(arcadeState.active&&!arcadeState.recorded){$('arcade-retry-save').hidden=true;arcadeMatchFinished(game.wins[0]>=2)}});
function showCharacterSelect(focus=false){
 arcadeState.active=false;updateArcadeButtons();
 storyMode.leave();
 // Restore the classic layout: the character roster remains above the separate arena.
 battleAudio.stopTheme();
 game.mode='idle';game.paused=false;game.hero=null;game.cpu=null;
 game.hitEffects.length=0;
 releaseControls();
 rosterLayer.hidden=false;
 arenaSelectBtn.hidden=true;
 battleExpandBtn.hidden=false;
 arena.setAttribute('aria-hidden','false');
 arenaFrame.classList.remove('is-selecting');
 arenaSection.classList.remove('is-selecting');
 returnRosterBtn.hidden=true;
 restartBtn.disabled=true;pauseBtn.disabled=true;pauseBtn.textContent='Pause';
 announceFight('READY TO TRAIN','');
 $('showdown-status').textContent='Select a fighter in the roster above, then start a match in the arena below.';
 if(focus){
  rosterGrid.scrollTop=0;
  rosterLayer.scrollIntoView({behavior:'smooth',block:'start'});
  const selected=rosterGrid.querySelector('.fighter-slot[aria-pressed="true"]');
  selected?.focus({preventScroll:true});
 }
}
function hideCharacterSelect(){
 // Starting a match never removes the player's roster or its preview from the page.
 rosterLayer.hidden=false;
 arenaSelectBtn.hidden=true;
 battleExpandBtn.hidden=false;
 arena.setAttribute('aria-hidden','false');
 arenaFrame.classList.remove('is-selecting');
 arenaSection.classList.remove('is-selecting');
 returnRosterBtn.hidden=false;
 releaseControls();
}
returnRosterBtn.addEventListener('click',()=>showCharacterSelect(true));
arenaSelectBtn.addEventListener('click',()=>showCharacterSelect(true));
quickStartBtn.addEventListener('click',()=>startBtn.click());

// Native fullscreen when supported, with a fixed-window fallback on mobile browsers.
function isExpanded(){
 return document.fullscreenElement===arenaFrame||arenaFrame.classList.contains('is-theater');
}
function syncExpandButtons(){
 const expanded=isExpanded();
 for(const button of [rosterExpandBtn,battleExpandBtn]){
  button.textContent=expanded?'⛶ Exit Full Screen':'⛶ Expand';
  button.setAttribute('aria-pressed',String(expanded));
  button.setAttribute('aria-label',expanded?'Exit expanded game screen':'Expand game screen');
 }
}
function leaveTheater(){
 arenaFrame.classList.remove('is-theater');
 document.body.classList.remove('showdown-theater-open');
 syncExpandButtons();
}
async function toggleExpandedGame(){
 if(document.fullscreenElement===arenaFrame){
  try{await document.exitFullscreen()}catch(error){console.warn('Could not exit full screen',error)}
  syncExpandButtons();
  return;
 }
 if(arenaFrame.classList.contains('is-theater')){leaveTheater();return}
 try{
  if(typeof arenaFrame.requestFullscreen!=='function')throw new Error('Fullscreen API unavailable');
  await arenaFrame.requestFullscreen();
 }catch(error){
  // Safari and restricted embedded browsers can deny fullscreen; preserve the same UI.
  arenaFrame.classList.add('is-theater');
  document.body.classList.add('showdown-theater-open');
 }
 syncExpandButtons();
}
rosterExpandBtn.addEventListener('click',toggleExpandedGame);
battleExpandBtn.addEventListener('click',toggleExpandedGame);
document.addEventListener('fullscreenchange',syncExpandButtons);
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&arenaFrame.classList.contains('is-theater'))leaveTheater();
});

function body(profile,x,face){
 return {profile,x,face,y:0,vy:0,hp:100,meter:0,cooldown:0,attack:0,attackType:'',attackHit:false,block:false,crouch:false,stun:0,flash:0,moveSpeed:0,hurtAt:null,koAt:null,jumpAt:null};
}
function updateHud(){
 const p=game.hero,c=game.cpu;
 $('player-name').textContent=game.heroProfile.name;
 $('cpu-name').textContent=game.cpuProfile.name;
 $('player-health').style.width=(p?p.hp:100)+'%';
 $('cpu-health').style.width=(c?c.hp:100)+'%';
 $('fight-timer').textContent=String(Math.ceil(game.timer));
 for(const [which,fighter] of [['player',p],['cpu',c]]){
  const value=Math.round(clamp(fighter?.meter??0,0,100));
  const bar=$(which+'-super'),fill=$(which+'-super-fill'),label=$(which+'-super-label');
  if(fill)fill.style.width=value+'%';
  if(bar){bar.setAttribute('aria-valuenow',String(value));bar.classList.toggle('is-ready',value>=40);}
  if(label)label.textContent=value>=40?'★ READY':value+' / 40';
 }
 $('round-score').textContent='ROUND '+game.round+' · '+game.wins[0]+' — '+game.wins[1];
 $('match-result').textContent='FIRST TO TWO WINS';
}
function resetRound(){
 game.hero=body(game.heroProfile,250,1);game.cpu=body(game.cpuProfile,710,-1);
 game.hitEffects.length=0;
 game.timer=60;game.mode='countdown';game.between=0;game.countdown=3;game.fightBanner=0;
 game.roundMessage='';
 releaseControls();
 game.nextHudUpdate=0;
 battleAudio.stopTheme();
 announceFight('3','countdown');
 battleAudio.cue(3);
 $('showdown-status').textContent='Round '+game.round+' · Starting in 3…';
 updateHud();
}
function beginFight(){
 game.mode='fighting';game.countdown=0;game.fightBanner=.85;
 releaseControls();
 announceFight('FIGHT!','fight');
 battleAudio.cue('fight');
 battleAudio.startTheme();
 $('showdown-status').textContent='FIGHT! Use keyboard controls or the on-screen buttons.';
}
function startMatch(profile,opponent=null,difficulty=1){
 if(stageChoice==='random')refreshStage();
 if(!ctx){$('showdown-status').textContent='Your browser does not support the battle canvas.';return}
 hideCharacterSelect();
 game.heroProfile=profile;game.cpuProfile=opponent||(profile.fighter_id==='samurai-jack'?demoHero:samuraiJack);
 game.cpuDifficulty=clamp(Number(difficulty)||1,.7,1.3);
  spriteAtlas(game.heroProfile);spriteAtlas(game.cpuProfile); // Preload before the fight begins.
 game.round=1;game.wins=[0,0];game.paused=false;
 battleAudio.prepare();
 resetRound();restartBtn.disabled=false;pauseBtn.disabled=false;pauseBtn.textContent='Pause';
 document.querySelector('.arena-frame').scrollIntoView({behavior:'smooth',block:'center'});
}
const storyMode=createStoryMode({
 getFighter:id=>[...selection.fighters.values()].find(f=>f.fighter_id===id&&f.enabled!==false)||null,
 getPlayable:()=>[...selection.fighters.values()].filter(f=>f.enabled!==false&&!isLocked(f)),
 startBattle:(hero,opponent,stage,difficulty)=>{chooseStage(stage);startMatch(hero,opponent,difficulty)},
 onReturn:()=>showCharacterSelect(false)
});
practiceBtn.addEventListener('click',()=>{arcadeState.active=false;storyMode.leave();startMatch(demoHero)});
startBtn.addEventListener('click',()=>{const fighter=currentFighter();if(fighter&&!isLocked(fighter)){arcadeState.active=false;storyMode.leave();startMatch(fighter)}});
restartBtn.addEventListener('click',()=>{if(storyMode.isActive())storyMode.retry();else startMatch(game.heroProfile,arcadeState.active?arcadeState.opponents[arcadeState.index]:null)});
pauseBtn.addEventListener('click',()=>{
 if(!['countdown','fighting','between'].includes(game.mode))return;
 game.paused=!game.paused;pauseBtn.textContent=game.paused?'Resume':'Pause';
 if(game.paused){
  releaseControls();
  battleAudio.pause();
  announceFight('PAUSED','paused');
 }else{
  battleAudio.resume();
  if(game.mode==='countdown')announceFight(String(Math.ceil(game.countdown)),'countdown');
  else if(game.mode==='fighting')announceFight(game.fightBanner>0?'FIGHT!':'',game.fightBanner>0?'fight':'');
  else announceFight(game.roundMessage,'result');
 }
});
// The hit becomes active on the middle attack sprite, not on button-down.
const ATTACK_MOVES=Object.freeze({
 punch:{duration:.30,damage:8,reach:103,push:11,impactStart:.34,impactEnd:.70},
 kick:{duration:.48,damage:13,reach:131,push:16,impactStart:.35,impactEnd:.73},
 special:{duration:.72,damage:23,reach:166,push:27,impactStart:.36,impactEnd:.74}
});
const JACK_ATTACK_MOVES=Object.freeze({
 punch:{duration:.34,damage:9,reach:127,push:12,impactStart:.32,impactEnd:.72},
 kick:{duration:.46,damage:12,reach:132,push:15,impactStart:.35,impactEnd:.72},
 special:{duration:.74,damage:25,reach:187,push:28,impactStart:.34,impactEnd:.75}
});
function moveFor(fighter,type){
 return fighter?.profile?.fighter_id==='samurai-jack'?JACK_ATTACK_MOVES[type]:ATTACK_MOVES[type];
}
function attack(attacker,type){
 if(attacker.cooldown>0||attacker.stun>0||attacker.hp<=0||attacker.attack>0)return;
 const move=moveFor(attacker,type);
 if(!move||(type==='special'&&attacker.meter<40))return;
 if(type==='special')attacker.meter-=40;
 attacker.attack=move.duration;attacker.cooldown=move.duration+.1;
 attacker.attackType=type;attacker.attackHit=false;
 attacker.block=false;attacker.crouch=false;
}
function resolveAttack(attacker,defender){
 if(attacker.attack<=0||attacker.attackHit||attacker.stun>0||attacker.hp<=0)return;
 const move=moveFor(attacker,attacker.attackType);if(!move)return;
 const progress=1-attacker.attack/move.duration;
 if(progress<move.impactStart||progress>move.impactEnd)return;
 // Check for contact throughout the active frames; a whiff does not consume the hitbox.
 const forward=(defender.x-attacker.x)*attacker.face;
 if(forward<0||forward>move.reach||Math.abs(attacker.y-defender.y)>80)return;
 attacker.attackHit=true; // One confirmed hit per punch/kick/special.
 const blocked=defender.block&&defender.y===0&&defender.stun===0;
 const damage=blocked?Math.ceil(move.damage*.2):move.damage;
 defender.hp=clamp(defender.hp-damage,0,100);
 defender.stun=blocked?.08:.25;
 defender.flash=.16;defender.hurtAt=game.animClock;
 // Match each successful strike to its visible attacking hand or foot.
 const foot=attacker.attackType==='kick',special=attacker.attackType==='special';
 game.hitEffects.push({
  x:clamp(attacker.x+attacker.face*Math.min(move.reach*.65,86),LEFT,RIGHT),
  y:GROUND-attacker.y-(foot?80:special?137:142),
  life:.26,maximum:.26,size:foot?27:special?43:21,
  color:blocked?'#9de8ff':special&&attacker.profile.fighter_id==='samurai-jack'?'#b7f8ff':foot?'#ffe289':special?'#ffb2fa':'#d5f8ff'
 });
 defender.x=clamp(defender.x+attacker.face*(blocked?8:move.push),LEFT,RIGHT);
 attacker.meter=clamp(attacker.meter+(blocked?6:13),0,100);
 if(defender.hp<=0){defender.koAt=game.animClock;finishRound();}
}
function finishRound(){
 if(game.mode!=='fighting')return;
 game.mode='between';game.between=2.2;
 battleAudio.stopTheme();
 const winner=game.hero.hp>game.cpu.hp?0:game.cpu.hp>game.hero.hp?1:-1;
 if(winner>=0)game.wins[winner]++;
 const message=winner===0?'PLAYER WINS ROUND!':winner===1?'CPU WINS ROUND!':'DRAW ROUND';
 game.roundMessage=message;
 announceFight(message,'result');
 $('showdown-status').textContent=message;
 if(Math.max(...game.wins)>=2){
  game.mode='finished';game.between=0;
  const result=game.wins[0]>=2?'YOU WIN THE MATCH!':'CPU WINS THE MATCH';
  game.roundMessage=result;
  announceFight(result,'result');
  const storyFinished=arcadeState.active?false:storyMode.onMatchFinished(game.wins[0]>=2);
  if(arcadeState.active)void arcadeMatchFinished(game.wins[0]>=2);
  $('showdown-status').textContent=storyFinished?(game.wins[0]>=2?'Story mission cleared! Select Continue Story to advance.':'Story battle lost. Retry the mission or return to the chapter map.'):
    result+' Choose Restart Match for another round.';
  pauseBtn.disabled=true;
 }
 updateHud();
}
// Finish the winning fighter's current pose while the losing KO frames play.
function settleRoundPoses(dt){
 for(const f of [game.hero,game.cpu]){
  if(!f)continue;
  f.cooldown=Math.max(0,f.cooldown-dt);
  f.attack=Math.max(0,f.attack-dt);
  f.stun=Math.max(0,f.stun-dt);
  f.flash=Math.max(0,f.flash-dt);
  f.block=false;f.moveSpeed=0;
 }
}
function step(dt){
 game.hitEffects=game.hitEffects.filter(effect=>((effect.life-=dt)>0));
 if(game.mode==='countdown'){
  const previous=Math.ceil(game.countdown);
  game.countdown=Math.max(0,game.countdown-dt);
  const current=Math.ceil(game.countdown);
  if(current===0)beginFight();
  else if(current!==previous){
   announceFight(String(current),'countdown');
   battleAudio.cue(current);
   $('showdown-status').textContent='Round '+game.round+' · Starting in '+current+'…';
  }
  oneShots.clear();
  return;
 }
 if(game.mode==='between'){
  settleRoundPoses(dt);
  game.between-=dt;
  if(game.between<=0){oneShots.clear();game.round++;resetRound()}
  return;
 }
 if(game.mode==='finished'){settleRoundPoses(dt);oneShots.clear();return;}
 if(game.mode!=='fighting'||game.paused)return;
 if(game.fightBanner>0){
  game.fightBanner=Math.max(0,game.fightBanner-dt);
  if(game.fightBanner===0)announceFight('');
 }
 game.timer=Math.max(0,game.timer-dt);
 const p=game.hero,c=game.cpu;
 const previousPX=p.x,previousCX=c.x;
 for(const f of [p,c]){
  f.cooldown=Math.max(0,f.cooldown-dt);f.attack=Math.max(0,f.attack-dt);f.stun=Math.max(0,f.stun-dt);f.flash=Math.max(0,f.flash-dt);
  f.vy-=1200*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0&&f.vy<0)f.vy=0;
 }
 p.face=p.x<c.x?1:-1;c.face=-p.face;
 const direction=(down.has('right')?1:0)-(down.has('left')?1:0);
 p.block=down.has('guard')&&p.y===0&&p.cooldown===0&&p.stun===0;
 p.crouch=down.has('down')&&p.y===0&&!p.block&&p.stun===0;
 if(p.stun===0&&p.cooldown===0&&!p.block&&!p.crouch)p.x=clamp(p.x+direction*235*dt,LEFT,RIGHT);
 if(oneShots.has('up')&&p.y===0&&p.stun===0){p.vy=510;p.jumpAt=game.animClock;}
 for(const type of ['punch','kick','special'])if(oneShots.has(type))attack(p,type);
 const dist=Math.abs(c.x-p.x);
 c.block=c.stun===0&&c.cooldown===0&&c.y===0&&p.attack>.06&&dist<155&&Math.random()<dt*4;
 if(c.stun===0&&c.cooldown===0){
  if(dist>103)c.x=clamp(c.x+Math.sign(p.x-c.x)*145*game.cpuDifficulty*dt,LEFT,RIGHT);
  else if(dist<64)c.x=clamp(c.x-Math.sign(p.x-c.x)*72*game.cpuDifficulty*dt,LEFT,RIGHT);
  if(dist<(c.meter>=40?187:132)&&Math.random()<dt*.88*game.cpuDifficulty){
    const type=c.meter>=40&&dist<185&&Math.random()<.18?'special':Math.random()>.7?'kick':'punch';
    attack(c,type);
   }
 }
 if(Math.abs(p.x-c.x)<62){const mid=(p.x+c.x)/2;p.x=clamp(mid-p.face*31,LEFT,RIGHT);c.x=clamp(mid+p.face*31,LEFT,RIGHT)}
 p.face=p.x<=c.x?1:-1;c.face=-p.face;
 p.moveSpeed=dt>0?(p.x-previousPX)/dt:0;
 c.moveSpeed=dt>0?(c.x-previousCX)/dt:0;
 resolveAttack(p,c);
 if(game.mode==='fighting')resolveAttack(c,p);
 if(game.timer===0&&game.mode==='fighting')finishRound();
 // HUD changes at 12–13 Hz; the canvas still animates every display frame.
 if(!game.nextHudUpdate||game.animClock>=game.nextHudUpdate){
  updateHud();game.nextHudUpdate=game.animClock+.08;
 }
 oneShots.clear();
}
function drawBody(f,t){
 const x=f.x,y=GROUND-f.y,accent=validColor(f.profile.accent);
 const atlasEntry=spriteAtlas(f.profile);
 if(atlasEntry){
  const atlas=atlasEntry.image;
  const columns=atlasEntry.columns,rows=atlasEntry.rows;
  const polished=atlasEntry.polished;
  const frameWidth=atlas.naturalWidth/columns,frameHeight=atlas.naturalHeight/rows;
  const pose=spritePose(f,t,columns);
  // Keep the character's feet on the ground, even when he jumps or gets knocked down.
  ctx.save();
  ctx.globalAlpha=.32;ctx.fillStyle='#030713';
  ctx.beginPath();ctx.ellipse(x,GROUND+2,57,9,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(Math.round(x),Math.round(y));
  const isJohnny=f.profile.fighter_id==='johnny-bravo';
  // Keep the original source orientation. The game sets f.face toward the opponent.
  ctx.scale(f.face,1);
  ctx.imageSmoothingEnabled=!isJohnny&&/\.svg(?:$|[?#])/i.test(atlas.currentSrc||atlas.src);
  if(ctx.imageSmoothingEnabled)ctx.imageSmoothingQuality='high';
  // Standing Johnny no longer bobs off the floor between idle frames.
  const bounce=0; // Character soles remain anchored.
  if(atlasEntry.uploaded){
   const size=270,anchorX=32,anchorY=atlasEntry.footAnchors?.[pose.row]?.[pose.frame]??60;
   ctx.drawImage(atlas,pose.frame*frameWidth,pose.row*frameHeight,frameWidth,frameHeight,
    -Math.round(anchorX/frameWidth*size),-Math.round(anchorY/frameHeight*size)+bounce,size,size);
  }else if(polished){
   // Use the visible sole on each frame, not the padded cell boundary.
   const size=390,anchorX=52,anchorY=atlasEntry.footAnchors?.[pose.row]?.[pose.frame]??82;
   ctx.drawImage(atlas,pose.frame*frameWidth,pose.row*frameHeight,frameWidth,frameHeight,
    -Math.round(anchorX/frameWidth*size),-Math.round(anchorY/frameHeight*size)+bounce,size,size);
  }else{
   // Retain the original scale for all old 3-column sprite sheets.
   const spriteHeight=248,spriteWidth=Math.min(236,Math.round(spriteHeight*frameWidth/frameHeight));
   const top=f.profile.fighter_id==='samurai-jack'?-Math.round(spriteHeight*248/frameHeight):-253;
   ctx.drawImage(atlas,pose.frame*frameWidth,pose.row*frameHeight,frameWidth,frameHeight,
    -spriteWidth/2,top+bounce,spriteWidth,spriteHeight);
  }
  const move=moveFor(f,f.attackType);
  const impactProgress=move?1-f.attack/move.duration:0;
  // Effects share the same facing transform as the fighter, so hits stay in front.
  if(f.attack>0&&move&&impactProgress>=move.impactStart&&impactProgress<=move.impactEnd){
   const effect=f.profile.fighter_id==='samurai-jack'?'#b7f1ff':f.attackType==='special'?'#ffe17c':'#f4f9ff';
   ctx.save();
   ctx.strokeStyle=effect;ctx.lineWidth=f.attackType==='special'?11:5;
   ctx.globalAlpha=.73;ctx.shadowColor=effect;ctx.shadowBlur=17;
   ctx.beginPath();ctx.arc(71,-126,f.attackType==='kick'?53:38,-1.25,1.35);ctx.stroke();
   ctx.restore();
  }
  if(f.block){ctx.save();ctx.strokeStyle='#9ce9ff';ctx.lineWidth=4;ctx.globalAlpha=.67;
   ctx.beginPath();ctx.arc(51,-137,60,-1.4,1.4);ctx.stroke();ctx.restore();}
  if(f.flash){ctx.fillStyle='#fff';ctx.globalAlpha=.15;ctx.fillRect(-110,-247,220,240)}
  ctx.restore();
  return;
 }

 // Never present generic geometry as Johnny's character art when his atlas is loading.
 if(['johnny-bravo','samurai-jack'].includes(f.profile.fighter_id)){
  ctx.save();ctx.textAlign='center';ctx.font='bold 15px system-ui';
  ctx.fillStyle='#fbe69e';ctx.fillText('Loading '+f.profile.name+' sprites…',x,GROUND-125);ctx.restore();
  return;
 }
 ctx.save();ctx.translate(x,y);ctx.scale(f.face,1);
 ctx.globalAlpha=.38;ctx.fillStyle='#000';
 ctx.beginPath();ctx.ellipse(0,f.y?f.y:0,52,11,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 const bounce=f.y===0&&f.attack===0?Math.sin(t*3+f.x*.01)*2:0;
 ctx.translate(0,bounce);
 if(f.flash)ctx.shadowColor='#fff',ctx.shadowBlur=23;
 ctx.lineJoin='round';ctx.lineCap='round';
 const skin='#ffdfc7';
 function line(a,b,c,d,width,color){ctx.strokeStyle='#081126';ctx.lineWidth=width+8;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
 line(-17,-72,-27,-6,19,'#2d356b');line(18,-72,30,-6,19,'#2d356b');
 ctx.fillStyle=accent;ctx.strokeStyle='#0a1230';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-35,-157);ctx.lineTo(35,-157);ctx.lineTo(27,-67);ctx.lineTo(-26,-67);ctx.closePath();ctx.fill();ctx.stroke();
 const attacking=f.attack>0,extension=attacking?(f.attackType==='special'?96:63):30;
 line(-26,-148,-43,-96,17,accent);
 line(27,-148,extension,-105+(attacking?-18:0),17,accent);
 ctx.beginPath();ctx.ellipse(0,-185,29,33,0,0,Math.PI*2);ctx.fillStyle=skin;ctx.fill();ctx.strokeStyle='#0a1230';ctx.lineWidth=5;ctx.stroke();
 ctx.fillStyle='#131633';ctx.fillRect(6,-189,5,5);ctx.fillRect(19,-189,5,5);
 ctx.beginPath();ctx.moveTo(-31,-198);ctx.lineTo(-24,-228);ctx.lineTo(9,-216);ctx.lineTo(34,-208);ctx.lineTo(25,-220);ctx.closePath();ctx.fillStyle=accent;ctx.fill();ctx.stroke();
 if(f.block){ctx.strokeStyle='#b8edff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(35,-125,34,-1.5,1.5);ctx.stroke()}
 if(attacking){ctx.strokeStyle=f.attackType==='special'?'#ffe189':'#ffffff';ctx.lineWidth=f.attackType==='special'?13:7;ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(extension-4,-125,45,-1.1,1.2);ctx.stroke()}
 ctx.restore();
}

const STAGE_NAMES={skyline:'Neon Skyline',dojo:'Moonlit Dojo',arcade:'Retro Arcade',desert:'Desert Ruins',space:'Cosmic Arena',random:'Random Stage'};
const STAGE_POOL=['skyline','dojo','arcade','desert','space'];
// Register additional custom stages here after adding their names and selector options.
const CUSTOM_STAGE_IMAGES={
 skyline:'/images/showdown/backgrounds/skyline.svg',
 dojo:'/images/showdown/backgrounds/dojo.svg',
 arcade:'/images/showdown/backgrounds/arcade.svg',
 desert:'/images/showdown/backgrounds/desert.svg',
 space:'/images/showdown/backgrounds/space.svg'
};
const stageArtwork=new Map();
function getStageArtwork(id){
 const src=CUSTOM_STAGE_IMAGES[id];
 if(!src)return null;
 if(!stageArtwork.has(id)){
  const image=new Image();
  const record={image,ready:false,failed:false};
  image.onload=()=>{record.ready=image.naturalWidth>0&&image.naturalHeight>0;};
  image.onerror=()=>{record.failed=true;console.warn('Stage artwork unavailable, using built-in stage:',src);};
  image.decoding='async';image.src=src;
  stageArtwork.set(id,record);
 }
 return stageArtwork.get(id);
}
STAGE_POOL.forEach(getStageArtwork);
let stageChoice='skyline',currentStage='skyline';
try{const v=localStorage.getItem('showdown-stage');if(v in STAGE_NAMES)stageChoice=v;}catch(_){}
function refreshStage(){
 currentStage=stageChoice==='random'?STAGE_POOL[Math.floor(Math.random()*STAGE_POOL.length)]:stageChoice;
 for(const button of document.querySelectorAll('[data-stage]')){const selected=button.dataset.stage===stageChoice;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));}
 $('stage-label').textContent=stageChoice==='random'?'Random: '+STAGE_NAMES[currentStage]:STAGE_NAMES[stageChoice];
 inlineStage.value=stageChoice;
 for(const button of document.querySelectorAll('.stage-choice[data-stage]')){
  const src=CUSTOM_STAGE_IMAGES[button.dataset.stage];
  const thumb=button.querySelector('.stage-thumb');
  if(src&&thumb){thumb.style.backgroundImage='url("'+src+'")';thumb.classList.add('custom-stage-thumb');}
 }
}
function chooseStage(value){
 if(!(value in STAGE_NAMES))return;
 stageChoice=value;
 try{localStorage.setItem('showdown-stage',stageChoice)}catch(_){}
 refreshStage();
}
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>chooseStage(button.dataset.stage)));
inlineStage.addEventListener('change',()=>chooseStage(inlineStage.value));
refreshStage();
function stageBackground(t){
 const artwork=getStageArtwork(currentStage);
 if(artwork?.ready){
  ctx.drawImage(artwork.image,0,0,arena.width,arena.height);
  return;
 }
 const palette={skyline:['#090f39','#774c88','#191b42'],dojo:['#0b243f','#43626c','#252b42'],arcade:['#160e3d','#753483','#24113b'],desert:['#f1b77f','#c97b6d','#854a58'],space:['#03091d','#3b2374','#151535']}[currentStage];
 const grad=ctx.createLinearGradient(0,0,0,540);palette.forEach((color,i)=>grad.addColorStop(i/2,color));ctx.fillStyle=grad;ctx.fillRect(0,0,960,540);
 ctx.save();
 if(currentStage==='skyline'){
  ctx.fillStyle='#e8ceff';ctx.beginPath();ctx.arc(715,120,60,0,Math.PI*2);ctx.fill();
  for(let i=0;i<19;i++){let x=i*55-10,y=225+(i*41%132);ctx.fillStyle=i%2?'#152051':'#202758';ctx.fillRect(x,y,46,GROUND-y);ctx.fillStyle=i%3?'#6adff2':'#f4a2e4';for(let yy=y+15;yy<GROUND-7;yy+=22)ctx.fillRect(x+15,yy,7,8)}
 }else if(currentStage==='dojo'){
  ctx.fillStyle='#ebe8dc';ctx.beginPath();ctx.arc(733,105,60,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#182e45';ctx.beginPath();ctx.moveTo(0,350);for(let i=0;i<=960;i+=120)ctx.lineTo(i,230+(i*13%115));ctx.lineTo(960,GROUND);ctx.lineTo(0,GROUND);ctx.fill();
  for(let x=60;x<940;x+=160){ctx.fillStyle='#703e52';ctx.fillRect(x,255,23,190);ctx.fillRect(x-15,245,53,15)}
  ctx.fillStyle='#703248';ctx.beginPath();ctx.moveTo(0,263);ctx.lineTo(480,155);ctx.lineTo(960,263);ctx.lineTo(960,283);ctx.lineTo(480,180);ctx.lineTo(0,283);ctx.fill();
 }else if(currentStage==='arcade'){
  for(let i=0;i<8;i++){const x=36+i*116;ctx.fillStyle='#171744';ctx.fillRect(x,160,93,285);ctx.strokeStyle=i%2?'#53f8e8':'#f781ed';ctx.lineWidth=4;ctx.strokeRect(x,160,93,285);ctx.fillStyle='#264585';ctx.fillRect(x+11,180,71,95);ctx.fillStyle='#dbcdff';ctx.font='30px sans-serif';ctx.fillText('★',x+31,240)}
 }else if(currentStage==='desert'){
  ctx.fillStyle='#995b61';ctx.beginPath();ctx.moveTo(0,348);for(let i=0;i<=960;i+=130)ctx.lineTo(i,255+(i*7%110));ctx.lineTo(960,GROUND);ctx.lineTo(0,GROUND);ctx.fill();
  ctx.fillStyle='#ffe2a6';ctx.beginPath();ctx.arc(752,111,62,0,Math.PI*2);ctx.fill();
  for(let x of [155,280,670,814]){ctx.fillStyle='#764a58';ctx.fillRect(x,295,25,150);ctx.fillRect(x-18,282,61,15)}
 }else{
  for(let i=0;i<78;i++){ctx.globalAlpha=.35+.45*Math.sin(i+t)**2;ctx.fillStyle='#e7ecff';ctx.fillRect((i*137+21)%960,(i*69+19)%GROUND,2,2)}ctx.globalAlpha=1;
  ctx.fillStyle='#8b71d7';ctx.beginPath();ctx.arc(480,160,77,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b6a7ff';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(480,160,170,46,-.2,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();ctx.fillStyle={skyline:'#161a3c',dojo:'#363343',arcade:'#271845',desert:'#995b66',space:'#14163d'}[currentStage];ctx.fillRect(0,GROUND,960,95);
 ctx.strokeStyle={skyline:'#637bc4',dojo:'#b58190',arcade:'#af63da',desert:'#d99a83',space:'#7c7ed2'}[currentStage];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,GROUND);ctx.lineTo(960,GROUND);ctx.stroke();
 ctx.globalAlpha=.4;ctx.lineWidth=1.5;for(let i=0;i<14;i++){ctx.beginPath();ctx.moveTo(i*78,GROUND);ctx.lineTo(480+(i-7)*155,540);ctx.stroke()}ctx.globalAlpha=1;
}

function drawArena(now){
 if(!ctx)return;
 const w=arena.width,h=arena.height,t=game.animClock;
 stageBackground(t);
 if(!game.hero){drawBody(body(demoHero,255,1),t);drawBody(body(demoCPU,700,-1),t);return}
 const sorted=[game.hero,game.cpu].sort((a,b)=>a.x-b.x);for(const f of sorted)drawBody(f,t);
 // Short-lived comic impact stars show precisely when a hand or foot connects.
 for(const e of game.hitEffects){
  const progress=1-e.life/e.maximum,fade=e.life/e.maximum;
  ctx.save();ctx.translate(e.x,e.y);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;
  ctx.lineWidth=Math.max(1,4*fade);ctx.globalAlpha=fade;
  ctx.shadowColor=e.color;ctx.shadowBlur=17;
  ctx.beginPath();ctx.arc(0,0,e.size*(.35+progress),0,Math.PI*2);ctx.stroke();
  for(let ray=0;ray<8;ray++){
   const angle=ray*Math.PI/4,near=e.size*(.48+progress*.3),far=e.size*(.72+progress);
   ctx.beginPath();
   ctx.moveTo(Math.cos(angle)*near,Math.sin(angle)*near);
   ctx.lineTo(Math.cos(angle)*far,Math.sin(angle)*far);
   ctx.stroke();
  }
  ctx.restore();
 }
 ctx.textAlign='center';ctx.font='900 14px system-ui';ctx.fillStyle='#f3edff';
 ctx.fillText(game.heroProfile.name,game.hero.x,GROUND-game.hero.y-252);
 ctx.fillText(game.cpuProfile.name,game.cpu.x,GROUND-game.cpu.y-252);
}
function tick(stamp){
 const dt=game.last?clamp((stamp-game.last)/1000,0,.05):0;game.last=stamp;
 if(!game.paused){game.animClock+=dt;step(dt);}
 battleAudio.tick();
 drawArena(stamp);
 renderPreviewFrame(stamp);
 requestAnimationFrame(tick);
}
async function showOwnerLink(){
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
  const db=createClient(API_URL,PUBLIC_KEY);
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user)return;
  const result=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!result.error&&result.data)$('owner-fighter-link').hidden=false;
 }catch(_){}
}
addBuiltInFighters();updateSeries();renderRoster();storyMode.syncFighters();selectSlot(1);showCharacterSelect();loadRoster();initializePlayer();showOwnerLink();
requestAnimationFrame(tick);
