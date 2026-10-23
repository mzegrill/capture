(function(root){
  function makeVariant(team){
    let state=team*7919+2026;
    function rand(n){state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n;}
    const order=[0,1,2,3,4,5];
    for(let i=5;i>0;i--){const j=rand(i+1);[order[i],order[j]]=[order[j],order[i]];}
    const columns=Array.from({length:6},(_,j)=>{let mask=1<<j;for(let i=j+1;i<6;i++)if(rand(2))mask|=1<<i;return mask;}).map(mask=>order.reduce((n,p,i)=>n|(((mask>>i)&1)<<p),0));
    let solution=1+rand(62);
    // Avoid trivial one-switch solutions.
    if(popcount(solution)<2)solution^=21;
    const a=1+rand(3),b=1+rand(5),c=2+rand(8);
    return {team,columns,target:lamps(columns,solution),solution,a,b,c,inputs:[12,14,17]};
  }
  function lamps(columns,mask){return columns.reduce((v,col,i)=>v^(((mask>>i)&1)?col:0),0);}
  function popcount(n){let c=0;for(;n;n>>>=1)c+=n&1;return c;}
  function machine(v,x){return v.a*x*x+v.b*x+v.c;}
  function finalAnswer(v){const count=popcount(v.solution);let sum=0;for(let i=0;i<6;i++)if(v.target&(1<<i))sum+=i+1;return [count,machine(v,count),sum];}
  function code(v,room){return 'R'+room+'-'+String((v.team*1877+room*313)%9000+1000);}
  function textKey(v){return 'LJUS-'+String(10000+(v.team*3571)%90000);}
  function hiddenText(v){return Array.from('NYCKEL: '+textKey(v)).map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join('').replace(/0/g,'\u200b').replace(/1/g,'\u200c');}
  function heavy(v,round){return 1+((v.team*5+round*3)%8);}
  function weigh(v,round,left,right){return (left.includes(heavy(v,round))?1:0)-(right.includes(heavy(v,round))?1:0);}
  const api={makeVariant,lamps,popcount,machine,finalAnswer,code,textKey,hiddenText,heavy,weigh};
  if(typeof module!=='undefined')module.exports=api;else root.Engine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
