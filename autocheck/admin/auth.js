// AutoCheck Admin Web — Etapa 2. Numai autentificare; NU acordă roluri sau acces la Firestore.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

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
const db = getFirestore(app);
const demoPanel = document.getElementById('admin-demo');
const roleLabel = document.getElementById('admin-role');
let authRevision = 0;
function lockPanel(message) {
  demoPanel.hidden = true;
  roleLabel.hidden = true;
  roleLabel.textContent = '';
  status.textContent = message;
}
const provider = new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});

onAuthStateChanged(auth, async user => {
  const revision = ++authRevision;
  login.hidden = Boolean(user);
  logout.hidden = !user;
  login.disabled = false;
  logout.disabled = false;
  userBox.hidden = !user;
  lockPanel(user ? 'Se verifică rolul administrativ...' : 'Conectează-te cu un cont Google autorizat pentru a accesa panoul.');
  if (!user) {
    name.textContent = ''; email.textContent = '';
    photo.hidden = true; photo.removeAttribute('src');
    return;
  }
  name.textContent = user.displayName || 'Cont Google';
  email.textContent = user.email || '';
  photo.hidden = !user.photoURL;
  if (user.photoURL) photo.src = user.photoURL;
  else photo.removeAttribute('src');
  try {
    // Documentul este citit exclusiv prin regulile Firestore, pentru UID-ul conectat.
    const snap = await getDoc(doc(db, 'adminUsers', user.uid));
    if (revision !== authRevision) return;
    const data = snap.exists() ? snap.data() : null;
    const isAdmin = data?.active === true && data?.role === 'super_admin';
    const isModerator = data?.active === true && data?.role === 'broker_moderator' && data?.brokerId === 'gcc-asigurari';
    if (!isAdmin && !isModerator) {
      lockPanel('Contul Google este conectat, dar nu are un rol administrativ activ. Acces refuzat.');
      return;
    }
    roleLabel.textContent = isAdmin ? 'Super Admin – Acces autorizat' : 'Moderator GCC Asigurări – Acces autorizat';
    roleLabel.hidden = false;
    demoPanel.hidden = false;
    status.textContent = 'Rol verificat în Firestore. Interfața de mai jos conține numai date demonstrative; acțiunile administrative sunt dezactivate.';
    // Restricție vizuală suplimentară: moderatorul GCC nu vede exemplele altor brokeri.
    const brokerSelect = document.getElementById('broker');
    brokerSelect.value = isModerator ? 'gcc-asigurari' : 'all';
    brokerSelect.disabled = isModerator;
    brokerSelect.dispatchEvent(new Event('change'));
  } catch (error) {
    if (revision !== authRevision) return;
    lockPanel('Nu s-a putut verifica rolul în Firestore (' + (error.code || 'eroare') + '). Acces blocat.');
  }
}, error => {
  ++authRevision;
  lockPanel('Nu s-a putut verifica autentificarea: ' + (error.code || 'eroare necunoscută'));
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
