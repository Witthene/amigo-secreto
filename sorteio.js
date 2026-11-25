import { ref, getDoc, runTransaction, db, $, tela, esc, sleep, rnd, cabecalho } from './comum.js?v=11251222';

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
const chaveLocal = r => 'amigo_sousa_' + r;
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

async function revelar(tirado, dica, pool, suspense){
  const palco = $('#palco');
  palco.classList.remove('treme'); palco.classList.add('aberto');
  $('#acao').innerHTML = `<div class="etiqueta" id="etq"><small>Você tirou</small><div class="nome" id="nm"></div>
      <div class="dica hide" id="dc"><small>Dica de presente</small><p></p></div></div>
    <p class="aviso">Guarde segredo até o grande dia.<br>Abra este link de novo neste celular pra rever e ver se a dica chegou.</p>`;
  await sleep(350); $('#etq').classList.add('mostra');
  const nm = $('#nm');
  if (suspense && pool.length > 1) {
    nm.classList.add('girando');
    let v = 50, i = rnd(pool.length);
    while (v < 380) { nm.textContent = pool[i++ % pool.length]; await sleep(v); v *= 1.13; }
    nm.classList.remove('girando');
  }
  nm.textContent = tirado;
  const dc = $('#dc');
  dc.querySelector('p').textContent = dica || `${tirado} ainda não deixou uma dica. Volte depois!`;
  dc.classList.remove('hide');
  if (suspense) confete();
}

async function iniciar(){
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : null;
  tela(`${cabecalho('Amigo Secreto da Família Sousa', 'Quem você vai<em>tirar este ano?</em>', 'a surpresa começa <b>agora!</b>')}
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
    <button class="btn" id="ir">sortear <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg></button>
    <p class="erro" id="erro"></p>`;

  $('#ir').onclick = async () => {
    const digitado = norm($('#eu').value);
    const nome = d.nomes.find(n => norm(n) === digitado);
    const dica = $('#dica').value.trim();
    if (!digitado) { $('#erro').textContent = 'Digite seu nome.'; return; }
    if (!nome) { $('#erro').textContent = 'Esse nome não está na lista. Escreva igual o organizador cadastrou.'; return; }
    $('#erro').textContent = '';
    $('#ir').disabled = true; $('#palco').classList.add('treme');
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
      }), sleep(1400)]);
      localStorage.setItem(chaveLocal(rodada), JSON.stringify({ t }));
      revelar(t, dicaT, d.nomes.filter(n => n !== nome), true);
    } catch (e) {
      $('#palco').classList.remove('treme');
      $('#erro').textContent = e.message === 'ja' ? `${nome} já fez o sorteio.` : e.message === 'vazio' ? 'Não sobrou nome pra sortear. Avise o organizador.' : 'Deu um probleminha, tenta de novo.';
      $('#ir').disabled = false;
    }
  };
}
iniciar();