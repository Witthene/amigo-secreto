import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let atual = null;

function montar(palco){
  if (atual) atual.parar();
  const host = palco.querySelector('.caixa');
  host.innerHTML = '';
  const W = host.clientWidth, H = host.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
  cam.position.set(0, 2.5, 7.4);
  cam.lookAt(0, 0.85, 0);

  // luzes
  cena.add(new THREE.HemisphereLight(0xfff4e0, 0x1b7a43, 0.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(3, 6, 4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.camera.left = sol.shadow.camera.bottom = -3;
  sol.shadow.camera.right = sol.shadow.camera.top = 3;
  sol.shadow.radius = 6;
  cena.add(sol);
  const contra = new THREE.DirectionalLight(0xffe08a, 1.2);
  contra.position.set(-4, 3, -3);
  cena.add(contra);

  // chão só pra sombra
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.28 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);

  // materiais
  const papel = new THREE.MeshPhysicalMaterial({ color: 0xe0242c, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4, sheenColor: 0xff8080 });
  const fita = new THREE.MeshPhysicalMaterial({ color: 0xffd23f, metalness: 0.35, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x6b4500, emissiveIntensity: 0.35 });
  const dentro = new THREE.MeshStandardMaterial({ color: 0x3a0508, roughness: 0.9 });

  const sombra = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const presente = new THREE.Group();
  cena.add(presente);

  // corpo
  const L = 1.6, A = 1.25;
  const corpo = sombra(new THREE.Mesh(new RoundedBoxGeometry(L, A, L, 6, 0.08), papel));
  corpo.position.y = A / 2;
  presente.add(corpo);
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.12, L - 0.12), dentro);
  fundo.rotation.x = -Math.PI / 2; fundo.position.y = A + 0.002;
  presente.add(fundo);
  const fitaCorpoA = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.26, A + 0.004, L + 0.02), fita));
  fitaCorpoA.position.y = A / 2;
  const fitaCorpoB = fitaCorpoA.clone(); fitaCorpoB.rotation.y = Math.PI / 2;
  presente.add(fitaCorpoA, fitaCorpoB);

  // luz de dentro (acende quando abre)
  const luzDentro = new THREE.PointLight(0xffd36b, 0, 6);
  luzDentro.position.set(0, A + 0.3, 0);
  presente.add(luzDentro);
  const brilho = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }));
  brilho.rotation.x = -Math.PI / 2; brilho.position.y = A + 0.01;
  presente.add(brilho);

  // tampa
  const tampa = new THREE.Group();
  tampa.position.y = A + 0.02;
  presente.add(tampa);
  const LT = L + 0.12, AT = 0.34;
  const tampaM = sombra(new THREE.Mesh(new RoundedBoxGeometry(LT, AT, LT, 6, 0.08), papel));
  tampaM.position.y = AT / 2;
  tampa.add(tampaM);
  const fitaTA = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.28, AT + 0.01, LT + 0.02), fita));
  fitaTA.position.y = AT / 2;
  const fitaTB = fitaTA.clone(); fitaTB.rotation.y = Math.PI / 2;
  tampa.add(fitaTA, fitaTB);

  // laço: duas alças de toro achatadas + nó + pontas
  const laco = new THREE.Group();
  laco.position.y = AT + 0.02;
  tampa.add(laco);
  const alcaG = new THREE.TorusGeometry(0.32, 0.085, 24, 64);
  for (const s of [-1, 1]) {
    const alca = sombra(new THREE.Mesh(alcaG, fita));
    alca.scale.set(1, 0.72, 0.9);
    alca.position.set(0.3 * s, 0.22, 0);
    alca.rotation.set(0, 0, s * 0.55);
    laco.add(alca);
    const ponta = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.62), fita));
    ponta.position.set(0.18 * s, 0.01, 0.34);
    ponta.rotation.y = s * 0.45;
    laco.add(ponta);
  }
  const no = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), fita));
  no.scale.set(1, 0.85, 1); no.position.y = 0.12;
  laco.add(no);

  // estado / animação
  let modo = 'parado', tAbre = 0, rodando = true, t0 = performance.now();
  const relogio = new THREE.Clock();
  const obs = new MutationObserver(() => {
    if (palco.classList.contains('aberto') && modo !== 'aberto') { modo = 'aberto'; tAbre = 0; }
    else if (palco.classList.contains('treme') && modo === 'parado') modo = 'treme';
    else if (!palco.classList.contains('treme') && !palco.classList.contains('aberto')) modo = 'parado';
  });
  obs.observe(palco, { attributes: true, attributeFilter: ['class'] });
  if (palco.classList.contains('aberto')) { modo = 'aberto'; tAbre = 5; }

  const ease = x => 1 - Math.pow(1 - Math.min(x, 1), 3);
  function quadro(){
    if (!rodando) return;
    requestAnimationFrame(quadro);
    const dt = relogio.getDelta(), t = (performance.now() - t0) / 1000;
    if (modo === 'parado') {
      presente.rotation.y = -0.6 + Math.sin(t * 0.6) * 0.35;
      presente.position.y = 0.08 + Math.sin(t * 1.6) * 0.06;
      presente.rotation.z = 0;
    } else if (modo === 'treme') {
      presente.rotation.z = Math.sin(t * 45) * 0.06;
      presente.position.y = 0.1 + Math.abs(Math.sin(t * 22)) * 0.08;
      presente.rotation.y += dt * 1.5;
    } else {
      tAbre += dt;
      const k = ease(tAbre / 0.9);
      presente.rotation.z *= 0.85;
      presente.position.y += (0 - presente.position.y) * 0.1;
      presente.rotation.y += (-0.6 - presente.rotation.y) * 0.05;
      tampa.position.set(1.4 * k, A + 0.02 + 2.6 * k, -0.4 * k);
      tampa.rotation.set(-0.6 * k, 0, -0.9 * k);
      tampa.visible = k < 0.98 || tAbre < 1;
      luzDentro.intensity = 6 * k;
      brilho.material.opacity = 0.85 * k;
    }
    renderer.render(cena, cam);
  }
  quadro();

  atual = { parar(){ rodando = false; obs.disconnect(); renderer.dispose(); pmrem.dispose(); } };
}

// monta sempre que a tela desenha um palco novo
new MutationObserver(() => {
  const p = document.getElementById('palco');
  if (p && !p.dataset.tres) { p.dataset.tres = 1; montar(p); }
}).observe(document.getElementById('app'), { childList: true, subtree: true });
