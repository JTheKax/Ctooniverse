/* Original vector avatar renderer; no external artwork or uploads required. */
export const defaults={skin:'#f2b989',hair:'#30204d',shirt:'#6545d7',eyes:'#36d5ed',style:'swoop',face:'smile',accessory:'none',background:'#2b176a'};
export function avatarSVG(options={}){
 const v={...defaults,...options};
 const safeColor=x=>/^#[0-9a-fA-F]{6}$/.test(x)?x:'#6545d7';
 for(const k of ['skin','hair','shirt','eyes','background'])v[k]=safeColor(v[k]);
 const hair={
 swoop:'<path d="M48 99 Q36 34 101 36 Q154 27 159 98 Q139 81 129 68 Q95 100 48 99Z"/>',
 spikes:'<path d="M44 100 L37 48 65 63 73 25 96 51 123 24 130 58 162 44 154 102 132 78 82 83Z"/>',
 curls:'<circle cx="60" cy="66" r="22"/><circle cx="82" cy="48" r="23"/><circle cx="110" cy="45" r="23"/><circle cx="137" cy="63" r="24"/><path d="M48 72H155V100H48Z"/>',
 bob:'<path d="M49 90Q37 30 99 32Q162 25 156 89L169 144H132L139 91Q100 111 61 91L69 144H34Z"/>',
 bald:''
 }[v.style]??'';
 const mouth=v.face==='grin'?'<path d="M82 141Q100 159 120 141Z" fill="#fff" stroke="#5e294b" stroke-width="3"/>':v.face==='serious'?'<path d="M89 145H113" stroke="#693c49" stroke-width="4" stroke-linecap="round"/>':'<path d="M83 141Q101 157 120 141" fill="none" stroke="#693c49" stroke-width="4" stroke-linecap="round"/>';
 const acc=v.accessory==='glasses'?'<g fill="none" stroke="#f8d86e" stroke-width="5"><rect x="60" y="104" width="33" height="23" rx="9"/><rect x="109" y="104" width="33" height="23" rx="9"/><path d="M93 112H109"/></g>':v.accessory==='crown'?'<path d="M58 50L64 20 86 35 102 12 122 35 144 20 150 50Z" fill="#ffd451" stroke="#6d3d15" stroke-width="4"/>':v.accessory==='headphones'?'<path d="M49 112V85Q49 29 102 29Q155 29 155 85V112" fill="none" stroke="#24264c" stroke-width="12"/><rect x="39" y="91" width="19" height="38" rx="8" fill="#ffdb54"/><rect x="146" y="91" width="19" height="38" rx="8" fill="#ffdb54"/>':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" role="img" aria-label="Custom cartoon avatar"><rect width="200" height="220" rx="22" fill="'+v.background+'"/><circle cx="100" cy="89" r="79" fill="#ffffff" opacity=".08"/><path d="M18 220Q23 163 82 164H120Q180 163 184 220Z" fill="'+v.shirt+'" stroke="#181139" stroke-width="6"/><path d="M84 158V177Q100 194 118 177V158" fill="'+v.skin+'" stroke="#2e1a43" stroke-width="4"/><ellipse cx="100" cy="111" rx="55" ry="63" fill="'+v.skin+'" stroke="#29183c" stroke-width="5"/><g fill="'+v.hair+'" stroke="#25173a" stroke-width="4" stroke-linejoin="round">'+hair+'</g><g fill="white" stroke="#2c1d40" stroke-width="3"><ellipse cx="79" cy="116" rx="13" ry="11"/><ellipse cx="121" cy="116" rx="13" ry="11"/></g><circle cx="80" cy="116" r="6" fill="'+v.eyes+'"/><circle cx="122" cy="116" r="6" fill="'+v.eyes+'"/><circle cx="81" cy="115" r="2" fill="#111"/><circle cx="123" cy="115" r="2" fill="#111"/><path d="M100 120L96 132H104" fill="none" stroke="#a56d64" stroke-width="3"/>'+mouth+acc+'<path d="M20 213Q100 195 180 213" fill="none" stroke="#ffde60" stroke-width="4" opacity=".8"/></svg>';
}
export function avatarDataUrl(options){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(avatarSVG(options))}
