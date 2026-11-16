// Extra original cartoon-cutout parts for CTooniverse avatar maker.
// Colors come exclusively from normalizeAvatar's validated palette.
// Gradient fills share the renderer's palette while outlines and accent strokes stay crisp.
const colorize=(s,a)=>s
 .replaceAll('fill="@hair"','fill="url(#av-hair)"')
 .replaceAll('fill="@skin"','fill="url(#av-skin)"')
 .replaceAll('fill="@shirt"','fill="url(#av-shirt)"')
 .replaceAll('fill="@pants"','fill="url(#av-pants)"')
 .replaceAll('fill="@hat"','fill="url(#av-hatColor)"')
 .replaceAll('fill="@trim"','fill="url(#av-hatAccent)"')
 .replaceAll('@hair',a.hair).replaceAll('@skin',a.skin)
 .replaceAll('@shirt',a.shirt).replaceAll('@pants',a.pants)
 .replaceAll('@hat',a.hatColor).replaceAll('@trim',a.hatAccent);
const outline='stroke="#19171d" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
export function avatarExtraLayers(a){
 const p={backHair:'',fringe:'',clothes:'',faceFeatures:'',hat:'',neckwear:'',accessories:''};
 if(a.hairStyle==='sidepart'){
  p.backHair='<path d="M63 185Q44 110 100 89Q166 51 226 95Q266 124 253 200L226 215L85 211Z" fill="@hair" '+outline+'/>';
  p.fringe='<path d="M62 171Q64 111 113 100Q183 73 246 113L254 159Q215 132 174 144Q136 171 78 171Q104 143 125 120Z" fill="@hair" '+outline+'/>';
 }
 if(a.hairStyle==='messy'){
  p.backHair='<path d="M69 190L43 143L67 127L62 90L99 108L113 65L138 101L157 61L184 98L224 77L228 113L263 102L251 154L272 174L244 214L218 194L91 202Z" fill="@hair" '+outline+'/>';
  p.fringe='<path d="M66 163L78 120L99 137L122 97L139 136L165 103L184 137L214 104L216 144L248 124L254 165L225 153L209 175L176 149L158 175L128 154L106 174L88 151Z" fill="@hair" '+outline+'/>';
 }
 if(a.hairStyle==='bob'){
  p.backHair='<path d="M65 162Q58 98 113 82Q160 62 219 89Q264 121 253 184L270 255Q221 272 198 246H121Q91 272 52 252Z" fill="@hair" '+outline+'/>';
  p.fringe='<path d="M64 172Q65 114 115 104Q187 76 245 120L257 185L234 194L216 149Q161 166 124 142L91 184L79 212L59 196Z" fill="@hair" '+outline+'/>';
 }
 if(a.hairStyle==='pigtails'){
  p.backHair='<g fill="@hair" '+outline+'><ellipse cx="50" cy="178" rx="32" ry="53"/><ellipse cx="271" cy="178" rx="32" ry="53"/><path d="M67 169Q53 102 107 87Q163 60 222 92Q269 118 253 169Z"/></g><path d="M34 149l22-9 10 19-24 13ZM284 149l-22-9-10 19 24 13Z" fill="@trim" '+outline+'/>';
  p.fringe='<path d="M66 162Q65 116 108 105L151 125L161 110L190 128L217 106Q255 122 255 160L227 146L203 159L162 133L124 156L93 143Z" fill="@hair" '+outline+'/>';
 }
 if(a.hairStyle==='afro'){
  p.backHair='<g fill="@hair" '+outline+'><circle cx="81" cy="137" r="42"/><circle cx="100" cy="96" r="40"/><circle cx="140" cy="81" r="44"/><circle cx="188" cy="81" r="44"/><circle cx="229" cy="102" r="42"/><circle cx="248" cy="145" r="40"/></g>';
  p.fringe='<g fill="@hair" '+outline+'><circle cx="99" cy="126" r="23"/><circle cx="132" cy="112" r="26"/><circle cx="172" cy="112" r="25"/><circle cx="208" cy="122" r="25"/><circle cx="233" cy="136" r="18"/></g>';
 }
 if(a.hairStyle==='mohawk')p.fringe='<path d="M134 103L139 62L151 83L163 35L177 84L197 61L192 113L182 146L139 145Z" fill="@hair" '+outline+'/>';
 if(a.hairStyle==='buzz')p.fringe='<path d="M62 148Q62 111 109 97Q162 72 220 101Q257 115 257 148Q161 128 62 148Z" fill="@hair" '+outline+'/>';
 if(a.outfit==='jacket')p.clothes='<path d="M109 267L142 279L160 314L179 280L209 268L211 344L173 352L161 311L149 351L108 344Z" fill="@pants" '+outline+'/><path d="M138 271L159 301L143 319L119 279ZM181 271L161 301L178 319L201 279Z" fill="@trim" '+outline+'/><path d="M160 312v37M117 334h25M179 334h25" stroke="#19171d" stroke-width="3"/>';
 if(a.outfit==='overalls')p.clothes='<path d="M113 262l21 2 14 34h27l11-33 21-3 7 84Q160 357 107 346Z" fill="@pants" '+outline+'/><path d="M133 265l16 34M186 265l-13 34" stroke="@pants" stroke-width="15"/><path d="M145 315h31v23h-31Z" fill="none" stroke="#19171d" stroke-width="3"/><circle cx="133" cy="282" r="5" fill="@trim"/><circle cx="187" cy="282" r="5" fill="@trim"/>';
 if(a.outfit==='jersey')p.clothes='<path d="M117 266Q160 293 204 266" stroke="@trim" stroke-width="9" fill="none"/><path d="M109 335Q160 326 214 335" stroke="@trim" stroke-width="7" fill="none"/><text x="160" y="324" font-family="Arial,sans-serif" font-size="40" font-weight="900" text-anchor="middle" fill="@trim" stroke="#19171d" stroke-width="1">07</text>';
 if(a.outfit==='vest')p.clothes='<path d="M112 267Q138 260 151 279L160 313L169 279Q184 259 207 267L214 344L171 351L160 319L148 351L108 344Z" fill="@pants" '+outline+'/><path d="M149 278L160 312L172 279" fill="none" stroke="@trim" stroke-width="5"/><circle cx="160" cy="334" r="3" fill="@trim"/>';
 if(a.outfit==='dress')p.clothes='<path d="M123 268Q159 283 196 268L225 370Q160 390 96 370Z" fill="@shirt" '+outline+'/><path d="M127 271Q159 289 193 271M108 351Q162 370 212 351" stroke="@trim" stroke-width="7" fill="none"/>';
 if(a.face==='frown')p.faceFeatures+='<path d="M143 262Q160 245 179 262" fill="none" stroke="#19171d" stroke-width="3.5" stroke-linecap="round"/>';
 if(a.face==='laugh')p.faceFeatures+='<path d="M134 246Q160 295 187 246Q160 262 134 246Z" fill="#451c2b" '+outline+'/><path d="M146 264Q159 257 173 264" fill="none" stroke="#fff" stroke-width="6"/>';
 if(a.face==='wink')p.faceFeatures+='<path d="M142 251Q160 266 178 251" fill="none" stroke="#19171d" stroke-width="3.5" stroke-linecap="round"/>';
 if(a.face==='sleepy')p.faceFeatures+='<path d="M148 254h24" fill="none" stroke="#19171d" stroke-width="3" stroke-linecap="round"/>';
 if(a.brows==='raised')p.faceFeatures+='<path d="M107 151Q130 138 150 149M174 149Q194 138 214 151" fill="none" stroke="#19171d" stroke-width="3"/>';
 if(a.brows==='angry')p.faceFeatures+='<path d="M105 152l48 14M169 166l48-14" stroke="#19171d" stroke-width="4"/>';
 if(a.brows==='soft')p.faceFeatures+='<path d="M110 155Q130 150 149 157M173 157Q193 150 213 155" fill="none" stroke="#19171d" stroke-width="2"/>';
 if(a.facialHair==='mustache')p.faceFeatures+='<path d="M160 238Q143 225 128 244Q144 253 160 245Q176 253 192 244Q178 225 160 238Z" fill="@hair" '+outline+'/>';
 if(a.facialHair==='goatee')p.faceFeatures+='<path d="M148 266Q160 279 172 266L169 289Q160 299 151 289Z" fill="@hair" '+outline+'/>';
 if(a.facialHair==='beard')p.faceFeatures+='<path d="M81 225Q94 271 124 273Q129 295 160 301Q191 295 198 273Q228 269 240 225L225 248L208 261L194 282L160 294L126 282L111 261L94 250Z" fill="@hair" '+outline+'/>';
 if(a.neckwear==='bowtie')p.neckwear+='<path d="M160 270L135 256L135 287L160 277L185 287L185 256Z" fill="@trim" '+outline+'/><circle cx="160" cy="272" r="6" fill="@hat" stroke="#19171d" stroke-width="2"/>';
 if(a.neckwear==='tie')p.neckwear+='<path d="M150 264H170L169 281L181 331L160 345L139 331L151 281Z" fill="@trim" '+outline+'/>';
 if(a.neckwear==='necklace')p.neckwear+='<path d="M129 261Q160 306 191 261" fill="none" stroke="@trim" stroke-width="4"/><circle cx="160" cy="291" r="7" fill="@hat" stroke="#19171d" stroke-width="2"/>';
 if(a.hat==='bucket')p.hat='<path d="M78 130Q66 65 116 49Q173 24 221 56Q254 78 241 130L279 145Q160 182 43 145Z" fill="@hat" '+outline+'/><path d="M71 132Q160 145 250 132" fill="none" stroke="@trim" stroke-width="9"/>';
 if(a.hat==='visor')p.hat='<path d="M60 145Q160 103 261 145L259 163Q160 139 61 166Z" fill="@hat" '+outline+'/><path d="M165 152Q240 132 288 151Q257 170 179 168Z" fill="@trim" '+outline+'/>';
 if(a.accessory==='sunglasses')p.accessories+='<path d="M100 165Q128 151 158 165L156 207Q129 223 105 203Z M164 165Q194 151 225 165L218 203Q193 223 166 207Z" fill="#151922" '+outline+'/><path d="M158 172h8" stroke="#19171d" stroke-width="5"/>';
 if(a.accessory==='eyepatch')p.accessories+='<path d="M76 151Q158 130 237 139" fill="none" stroke="#19171d" stroke-width="6"/><ellipse cx="132" cy="186" rx="33" ry="31" fill="#1d1a26" '+outline+'/>';
 if(a.accessory==='headphones')p.accessories+='<path d="M65 181Q52 85 160 71Q269 76 255 181" fill="none" stroke="@hat" stroke-width="13"/><rect x="53" y="174" width="28" height="60" rx="12" fill="@trim" '+outline+'/><rect x="240" y="174" width="28" height="60" rx="12" fill="@trim" '+outline+'/>';
 if(a.accessory==='mask')p.accessories+='<path d="M111 230Q160 245 211 230L205 267Q160 292 115 267Z" fill="@trim" '+outline+'/><path d="M111 235L84 223M211 235L234 223" stroke="#19171d" stroke-width="3" fill="none"/>';
 return Object.fromEntries(Object.entries(p).map(([name,svg])=>[name,colorize(svg,a)]));
}
