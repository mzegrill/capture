'use strict';
const $=id=>document.getElementById(id);
const E=Engine;
const storagePrefix='grillska-systemet-v3-';
let storageKey='';
let state=null,variant=null,active=1;
const hints={1:'Testa ett reglage åt gången från nolläget och anteckna vilka lampor det påverkar. Om två reglage påverkar samma lampa växlar den två gånger.',2:'Testa 0, 1, 2 och 3. Undersök skillnaderna mellan resultaten. Regeln innehåller x², x och ett konstant tal.',5:'Filen innehåller osynliga Unicode-tecken. U+200B betyder 0 och U+200C betyder 1. Läs åtta bitar i taget som ASCII-text.',4:'Förstora bilden och leta efter fem siffror som hör ihop.',6:'Väg tre mot tre. Om de balanserar finns den tyngre bland de två utanför. Annars finns den bland tre på den tyngre sidan. En sista vägning kan skilja alternativen åt.',3:'Räkna PÅ i den sparade panelinställningen. Använd antalet som indata i maskinens regel. Den sista summan gäller lampornas positionsnummer, inte reglagen.'};
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{$('storage-note').hidden=false;}}
function total(){return [15,15,20,15,15,20].reduce((s,p,i)=>s+(state.solved[i]&&(i!==3||CONFIG.photoEnabled)?Math.max(0,p-(state.hints[i]?5:0)):0),0);}
function visit(room){if(!state.test&&room>state.unlocked)return;active=room;render();$('room'+room).scrollIntoView({behavior:'smooth',block:'start'});}
function showLamps(id,mask){$(id).replaceChildren();for(let i=0;i<6;i++){const el=document.createElement('div');el.className='lamp '+(mask&(1<<i)?'on':'');el.textContent=(i+1)+' · '+(mask&(1<<i)?'TÄND':'SLÄCKT');$(id).append(el);}}
function render(){
 $('setup').hidden=true;$('game').hidden=false;
 $('identity').textContent='LAG '+state.team+' / '+state.name;$('score').textContent=total()+' / '+(CONFIG.photoEnabled?100:85)+' POÄNG';
 document.querySelectorAll('[data-room]').forEach(b=>{const n=Number(b.dataset.room);b.disabled=!state.test&&n>state.unlocked;b.setAttribute('aria-current',n===active?'step':'false');});
 for(let n=1;n<=6;n++){$('room'+n).hidden=n!==active;$('hint'+n).textContent=hints[n];$('hint'+n).hidden=!state.hints[n-1];const b=document.querySelector('[data-hint="'+n+'"]');b.disabled=state.hints[n-1]||state.solved[n-1];b.textContent=state.hints[n-1]?'Ledtråd använd (−5 poäng)':'Visa ledtråd (−5 poäng)';}
 showLamps('targets',variant.target);showLamps('lamps',E.lamps(variant.columns,state.mask));
 $('switches').replaceChildren();for(let i=0;i<6;i++){const b=document.createElement('button');const on=!!(state.mask&(1<<i));b.textContent=String.fromCharCode(65+i)+' · '+(on?'PÅ':'AV');b.setAttribute('aria-pressed',String(on));b.disabled=state.solved[0];b.onclick=()=>{if(!canPlay(1))return;state.mask^=1<<i;state.log.push('Reglage '+String.fromCharCode(65+i)+': '+(on?'AV':'PÅ')+' → tända lampor '+Array.from({length:6},(_,n)=>n+1).filter(n=>E.lamps(variant.columns,state.mask)&(1<<(n-1))).join(', '));if(state.log.length>40)state.log.shift();save();render();};$('switches').append(b);}
 $('panel-log').replaceChildren();state.log.forEach(t=>{const li=document.createElement('li');li.textContent=t;$('panel-log').append(li);});
 $('reset-panel').disabled=state.solved[0];$('check-panel').disabled=state.solved[0];
 $('probe-log').replaceChildren();Object.entries(state.probes).sort((a,b)=>Number(a[0])-Number(b[0])).forEach(([x,y])=>{const tr=document.createElement('tr');for(const v of [x,y]){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('probe-log').append(tr);});
 $('predict-button').disabled=state.solved[1];
 for(let r=1;r<=5;r++){$('reward'+r).hidden=!state.solved[r-1];$('reward'+r).textContent='Rum klart! Er kod: '+E.code(variant,r);$('gate'+r).hidden=!state.solved[r-1]||state.unlocked>r;}
 $('observations').textContent=state.solved[0]?'Godkänd panel: '+Array.from({length:6},(_,i)=>String.fromCharCode(65+i)+' '+((state.panelSolution&(1<<i))?'PÅ':'AV')).join(' · '):'Ingen godkänd panelinställning ännu.';
 $('result-title').textContent=state.test?'TESTRESULTAT':state.finishedAt?'SYSTEMET ÄR IGÅNG':expired()?'TIDEN ÄR SLUT':'UPPDRAG PÅGÅR';$('result-team').textContent='Lag '+state.team+' · '+state.name;
 $('result-score').textContent=total()+' poäng';$('result-rooms').textContent=state.solved.filter((done,i)=>done&&(i!==3||CONFIG.photoEnabled)).length+' av '+(CONFIG.photoEnabled?6:5)+' rum klara';$('result-hints').textContent='Använda ledtrådar: '+state.hints.filter(Boolean).length;
 $('session-label').textContent='Omgångskod: '+state.session+' · Start '+new Date(state.startedAt).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});
 $('result-session').textContent='Omgångskod: '+state.session;
 $('result-time').textContent=state.test?'Testläge – räknas inte i tävlingen':'Start: '+new Date(state.startedAt).toLocaleTimeString('sv-SE')+' · Speltid: '+elapsedLabel();
 $('test-banner').hidden=!state.test;$('reset-test').hidden=!state.test;
 $('photo-disabled').hidden=CONFIG.photoEnabled;$('photo-form').hidden=!CONFIG.photoEnabled;
 document.querySelector('[data-hint="4"]').hidden=!CONFIG.photoEnabled;$('skip-photo').hidden=CONFIG.photoEnabled;
 $('photo-placeholder').hidden=CONFIG.photoEnabled&&photoLoaded;$('school-photo').hidden=!CONFIG.photoEnabled||!photoLoaded;
 $('weigh-count').textContent='Vägningar: '+state.weighings.length+' / 2 · Försök '+(state.round+1);
 $('weigh-log').replaceChildren();state.weighings.forEach(t=>{const li=document.createElement('li');li.textContent=t;$('weigh-log').append(li);});
 $('weigh').disabled=state.solved[5]||state.weighings.length>=2;
 if(!state.test&&expired())document.querySelectorAll('#game form input, #game form select, #game form button, #game textarea, #switches button, [data-hint], #reset-panel, #check-panel, #weigh, #skip-photo, #scale-parts select').forEach(el=>el.disabled=true);
 updateClock();
}
function init(){variant=E.makeVariant(state.team);$('predictions').replaceChildren();variant.inputs.forEach((x,i)=>{const label=document.createElement('label');label.textContent='Resultat för '+x;const input=document.createElement('input');input.id='prediction'+i;input.type='number';input.step='1';input.required=true;label.append(input);$('predictions').append(label);});$('notes').value=state.notes;active=state.unlocked;render();}
$('start-form').onsubmit=async e=>{
 e.preventDefault();
 const name=$('name').value.trim(),input=$('start-code').value.trim().toUpperCase();
 if(!name)return;
 if(!globalThis.crypto?.subtle){$('start-message').textContent='Öppna sidan via HTTPS eller localhost för att starta.';return;}
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input))),b=>b.toString(16).padStart(2,'0')).join('');
 const test=hash===CONFIG.testHash,match=CONFIG.startCodes.find(r=>r.hash===hash);
 if(!test&&!match){$('start-message').textContent='Startkoden stämmer inte. Kontrollera med läraren.';return;}
 storageKey=storagePrefix+hash;
 let existing;try{existing=JSON.parse(localStorage.getItem(storageKey));}catch{}
 if(validState(existing)){state=existing;}else{
 const team=test?1:match.team;
 const session=(test?'TEST-':'L'+String(team).padStart(2,'0')+'-')+Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
 state={team,name,test,session,startedAt:Date.now(),finishedAt:null,mask:0,panelSolution:null,solved:Array(6).fill(false),hints:Array(6).fill(false),unlocked:1,probes:{},notes:'',log:[],round:0,weighings:[]};save();
 }
 try{localStorage.setItem(storagePrefix+'active',storageKey);}catch{}
 init();
};
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>visit(Number(b.dataset.room)));
$('reset-panel').onclick=()=>{if(!canPlay(1))return;state.mask=0;state.log.push('Alla reglage återställda till AV.');save();render();};
$('check-panel').onclick=()=>{if(!canPlay(1))return;if(E.lamps(variant.columns,state.mask)===variant.target){state.solved[0]=true;state.panelSolution=state.mask;$('panel-message').textContent='Panelen är rätt inställd. Använd koden nedan.';save();render();}else $('panel-message').textContent='Lamporna matchar inte målet ännu.';};
for(let room=1;room<=5;room++)$('gate'+room).onsubmit=e=>{e.preventDefault();if(!canPlay(room))return;if(state.solved[room-1]&&$('code'+room).value.trim().toUpperCase()===E.code(variant,room)){state.unlocked=Math.max(state.unlocked,room+1);save();visit(room+1);}else $('gate-message'+room).textContent='Koden stämmer inte. Läs resultatet ovan.';};
$('probe-form').onsubmit=e=>{e.preventDefault();if(!canPlay(2))return;const x=Number($('probe').value);if(!Number.isInteger(x)||x< -10||x>10)return;state.probes[x]=E.machine(variant,x);$('probe-message').textContent=x+' → '+state.probes[x];save();render();};
$('predict-form').onsubmit=e=>{e.preventDefault();if(!canPlay(2))return;if(Object.keys(state.probes).length<3){$('predict-message').textContent='Testa minst tre olika tal innan ni lämnar era förutsägelser.';return;}const correct=variant.inputs.every((x,i)=>Number($('prediction'+i).value)===E.machine(variant,x));if(correct){state.solved[1]=true;$('predict-message').textContent='Tre rätt! Maskinens regel är knäckt.';save();render();}else $('predict-message').textContent='Minst ett svar är fel. Undersök regeln med fler tester.';};
$('final-form').onsubmit=e=>{e.preventDefault();if(!canPlay(3))return;const answers=E.finalAnswer(variant);if(answers.every((v,i)=>Number($('final'+(i+1)).value)===v)){state.solved[2]=true;$('final-message').textContent='Kontrollrummet är klart. Använd koden för nästa rum.';save();render();}else $('final-message').textContent='Inställningarna stämmer inte. Kontrollera alla tre värden.';};
document.querySelectorAll('[data-hint]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.hint)-1;if(!canPlay(i+1))return;if(confirm('Ledtråden minskar detta rums poäng med 5. Vill ni fortsätta?')){state.hints[i]=true;save();render();}});
$('notes').oninput=()=>{if(expired())return;state.notes=$('notes').value;save();};

$('reset-game').onclick=()=>{try{localStorage.removeItem(storagePrefix+'active');}catch{}location.reload();};
$('reset-test').onclick=()=>{if(state?.test&&confirm('Nollställ testomgången?')){try{localStorage.removeItem(storageKey);localStorage.removeItem(storagePrefix+'active');}catch{}location.reload();}};
let photoLoaded=false;
$('school-photo').onload=()=>{photoLoaded=true;if(state)render();};
$('school-photo').onerror=()=>{photoLoaded=false;$('photo-placeholder').textContent='Skolbilden saknas. Lägg plats.jpg i samma mapp som index.html och ladda om sidan.';if(state)render();};
if(CONFIG.photoEnabled)$('school-photo').src=CONFIG.photoPath;
function validState(s){return s&&Number.isInteger(s.team)&&s.team>=1&&s.team<=20&&typeof s.name==='string'&&typeof s.test==='boolean'&&Number.isFinite(s.startedAt)&&Array.isArray(s.solved)&&s.solved.length===6&&Array.isArray(s.hints)&&s.hints.length===6&&Number.isInteger(s.unlocked)&&s.unlocked>=1&&s.unlocked<=6&&s.probes&&Array.isArray(s.log)&&Array.isArray(s.weighings);}
function expired(){return !!state&&!state.test&&(Date.now()-state.startedAt>=CONFIG.durationMinutes*60000)&&!state.finishedAt;}
function canPlay(room){if(!state||expired()||state.finishedAt&&!state.test)return false;return state.test||room<=state.unlocked;}
function elapsedLabel(){const seconds=Math.floor(Math.max(0,Math.min((state.finishedAt||Date.now())-state.startedAt,CONFIG.durationMinutes*60000))/1000);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
function updateClock(){if(!state)return;const seconds=Math.ceil(Math.max(0,CONFIG.durationMinutes*60000-((state.finishedAt||Date.now())-state.startedAt))/1000);$('clock').textContent=state.test?'TESTLÄGE':state.finishedAt?'KLART · '+elapsedLabel():Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' KVAR';$('expired-banner').hidden=!expired();}
let wasExpired=false;
setInterval(()=>{if(!state)return;updateClock();if(expired()&&!wasExpired){wasExpired=true;render();$('receipt').scrollIntoView({behavior:'smooth'});}},1000);
function finishIfComplete(){if(state.solved.every((s,i)=>s||(i===3&&!CONFIG.photoEnabled))&&!state.finishedAt)state.finishedAt=Date.now();}
$('download-file').onclick=()=>{if(!canPlay(5))return;const blob=new Blob([E.hiddenText(variant)],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='signal-lag-'+state.team+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('file-form').onsubmit=e=>{e.preventDefault();if(!canPlay(5))return;if($('file-key').value.trim().toUpperCase()===E.textKey(variant)){state.solved[4]=true;$('file-message').textContent='Nyckeln är rätt. Öppna nästa rum med koden nedan.';save();render();}else $('file-message').textContent='Nyckeln stämmer inte ännu.';};
$('photo-form').onsubmit=e=>{e.preventDefault();if(!canPlay(4)||!CONFIG.photoEnabled)return;if($('photo-key').value.trim()===CONFIG.photoCode){state.solved[3]=true;$('photo-message').textContent='Rätt plats, rätt kod!';finishIfComplete();save();render();}else $('photo-message').textContent='Koden stämmer inte.';};
$('skip-photo').onclick=()=>{if(!canPlay(4)||CONFIG.photoEnabled)return;state.unlocked=5;save();visit(5);};
for(let i=1;i<=8;i++){
 const label=document.createElement('label');label.textContent='Komponent '+i;const select=document.createElement('select');select.id='component'+i;
 for(const [v,t]of [['out','Utanför'],['left','Vänster'],['right','Höger']]){const option=document.createElement('option');option.value=v;option.textContent=t;select.append(option);}label.append(select);$('scale-parts').append(label);
 const option=document.createElement('option');option.value=String(i);option.textContent=String(i);$('heavy-choice').append(option);
}
$('weigh').onclick=()=>{
 if(!canPlay(6)||state.solved[5]||state.weighings.length>=2)return;
 const left=[],right=[];for(let i=1;i<=8;i++){if($('component'+i).value==='left')left.push(i);if($('component'+i).value==='right')right.push(i);}
 if(left.length===0||left.length!==right.length){$('scale-message').textContent='Lägg lika många komponenter på varje sida, minst en per sida.';return;}
 const result=E.weigh(variant,state.round,left,right);const message=result===0?'Balans':result>0?'Vänster sida är tyngre':'Höger sida är tyngre';
 state.weighings.push('Vänster: '+left.join(', ')+' | Höger: '+right.join(', ')+' → '+message);$('scale-message').textContent=message;save();render();
};
$('heavy-form').onsubmit=e=>{
 e.preventDefault();if(!canPlay(6)||state.solved[5])return;
 if(state.weighings.length===0){$('heavy-message').textContent='Gör minst en vägning innan ni lämnar svaret.';return;}
 if(Number($('heavy-choice').value)===E.heavy(variant,state.round)){state.solved[5]=true;$('heavy-message').textContent='Rätt komponent! Fotografera resultatet.';finishIfComplete();save();render();$('receipt').focus();$('receipt').scrollIntoView({behavior:'smooth'});}
 else{state.round++;state.weighings=[];$('heavy-choice').value='';for(let i=1;i<=8;i++)$('component'+i).value='out';$('heavy-message').textContent='Fel komponent. Nytt försök: en annan komponent är nu tyngre. Ni har två nya vägningar.';$('scale-message').textContent='';save();render();}
};
try{const key=localStorage.getItem(storagePrefix+'active');if(key?.startsWith(storagePrefix)){const saved=JSON.parse(localStorage.getItem(key));if(validState(saved)){storageKey=key;state=saved;init();}}}catch{}
