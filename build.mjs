import {cpSync,mkdirSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true}); mkdirSync('dist'); for(const p of ['index.html','assets','manifest.webmanifest']) cpSync(p,`dist/${p}`,{recursive:true});
