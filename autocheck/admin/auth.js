// AutoCheck Admin Web — Etapa 2. Numai autentificare; NU acordă roluri sau acces la Firestore.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js';
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

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
const functions = getFunctions(app, 'europe-west1');
const recalculateRating = httpsCallable(functions, 'recalculateBrokerRating');
const moderateReview = httpsCallable(functions, 'moderateBrokerReview');
const moderateReply = httpsCallable(functions, 'moderateBrokerReply');
const moderateReport = httpsCallable(functions, 'moderateBrokerReport');
const ratingPanel = document.getElementById('rating-admin-panel');
const ratingButton = document.getElementById('rating-recalculate');
const ratingBroker = document.getElementById('rating-broker');
const ratingStatus = document.getElementById('rating-result');
const demoPanel = document.getElementById('admin-demo');
const brokerSelect = document.getElementById('broker');
const brokerOptions = [...brokerSelect.options];
function applyRoleScope(role) {
  const isModerator = role === 'broker_moderator';
  for (const option of brokerOptions) option.hidden = false;
  brokerSelect.value = 'all';
  brokerSelect.disabled = false;
  document.getElementById('scope-description').textContent = isModerator
    ? 'Moderator activ: poate modera conținutul conform permisiunilor verificate de Cloud Functions.'
    : 'Recenzii aprobate și în așteptare pentru toți brokerii. Recenziile publicate sunt vizibile public în aplicație.';
  brokerSelect.dispatchEvent(new Event('change'));
}

const roleLabel = document.getElementById('admin-role');
let authRevision = 0;
let currentRole = null;
const knownBrokers = ['gcc-asigurari','broker-demo-promoted','broker-demo-standard'];
async function loadAdminReviews(isModerator, revision) {
  const ids = knownBrokers;
  const items = [];
  // All queues are read under the active moderator's Firestore security rules.
  for (const broker of ids) {
    for (const reviewStatus of ['approved', 'pending']) {
      const snap = await getDocs(query(collection(db, 'brokers', broker, 'reviews'), where('status', '==', reviewStatus), limit(50)));
      for (const d of snap.docs) {
        const r = d.data();
        items.push({kind:'review', id:d.id, reviewId:d.id, broker, author:r.authorName || 'Utilizator Google', stars:r.stars || 0, status:r.status, comment:r.comment || ''});
        // Replies are scoped to the review and always have a bounded query.
        const replies = await getDocs(query(collection(db,'brokers',broker,'reviews',d.id,'replies'),limit(50)));
        for (const reply of replies.docs) {
          const v=reply.data();
          items.push({kind:'reply',id:reply.id,reviewId:d.id,broker,author:v.authorName || 'Utilizator Google',status:v.status,comment:v.comment || '',parentReplyId:v.parentReplyId || null});
        }
      }
    }
    const revisions = await getDocs(query(collection(db,'brokers',broker,'pendingRevisions'),limit(50)));
    for (const d of revisions.docs) {
      const r=d.data();
      items.push({kind:'revision',id:d.id,reviewId:d.id,broker,author:'Modificare recenzie',stars:r.stars || 0,status:r.status,comment:r.comment || ''});
    }
  }
  const reports = await getDocs(query(collection(db,'brokerReports'),limit(50)));
  for (const d of reports.docs) {
    const r=d.data();
    items.push({kind:'report',id:d.id,broker:r.brokerId,reviewId:r.reviewId,replyId:r.replyId || null,author:'Raportare',status:r.status,comment:[r.reason,r.details].filter(Boolean).join(' — ')});
  }
  if (revision !== authRevision) return;
  window.AutoCheckAdmin.setReviews(items);
  status.textContent = 'Panou sincronizat cu Firestore. Sunt afișate maximum 50 de documente per interogare; pentru volume mai mari va fi necesară paginare.';
}

