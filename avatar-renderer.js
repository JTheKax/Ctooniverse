// CTooniverse South Park-style cutout avatar renderer.
// Original paper-cutout designs; no official series art or character assets.
// All user appearance values are strictly whitelisted before SVG interpolation.
const COLORS={
 skin:'#f2be97',hair:'#302442',shirt:'#624be3',pants:'#293862',
 hat:'#df3957',hatAccent:'#ffc950',background:'#34286d'
};
const OPTIONS={
 hairStyle:['short','swoop','spiky','long','curly','bald'],
 hat:['none','beanie','pom','earflaps','cap'],
 outfit:['coat','hoodie','sweater','tee'],
 face:['smile','grin','neutral','surprised'],
 accessory:['none','glasses','freckles','blush','scarf'],
 eyes:['black','brown','blue','green'],
 backdrop:['spotlight','snow','stars','plain'],
};
const HEX=/^#[0-9a-f]{6}$/i;
export const AVATAR_OPTIONS=OPTIONS;
export const DEFAULT_AVATAR=Object.freeze({
 theme:'paper-cutout',version:2,hairStyle:'swoop',hat:'beanie',
 outfit:'coat',face:'smile',accessory:'none',eyes:'black',backdrop:'spotlight',
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
export function avatarSvg(value={}){
 const a=normalizeAvatar(value);
 const stroke='#201c2c';
 let decor='';
 if(a.backdrop==='stars')decor=`<g fill="#f8df6e"><path d="M35 52l6 12 13 2-10 9 2 13-11-6-12 6 3-13-10-9 13-2z"/><path d="M267 86l4 10 10 3-8 6 2 11-8-5-9 5 2-11-8-6 10-3z"/><circle cx="275" cy="200" r="5"/><circle cx="51" cy="234" r="4"/></g>`;
 if(a.backdrop==='snow')decor='<g fill="#fff" opacity=".65"><circle cx="38" cy="52" r="7"/><circle cx="278" cy="86" r="10"/><circle cx="49" cy="179" r="5"/><circle cx="269" cy="250" r="6"/></g>';
 const hairBase=a.hairStyle==='long'? `<path d="M83 111 Q73 39 159 34 Q234 43 228 123 L229 220 L88 220Z" fill="${a.hair}" stroke="${stroke}" stroke-width="6"/>`:'';
 const legs=`<path d="M116 276L116 351Q133 364 159 350L159 286ZM161 286L161 350Q190 365 209 350L204 276Z" fill="${a.pants}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>`;
 const shoes=`<path d="M113 345 Q102 354 101 366 Q103 381 140 379 L163 375L162 350Q142 351 113 345Z" fill="#f2efef" stroke="${stroke}" stroke-width="6"/><path d="M166 352 L205 345Q223 354 223 368Q219 381 183 379L161 375Z" fill="#f2efef" stroke="${stroke}" stroke-width="6"/>`;
 const body=a.outfit==='coat'
  ?`<path d="M114 208 Q159 195 204 208 L225 300 Q163 311 95 300Z" fill="${a.shirt}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/><path d="M157 211L157 302" stroke="${stroke}" stroke-width="5"/><circle cx="171" cy="245" r="3.5" fill="#fae59a"/><circle cx="171" cy="271" r="3.5" fill="#fae59a"/>`:
 a.outfit==='hoodie'? `<path d="M116 201 Q160 193 204 201L227 301Q158 315 94 301Z" fill="${a.shirt}" stroke="${stroke}" stroke-width="6"/><path d="M135 207 Q160 240 188 207" fill="none" stroke="#f4cda7" stroke-width="6"/><path d="M132 273 Q161 261 187 273L186 293L135 293Z" fill="none" stroke="${stroke}" stroke-width="4"/>`:
 a.outfit==='sweater'? `<path d="M112 210Q162 193 207 210L225 303Q160 314 96 303Z" fill="${a.shirt}" stroke="${stroke}" stroke-width="6"/><path d="M109 278Q160 293 216 278" fill="none" stroke="${a.hatAccent}" stroke-width="7"/>`:
 `<path d="M111 207Q160 193 206 207L225 301Q160 312 96 301Z" fill="${a.shirt}" stroke="${stroke}" stroke-width="6"/><path d="M140 210 Q160 229 181 210" stroke="${a.hatAccent}" stroke-width="5" fill="none"/>`;
 const arms=`<path d="M111 216 Q82 214 68 266 L91 282 L115 246Z" fill="${a.shirt}" stroke="${stroke}" stroke-width="6"/><path d="M206 216 Q236 214 251 266 L228 282 L203 246Z" fill="${a.shirt}" stroke="${stroke}" stroke-width="6"/><ellipse cx="83" cy="279" rx="20" ry="19" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="6"/><ellipse cx="237" cy="279" rx="20" ry="19" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="6"/>`;
 const face=`<ellipse cx="160" cy="136" rx="83" ry="85" fill="${a.skin}" stroke="${stroke}" stroke-width="7"/>`;
 const hairFront=a.hairStyle==='bald'?'':a.hairStyle==='curly'?
  Array.from({length:8},(_,i)=>`<circle cx="${96+i*18}" cy="${61+Math.abs(i-3.5)*3}" r="18" fill="${a.hair}" stroke="${stroke}" stroke-width="2"/>`).join(''):
 a.hairStyle==='spiky'?`<path d="M86 110L75 45L110 58L122 23L151 54L179 28L189 56L228 43L225 108Q188 86 157 95Q112 86 86 110Z" fill="${a.hair}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/>`:
 a.hairStyle==='long'?`<path d="M83 109Q72 57 125 47Q178 30 226 86Q191 72 177 83Q134 102 83 109Z" fill="${a.hair}" stroke="${stroke}" stroke-width="5"/>`:
 a.hairStyle==='short'?`<path d="M82 110Q72 58 137 48Q217 43 236 109Q214 97 199 94Q157 82 82 110Z" fill="${a.hair}" stroke="${stroke}" stroke-width="5"/>`:
 `<path d="M80 110Q61 54 145 43Q219 35 237 100Q207 109 182 82Q145 115 81 114Z" fill="${a.hair}" stroke="${stroke}" stroke-width="5"/>`;
 const eyes=`<ellipse cx="139" cy="136" rx="26" ry="33" fill="white" stroke="${stroke}" stroke-width="4"/><ellipse cx="182" cy="136" rx="26" ry="33" fill="white" stroke="${stroke}" stroke-width="4"/>`;
 const pupil=a.eyes==='black'?'#1a1929':a.eyes==='brown'?'#80482f':a.eyes==='green'?'#2c9c62':'#368fd7';
 const pupils=`<circle cx="145" cy="143" r="5.5" fill="${pupil}"/><circle cx="177" cy="143" r="5.5" fill="${pupil}"/><circle cx="146" cy="141" r="2" fill="#fff"/><circle cx="178" cy="141" r="2" fill="#fff"/>`;
 const mouth=a.face==='neutral'?'<path d="M147 189L174 189" fill="none" stroke="#452633" stroke-width="4" stroke-linecap="round"/>':
 a.face==='surprised'?'<ellipse cx="160" cy="189" rx="9" ry="13" fill="#482633"/>':
 a.face==='grin'?'<path d="M138 179Q160 215 181 179Q160 193 138 179Z" fill="white" stroke="#482633" stroke-width="3"/>':
 '<path d="M141 185 Q161 198 181 185" fill="none" stroke="#482633" stroke-width="4" stroke-linecap="round"/>';
 const hat=a.hat==='none'?'':a.hat==='beanie'?
 `<path d="M80 97Q82 12 161 20Q245 22 242 97Z" fill="${a.hat}" stroke="${stroke}" stroke-width="6"/><path d="M79 93Q161 77 243 93L242 113Q157 97 80 114Z" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="5"/>`:
 a.hat==='pom'?`<circle cx="161" cy="18" r="17" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="5"/><path d="M82 101Q91 25 159 29Q230 26 239 101Z" fill="${a.hat}" stroke="${stroke}" stroke-width="6"/><path d="M79 96Q160 84 244 96L241 113Q161 100 80 113Z" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="5"/>`:
 a.hat==='earflaps'?`<path d="M86 105Q88 14 159 28Q234 19 237 103L239 144L219 147L212 108L108 108L99 147L78 145Z" fill="${a.hat}" stroke="${stroke}" stroke-width="6"/><path d="M82 94Q160 83 240 95" fill="none" stroke="${a.hatAccent}" stroke-width="11"/>`:
 `<path d="M84 97Q90 29 163 37Q226 37 238 100Z" fill="${a.hat}" stroke="${stroke}" stroke-width="6"/><path d="M146 100Q211 104 259 112Q236 127 156 116Z" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="5"/>`;
 const extras=a.accessory==='glasses'?
 '<rect x="108" y="111" width="49" height="43" rx="13" fill="none" stroke="#343045" stroke-width="5"/><rect x="163" y="111" width="49" height="43" rx="13" fill="none" stroke="#343045" stroke-width="5"/><path d="M157 126H163" stroke="#343045" stroke-width="6"/>':
 a.accessory==='freckles'?
 '<g fill="#ad6a58"><circle cx="106" cy="171" r="3.5"/><circle cx="117" cy="174" r="3.5"/><circle cx="204" cy="171" r="3.5"/><circle cx="194" cy="174" r="3.5"/></g>':
 a.accessory==='blush'?
 '<ellipse cx="105" cy="177" rx="18" ry="8" fill="#e9828a" opacity=".75"/><ellipse cx="215" cy="177" rx="18" ry="8" fill="#e9828a" opacity=".75"/>':
 a.accessory==='scarf'?
 `<path d="M103 198Q161 221 217 198L220 216Q161 243 103 217Z" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="5"/><path d="M194 221L208 266L231 261L215 212Z" fill="${a.hatAccent}" stroke="${stroke}" stroke-width="4"/>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400" role="img" aria-label="Custom paper-cutout cartoon avatar">
<rect width="320" height="400" rx="18" fill="${a.background}"/>
${a.backdrop==='spotlight'?'<ellipse cx="160" cy="160" rx="128" ry="153" fill="#ffffff" opacity=".09"/>':''}
${decor}<ellipse cx="160" cy="378" rx="102" ry="10" fill="#100d24" opacity=".45"/>
<g stroke-linecap="round" stroke-linejoin="round">${hairBase}${legs}${shoes}${arms}${body}
<path d="M142 193H181V215H142Z" fill="${a.skin}" stroke="${stroke}" stroke-width="5"/>
${face}${hairFront}${eyes}${pupils}${mouth}${hat}${extras}</g></svg>`;
}
export function avatarDataUrl(value){
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(avatarSvg(value));
}
