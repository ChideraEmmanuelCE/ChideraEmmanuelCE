import {STEPS, TRACKS, PRESETS, emptyPattern, validateLoop, stepDuration, randomPattern} from './core.mjs';
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'ce-pocket-groove-loop-v1';
const colors = ['#e77a4e','#96ad8d','#c9a960','#9e94b5'];
let pattern = PRESETS[0].pattern.map(r=>[...r]), tempo=96, swing=12, muted=[false,false,false,false], preset=0;
let ctx, master, compressor, noiseBuffer, playing=false, starting=false, interval, frame, nextTime=0, nextStep=0, queue=[], current=-1, generation=0;
const sources=new Set(), pads=[], muteButtons=[];
function message(text){$('message').textContent=text;}
function markCustom(){preset=-1;renderPresets();$('presetDescription').textContent='Your own pocket. Keep going.';}
function renderPresets(){document.querySelectorAll('.preset').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===preset)));}
function renderPads(){pads.forEach((row,r)=>row.forEach((b,s)=>b.setAttribute('aria-pressed',String(pattern[r][s]))));muted.forEach((m,r)=>{muteButtons[r].setAttribute('aria-pressed',String(m));$('track'+r).classList.toggle('muted',m);});}
function renderSettings(){for(const [name,value,unit] of [['tempo',tempo,' BPM'],['swing',swing,'%']]){$(name).value=value;$(name+'Value').textContent=value+unit;}$('screenTempo').textContent=tempo;}
function focusPad(row,step){pads.flat().forEach(b=>b.tabIndex=-1);pads[row][step].tabIndex=0;pads[row][step].focus();}
const speakerIcon='<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h3l4-4v12l-4-4H3Zm10-1q3 3 0 6"/></svg>';
for(let s=0;s<STEPS;s++){const label=document.createElement('span');label.textContent=String(s+1).padStart(2,'0');label.className='beat-head'+(s%4===0?' bar':'');$('numbers').append(label);}
TRACKS.forEach((name,r)=>{
  const track=document.createElement('div');track.className='track';track.id='track'+r;track.style.setProperty('--track',colors[r]);
  const label=document.createElement('div');label.className='track-label';const text=document.createElement('span');text.className='track-name';text.innerHTML='<span class="track-dot"></span>';text.append(document.createTextNode(name));
  const mute=document.createElement('button');mute.setAttribute('aria-label','Mute '+name);mute.setAttribute('aria-pressed','false');mute.innerHTML=speakerIcon;mute.addEventListener('click',()=>{muted[r]=!muted[r];renderPads();markCustom();});muteButtons.push(mute);label.append(text,mute);track.append(label);
  const steps=document.createElement('div');steps.className='pads';steps.setAttribute('role','group');steps.setAttribute('aria-label',name+' sequence');pads[r]=[];
  for(let s=0;s<STEPS;s++){const b=document.createElement('button');b.className='pad';b.setAttribute('aria-label',name+', step '+(s+1));b.setAttribute('aria-pressed',String(pattern[r][s]));b.tabIndex=r===0&&s===0?0:-1;
    b.addEventListener('click',()=>{pattern[r][s]=!pattern[r][s];b.setAttribute('aria-pressed',String(pattern[r][s]));pads.flat().forEach(p=>p.tabIndex=-1);b.tabIndex=0;markCustom();});
    b.addEventListener('keydown',e=>{const moves={ArrowRight:[r,(s+1)%STEPS],ArrowLeft:[r,(s+STEPS-1)%STEPS],ArrowDown:[(r+1)%TRACKS.length,s],ArrowUp:[(r+TRACKS.length-1)%TRACKS.length,s]};if(moves[e.key]){e.preventDefault();focusPad(...moves[e.key]);}});pads[r][s]=b;steps.append(b);
  }track.append(steps);$('tracks').append(track);
});
PRESETS.forEach((p,i)=>{const b=document.createElement('button');b.className='preset';b.innerHTML='<strong></strong><span></span>';b.querySelector('strong').textContent=p.name;b.querySelector('span').textContent=p.tempo+' BPM';b.setAttribute('aria-pressed',String(i===preset));b.addEventListener('click',()=>{stop();pattern=p.pattern.map(r=>[...r]);tempo=p.tempo;swing=p.swing;muted=[false,false,false,false];preset=i;renderPads();renderSettings();renderPresets();$('presetDescription').textContent=p.description;message(p.name+' loaded. Press Play to hear it.');});$('presets').append(b);});
function connectSource(source,nodes,time,duration){sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};source.start(time);source.stop(time+duration);}
function kick(time){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(145,time);osc.frequency.exponentialRampToValueAtTime(43,time+.16);gain.gain.setValueAtTime(.8,time);gain.gain.exponentialRampToValueAtTime(.001,time+.33);osc.connect(gain).connect(master);connectSource(osc,[gain],time,.35);}
function noise(time,duration,level,frequency,type,clap=false){const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noiseBuffer;filter.type=type;filter.frequency.value=frequency;gain.gain.setValueAtTime(.001,time);
  if(clap){for(let i=0;i<3;i++){gain.gain.linearRampToValueAtTime(level,time+i*.018+.002);gain.gain.exponentialRampToValueAtTime(.001,time+i*.018+.016);}gain.gain.setValueAtTime(level*.55,time+.055);gain.gain.exponentialRampToValueAtTime(.001,time+duration);}
  else{gain.gain.linearRampToValueAtTime(level,time+.002);gain.gain.exponentialRampToValueAtTime(.001,time+duration);}
  src.connect(filter).connect(gain).connect(master);connectSource(src,[filter,gain],time,duration+.01);
}
function snare(time){noise(time,.18,.5,1400,'highpass');const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(185,time);osc.frequency.exponentialRampToValueAtTime(110,time+.09);gain.gain.setValueAtTime(.25,time);gain.gain.exponentialRampToValueAtTime(.001,time+.12);osc.connect(gain).connect(master);connectSource(osc,[gain],time,.14);}
const voices=[kick,snare,t=>noise(t,.055,.24,6500,'highpass'),t=>noise(t,.17,.55,1450,'bandpass',true)];
function initAudio(){if(ctx)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio is unavailable');ctx=new Audio();master=ctx.createGain();master.gain.value=Number($('volume').value)/100*.7;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-14;compressor.knee.value=15;compressor.ratio.value=4;master.connect(compressor).connect(ctx.destination);noiseBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.5),ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
function schedule(){if(!playing)return;const now=ctx.currentTime;if(nextTime<now){nextTime=now+.05;queue=[];}while(nextTime<now+.1){for(let r=0;r<TRACKS.length;r++)if(pattern[r][nextStep]&&!muted[r])voices[r](nextTime);queue.push({step:nextStep,time:nextTime});nextTime+=stepDuration(nextStep,tempo,swing);nextStep=(nextStep+1)%STEPS;}}
function paint(step){if(current>=0){pads.forEach(row=>row[current].classList.remove('current'));$('numbers').children[current].classList.remove('current');}current=step;if(step>=0){pads.forEach(row=>row[step].classList.add('current'));$('numbers').children[step].classList.add('current');$('position').textContent=String(step+1).padStart(2,'0')+' / 16';}else $('position').textContent='01 / 16';}
function animate(){if(!playing)return;while(queue.length&&queue[0].time<=ctx.currentTime)paint(queue.shift().step);frame=requestAnimationFrame(animate);}
function transport(){document.querySelector('.machine').classList.toggle('playing',playing);$('play').setAttribute('aria-pressed',String(playing));$('playLabel').textContent=playing?'Stop groove':'Play groove';$('playIcon').innerHTML=playing?'<path d="M5 4h10v12H5Z"/>':'<path d="m5 3 11 7-11 7Z"/>';$('playStatus').textContent=playing?'In the pocket':'Ready when you are';}
function stop(){generation++;playing=false;starting=false;clearInterval(interval);cancelAnimationFrame(frame);queue=[];for(const source of sources){try{source.stop();}catch{/* Already ended. */}}sources.clear();paint(-1);$('play').disabled=false;transport();}
async function play(){if(playing||starting){stop();return;}const attempt=++generation;starting=true;$('play').disabled=true;try{initAudio();await ctx.resume();if(attempt!==generation)return;if(ctx.state!=='running')throw new Error('Audio did not start');starting=false;playing=true;nextStep=0;nextTime=ctx.currentTime+.05;transport();schedule();interval=setInterval(schedule,25);frame=requestAnimationFrame(animate);message('You are in the pocket. Change steps while the groove plays.');}catch{if(attempt===generation){stop();message('Sound could not start. Try Play again in a browser with Web Audio enabled.');}}finally{if(attempt===generation)$('play').disabled=false;}}
$('play').addEventListener('click',play);
$('tempo').addEventListener('input',e=>{tempo=Number(e.target.value);renderSettings();markCustom();});
$('swing').addEventListener('input',e=>{swing=Number(e.target.value);renderSettings();markCustom();});
$('volume').addEventListener('input',e=>{const value=Number(e.target.value);$('volumeValue').textContent=value+'%';if(master)master.gain.setTargetAtTime(value/100*.7,ctx.currentTime,.025);});
$('randomize').addEventListener('click',()=>{pattern=randomPattern();renderPads();markCustom();message('A fresh groove. Play it, then make it your own.');});
$('clear').addEventListener('click',()=>{stop();pattern=emptyPattern();renderPads();markCustom();message('A blank pattern. Start with a kick on step 1.');});
function snapshot(){return validateLoop({version:1,pattern,tempo,swing,muted});}
function readSaved(){const raw=localStorage.getItem(STORAGE_KEY);return raw?validateLoop(JSON.parse(raw)):null;}
$('save').addEventListener('click',()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot()));$('load').disabled=false;message('Loop saved in this browser. Saving again replaces this saved loop.');}catch{message('This browser could not save the loop. Check its storage settings.');}});
$('load').addEventListener('click',()=>{try{const saved=readSaved();if(!saved){$('load').disabled=true;message('No saved loop in this browser yet.');return;}stop();({pattern,tempo,swing,muted}=saved);markCustom();renderPads();renderSettings();message('Your saved loop is back. Press Play when you are ready.');}catch{message('The saved loop could not be loaded. Save a new loop to replace it.');}});
try{$('load').disabled=!readSaved();}catch{message('Saved loops are unavailable in this browser. You can still make music.');}
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.altKey&&!e.metaKey&&!e.ctrlKey&&!e.target.closest('button,input,textarea,select,a,[contenteditable=true]')){e.preventDefault();play();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(playing||starting)){stop();message('Playback paused while this tab was hidden. Press Play to continue.');}});
window.addEventListener('pagehide',stop);
renderPads();renderSettings();
