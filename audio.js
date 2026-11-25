// Trilha e efeitos sintetizados na hora (sem arquivos de áudio)
let ctx, mestre, musicaGain, ligado = localStorage.getItem('som') !== 'off', musicaTocando = false, rufarNo = null;

function iniciar(){
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  mestre = ctx.createGain(); mestre.gain.value = ligado ? 1 : 0; mestre.connect(ctx.destination);
  // eco suave pra dar ambiência
  const atraso = ctx.createDelay(); atraso.delayTime.value = 0.28;
  const retorno = ctx.createGain(); retorno.gain.value = 0.28;
  atraso.connect(retorno); retorno.connect(atraso); atraso.connect(mestre);
  musicaGain = ctx.createGain(); musicaGain.gain.value = 0.16;
  musicaGain.connect(mestre); musicaGain.connect(atraso);
}

function nota(freq, quando, dur = 0.6, tipo = 'triangle', vol = 0.3, destino){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(0, quando);
  g.gain.linearRampToValueAtTime(vol, quando + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  o.connect(g); g.connect(destino || mestre);
  o.start(quando); o.stop(quando + dur + 0.05);
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// caixinha de música: melodia alegre em loop
const MELODIA = [72,76,79,84, 83,79,76,79, 81,77,72,77, 76,74,72,null, 72,76,79,84, 86,84,79,76, 77,81,79,74, 72,null,null,null];
const BAIXO = [48,48,53,55, 48,48,53,43];
function tocarMusica(){
  if (musicaTocando) return; musicaTocando = true;
  const passo = 0.24;
  let inicio = ctx.currentTime + 0.1;
  const ciclo = () => {
    if (!musicaTocando) return;
    MELODIA.forEach((m, i) => { if (m) { nota(hz(m), inicio + i * passo, 0.9, 'sine', 0.5, musicaGain); nota(hz(m + 12), inicio + i * passo, 0.4, 'triangle', 0.12, musicaGain); } });
    BAIXO.forEach((m, i) => nota(hz(m), inicio + i * passo * 4, 1.1, 'sine', 0.35, musicaGain));
    inicio += MELODIA.length * passo;
    setTimeout(ciclo, (inicio - ctx.currentTime - 0.5) * 1000);
  };
  ciclo();
}

function ruido(dur){
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}

export const som = {
  clique(){ if (!ctx) return; const t = ctx.currentTime; nota(hz(84), t, 0.12, 'square', 0.08); nota(hz(91), t + 0.05, 0.15, 'triangle', 0.12); },
  tic(){ if (!ctx) return; nota(hz(96), ctx.currentTime, 0.06, 'square', 0.05); },
  rufar(liga){
    if (!ctx) return;
    if (liga && !rufarNo) {
      const s = ruido(4); s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 22; const lg = ctx.createGain(); lg.gain.value = 0.18;
      lfo.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.12, ctx.currentTime); g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.5);
      s.connect(f); f.connect(g); g.connect(mestre); s.start(); lfo.start();
      musicaGain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.2);
      rufarNo = { s, lfo, g };
    } else if (!liga && rufarNo) {
      const { s, lfo, g } = rufarNo; rufarNo = null;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => { s.stop(); lfo.stop(); }, 300);
    }
  },
  pop(){ if (!ctx) return; const t = ctx.currentTime; const s = ruido(0.3); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); s.connect(f); f.connect(g); g.connect(mestre); s.start(t); nota(120, t, 0.25, 'sine', 0.5); },
  tada(){
    if (!ctx) return;
    som.rufar(false);
    const t = ctx.currentTime + 0.05;
    nota(110, t - 0.03, 0.4, 'sine', 0.6); // pancada
    [[60,64,67],[65,69,72],[67,71,74],[72,76,79,84]].forEach((ac, i) => ac.forEach(m => {
      nota(hz(m), t + i * 0.16, i === 3 ? 1.8 : 0.3, 'sawtooth', 0.05);
      nota(hz(m), t + i * 0.16, i === 3 ? 2.2 : 0.35, 'triangle', 0.12);
    }));
    [96, 100, 103, 108, 103, 108].forEach((m, i) => nota(hz(m), t + 0.7 + i * 0.07, 0.6, 'sine', 0.1)); // brilhinhos
    musicaGain.gain.setTargetAtTime(0.16, ctx.currentTime + 2.5, 0.8);
    if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 200]);
  },
};
som.musica = () => { iniciar(); ctx.resume(); if (ligado) tocarMusica(); };
window.som = som;

// botão de ligar/desligar o som
const bt = document.createElement('button');
bt.className = 'somBtn';
const icone = () => bt.innerHTML = ligado
  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>'
  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6"/></svg>';
icone();
bt.onclick = e => {
  e.stopPropagation(); iniciar();
  ligado = !ligado; localStorage.setItem('som', ligado ? 'on' : 'off'); icone();
  mestre.gain.setTargetAtTime(ligado ? 1 : 0, ctx.currentTime, 0.1);
  if (ligado) tocarMusica();
};
document.body.appendChild(bt);

// navegadores só liberam som depois do primeiro toque
const destrava = () => { iniciar(); ctx.resume(); if (ligado && !document.body.classList.contains('intro')) tocarMusica(); removeEventListener('pointerdown', destrava); };
addEventListener('pointerdown', destrava);

// sons automáticos: cliques em botões, rufar ao sortear, fanfarra ao abrir, tique nos nomes girando
document.addEventListener('click', e => { if (e.target.closest('button:not(.somBtn)')) som.clique(); });
new MutationObserver(() => {
  const p = document.getElementById('palco');
  if (!p || p.dataset.som) return; p.dataset.som = 1;
  new MutationObserver(() => {
    if (p.classList.contains('treme')) som.rufar(true);
    if (p.classList.contains('aberto') && !p.dataset.tada) { p.dataset.tada = 1; som.pop(); }
  }).observe(p, { attributes: true, attributeFilter: ['class'] });
}).observe(document.getElementById('app'), { childList: true, subtree: true });
new MutationObserver(muts => {
  const nm = document.getElementById('nm');
  if (!nm) return;
  if (muts.some(m => m.target === nm || nm.contains(m.target))) {
    if (nm.classList.contains('girando')) som.tic();
    else if (nm.textContent && !nm.dataset.fim) { nm.dataset.fim = 1; som.tada(); }
  }
}).observe(document.getElementById('app'), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
