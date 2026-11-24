function audit(files,produce,verify){
 const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a};
 const totals={SAFE:0,COLLISION:0,UNKNOWN:0,falseSafe:0,falseCollision:0,rejected:0,nodes:0,leaves:0,brackets:0,endpoints:0,tamperAttempts:0,tamperAccepted:0},rows=[];
 for(const f of files){const rs=f.content.trim().split(/\r?\n/).filter(x=>x.trim()).map(x=>x.split(",").map(y=>BigInt(y.trim())));if(rs.length%8||rs.some(r=>r.length!==7||[1,3,5].some(i=>r[i]<=0n)))throw Error("invalid rows");const ee=f.path.includes("edge-edge"),s=Object.fromEntries(Object.keys(totals).map(k=>[k,0]));
 for(let i=0;i<rs.length;i+=8){const rr=rs.slice(i,i+8);if(!rr.every(r=>r[6]===rr[0][6])||![0n,1n].includes(rr[0][6]))throw Error("invalid truth");let d=1n;for(const r of rr)for(const j of [1,3,5])d=d/gcd(d,r[j])*r[j];const p=rr.map(r=>[0,2,4].map(j=>r[j]*(d/r[j+1]))),truth=rr[0][6]===1n,c=produce(p,ee);s[c.status]++;s.nodes+=c.nodes;s.falseSafe+=+(truth&&c.status==="SAFE");s.falseCollision+=+(!truth&&c.status==="COLLISION");if(c.status==="UNKNOWN")continue;if(!verify(p,ee,c))s.rejected++;
 let bad;if(c.status==="SAFE"){s.leaves+=c.leaves.length;bad={...c,leaves:c.leaves.slice(1)}}else{s[c.witness.kind==="bracket"?"brackets":"endpoints"]++;bad={...c,witness:{...c.witness,path:"x"}}}s.tamperAttempts++;s.tamperAccepted+=+verify(p,ee,bad);
 }for(const k in s)totals[k]+=s[k];rows.push({path:f.path,sha:f.sha,queries:rs.length/8,...s})}return {totals,rows}
}
module.exports={audit};
if(require.main===module){const fs=require('node:fs'),{produce}=require('./produce_certificate.cjs'),{verify}=require('./verify_certificate.cjs');console.log(JSON.stringify(audit(process.argv.slice(2).map(path=>({path,content:fs.readFileSync(path,'utf8')})),produce,verify),null,2));}
