const {benchmark}=require('./two_sided_ccd.cjs');
const tri=[[0n,0n,0n],[4n,0n,0n],[0n,4n,0n]];
const vf=(a,b)=>[a,...tri,b,...tri];
const ee=(a,b)=>[[0n,0n,0n],[4n,0n,0n],...a,[0n,0n,0n],[4n,0n,0n],...b];
function check(p,truth,expected,kind='vertex-face',den=1n){
  const data={path:kind+'/fixture.csv',content:p.map(v=>v.flatMap(x=>[x,den]).concat(truth?1n:0n).join(',')).join('\n')};
  const r=benchmark([data])[0].methods.two_sided;
  if(r[expected]!==1||r.falseSafe||r.falseCollision)throw Error(JSON.stringify({expected,r}));
}
const tests=[
 ['strict safe',()=>check(vf([1n,1n,1n],[1n,1n,2n]),false,'SAFE')],
 ['interior crossing',()=>check(vf([1n,1n,-1n],[1n,1n,1n]),true,'COLLISION')],
 ['initial contact',()=>check(vf([1n,1n,0n],[1n,1n,1n]),true,'COLLISION')],
 ['terminal contact',()=>check(vf([1n,1n,1n],[1n,1n,0n]),true,'COLLISION')],
 ['outside triangle plane crossing',()=>check(vf([3n,3n,-1n],[3n,3n,1n]),false,'SAFE')],
 ['coplanar interior',()=>check(vf([1n,1n,0n],[2n,1n,0n]),true,'COLLISION')],
 ['coplanar outside',()=>check(vf([3n,3n,0n],[3n,3n,0n]),false,'SAFE')],
 ['edge crossing',()=>check(ee([[2n,-1n,-1n],[2n,1n,-1n]],[[2n,-1n,1n],[2n,1n,1n]]),true,'COLLISION','edge-edge')],
 ['edge extension only',()=>check(ee([[5n,-1n,-1n],[5n,1n,-1n]],[[5n,-1n,1n],[5n,1n,1n]]),false,'SAFE','edge-edge')],
 ['coincident edges remain unknown',()=>check(ee([[0n,0n,0n],[4n,0n,0n]],[[0n,0n,0n],[4n,0n,0n]]),true,'UNKNOWN','edge-edge')],
 ['degenerate triangle remains unknown',()=>check(Array(8).fill([0n,0n,0n]),true,'UNKNOWN')],
 ['large exact translation',()=>check(vf([1n,1n,-1n],[1n,1n,1n]).map(v=>v.map(x=>x*10n**40n+10n**100n)),true,'COLLISION','vertex-face',10n**80n)],
 ['negative direction edge crossing',()=>check(ee([[2n,1n,1n],[2n,-1n,1n]],[[2n,1n,-1n],[2n,-1n,-1n]]),true,'COLLISION','edge-edge')],
 ['boundary vertex collision',()=>check(vf([0n,0n,-1n],[0n,0n,1n]),true,'COLLISION')],
];
for(const [name,run] of tests){run();console.log('PASS '+name);}
console.log(tests.length+' tests passed');
