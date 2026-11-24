function auditHard(files,produce,gen,verify){
 const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a};
 const rows=[],totals={queries:0,unknownBefore:0,certified:0,wrong:0,rejected:0,rational:0,root:0,tamperAttempts:0,tamperAccepted:0},witnesses=[];
 for(const f of files){const rr=f.content.trim().split(/\r?\n/).filter(x=>x.trim()).map(x=>x.split(",").map(y=>BigInt(y.trim())));if(rr.length%8||rr.some(r=>r.length!==7||[1,3,5].some(i=>r[i]<=0n)))throw Error("bad CSV");const ee=f.path.includes("edge-edge"),s=Object.fromEntries(Object.keys(totals).map(k=>[k,0]));
 for(let i=0;i<rr.length;i+=8){const rs=rr.slice(i,i+8);if(!rs.every(r=>r[6]===rs[0][6])||![0n,1n].includes(rs[0][6]))throw Error("bad labels");let d=1n;for(const r of rs)for(const j of [1,3,5])d=d/gcd(d,r[j])*r[j];const p=rs.map(r=>[0,2,4].map(j=>r[j]*(d/r[j+1])));s.queries++;if(produce(p,ee).status!=="UNKNOWN")continue;s.unknownBefore++;const c=gen(p,ee);if(c.status!=="COLLISION")continue;if(!verify(p,ee,c)){s.rejected++;continue}s.certified++;s.wrong+=+(rs[0][6]!==1n);s[c.witness.kind]++;
 const bads=[{...c,witness:{...c.witness,subset:[]}}, {...c,witness:{...c.witness,...(c.witness.kind==="root"?{polynomial:["1"]}:{time:["2","1"]})}}];
 for(const bad of bads){s.tamperAttempts++;s.tamperAccepted+=+verify(p,ee,bad)}witnesses.push({path:f.path,query:i/8,witness:c.witness});
 }for(const k in s)totals[k]+=s[k];rows.push({path:f.path,sha:f.sha,...s})}return {totals,rows,witnesses}
}
if(require.main===module){const fs=require('node:fs'),{produce}=require('./produce_certificate.cjs'),{algebraicWitness}=require('./algebraic_witness.cjs'),{verifyAlgebraic}=require('./verify_algebraic_witness.cjs');console.log(JSON.stringify(auditHard(process.argv.slice(2).map(path=>({path,content:fs.readFileSync(path,'utf8')})),produce,algebraicWitness,verifyAlgebraic),null,2));}
