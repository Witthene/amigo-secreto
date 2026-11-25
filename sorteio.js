import { ref, getDoc, runTransaction, db, $, tela, esc, sleep, rnd, cabecalho } from './comum.js';

const presente = () => document.getElementById('tplPresente').innerHTML;
// etiquetas com os nomes da família flutuando em volta do presente
const POS = [[2,30,-8],[78,16,7],[0,180,6],[82,170,-6],[24,252,-4],[62,250,5]];
function etiquetas(nomes){
  const n = [...nomes].sort(() => Math.random() - .5).slice(0, 5);
  const tags = ['?', ...n].slice(0, 6).map((nm, i) => {
    const [x, y, r] = POS[i];
    const voce = i === 0;
    return `<div class="tag${voce ? ' voce' : ''}" style="left:${x}%;top:${y}px;--r:${r}deg;--d:${3.4 + i * .4}s;margin-left:${x > 50 ? '-84px' : '0'}"><i>${voce ? '★' : esc(nm[0].toUpperCase())}</i>${voce ? 'Você' : esc(nm)}</div>`;
  }).join('');
  $('#palco').insertAdjacentHTML('beforeend', tags);
}
const chaveLocal = r => 'amigo_sousa_' + r;

async function revelar(tirado, pool, suspense){
  const palco = $('#palco');
  palco.classList.remove('treme'); palco.classList.add('aberto');
  $('#acao').innerHTML = `<div class="etiqueta" id="etq"><small>Você tirou</small><div class="nome" id="nm"></div></div>
    <p class="aviso">Guarde segredo até o grande dia.<br>Se esquecer, é só abrir este link de novo neste celular.</p>
    <button class="mini" id="eu">Tirei meu próprio nome</button>`;
  await sleep(350); $('#etq').classList.add('mostra');
  const nm = $('#nm');
  if (suspense && pool.length > 1) {
    nm.classList.add('girando');
    let v = 50, i = rnd(pool.length);
    while (v < 380) { nm.textContent = pool[i++ % pool.length]; await sleep(v); v *= 1.13; }
    nm.classList.remove('girando');
  }
  nm.textContent = tirado;
  confete();
  $('#eu').onclick = () => trocar(tirado);
}

// se a pessoa tirou ela mesma, devolve o nome e tira outro
async function trocar(meu){
  $('#eu').disabled = true;
  try {
    const { novo, rodada } = await runTransaction(db, async tx => {
      const d = (await tx.get(ref)).data();
      const opcoes = d.disponiveis.filter(n => n !== meu);
      if (!opcoes.length) throw new Error('vazio');
      const novo = opcoes[rnd(opcoes.length)];
      tx.update(ref, { disponiveis: [...d.disponiveis.filter(n => n !== novo), meu] });
      return { novo, rodada: d.rodada };
    });
    localStorage.setItem(chaveLocal(rodada), novo);
    $('#palco').classList.remove('aberto');
    await sleep(500);
    revelar(novo, [novo], false);
  } catch (e) {
    $('#eu').outerHTML = `<p class="erro">${e.message === 'vazio' ? 'Não sobrou outro nome. Avise quem organizou pra refazer o sorteio.' : 'Deu um probleminha, tenta de novo.'}</p>`;
  }
}

async function iniciar(){
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : null;
  tela(`${cabecalho('Família Sousa', 'Amigo<em>Secreto</em>')}
    ${presente()}
    <div id="acao"></div>`);

  if (d?.nomes?.length) etiquetas(d.nomes);
  if (!d || !d.nomes?.length) { $('#acao').innerHTML = `<p class="sub">O sorteio ainda não foi aberto.<br><b>Volte daqui a pouco.</b></p>`; return; }

  const salvo = localStorage.getItem(chaveLocal(d.rodada));
  if (salvo) return revelar(salvo, [salvo], false);

  if (!d.disponiveis.length) { $('#acao').innerHTML = `<p class="sub">Todos os nomes já foram sorteados.</p>`; return; }

  $('#acao').innerHTML = `
    <p class="sub"><b>Toque em sortear</b> e descubra quem é o seu amigo secreto.<br>Não deixe ninguém espiar!</p>
    <button class="btn" id="ir">sortear <span class="dado"></span></button>
    <p class="erro" id="erro"></p>`;

  const abrir = async () => {
    if (!$('#ir') || $('#ir').disabled) return;
    $('#ir').disabled = true; $('#palco').classList.add('treme');
    try {
      const [{ t, rodada }] = await Promise.all([runTransaction(db, async tx => {
        const x = (await tx.get(ref)).data();
        if (!x.disponiveis.length) throw new Error('vazio');
        const t = x.disponiveis[rnd(x.disponiveis.length)];
        tx.update(ref, { disponiveis: x.disponiveis.filter(n => n !== t) });
        return { t, rodada: x.rodada };
      }), sleep(1400)]);
      localStorage.setItem(chaveLocal(rodada), t);
      revelar(t, d.nomes, true);
    } catch (e) {
      $('#palco').classList.remove('treme');
      $('#erro').textContent = e.message === 'vazio' ? 'Todos os nomes já foram sorteados.' : 'Deu um probleminha, tenta de novo.';
      $('#ir').disabled = false;
    }
  };
  $('#ir').onclick = abrir;
  $('#palco').onclick = abrir;
  $('#palco').style.cursor = 'pointer';
}
iniciar();
