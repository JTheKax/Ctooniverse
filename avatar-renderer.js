import {avatarExtraLayers} from './avatar-extra-layers.js?v=cutout-avatar-v4';
// CTooniverse South Park-style cutout avatar renderer.
// Original paper-cutout designs; no official series art or character assets.
// All user appearance values are strictly whitelisted before SVG interpolation.
const COLORS={
 skin:'#ffd19f',hair:'#513020',shirt:'#d72f38',pants:'#414b79',
 hatColor:'#354e87',hatAccent:'#d72f38',background:'#f8f8fb'
};
const OPTIONS={
 hairStyle:['short','swoop','spiky','long','curly','bald','sidepart','messy','bob','pigtails','afro','mohawk','buzz'],
 hat:['none','beanie','pom','earflaps','cap','bucket','visor'],
 outfit:['coat','hoodie','sweater','tee','jacket','overalls','jersey','vest','dress'],
 face:['smile','grin','neutral','surprised','frown','laugh','wink','sleepy'],
 accessory:['none','glasses','freckles','blush','scarf','sunglasses','eyepatch','headphones','mask'],
 eyes:['black','brown','blue','green'],
 brows:['plain','raised','angry','soft'],
 facialHair:['none','mustache','goatee','beard'],
 neckwear:['none','bowtie','tie','necklace'],
 backdrop:['spotlight','snow','stars','plain'],
};
const HEX=/^#[0-9a-f]{6}$/i;
export const AVATAR_OPTIONS=OPTIONS;
export const DEFAULT_AVATAR=Object.freeze({
 theme:'paper-cutout',version:4,hairStyle:'swoop',hat:'pom',
 outfit:'coat',face:'smile',accessory:'none',eyes:'black',brows:'plain',facialHair:'none',neckwear:'none',backdrop:'plain',
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
export function avatarSvg(value={}) {
 const a=normalizeAvatar(value);
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
 const pants=`<path d="M109 324 L209 324 L213 374 Q190 381 163 372 L159 345 L156 372 Q125 382 107 374Z" fill="${a.pants}" ${edge}/><path d="M159 345V376" fill="none" stroke="${ink}" stroke-width="4"/>`;
 const shoes=`<ellipse cx="120" cy="383" rx="44" ry="13" fill="${ink}"/><ellipse cx="199" cy="383" rx="44" ry="13" fill="${ink}"/>`;
 const base=`<path d="M110 256 Q159 244 211 256 Q225 298 230 346 Q163 360 91 346 Q97 296 110 256Z" fill="${a.shirt}" ${edge}/>`;
 let clothing='';
 if(a.outfit==='coat') clothing=`
 <path d="M113 267 Q130 245 160 260 Q185 245 208 267L215 284Q177 278 160 291Q139 280 105 283Z" fill="${a.shirt}" ${edge}/>
 <path d="M160 283V350M99 315Q160 324 221 315" fill="none" stroke="${ink}" stroke-width="3.8"/>
 <path d="M142 286L157 299M177 286L163 299" fill="none" stroke="${ink}" stroke-width="3"/>
 <path d="M113 326l-12 25 10 4 15-26M195 329l14 25 10-5-12-23" fill="none" stroke="${ink}" stroke-width="3.7"/>
 <rect x="155" y="294" width="10" height="20" rx="2" fill="#bbbcc6" stroke="${ink}" stroke-width="2"/>`;
 else if(a.outfit==='hoodie') clothing=`
 <path d="M112 263Q160 297 208 263Q204 250 187 255L160 271L133 254Q119 251 112 263Z" fill="${a.shirt}" ${edge}/>
 <path d="M145 270l-4 26M176 270l4 26" stroke="#eeeeed" stroke-width="3" fill="none"/>
 <path d="M124 322Q161 314 197 322L190 343H130Z" fill="none" stroke="${ink}" stroke-width="3.8"/>`;
 else if(a.outfit==='sweater') clothing=`
 <path d="M118 264Q160 281 201 264" fill="none" stroke="${a.hatAccent}" stroke-width="10"/>
 <path d="M94 332Q160 344 225 332" fill="none" stroke="${a.hatAccent}" stroke-width="7"/>`;
 else clothing=`<path d="M128 261Q160 283 192 261" fill="none" stroke="${a.hatAccent}" stroke-width="5"/>`;
 const sleeves=`<path d="M111 267Q91 259 78 277Q62 294 56 326L86 337Q105 314 117 289Z" fill="${a.shirt}" ${edge}/>
 <path d="M209 267Q229 259 242 277Q257 294 263 326L233 337Q215 314 202 289Z" fill="${a.shirt}" ${edge}/>
 ${a.outfit==='coat'?`<path d="M61 319l28 9M231 328l27-9" fill="none" stroke="${ink}" stroke-width="3"/>`:''}
 <path d="M79 331Q64 319 49 327Q30 341 40 360Q50 379 70 367Q85 358 79 347Q68 356 61 345" fill="${a.skin}" ${edge}/>
 <path d="M241 331Q256 319 271 327Q290 341 280 360Q270 379 250 367Q235 358 241 347Q252 356 259 345" fill="${a.skin}" ${edge}/>`;
 const backHair=['bald','mohawk','buzz','bob','afro','pigtails','sidepart','messy'].includes(a.hairStyle)?'':`
 <path d="M72 161Q50 106 77 90Q90 68 131 72Q212 62 243 108Q261 142 251 192L276 213L248 209L249 229L224 215Q194 240 158 231Q120 241 90 213L72 226L66 201L44 211L61 179Z" fill="${a.hair}" ${hairEdge}/>`;
 const head=`<ellipse cx="160" cy="182" rx="100" ry="99" fill="${a.skin}" ${edge}/>`;
 let fringe='';
 if(a.hairStyle==='swoop') fringe=`<path d="M62 171Q61 112 101 106L116 126L148 107L166 126L187 102L213 122L236 112Q257 134 258 165L244 155L231 174L220 152L200 166L179 145L152 160L128 145L107 166L92 148L75 174Z" fill="${a.hair}" ${hairEdge}/>`;
 if(a.hairStyle==='short') fringe=`<path d="M62 159Q60 111 115 104Q183 92 235 114Q258 129 258 158L237 147L222 160Q193 147 161 155Q119 145 95 159L80 145Z" fill="${a.hair}" ${hairEdge}/>`;
 if(a.hairStyle==='spiky') fringe=`<path d="M63 164L52 95L90 111L101 73L129 105L158 68L178 105L217 80L224 117L262 104L256 167Q221 146 200 158L176 142L146 161L116 145L89 164L76 146Z" fill="${a.hair}" ${hairEdge}/>`;
 if(a.hairStyle==='long') fringe=`<path d="M59 174Q55 112 96 104Q164 83 234 112Q261 148 260 187L245 211L223 167L215 138Q166 160 130 139Q111 172 88 180L73 222L57 213Z" fill="${a.hair}" ${hairEdge}/>`;
 if(a.hairStyle==='curly') fringe=`<g fill="${a.hair}" ${hairEdge}><circle cx="86" cy="127" r="22"/><circle cx="109" cy="112" r="23"/><circle cx="135" cy="106" r="22"/><circle cx="164" cy="109" r="22"/><circle cx="188" cy="108" r="23"/><circle cx="213" cy="118" r="22"/><circle cx="235" cy="136" r="23"/></g>`;
 const eyeColor={black:'#19191e',brown:'#5f3b29',blue:'#2867b5',green:'#2c8052'}[a.eyes];
 const eyes=`<ellipse cx="133" cy="187" rx="36" ry="40" fill="white" stroke="#bab7ba" stroke-width="1.2"/>
 <ellipse cx="188" cy="187" rx="36" ry="40" fill="white" stroke="#bab7ba" stroke-width="1.2"/>
 <circle cx="152" cy="189" r="5" fill="${eyeColor}"/><circle cx="172" cy="189" r="5" fill="${eyeColor}"/>`;
 const layers=avatarExtraLayers(a);
 const mouth=a.face==='neutral'?'<path d="M147 257h27" stroke="#1b161b" stroke-width="3" fill="none" stroke-linecap="round"/>'
  :a.face==='surprised'?'<ellipse cx="160" cy="253" rx="8" ry="11" fill="#3b1c24"/>'
  :a.face==='grin'?'<path d="M140 247Q160 274 182 247Q160 261 140 247Z" fill="white" stroke="#1b161b" stroke-width="2.7"/>'
  :['frown','laugh','wink','sleepy'].includes(a.face)?'':'<path d="M142 251Q160 265 179 251" stroke="#1b161b" stroke-width="3" fill="none" stroke-linecap="round"/>';
 let hat='';
 if(a.hat==='pom') hat=`
 <path d="M59 135Q54 57 100 43Q164 12 226 48Q267 67 262 135Z" fill="${a.hatColor}" ${edge}/>
 <path d="M48 137Q159 92 272 137L270 164Q160 128 50 165Z" fill="${a.hatAccent}" ${edge}/>
 <path d="M68 135v22M101 120v31M133 109v37M165 106v36M198 110v36M231 122v29M257 136v22" fill="none" stroke="${ink}" stroke-width="2.5"/>
 <path d="M139 34Q130 22 144 15Q149 -2 167 12Q182 -2 191 14Q214 13 213 30Q228 41 212 51Q215 66 194 65Q178 79 166 65Q150 74 137 62Q121 59 122 43Q113 33 139 34Z" fill="${a.hatAccent}" ${edge}/>`;
 if(a.hat==='beanie') hat=`
 <path d="M60 136Q59 57 115 40Q170 22 217 44Q264 64 260 135Z" fill="${a.hatColor}" ${edge}/>
 <path d="M51 138Q160 103 269 138L268 164Q160 131 52 165Z" fill="${a.hatAccent}" ${edge}/>
 <path d="M94 123V158M129 114v36M164 109v38M199 114v36M235 123v34" stroke="${ink}" stroke-width="2.5" fill="none"/>`;
 if(a.hat==='earflaps') hat=`
 <path d="M61 143Q58 65 113 43Q166 21 218 47Q263 65 260 144L264 199L238 205L227 159H94L82 205L56 201Z" fill="${a.hatColor}" ${edge}/>
 <path d="M57 139Q160 106 262 139" stroke="${a.hatAccent}" stroke-width="14" fill="none"/>`;
 if(a.hat==='cap') hat=`
 <path d="M57 142Q60 74 119 55Q171 39 218 62Q255 82 258 143Z" fill="${a.hatColor}" ${edge}/>
 <path d="M128 139Q224 120 287 143Q260 169 148 161Z" fill="${a.hatAccent}" ${edge}/>`;
 const extras=a.accessory==='glasses'?`
 <rect x="100" y="158" width="58" height="52" rx="15" fill="none" stroke="${ink}" stroke-width="4"/>
 <rect x="165" y="158" width="58" height="52" rx="15" fill="none" stroke="${ink}" stroke-width="4"/>
 <path d="M158 171h7" stroke="${ink}" stroke-width="5"/>`
 :a.accessory==='freckles'?'<g fill="#a26450"><circle cx="94" cy="225" r="3"/><circle cx="104" cy="229" r="3"/><circle cx="114" cy="227" r="3"/><circle cx="206" cy="227" r="3"/><circle cx="216" cy="229" r="3"/><circle cx="226" cy="225" r="3"/></g>'
 :a.accessory==='blush'?'<ellipse cx="100" cy="225" rx="18" ry="8" fill="#ed959a" opacity=".65"/><ellipse cx="219" cy="225" rx="18" ry="8" fill="#ed959a" opacity=".65"/>'
 :a.accessory==='scarf'?`<path d="M104 271Q160 293 215 271L219 291Q159 313 102 291Z" fill="${a.hatAccent}" ${edge}/><path d="M193 298l16 37 18-7-14-37Z" fill="${a.hatAccent}" ${edge}/>`
 :'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400" role="img" aria-label="Custom flat paper-cutout cartoon avatar">
 <rect width="320" height="400" rx="10" fill="${backdrop}"/>
 ${backdropDecor}${decoration}
 <ellipse cx="160" cy="388" rx="94" ry="8" fill="#23202d" opacity=".15"/>
 ${pants}${shoes}${base}${clothing}${layers.clothes}${sleeves}
 ${backHair}${layers.backHair}<path d="M143 245H178V278H143Z" fill="${a.skin}"/>
 ${head}${fringe}${layers.fringe}${eyes}${mouth}${layers.faceFeatures}${hat}${layers.hat}${extras}${layers.accessories}</svg>`;
}
export function avatarDataUrl(value){
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(avatarSvg(value));
}
