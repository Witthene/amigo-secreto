import { ref, getDoc, setDoc, runTransaction, db, $, tela, esc, cabecalho } from './comum.js?v=1125135155';

const cap = n => String(n).toLocaleLowerCase('pt-BR').replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('pt-BR'));
const HASH = '311f4d7334be0059d7f5ff9395196eec2c9651adb4ac9dadbaa4858ec2fdf5b5';
const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2,'0')).join('');

function login(){
  tela(`${cabecalho('Painel do organizador', 'Área<em>restrita</em>')}
    <div class="painel"><div class="addrow"><input id="senha" type="text" autocomplete="off" placeholder="Digite a senha"><button class="btn" id="entrar">Entrar</button></div>
    <p class="erro" id="erro"></p></div>`);
  const ir = async () => {
    if (await sha($('#senha').value.toLowerCase().replace(/\s/g,'')) === HASH) { sessionStorage.setItem('adm', 1); painel(); }
    else $('#erro').textContent = 'Senha errada.';
  };
  $('#entrar').onclick = ir;
  $('#senha').onkeydown = e => { if (e.key === 'Enter') ir(); };
  $('#senha').focus();
}

async function painel(){
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : { nomes: [], disponiveis: [], rodada: 1 };
  const sorteados = d.nomes.length - d.disponiveis.length;
  tela(`${cabecalho('Painel do organizador', 'Amigo Secreto<em>Família Sousa</em>')}<div class="painel">
    <div class="status">
      <div>${d.nomes.length}<small>Pessoas</small></div>
      <div>${sorteados}<small>Já sortearam</small></div>
    </div>
    <div class="addrow" style="margin-top:18px"><input id="novo" placeholder="Adicionar nome"><button class="btn" id="add">+</button></div>
    <div class="lista" style="margin-top:18px">${d.nomes.map((n, i) => `<div class="linha"><span>${esc(cap(n))}</span><button class="x" data-i="${i}">Remover</button></div>`).join('')}</div>
    <button class="btn" id="reset">Sortear novamente</button>
    <button class="btn sec" id="link">Copiar link do sorteio</button>
    <p class="aviso">Ao adicionar ou remover nomes, ou sortear novamente,<br>o sorteio recomeça do zero para todo mundo.</p></div>`);

  // qualquer mudança na lista zera o sorteio pra não ficar ninguém de fora
  const salvar = async nomes => {
    await setDoc(ref, { nomes, disponiveis: [...nomes], jaSortearam: [], dicas: d.dicas || {}, rodada: (d.rodada || 0) + 1, atualizado: Date.now() });
    painel();
  };
  const add = () => {
    const n = $('#novo').value.trim();
    if (!n || d.nomes.includes(n)) return;
    salvar([...d.nomes, n]);
  };
  $('#add').onclick = add;
  $('#novo').onkeydown = e => { if (e.key === 'Enter') add(); };
  document.querySelectorAll('.x').forEach(b => b.onclick = () => {
    if (confirm(`Remover ${d.nomes[b.dataset.i]}? O sorteio vai recomeçar.`)) salvar(d.nomes.filter((_, i) => i != b.dataset.i));
  });
  $('#reset').onclick = () => { if (confirm('Recomeçar o sorteio? Todo mundo vai precisar sortear de novo.')) salvar(d.nomes); };
  $('#link').onclick = () => {
    navigator.clipboard.writeText(location.href.replace(/admin\.html.*$/, ''));
    $('#link').textContent = 'Link copiado ✓';
  };
}

sessionStorage.getItem('adm') ? painel() : login();
