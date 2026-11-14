// Resolve CToon artwork stored in GitHub's public/images/ctoons folder.
// Render deployments do not necessarily expose the repository's /public prefix.
const GITHUB_CTOON_IMAGES='https://raw.githubusercontent.com/JTheKax/CTooniverse/main/public/images/ctoons/';
export function ctoonImageUrl(value){
 const raw=String(value||'').trim();
 if(!raw)return '';
 if(/^https:\/\//i.test(raw))return raw;
 const filename=raw.replace(/^\/?(?:public\/)?images\/ctoons\//i,'');
 if(!/^[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp)$/i.test(filename)||filename.includes('..'))return '';
 return GITHUB_CTOON_IMAGES+encodeURIComponent(filename);
}
