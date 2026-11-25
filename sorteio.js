import { ref, getDoc, runTransaction, db, $, tela, esc, sleep, rnd, cabecalho } from './comum.js?v=1125140627';

const presente = () => document.getElementById('tplPresente').innerHTML;
// etiquetas com os nomes da família flutuando em volta do presente
const POS = [[0,20,-8],[100,6,7],[0,150,6],[100,136,-6],[4,262,-4],[96,258,5]];
function etiquetas(nomes){
  const n = [...nomes].sort(() => Math.random() - .5).slice(0, 5);
  const tags = ['?', ...n].slice(0, 6).map((nm, i) => {
    const [x, y, r] = POS[i];
    const voce = i === 0;
    return `<div class="tag${voce ? ' voce' : ''}" style="left:${x}%;top:${y}px;--r:${r}deg;--d:${3.4 + i * .4}s;margin-left:${x > 50 ? '-84px' : '0'};z-index:${i>3?3:1}"><i>${voce ? '★' : esc(nm[0].toUpperCase())}</i>${voce ? 'Você' : esc(nm)}</div>`;
  }).join('');
  $('#palco').insertAdjacentHTML('beforeend', tags);
}
const cap = n => String(n).toLocaleLowerCase('pt-BR').replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('pt-BR'));
const chaveLocal = r => 'amigo_sousa_' + r;
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const legenda = async (txt, ms) => { const l = $('#legenda'); l.textContent = txt; l.classList.add('on'); await sleep(ms); l.classList.remove('on'); await sleep(500); };
function escreverNome(nm, nome){
  nm.innerHTML = [...nome].map((c, i) => c === ' ' ? ' ' : `<span style="--i:${i}">${esc(c)}</span>`).join('');
  [...nome].forEach((c, i) => setTimeout(() => window.som && som.tic(), i * 100));
}

async function revelar(tirado, dica, pool, suspense){
  tirado = cap(tirado); pool = pool.map(cap);
  const palco = $('#palco'), nm = $('#nm');
  $('#acao').innerHTML = `<div class="etiqueta" id="etq"><span class="orn">✦</span><small>O que essa pessoa gostaria de ganhar</small><p id="dcp"></p></div>
    <p class="aviso">Guarde segredo até o grande dia.<br>Abra este link de novo neste celular para rever.</p>`;
  $('#dcp').textContent = dica || `${tirado} ainda não deixou uma dica. Volte mais tarde.`;
  if (!suspense) {
    palco.classList.add('aberto', 'sobe', 'frente'); nm.textContent = tirado;
    document.body.classList.add('revelado'); $('#etq').classList.add('mostra');
    return;
  }
  // 1. a cena se prepara
  document.body.classList.add('cena');
  window.som && (som.abaixar(), som.whoosh());
  await sleep(1800);
  // 2. o narrador
  await Promise.all([legenda('Entre todos os nomes da família...', 2800), window.som && som.fala(1)]);
  window.som && som.batida(true);
  palco.classList.add('treme');
  await Promise.all([legenda('um foi guardado só para você.', 3000), window.som && som.fala(2)]);
  await sleep(900);
  // 3. o lacre se parte
  palco.classList.remove('treme');
  const r = $('.lacre').getBoundingClientRect();
  window.faiscas && faiscas(r.left + r.width / 2, r.top + r.height / 2);
  document.getElementById('flash').classList.add('on');
  window.som && som.lacre();
  palco.classList.add('aberto');
  // 4. o cartão sai do envelope e vem pra frente
  await sleep(1000); palco.classList.add('sobe');
  await sleep(2000); palco.classList.add('frente');
  await sleep(700);
  // 5. o nome
  escreverNome(nm, tirado);
  window.som && som.revelacao();
  await sleep(900 + tirado.length * 100);
  confete();
  await sleep(1400);
  await Promise.all([legenda('Shhh... é segredo, tá? Não conta pra ninguém.', 3400), window.som && som.fala(3)]);
  // 6. volta pra tela calma com a dica
  document.body.classList.remove('cena'); document.body.classList.add('revelado');
  await sleep(600);
  $('#etq').classList.add('mostra');
  window.som && som.subir();
}
async function iniciar(){
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : null;
  tela(`${cabecalho('Família Sousa', 'Amigo<em>Secreto</em>')}
    ${presente()}
    <div id="acao"></div>`);

  if (!d || !d.nomes?.length) { $('#acao').innerHTML = `<p class="sub">O sorteio ainda não foi aberto.<br><b>Volte daqui a pouco.</b></p>`; return; }

  // já sorteou neste celular: mostra de novo com a dica atualizada
  const salvo = JSON.parse(localStorage.getItem(chaveLocal(d.rodada)) || 'null');
  if (salvo?.t) return revelar(salvo.t, d.dicas?.[salvo.t], [], false);

  $('#acao').innerHTML = `
    <div class="form">
      <label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>Seu nome</label>
      <input id="eu" placeholder="Digite seu nome" autocomplete="off">
      <label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>O que você gostaria de ganhar?</label>
      <textarea id="dica" maxlength="200" placeholder="Ex.: livro, perfume, algo de cozinha, tamanho M..."></textarea>
    </div>
    <button class="btn" id="ir">Abrir envelope <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></button>
    <p class="erro" id="erro"></p>`;

  $('#ir').onclick = async () => {
    const digitado = norm($('#eu').value);
    const nome = d.nomes.find(n => norm(n) === digitado);
    const dica = $('#dica').value.trim();
    if (!digitado) { $('#erro').textContent = 'Digite seu nome.'; return; }
    if (!nome) { $('#erro').textContent = 'Esse nome não está na lista. Escreva igual o organizador cadastrou.'; return; }
    $('#erro').textContent = '';
    $('#ir').disabled = true;
    try {
      const [{ t, dicaT, rodada }] = await Promise.all([runTransaction(db, async tx => {
        const x = (await tx.get(ref)).data();
        const ja = x.jaSortearam || [];
        if (ja.includes(nome)) throw new Error('ja');
        const faltam = x.nomes.filter(n => !ja.includes(n));
        const outro = faltam.find(n => n !== nome);
        let opcoes = x.disponiveis.filter(n => n !== nome);
        // se só faltam 2, garante que o último não fique com o próprio nome
        if (faltam.length === 2 && x.disponiveis.includes(outro)) opcoes = [outro];
        if (!opcoes.length) throw new Error('vazio');
        const t = opcoes[rnd(opcoes.length)];
        const dicas = { ...(x.dicas || {}) };
        if (dica) dicas[nome] = dica;
        tx.update(ref, { disponiveis: x.disponiveis.filter(n => n !== t), jaSortearam: [...ja, nome], dicas });
        return { t, dicaT: dicas[t], rodada: x.rodada };
      })]);
      localStorage.setItem(chaveLocal(rodada), JSON.stringify({ t }));
      revelar(t, dicaT, d.nomes.filter(n => n !== nome), true);
    } catch (e) {
      document.body.classList.remove('cena');
      $('#erro').textContent = e.message === 'ja' ? `${nome} já fez o sorteio.` : e.message === 'vazio' ? 'Não sobrou nome pra sortear. Avise o organizador.' : 'Deu um probleminha, tenta de novo.';
      $('#ir').disabled = false;
    }
  };
}
iniciar();