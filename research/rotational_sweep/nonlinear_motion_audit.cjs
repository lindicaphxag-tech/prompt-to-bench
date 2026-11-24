function nonlinearAudit(produce,verify,linearProduce){
 let seed=20261124;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed},rand=n=>rnd()%n;
 const totals={queries:0,colliding:0,SAFE:0,COLLISION:0,UNKNOWN:0,wrong:0,rejected:0,linearFalseSafe:0,linearUnknown:0,tamperAttempts:0,tamperAccepted:0},rows={};
 const scenarios=[["crossing2",[3,-5,3],true,false],["crossing3",[3,-6,-6,3],true,false],["tangent-dyadic",[1,-1,1],true,false],["tangent-nondyadic",[1,-2,4],true,false],["positive-despite-negative-control",[4,-1,4],false,false],["outside-with-crossing",[3,-5,3],false,true],["positive-cubic",[3,1,1,3],false,false],["endpoint-contact",[0,2,3],true,false]];
 for(const [name,z,truth,outside] of scenarios)for(const ee of [false,true])for(let j=0;j<100;j++){
 const n=z.length,scale=BigInt(1+rand(100)),A=()=>Array.from({length:n},()=>[0n,0n,0n]);let p;
 if(ee){const x=outside?15n:5n;p=[A(),A().map(()=>[10n,0n,0n]),z.map(v=>[x,-5n,BigInt(v)]),z.map(v=>[x,5n,BigInt(v)])]}
 else{const x=outside?15n:3n;p=[z.map(v=>[x,3n,BigInt(v)]),A(),A().map(()=>[10n,0n,0n]),A().map(()=>[0n,10n,0n])]}
 // Common moving translation, invertible integer shear and scale preserve exact contact.
 const shift=A().map(()=>Array.from({length:3},()=>BigInt(rand(1000)-500))),h=BigInt(rand(7)-3),k=BigInt(rand(7)-3),l=BigInt(rand(7)-3);
 p=p.map(a=>a.map(([x,y,z],i)=>[x+h*y+k*z,y+l*z,z].map((v,j)=>v*scale+shift[i][j])));
 const key=name+(ee?"/EE":"/VF"),s=rows[key]??=Object.fromEntries(Object.keys(totals).map(k=>[k,0])),c=produce(p,ee),linear=linearProduce([...p.map(x=>x[0]),...p.map(x=>x.at(-1))],ee);
 s.queries++;s.colliding+=+truth;s[c.status]++;s.wrong+=+(c.status!=="UNKNOWN"&&((c.status==="COLLISION")!==truth));s.linearFalseSafe+=+(truth&&linear.status==="SAFE");s.linearUnknown+=+(linear.status==="UNKNOWN");
 if(c.status!=="UNKNOWN"){s.rejected+=+!verify(p,ee,c);const bad=c.status==="SAFE"?{...c,leaves:c.leaves.slice(1)}:{...c,witness:{...c.witness,path:"x"}};s.tamperAttempts++;s.tamperAccepted+=+verify(p,ee,bad)}
 }for(const s of Object.values(rows))for(const k in s)totals[k]+=s[k];return {totals,rows}
}
if(require.main===module){const {polynomialProduce}=require('./polynomial_produce.cjs'),{polynomialVerify}=require('./polynomial_verify.cjs'),{produce}=require('./produce_certificate.cjs');console.log(JSON.stringify(nonlinearAudit(polynomialProduce,polynomialVerify,produce),null,2));}
