import {avatarExtraLayers} from './avatar-extra-layers.js?v=cutout-avatar-v5';
// CTooniverse South Park-style cutout avatar renderer.
// Original paper-cutout designs; no official series art or character assets.
// All user appearance values are strictly whitelisted before SVG interpolation.
const COLORS={
 skin:'#ffd19f',hair:'#513020',shirt:'#d72f38',pants:'#414b79',
 hatColor:'#354e87',hatAccent:'#d72f38',background:'#f8f8fb',
 mittens:'#f2c837',shoes:'#24202e'
};
const OPTIONS={
 hairStyle:['short','swoop','spiky','long','curly','bald','sidepart','messy','bob','pigtails','afro','mohawk','buzz'],
 hat:['none','beanie','pom','earflaps','cap','bucket','visor'],
 outfit:['coat','hoodie','sweater','tee','jacket','overalls','jersey','vest','dress'],
 face:['smile','grin','neutral','surprised','frown','laugh','wink','sleepy','smirk'],
 headShape:['round','wide','square'],
 eyeStyle:['classic','wide','small','side'],
 nose:['none','dot','button'],
 build:['classic','slim','broad'],
 pose:['relaxed','wave','hips'],
 hands:['mittens','bare'],
 accessory:['none','glasses','freckles','blush','scarf','sunglasses','eyepatch','headphones','mask'],
 eyes:['black','brown','blue','green'],
 brows:['plain','raised','angry','soft'],
 facialHair:['none','mustache','goatee','beard'],
 neckwear:['none','bowtie','tie','necklace'],
 backdrop:['spotlight','snow','stars','plain','transparent'],
 depth:['flat','soft','bold'],
};
const HEX=/^#[0-9a-f]{6}$/i;
export const AVATAR_OPTIONS=OPTIONS;
export const DEFAULT_AVATAR=Object.freeze({
 theme:'paper-cutout',version:6,hairStyle:'swoop',hat:'pom',depth:'soft',
 outfit:'coat',face:'smile',accessory:'none',eyes:'black',brows:'plain',facialHair:'none',neckwear:'none',backdrop:'plain',
 headShape:'round',eyeStyle:'classic',nose:'none',build:'classic',pose:'relaxed',hands:'mittens',
 ...COLORS
});
export function normalizeAvatar(source={}){
 const input=source&&typeof source==='object'&&!Array.isArray(source)?source:{};
 const a={...DEFAULT_AVATAR};
 for(const key of Object.keys(COLORS)){
  if(typeof input[key]==='string'&&HEX.test(input[key]))a[key]=input[key].toLowerCase();
 }
 // Migrate old custom-avatar data's "style" hair setting.
 const legacyStyle=typeof input.style==='string'?input.style:null;
 a.hairStyle=OPTIONS.hairStyle.includes(input.hairStyle)?input.hairStyle:
  OPTIONS.hairStyle.includes(legacyStyle)?legacyStyle:DEFAULT_AVATAR.hairStyle;
 for(const [key,values] of Object.entries(OPTIONS)){
  if(key==='hairStyle')continue;
  if(typeof input[key]==='string'&&values.includes(input[key]))a[key]=input[key];
 }
 // Support existing shirt/hat/aura fields from the previous avatar experiment.
 if(typeof input.aura==='string'&&input.aura==='stars'&&!input.backdrop)a.backdrop='stars';
 return a;
}
// Directional highlights give the classic cutout silhouette a rounded 2.5D finish.
// Colors are normalized before interpolation: neither user markup nor external URLs enter the SVG.
function mixHex(hex,target,amount){
 const c=parseInt(hex.slice(1),16),t=target==='white'?255:0;
 const r=Math.round(((c>>16)&255)*(1-amount)+t*amount);
 const g=Math.round(((c>>8)&255)*(1-amount)+t*amount);
 const b=Math.round((c&255)*(1-amount)+t*amount);
 return '#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function avatarSvg(value={}) {
 const a=normalizeAvatar(value);
 const power=a.depth==='flat'?0:a.depth==='bold'?1:0.55;
 const graded=['skin','hair','shirt','pants','hatColor','hatAccent','mittens','shoes','background'];
 const gradients=graded.map(key=>{
  const color=a[key];
  return `<radialGradient id="av-${key}" cx="29%" cy="23%" r="90%" fx="23%" fy="18%">
    <stop offset="0%" stop-color="${mixHex(color,'white',0.34*power)}"/>
    <stop offset="43%" stop-color="${mixHex(color,'white',0.11*power)}"/>
    <stop offset="78%" stop-color="${mixHex(color,'black',0.1*power)}"/>
    <stop offset="100%" stop-color="${mixHex(color,'black',0.38*power)}"/>
   </radialGradient>`;
 }).join('');
 const eyeGradient=`<radialGradient id="av-eye" cx="28%" cy="22%" r="92%"><stop offset="0" stop-color="#fff"/><stop offset="67%" stop-color="#fff"/><stop offset="100%" stop-color="${power?'#d4d5db':'#ffffff'}"/></radialGradient>`;
 const castShadow=power?`<filter id="av-depth-shadow" x="-35%" y="-35%" width="170%" height="175%">
   <feDropShadow dx="${1.2+power}" dy="${1.5+power*2}" stdDeviation="${1.2+power*2}" flood-color="#1c1731" flood-opacity="${(0.2+power*0.23).toFixed(2)}"/>
 </filter>`:'';
 const definitions=`<defs>${gradients}${eyeGradient}${castShadow}</defs>`;
 const ink='#19171d', edge=`stroke="${ink}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"`;
 const hairEdge=`stroke="${ink}" stroke-width="4" stroke-linejoin="round"`;
 const decoration=a.backdrop==='snow'
  ? '<g fill="#fff" opacity=".9"><circle cx="38" cy="45" r="6"/><circle cx="282" cy="85" r="8"/><circle cx="49" cy="215" r="4"/><circle cx="271" cy="252" r="5"/></g>'
  :a.backdrop==='stars'
  ? '<g fill="#ffe08b"><path d="M35 62l5 11 12 1-9 8 2 12-10-6-11 6 2-12-9-8 12-1z"/><path d="M281 115l4 10 10 1-8 7 2 10-8-5-9 5 2-10-8-7 10-1z"/></g>'
  :'';
 const backdrop=a.background;
 const backdropDecor=a.backdrop==='spotlight'
  ?'<ellipse cx="160" cy="175" rx="134" ry="161" fill="#ffffff" opacity=".13"/>':'';
 const pants=`<path d="M109 324 L209 324 L213 374 Q190 381 163 372 L159 345 L156 372 Q125 382 107 374Z" fill="url(#av-pants)" ${edge}/><path d="M159 345V376" fill="none" stroke="${ink}" stroke-width="4"/>`;
 const shoes=`<ellipse cx="120" cy="383" rx="44" ry="13" fill="url(#av-shoes)" stroke="${ink}" stroke-width="3"/><ellipse cx="199" cy="383" rx="44" ry="13" fill="url(#av-shoes)" stroke="${ink}" stroke-width="3"/>`;
 const base=`<path d="M110 256 Q159 244 211 256 Q225 298 230 346 Q163 360 91 346 Q97 296 110 256Z" fill="url(#av-shirt)" ${edge}/>`;
 let clothing='';
 if(a.outfit==='coat') clothing=`
 <path d="M113 267 Q130 245 160 260 Q185 245 208 267L215 284Q177 278 160 291Q139 280 105 283Z" fill="url(#av-shirt)" ${edge}/>
 <path d="M160 283V350M99 315Q160 324 221 315" fill="none" stroke="${ink}" stroke-width="3.8"/>
 <path d="M142 286L157 299M177 286L163 299" fill="none" stroke="${ink}" stroke-width="3"/>
 <path d="M113 326l-12 25 10 4 15-26M195 329l14 25 10-5-12-23" fill="none" stroke="${ink}" stroke-width="3.7"/>
 <rect x="155" y="294" width="10" height="20" rx="2" fill="#bbbcc6" stroke="${ink}" stroke-width="2"/>`;
 else if(a.outfit==='hoodie') clothing=`
 <path d="M112 263Q160 297 208 263Q204 250 187 255L160 271L133 254Q119 251 112 263Z" fill="url(#av-shirt)" ${edge}/>
 <path d="M145 270l-4 26M176 270l4 26" stroke="#eeeeed" stroke-width="3" fill="none"/>
 <path d="M124 322Q161 314 197 322L190 343H130Z" fill="none" stroke="${ink}" stroke-width="3.8"/>`;
 else if(a.outfit==='sweater') clothing=`
 <path d="M118 264Q160 281 201 264" fill="none" stroke="${a.hatAccent}" stroke-width="10"/>
 <path d="M94 332Q160 344 225 332" fill="none" stroke="${a.hatAccent}" stroke-width="7"/>`;
 else clothing=`<path d="M128 261Q160 283 192 261" fill="none" stroke="${a.hatAccent}" stroke-width="5"/>`;
 const glove=a.hands==='mittens'?'url(#av-mittens)':'url(#av-skin)';
 const cuff=a.hands==='mittens'?a.hatAccent:a.shirt;
 const sleeveLeft=`<path d="M111 267Q91 259 78 277Q62 294 56 326L86 337Q105 314 117 289Z" fill="url(#av-shirt)" ${edge}/>`;
 const sleeveRight=`<path d="M209 267Q229 259 242 277Q257 294 263 326L233 337Q215 314 202 289Z" fill="url(#av-shirt)" ${edge}/>`;
 const sleeves=a.pose==='wave'
  ?`${sleeveLeft}<path d="M80 325L57 337" fill="none" stroke="${cuff}" stroke-width="9"/>
    <path d="M209 268Q237 257 246 237L263 187L291 202Q290 255 265 285Q237 305 206 289Z" fill="url(#av-shirt)" ${edge}/>
    <path d="M262 198L287 210" stroke="${cuff}" stroke-width="9"/>
    <ellipse cx="59" cy="349" rx="24" ry="19" fill="${glove}" ${edge}/>
    <path d="M263 186Q245 167 257 152Q263 145 272 153Q279 138 289 147Q307 157 303 178Q305 201 282 205Z" fill="${glove}" ${edge}/>`
  :a.pose==='hips'
  ?`<path d="M109 268Q84 261 79 286L87 324L117 338L128 311L105 301L119 292Z" fill="url(#av-shirt)" ${edge}/>
    <path d="M210 268Q235 261 240 286L231 324L201 338L190 311L213 301L199 292Z" fill="url(#av-shirt)" ${edge}/>
    <path d="M91 321L113 331M206 331L227 321" stroke="${cuff}" stroke-width="8"/>
    <ellipse cx="112" cy="328" rx="19" ry="17" fill="${glove}" ${edge}/>
    <ellipse cx="208" cy="328" rx="19" ry="17" fill="${glove}" ${edge}/>`
  :`${sleeveLeft}${sleeveRight}
    <path d="M79 333L58 325M241 333L263 325" stroke="${cuff}" stroke-width="9"/>
    <ellipse cx="59" cy="350" rx="25" ry="20" fill="${glove}" ${edge}/>
    <ellipse cx="261" cy="350" rx="25" ry="20" fill="${glove}" ${edge}/>`;
 const backHair=['bald','mohawk','buzz','bob','afro','pigtails','sidepart','messy'].includes(a.hairStyle)?'':`
 <path d="M72 161Q50 106 77 90Q90 68 131 72Q212 62 243 108Q261 142 251 192L276 213L248 209L249 229L224 215Q194 240 158 231Q120 241 90 213L72 226L66 201L44 211L61 179Z" fill="url(#av-hair)" ${hairEdge}/>`;
 const head=a.headShape==='wide'
  ?`<ellipse cx="160" cy="184" rx="108" ry="94" fill="url(#av-skin)" ${edge}/>`
  :a.headShape==='square'
  ?`<path d="M80 113Q160 70 240 113Q264 153 249 232Q236 274 160 279Q84 274 71 232Q56 154 80 113Z" fill="url(#av-skin)" ${edge}/>`
  :`<ellipse cx="160" cy="182" rx="100" ry="99" fill="url(#av-skin)" ${edge}/>`;
 let fringe='';
 if(a.hairStyle==='swoop') fringe=`<path d="M62 171Q61 112 101 106L116 126L148 107L166 126L187 102L213 122L236 112Q257 134 258 165L244 155L231 174L220 152L200 166L179 145L152 160L128 145L107 166L92 148L75 174Z" fill="url(#av-hair)" ${hairEdge}/>`;
 if(a.hairStyle==='short') fringe=`<path d="M62 159Q60 111 115 104Q183 92 235 114Q258 129 258 158L237 147L222 160Q193 147 161 155Q119 145 95 159L80 145Z" fill="url(#av-hair)" ${hairEdge}/>`;
 if(a.hairStyle==='spiky') fringe=`<path d="M63 164L52 95L90 111L101 73L129 105L158 68L178 105L217 80L224 117L262 104L256 167Q221 146 200 158L176 142L146 161L116 145L89 164L76 146Z" fill="url(#av-hair)" ${hairEdge}/>`;
 if(a.hairStyle==='long') fringe=`<path d="M59 174Q55 112 96 104Q164 83 234 112Q261 148 260 187L245 211L223 167L215 138Q166 160 130 139Q111 172 88 180L73 222L57 213Z" fill="url(#av-hair)" ${hairEdge}/>`;
 if(a.hairStyle==='curly') fringe=`<g fill="url(#av-hair)" ${hairEdge}><circle cx="86" cy="127" r="22"/><circle cx="109" cy="112" r="23"/><circle cx="135" cy="106" r="22"/><circle cx="164" cy="109" r="22"/><circle cx="188" cy="108" r="23"/><circle cx="213" cy="118" r="22"/><circle cx="235" cy="136" r="23"/></g>`;
 const eyeColor={black:'#19191e',brown:'#5f3b29',blue:'#2867b5',green:'#2c8052'}[a.eyes];
 const eyeRadius=a.eyeStyle==='wide'?[40,45]:a.eyeStyle==='small'?[30,34]:[36,40];
 const eyePupils=a.eyeStyle==='side'?[117,171]:a.eyeStyle==='small'?[147,176]:[149,174];
 const eyes=`<ellipse cx="133" cy="187" rx="${eyeRadius[0]}" ry="${eyeRadius[1]}" fill="url(#av-eye)" stroke="#bab7ba" stroke-width="1.2"/>
 <ellipse cx="188" cy="187" rx="${eyeRadius[0]}" ry="${eyeRadius[1]}" fill="url(#av-eye)" stroke="#bab7ba" stroke-width="1.2"/>
 <circle cx="${eyePupils[0]}" cy="189" r="5.5" fill="${eyeColor}"/>
 <circle cx="${eyePupils[1]}" cy="189" r="5.5" fill="${eyeColor}"/>
 ${power?`<circle cx="${eyePupils[0]-1.7}" cy="186.7" r="2" fill="#fff" opacity=".9"/><circle cx="${eyePupils[1]-1.7}" cy="186.7" r="2" fill="#fff" opacity=".9"/>`:''}`;
 const nose=a.nose==='dot'?'<circle cx="160" cy="229" r="2.6" fill="#5f4033" opacity=".75"/>':
  a.nose==='button'?`<path d="M153 223Q160 238 168 226" fill="none" stroke="#995e48" stroke-width="3" stroke-linecap="round"/>`:'';
 const layers=avatarExtraLayers(a);
 const mouth=a.face==='smirk'?'<path d="M142 255Q161 263 178 245" fill="none" stroke="#1b161b" stroke-width="3.2" stroke-linecap="round"/>'
  :a.face==='neutral'?'<path d="M147 257h27" stroke="#1b161b" stroke-width="3" fill="none" stroke-linecap="round"/>'
  :a.face==='surprised'?'<ellipse cx="160" cy="253" rx="8" ry="11" fill="#3b1c24"/>'
  :a.face==='grin'?'<path d="M140 247Q160 274 182 247Q160 261 140 247Z" fill="white" stroke="#1b161b" stroke-width="2.7"/>'
  :['frown','laugh','wink','sleepy'].includes(a.face)?'':'<path d="M142 251Q160 265 179 251" stroke="#1b161b" stroke-width="3" fill="none" stroke-linecap="round"/>';
 let hat='';
 if(a.hat==='pom') hat=`
 <path d="M59 135Q54 57 100 43Q164 12 226 48Q267 67 262 135Z" fill="url(#av-hatColor)" ${edge}/>
 <path d="M48 137Q159 92 272 137L270 164Q160 128 50 165Z" fill="url(#av-hatAccent)" ${edge}/>
 <path d="M68 135v22M101 120v31M133 109v37M165 106v36M198 110v36M231 122v29M257 136v22" fill="none" stroke="${ink}" stroke-width="2.5"/>
 <path d="M139 34Q130 22 144 15Q149 7 167 12Q182 7 191 14Q214 13 213 30Q228 41 212 51Q215 66 194 65Q178 79 166 65Q150 74 137 62Q121 59 122 43Q113 33 139 34Z" fill="url(#av-hatAccent)" ${edge}/>`;
 if(a.hat==='beanie') hat=`
 <path d="M60 136Q59 57 115 40Q170 22 217 44Q264 64 260 135Z" fill="url(#av-hatColor)" ${edge}/>
 <path d="M51 138Q160 103 269 138L268 164Q160 131 52 165Z" fill="url(#av-hatAccent)" ${edge}/>
 <path d="M94 123V158M129 114v36M164 109v38M199 114v36M235 123v34" stroke="${ink}" stroke-width="2.5" fill="none"/>`;
 if(a.hat==='earflaps') hat=`
 <path d="M61 143Q58 65 113 43Q166 21 218 47Q263 65 260 144L264 199L238 205L227 159H94L82 205L56 201Z" fill="url(#av-hatColor)" ${edge}/>
 <path d="M57 139Q160 106 262 139" stroke="${a.hatAccent}" stroke-width="14" fill="none"/>`;
 if(a.hat==='cap') hat=`
 <path d="M57 142Q60 74 119 55Q171 39 218 62Q255 82 258 143Z" fill="url(#av-hatColor)" ${edge}/>
 <path d="M128 139Q224 120 287 143Q260 169 148 161Z" fill="url(#av-hatAccent)" ${edge}/>`;
 const extras=a.accessory==='glasses'?`
 <rect x="100" y="158" width="58" height="52" rx="15" fill="none" stroke="${ink}" stroke-width="4"/>
 <rect x="165" y="158" width="58" height="52" rx="15" fill="none" stroke="${ink}" stroke-width="4"/>
 <path d="M158 171h7" stroke="${ink}" stroke-width="5"/>`
 :a.accessory==='freckles'?'<g fill="#a26450"><circle cx="94" cy="225" r="3"/><circle cx="104" cy="229" r="3"/><circle cx="114" cy="227" r="3"/><circle cx="206" cy="227" r="3"/><circle cx="216" cy="229" r="3"/><circle cx="226" cy="225" r="3"/></g>'
 :a.accessory==='blush'?'<ellipse cx="100" cy="225" rx="18" ry="8" fill="#ed959a" opacity=".65"/><ellipse cx="219" cy="225" rx="18" ry="8" fill="#ed959a" opacity=".65"/>'
 :a.accessory==='scarf'?`<path d="M104 271Q160 293 215 271L219 291Q159 313 102 291Z" fill="url(#av-hatAccent)" ${edge}/><path d="M193 298l16 37 18-7-14-37Z" fill="url(#av-hatAccent)" ${edge}/>`
 :'';
 const faceHighlights=power?`<path d="M87 175Q91 135 129 118Q112 132 103 158Z" fill="#fff" opacity="${(0.13*power).toFixed(2)}"/><path d="M201 255Q234 242 245 216Q238 257 210 267Z" fill="#38251d" opacity="${(0.14*power).toFixed(2)}"/>`:'';
 const bodyScale=a.build==='slim'?'.88':a.build==='broad'?'1.10':'1';
 const backgroundRect=a.backdrop==='transparent'?'':`<rect width="320" height="400" rx="10" fill="url(#av-background)"/>`;
 const shadow=a.backdrop==='transparent'?'':'<ellipse cx="160" cy="388" rx="94" ry="8" fill="#23202d" opacity=".15"/>';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400" role="img" aria-label="Dimensional cartoon-cutout player avatar">
 ${definitions}${backgroundRect}${backdropDecor}${decoration}
 ${shadow}
 <g${power?' filter="url(#av-depth-shadow)"':''}>
 <g transform="translate(160 0) scale(${bodyScale} 1) translate(-160 0)">
 ${pants}${shoes}${base}${clothing}${layers.clothes}${sleeves}${layers.neckwear}</g>
 ${backHair}${layers.backHair}<path d="M143 245H178V278H143Z" fill="url(#av-skin)"/>
 ${head}${faceHighlights}${fringe}${layers.fringe}${eyes}${nose}${mouth}${layers.faceFeatures}${hat}${layers.hat}${extras}${layers.accessories}
 </g></svg>`;
}
export function avatarDataUrl(value){
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(avatarSvg(value));
}
