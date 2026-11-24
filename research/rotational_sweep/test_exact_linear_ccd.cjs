const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const test=require('node:test');
const source=fs.readFileSync(__dirname+'/exact_linear_ccd.cjs','utf8');
// Execute the unchanged benchmark implementation, not a rewritten kernel.
const benchmark=vm.runInNewContext(source.slice(source.indexOf('function benchmark(data)'),source.indexOf('\nconsole.log('))+'\nbenchmark');
const tri=[[0n,0n,0n],[4n,0n,0n],[0n,4n,0n]];
const vf=(a,b)=>[a,...tri,b,...tri];
const ee=(a,b)=>[[0n,0n,0n],[4n,0n,0n],...a,[0n,0n,0n],[4n,0n,0n],...b];
const dataset=(p,truth,kind='vertex-face',den=1n)=>({path:kind+'/test.csv',content:p.map(v=>v.flatMap(x=>[x,den]).concat(truth?1n:0n).join(',')).join('\n')});
const all=(p,truth,kind,den)=>benchmark([dataset(p,truth,kind,den)])[0].methods;
function neverSafe(p,kind,den){for(const x of Object.values(all(p,true,kind,den)))assert.equal(x.safe,0)}
function safe(p,kind,den){assert.equal(all(p,false,kind,den).full.safe,1)}
test('strict separation',()=>safe(vf([1n,1n,1n],[1n,1n,2n])));
test('interior time contact',()=>neverSafe(vf([1n,1n,-1n],[1n,1n,1n])));
test('initial contact',()=>neverSafe(vf([1n,1n,0n],[1n,1n,1n])));
test('terminal contact',()=>neverSafe(vf([1n,1n,1n],[1n,1n,0n])));
test('coplanar crossing',()=>neverSafe(vf([-1n,1n,0n],[1n,1n,0n])));
test('coplanar exterior requires spatial separation',()=>safe(vf([3n,3n,0n],[3n,3n,0n])));
test('edge-edge instantaneous intersection',()=>neverSafe(ee([[2n,-1n,-1n],[2n,1n,-1n]],[[2n,-1n,1n],[2n,1n,1n]]),'edge-edge'));
test('parallel disjoint edges',()=>safe(ee([[0n,1n,0n],[4n,1n,0n]],[[0n,1n,0n],[4n,1n,0n]]),'edge-edge'));
test('coincident edges',()=>neverSafe(ee([[0n,0n,0n],[4n,0n,0n]],[[0n,0n,0n],[4n,0n,0n]]),'edge-edge'));
test('translation and scale at extreme rational magnitudes',()=>{const q=vf([3n,3n,0n],[3n,3n,0n]).map(v=>v.map(x=>x*10n**40n+10n**100n));safe(q,'vertex-face',10n**80n);});
test('malformed denominator and inconsistent labels reject',()=>{assert.throws(()=>benchmark([{path:'vertex-face/x',content:dataset(vf([1n,1n,1n],[1n,1n,2n]),false,'vertex-face',0n).content}]));const q=dataset(vf([1n,1n,1n],[1n,1n,2n]),false);q.content=q.content.replace(/,0\n/,',1\n');assert.throws(()=>benchmark([q]));});
test('100 constructed rational mid-time collisions',()=>{let s=8n;const rng=()=>{s=(1664525n*s+1013904223n)%4294967296n;return s%101n-50n};let rows=[];for(let i=0;i<100;i++){const d=[rng(),rng(),rng()];const c=[1n,1n,0n];const p=vf(c.map((x,j)=>x-d[j]),c.map((x,j)=>x+d[j]));rows.push(dataset(p,true).content)}const q=benchmark([{path:'vertex-face/test.csv',content:rows.join('\n')}])[0];assert.equal(q.queries,100);for(const x of Object.values(q.methods))assert.equal(x.unsafeSafe,0);});
