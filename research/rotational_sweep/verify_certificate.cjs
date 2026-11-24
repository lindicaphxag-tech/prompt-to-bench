// Independent checker: power-basis polynomials, scaled Bernstein conversion, exact partition coverage.
function verify(points,ee,cert){
 try{
 if(!Array.isArray(points)||points.length!==8||points.some(p=>!Array.isArray(p)||p.length!==3||p.some(x=>typeof x!=="bigint"))||typeof ee!=="boolean")return false;
 const minus=(a,b)=>a.map((v,i)=>v-b[i]),inner=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],outer=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],same=a=>a.every(v=>v>0n)||a.every(v=>v<0n);
 function interval(path){if(typeof path!=="string"||path.length>64||!/^[01]*$/.test(path))throw Error("bad path");const d=1n<<BigInt(path.length),l=path?BigInt("0b"+path):0n;return [l,l+1n].map(k=>{const a=points.slice(0,4).map((p,i)=>p.map((v,j)=>(d-k)*v+k*points[i+4][j]));return ee?[minus(a[0],a[2]),minus(a[0],a[3]),minus(a[1],a[2]),minus(a[1],a[3])]:[minus(a[0],a[1]),minus(a[0],a[2]),minus(a[0],a[3])]})}
 // Independent power-basis construction then exact conversion to scaled Bernstein coefficients.
 const sum=(a,b)=>Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]??0n)+(b[i]??0n)),neg=a=>a.map(v=>-v),diff=(a,b)=>sum(a,neg(b)),mul=(a,b)=>{const c=Array(a.length+b.length-1).fill(0n);a.forEach((x,i)=>b.forEach((y,j)=>c[i+j]+=x*y));return c};
 const vc=(a,b)=>[diff(mul(a[1],b[2]),mul(a[2],b[1])),diff(mul(a[2],b[0]),mul(a[0],b[2])),diff(mul(a[0],b[1]),mul(a[1],b[0]))],vd=(a,b)=>a.map((x,i)=>mul(x,b[i])).reduce(sum,[0n]),vm=(a,b)=>a.map((x,i)=>diff(x,b[i]));
 const choose=(n,k)=>{let x=1n;for(let i=1;i<=k;i++)x=x*BigInt(n-i+1)/BigInt(i);return x};
 function bern(p,n){return Array.from({length:n+1},(_,k)=>{let v=0n;for(let i=0;i<=k;i++)v+=(p[i]??0n)*choose(k,i)*(24n/choose(n,i));return v})}
 function pol(a,b){const p=a.slice(0,3).map((x,i)=>x.map((v,j)=>[v,b[i][j]-v]));const r=p[0],e=vm(p[1],r),f=vm(p[2],r),n=vc(e,f),v=r.map(neg);return {C:bern(vd(r,n),3),D:bern(vd(n,n),4),U:bern(vd(vc(v,f),n),4),V:bern(vd(vc(e,v),n),4)}}
 function staticHit(a){const z=v=>v.every(x=>x===0n);if(a.some(z))return true;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){if(z(outer(a[i],a[j]))&&inner(a[i],a[j])<=0n)return true;for(let k=j+1;k<a.length;k++){const e=minus(a[j],a[i]),f=minus(a[k],a[i]),v=a[i].map(x=>-x),n=outer(e,f),d=inner(n,n);if(d===0n||inner(v,n)!==0n)continue;const u=inner(outer(v,f),n),w=inner(outer(e,v),n);if(u>=0n&&w>=0n&&u+w<=d)return true}}return false}
 if(cert.status==="COLLISION"){const w=cert.witness,[a,b]=interval(w.path);if(w.kind==="endpoint")return (w.side===0||w.side===1)&&staticHit(w.side===0?a:b);if(w.kind!=="bracket")return false;const {C,D,U,V}=pol(a,b);return C[0]*C[3]<=0n&&D.every(x=>x>0n)&&U.every(x=>x>=0n)&&V.every(x=>x>=0n)&&D.every((x,i)=>ee?x>=U[i]&&x>=V[i]:x>=U[i]+V[i])}
 if(cert.status!=="SAFE"||!Array.isArray(cert.leaves)||cert.leaves.length<1||cert.leaves.length>65536)return false;
 // Verify a prefix-free complete dyadic partition, not only individual intervals.
 const paths=new Set();for(const l of cert.leaves){const [a,b]=interval(l.path);if(paths.has(l.path))return false;paths.add(l.path);if(l.kind==="plane"){if(!same(pol(a,b).C))return false}else if(l.kind==="separator"){if(!Array.isArray(l.normal)||l.normal.length!==3||l.normal.some(x=>typeof x!=="string"||! /^-?\d{1,2048}$/.test(x)))return false;const n=l.normal.map(BigInt);if(!same(a.concat(b).map(x=>inner(n,x))))return false}else return false}
 const max=Math.max(...Array.from(paths,x=>x.length));let mass=0n;for(const p of paths){for(let i=0;i<p.length;i++)if(paths.has(p.slice(0,i)))return false;mass+=1n<<BigInt(max-p.length)}return mass===(1n<<BigInt(max));
 }catch{return false}
}
module.exports={verify};
