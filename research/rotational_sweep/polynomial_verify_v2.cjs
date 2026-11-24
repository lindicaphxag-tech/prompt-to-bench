function polynomialVerifyV2(control,ee,cert){
 try{
 const degree=control[0].length-1;if(![1,2,3].includes(degree)||control.length!==4||typeof ee!=="boolean"||control.some(p=>p.length!==degree+1||p.some(v=>v.length!==3||v.some(x=>typeof x!=="bigint"))))return false;
 const choose=(n,k)=>{let c=1n;for(let j=1;j<=k;j++)c=c*BigInt(n-j+1)/BigInt(j);return c},sgn=x=>x%2===0?1n:-1n;
 const plus=(a,b)=>Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]??0n)+(b[i]??0n)),neg=a=>a.map(x=>-x),minus=(a,b)=>plus(a,neg(b)),mul=(a,b)=>{const c=Array(a.length+b.length-1).fill(0n);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)c[i+j]+=a[i]*b[j];return c};
 const vs=(a,b)=>a.map((x,i)=>minus(x,b[i])),vc=(a,b)=>[minus(mul(a[1],b[2]),mul(a[2],b[1])),minus(mul(a[2],b[0]),mul(a[0],b[2])),minus(mul(a[0],b[1]),mul(a[1],b[0]))],vd=(a,b)=>a.map((x,i)=>mul(x,b[i])).reduce(plus,[0n]);
 // Convert original normalized Bernstein control points directly to power coefficients.
 const power=control.map(p=>[0,1,2].map(j=>Array.from({length:degree+1},(_,k)=>{let v=0n;for(let i=0;i<=k;i++)v+=p[i][j]*choose(degree,i)*choose(degree-i,k-i)*sgn(k-i);return v})));
 const relative=ee?[vs(power[0],power[2]),vs(power[0],power[3]),vs(power[1],power[2]),vs(power[1],power[3])]:[vs(power[0],power[1]),vs(power[0],power[2]),vs(power[0],power[3])];
 function restrict(p,path){const d=1n<<BigInt(path.length),l=path?BigInt("0b"+path):0n,n=p.length-1;return Array.from({length:n+1},(_,k)=>{let v=0n;for(let i=k;i<=n;i++)v+=p[i]*choose(i,k)*l**BigInt(i-k)*d**BigInt(n-i);return v})}
 const bern=p=>{const n=p.length-1;return Array.from({length:n+1},(_,k)=>{let v=0n;for(let i=0;i<=k;i++)v+=p[i]*choose(k,i)*choose(n,k)/choose(n,i);return v})}; // scaled by choose(n,k); quotient exact
 const strict=a=>a.every(x=>x>0n)||a.every(x=>x<0n);
 function check(l,collision){if(!l||typeof l.path!=="string"||l.path.length>32||!/^[01]*$/.test(l.path))return false;const p=relative.map(v=>v.map(x=>restrict(x,l.path)));
 if(!collision&&l.kind==="axis")return Number.isInteger(l.axis)&&l.axis>=0&&l.axis<=2&&strict(p.flatMap(v=>bern(v[l.axis])));
 const r=p[0],e=vs(p[1],r),f=vs(p[2],r),n=vc(e,f),C=bern(vd(r,n));
 if(!collision&&l.kind==="plane")return strict(C);
 const v=r.map(neg),D=bern(vd(n,n)),U=bern(vd(vc(v,f),n)),V=bern(vd(vc(e,v),n));
 if(!collision){if(l.kind!=="outside"||!D.every(x=>x>0n))return false;const bounds=[U,V,...(ee?[D.map((x,i)=>x-U[i]),D.map((x,i)=>x-V[i])]:[D.map((x,i)=>x-U[i]-V[i])])];return Number.isInteger(l.index)&&l.index>=0&&l.index<bounds.length&&bounds[l.index].every(x=>x<0n)}
 if(l.kind!=="bracket")return false;
 return C[0]*C.at(-1)<=0n&&D.every(x=>x>0n)&&U.every(x=>x>=0n)&&V.every(x=>x>=0n)&&D.every((x,i)=>ee?x>=U[i]&&x>=V[i]:x>=U[i]+V[i])}
 if(cert.status==="COLLISION")return check(cert.witness,true);
 if(cert.status!=="SAFE"||!Array.isArray(cert.leaves)||!cert.leaves.length||cert.leaves.length>65536)return false;
 const paths=new Set();for(const l of cert.leaves){if(!check(l,false)||paths.has(l.path))return false;paths.add(l.path)}
 const m=Math.max(...Array.from(paths,p=>p.length));let s=0n;for(const p of paths){for(let j=0;j<p.length;j++)if(paths.has(p.slice(0,j)))return false;s+=1n<<BigInt(m-p.length)}return s===(1n<<BigInt(m));
 }catch{return false}
}
module.exports={polynomialVerifyV2};
