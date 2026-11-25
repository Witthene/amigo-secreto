import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const db = getFirestore(initializeApp({
  apiKey: "AIzaSyDaj2LMBuPj_sXqnhfVRJR70vLE99YmY7c",
  authDomain: "amigo-secreto-8ca24.firebaseapp.com",
  projectId: "amigo-secreto-8ca24",
  storageBucket: "amigo-secreto-8ca24.firebasestorage.app",
  messagingSenderId: "858994116965",
  appId: "1:858994116965:web:7384db58be184add1f398c"
}));
export const ref = doc(db, 'sorteios', 'familia-sousa');
export { getDoc, setDoc, runTransaction };
export const $ = s => document.querySelector(s);
export const tela = html => $('#app').innerHTML = html;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const rnd = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
export const cabecalho = (kicker, titulo) => `
  <div class="selo">S</div>
  <p class="kicker">${kicker}</p>
  <h1>${titulo}</h1>
  <div class="divisor"><span>✦</span></div>`;
