// Trilha ambiente e efeitos cinematográficos, sintetizados na hora
let ctx, mestre, musicaGain, reverb, ligado = localStorage.getItem('som') !== 'off', musicaTocando = false, batidaTimer = null;

function criarReverb(){
  const dur = 3.5, len = ctx.sampleRate * dur, b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const r = ctx.createConvolver(); r.buffer = b; return r;
}
function iniciar(){
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  mestre = ctx.createGain(); mestre.gain.value = ligado ? 1 : 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  mestre.connect(comp); comp.connect(ctx.destination);
  reverb = criarReverb(); const rv = ctx.createGain(); rv.gain.value = 0.55; reverb.connect(rv); rv.connect(mestre);
  musicaGain = ctx.createGain(); musicaGain.gain.value = 0.0;
  musicaGain.connect(mestre); musicaGain.connect(reverb);
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function nota(freq, quando, dur = 0.6, tipo = 'sine', vol = 0.3, destino, ataque = 0.01){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(0, quando);
  g.gain.linearRampToValueAtTime(vol, quando + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  o.connect(g); g.connect(destino || mestre);
  if (!destino) g.connect(reverb);
  o.start(quando); o.stop(quando + dur + 0.05);
  return o;
}
function ruido(dur){
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}

// trilha: acordes longos e suaves + notas de piano esparsas (Ré maior / Si menor / Sol / Lá)
const ACORDES = [[50,57,62,66,69],[47,54,59,62,66],[43,50,55,59,62],[45,52,57,61,64]];
const PIANO = [[74,78],[73,71],[71,74],[76,73]];
function tocarMusica(){
  if (musicaTocando) return; musicaTocando = true;
  musicaGain.gain.cancelScheduledValues(ctx.currentTime);
  musicaGain.gain.setTargetAtTime(0.22, ctx.currentTime, 1.5);
  const comp = 4.8; let t = ctx.currentTime + 0.2, n = 0;
  const ciclo = () => {
    if (!musicaTocando) return;
    const i = n % 4, ac = ACORDES[i];
    ac.forEach(m => { const o = nota(hz(m), t, comp + 1.5, 'sine', 0.06, musicaGain, 1.6); o.detune.value = (Math.random() - .5) * 8; });
    ac.slice(1, 3).forEach(m => nota(hz(m + 12), t, comp + 1, 'triangle', 0.015, musicaGain, 2));
    PIANO[i].forEach((m, k) => { nota(hz(m), t + 0.6 + k * 1.9, 3, 'sine', 0.09, musicaGain, 0.005); nota(hz(m + 12), t + 0.6 + k * 1.9, 1.2, 'sine', 0.02, musicaGain, 0.005); });
    t += comp; n++;
    setTimeout(ciclo, (t - ctx.currentTime - 1) * 1000);
  };
  ciclo();
}

export const som = {
  musica(){ iniciar(); ctx.resume(); if (ligado) tocarMusica(); },
  abaixar(v = 0.06){ if (ctx) musicaGain.gain.setTargetAtTime(v, ctx.currentTime, 0.6); },
  subir(){ if (ctx) musicaGain.gain.setTargetAtTime(0.22, ctx.currentTime, 1.5); },
  clique(){ if (!ctx) return; const t = ctx.currentTime; nota(hz(88), t, 0.25, 'sine', 0.06); },
  tic(){ if (!ctx) return; nota(hz(93 + Math.random() * 4 | 0), ctx.currentTime, 0.5, 'sine', 0.035); },
  // grave que "abre" a cena
  whoosh(){
    if (!ctx) return; const t = ctx.currentTime, s = ruido(2.5), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(2500, t + 1.2); f.frequency.exponentialRampToValueAtTime(150, t + 2.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 1); g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
    s.connect(f); f.connect(g); g.connect(mestre); g.connect(reverb); s.start(t);
  },
  batida(liga){
    if (!ctx) return;
    clearInterval(batidaTimer); batidaTimer = null;
    if (!liga) return;
    const pulso = () => { const t = ctx.currentTime; [0, 0.22].forEach((d, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(70, t + d); o.frequency.exponentialRampToValueAtTime(38, t + d + 0.18); g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(k ? 0.35 : 0.55, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.3); o.connect(g); g.connect(mestre); o.start(t + d); o.stop(t + d + 0.35); }); };
    pulso(); batidaTimer = setInterval(pulso, 900);
  },
  // lacre quebrando: estalo + impacto grave + brilho
  lacre(){
    if (!ctx) return; som.batida(false);
    const t = ctx.currentTime;
    const s = ruido(0.4), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); s.connect(f); f.connect(g); g.connect(mestre); g.connect(reverb); s.start(t);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.4);
    og.gain.setValueAtTime(0.9, t); og.gain.exponentialRampToValueAtTime(0.001, t + 1.6); o.connect(og); og.connect(mestre); o.start(t); o.stop(t + 1.7);
    [96, 100, 103, 107, 110].forEach((m, i) => nota(hz(m), t + 0.15 + i * 0.06, 1.6, 'sine', 0.05));
  },
  // acorde final que cresce, tipo trilha de filme
  revelacao(){
    if (!ctx) return; const t = ctx.currentTime;
    [50, 57, 62, 66, 69, 74, 78].forEach((m, i) => {
      nota(hz(m), t, 6, 'sawtooth', 0.012, null, 1.8);
      nota(hz(m), t, 6.5, 'sine', 0.07, null, 1.2);
    });
    [81, 86, 90, 93].forEach((m, i) => nota(hz(m), t + 1.2 + i * 0.35, 3, 'sine', 0.05));
    if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 260]);
  },
  // compatibilidade
  rufar(l){ som.batida(l); }, pop(){ som.lacre(); }, tada(){ som.revelacao(); },
  async fala(n){
    if (!ligado) return;
    const a = new Audio(`midia/fala${n}.mp3`); a.volume = 1;
    await new Promise(r => { a.onended = r; a.onerror = r; a.play().catch(r); });
  },
};
window.som = som;

// botão de ligar/desligar o som
const bt = document.createElement('button');
bt.className = 'somBtn'; bt.setAttribute('aria-label', 'Som');
const icone = () => bt.innerHTML = ligado
  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>'
  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6"/></svg>';
icone();
bt.onclick = e => {
  e.stopPropagation(); iniciar();
  ligado = !ligado; localStorage.setItem('som', ligado ? 'on' : 'off'); icone();
  mestre.gain.setTargetAtTime(ligado ? 1 : 0, ctx.currentTime, 0.1);
  if (ligado) tocarMusica();
};
document.body.appendChild(bt);

const destrava = () => { iniciar(); ctx.resume(); if (ligado && !document.body.classList.contains('intro')) tocarMusica(); removeEventListener('pointerdown', destrava); };
addEventListener('pointerdown', destrava);
document.addEventListener('click', e => { if (e.target.closest('button:not(.somBtn)')) som.clique(); });
