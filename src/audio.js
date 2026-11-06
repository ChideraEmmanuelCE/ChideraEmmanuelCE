/** Self-contained aircraft sound synthesis; no third-party assets or autoplay. */
export class FlightAudio{
 constructor(){this.ctx=null;this.enabled=true;this.gain=null;this.engineNodes=[];this.noise=null;this.active=false;this.kind='prop'}
 async resume(){try{if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.21;this.master.connect(this.ctx.destination);this.startEngine('prop')}if(this.ctx.state==='suspended')await this.ctx.resume();}catch(e){console.warn('Audio unavailable',e)}}
 startEngine(kind){if(!this.ctx)return;for(const n of this.engineNodes){try{n.stop()}catch{}}this.engineNodes=[];if(this.gain)this.gain.disconnect();this.gain=this.ctx.createGain();this.gain.gain.value=.0001;this.gain.connect(this.master);this.kind=kind;
  const spec=kind==='jet'||kind==='fighter'?[[47,'sawtooth',.13],[93,'triangle',.1],[155,'sine',.09]]:kind==='turboprop'?[[59,'sawtooth',.1],[112,'triangle',.11],[174,'sine',.08]]:[[37,'sawtooth',.13],[71,'triangle',.12],[103,'sine',.06]];
  for(const [f,type,g] of spec){const o=this.ctx.createOscillator(),amp=this.ctx.createGain();o.type=type;o.frequency.value=f;amp.gain.value=g;o.connect(amp);amp.connect(this.gain);o.start();this.engineNodes.push(o)}
  // Filtered noise conveys turbine airflow without downloading samples.
  const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);const a=buffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*.15;const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=420;source.connect(filter);filter.connect(this.gain);source.start();this.engineNodes.push(source);this.noiseFilter=filter;
 }
 update(throttle,speed,active){if(!this.ctx||!this.gain)return;const t=this.ctx.currentTime;this.gain.gain.setTargetAtTime(this.enabled&&active?.5+.4*throttle:.0001,t,.13);
  let base=this.kind==='jet'||this.kind==='fighter'?55:this.kind==='turboprop'?64:45;for(let i=0;i<Math.min(3,this.engineNodes.length);i++){this.engineNodes[i].frequency.setTargetAtTime(base*(i+1)*(.65+throttle*1.7),t,.09)}this.noiseFilter.frequency.setTargetAtTime(220+Math.min(1200,speed*3+throttle*500),t,.2)}
 chime(success=true){if(!this.ctx||!this.enabled)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type=success?'sine':'sawtooth';o.frequency.setValueAtTime(success?590:120,t);o.frequency.exponentialRampToValueAtTime(success?890:45,t+.34);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.11,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.46);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.5)}
 toggle(){this.enabled=!this.enabled;return this.enabled}
}