function lockPanel(message) {
  demoPanel.hidden = true;
  ratingPanel.hidden = true;
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
  applyRoleScope(null);
  currentRole = null;
  ratingPanel.hidden = true;
  ratingStatus.textContent = '';
  window.AutoCheckAdmin.setRole(null);
  window.AutoCheckAdmin.clear();
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
    const isModerator = data?.active === true && data?.role === 'broker_moderator';
    if (!isAdmin && !isModerator) {
      lockPanel('Contul Google este conectat, dar nu are un rol administrativ activ. Acces refuzat.');
      return;
    }
    currentRole = isAdmin ? 'super_admin' : 'broker_moderator';
    ratingPanel.hidden = !isAdmin;
    window.AutoCheckAdmin.setRole(currentRole);
    roleLabel.textContent = isAdmin ? 'Super Admin – Acces autorizat' : 'Moderator – Acces autorizat';
    roleLabel.hidden = false;
    demoPanel.hidden = false;
    status.textContent = 'Rol verificat. Se încarcă recenziile aprobate și în așteptare din Firestore...';
    applyRoleScope(isModerator ? 'broker_moderator' : 'super_admin');
    try { await loadAdminReviews(isModerator,revision); }
    catch (readError) {
      if (revision !== authRevision) return;
      window.AutoCheckAdmin.setError('Citirea recenziilor a eșuat ('+(readError.code||'eroare')+'). Verifică regulile Firestore și conexiunea.');
      status.textContent='Rol autorizat, dar recenziile nu au putut fi citite.';
    }
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

// Client actions are gated by Firestore security rules; UI checks are supplementary.
window.AutoCheckAdmin.moderate = async (item, decision) => {
  if (!auth.currentUser || !currentRole || item.status !== 'pending') throw new Error('Acțiune nepermisă.');
  const uid=auth.currentUser.uid;
  if (!window.confirm('Confirmi acțiunea de moderare: '+decision+'?')) return false;
  if (item.kind === 'review' || item.kind === 'revision') {
    await moderateReview({brokerId:item.broker,reviewId:item.reviewId,target:item.kind === 'revision' ? 'revision' : 'review',action:decision});
  } else if (item.kind === 'reply') {
    await moderateReply({brokerId:item.broker,reviewId:item.reviewId,replyId:item.id,action:decision});
  } else if (item.kind === 'report') {
    await moderateReport({reportId:item.id,action:decision});
  } else throw new Error('Tip necunoscut');
  if (auth.currentUser?.uid === uid && currentRole) await loadAdminReviews(currentRole === 'broker_moderator',authRevision);
  return true;
};
window.AutoCheckAdmin.refresh = () => loadAdminReviews(currentRole === 'broker_moderator',authRevision);

// Recalculare manuală numai pentru Super Admin. Autorizarea reală este verificată și în Cloud Function.
ratingButton.addEventListener('click', async () => {
  if (!auth.currentUser || currentRole !== 'super_admin') return;
  const brokerId = ratingBroker.value;
  if (!brokerId || !window.confirm('Recalculezi ratingul pentru ' + ratingBroker.options[ratingBroker.selectedIndex].text + '?')) return;
  const userUid = auth.currentUser.uid;
  ratingButton.disabled = true;
  ratingStatus.textContent = 'Se recalculează ratingul...';
  try {
    const response = await recalculateRating({brokerId});
    if (auth.currentUser?.uid !== userUid || currentRole !== 'super_admin') return;
    const result = response.data;
    ratingStatus.textContent = 'Rating actualizat: ' + Number(result.ratingAverage).toLocaleString('ro-RO', {maximumFractionDigits:2}) + ' / 5 (' + result.ratingCount + ' recenzii aprobate).';
  } catch (error) {
    if (auth.currentUser?.uid !== userUid || currentRole !== 'super_admin') return;
    ratingStatus.textContent = 'Recalcularea a eșuat (' + (error.code || 'eroare') + '). Verifică autentificarea și jurnalul Cloud Functions.';
  } finally {
    ratingButton.disabled = false;
  }
});
