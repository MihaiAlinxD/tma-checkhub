// AutoCheck Admin Web — Etapa 2. Numai autentificare; NU acordă roluri sau acces la Firestore.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBFSarhddXeLgB_G5NGw0waz1goFa99N0Q',
  authDomain: 'autocheck-62675.firebaseapp.com',
  projectId: 'autocheck-62675',
  storageBucket: 'autocheck-62675.firebasestorage.app',
  messagingSenderId: '657873797400',
  appId: '1:657873797400:web:4e2517c59c815d5d7e9e6d'
};
const status = document.getElementById('auth-status');
const login = document.getElementById('login-google');
const logout = document.getElementById('logout-google');
const userBox = document.getElementById('auth-user');
const photo = document.getElementById('auth-photo');
const name = document.getElementById('auth-name');
const email = document.getElementById('auth-email');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});

onAuthStateChanged(auth, user => {
  login.hidden = Boolean(user);
  logout.hidden = !user;
  login.disabled = false;
  logout.disabled = false;
  userBox.hidden = !user;
  if (user) {
    name.textContent = user.displayName || 'Cont Google';
    email.textContent = user.email || '';
    photo.hidden = !user.photoURL;
    if(user.photoURL) photo.src = user.photoURL; else photo.removeAttribute('src');
    status.textContent = 'Conectat cu Google. Rol administrativ: neconfigurat. Datele afișate mai jos sunt demonstrative.';
  } else {
    name.textContent = ''; email.textContent = ''; photo.hidden = true; photo.removeAttribute('src');
    status.textContent = 'Nu ești conectat. Panoul afișează doar date demonstrative.';
  }
}, error => {
  status.textContent = 'Nu s-a putut verifica autentificarea: ' + (error.code || 'eroare necunoscută');
  login.disabled = false;
});

login.addEventListener('click', async () => {
  login.disabled = true;
  status.textContent = 'Se deschide autentificarea Google...';
  try { await signInWithPopup(auth, provider); }
  catch(error) {
    status.textContent = error.code === 'auth/popup-closed-by-user' ? 'Autentificarea a fost anulată.' : 'Autentificarea a eșuat: ' + (error.code || 'eroare necunoscută');
  } finally { login.disabled = false; }
});
logout.addEventListener('click', async () => {
  logout.disabled = true;
  try { await signOut(auth); }
  catch(error) { status.textContent = 'Deconectarea a eșuat: ' + (error.code || 'eroare necunoscută'); logout.disabled = false; }
});
