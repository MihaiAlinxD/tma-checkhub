// AutoCheck Admin Web — Etapa 2. Numai autentificare; NU acordă roluri sau acces la Firestore.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js';
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs, startAfter } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

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
let authorizedBrokerId = null;
function applyRoleScope(role, brokerId = null) {
  const isModerator = role === 'broker_moderator';
  authorizedBrokerId = isModerator ? brokerId : null;
  for (const option of brokerOptions) {
    option.hidden = isModerator && option.value !== brokerId;
    option.disabled = isModerator && option.value !== brokerId;
  }
  brokerSelect.value = isModerator ? brokerId : 'all';
  brokerSelect.disabled = isModerator;
  document.getElementById('scope-description').textContent = isModerator
    ? 'Moderator: sunt afișate numai documentele brokerului autorizat.'
    : 'Recenzii, răspunsuri, revizii și raportări pentru toți brokerii.';
  brokerSelect.dispatchEvent(new Event('change'));
}

const roleLabel = document.getElementById('admin-role');
let authRevision = 0;
let currentRole = null;
const knownBrokers = ['gcc-asigurari','broker-demo-promoted','broker-demo-standard'];
// Citește toate paginile, fără a opri afișarea la primele 50 de documente.
// Fără orderBy suplimentar: cursorul folosește ordinea implicită a ID-urilor.
async function readAllPages(reference, constraints = [], revision) {
  const documents = [];
  let cursor = null;
  do {
    if (revision !== authRevision) return [];
    const parts = [...constraints];
    if (cursor) parts.push(startAfter(cursor));
    parts.push(limit(50));
    const page = await getDocs(query(reference, ...parts));
    documents.push(...page.docs);
    if (page.size < 50) break;
    cursor = page.docs[page.docs.length - 1];
  } while (cursor);
  return documents;
}
let loadingReviews = false;
async function loadAdminReviews(isModerator, revision) {
  if (loadingReviews || !currentRole) return;
  loadingReviews = true;
  try {
    const ids = isModerator ? [authorizedBrokerId] : knownBrokers;
    if (ids.some(id => !id || !knownBrokers.includes(id))) throw new Error('Broker neautorizat sau necunoscut');
    const items = [];
    for (const broker of ids) {
      for (const reviewStatus of ['approved', 'pending']) {
        const reviews = await readAllPages(collection(db, 'brokers', broker, 'reviews'), [where('status', '==', reviewStatus)], revision);
        for (const d of reviews) {
          const r = d.data();
          items.push({kind:'review', id:d.id, reviewId:d.id, broker, author:r.authorName || 'Utilizator Google', stars:r.stars || 0, status:r.status, comment:r.comment || ''});
          const replies = await readAllPages(collection(db,'brokers',broker,'reviews',d.id,'replies'), [], revision);
          for (const reply of replies) {
            const v = reply.data();
            items.push({kind:'reply',id:reply.id,reviewId:d.id,broker,author:v.authorName || 'Utilizator Google',status:v.status,comment:v.comment || '',parentReplyId:v.parentReplyId || null});
          }
        }
      }
      const revisions = await readAllPages(collection(db,'brokers',broker,'pendingRevisions'), [], revision);
      for (const d of revisions) {
        const r = d.data();
        items.push({kind:'revision',id:d.id,reviewId:d.id,broker,author:'Modificare recenzie',stars:r.stars || 0,status:r.status,comment:r.comment || ''});
      }
    }
    // Filtrul pe broker este obligatoriu pentru moderatori, inclusiv la raportări.
    const reportConstraints = isModerator ? [where('brokerId', '==', authorizedBrokerId)] : [];
    const reports = await readAllPages(collection(db,'brokerReports'), reportConstraints, revision);
    for (const d of reports) {
      const r = d.data();
      if (!isModerator || r.brokerId === authorizedBrokerId) {
        items.push({kind:'report',id:d.id,broker:r.brokerId,reviewId:r.reviewId,replyId:r.replyId || null,author:'Raportare',status:r.status,comment:[r.reason,r.details].filter(Boolean).join(' — ')});
      }
    }
    if (revision !== authRevision) return;
    window.AutoCheckAdmin.setReviews(items);
    status.textContent = 'Panou actualizat din Firestore: ' + items.length + ' documente încărcate.';
  } finally { loadingReviews = false; }
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
    const moderatorBrokerId = isModerator ? data?.brokerId : null;
    if (isModerator && (!moderatorBrokerId || !knownBrokers.includes(moderatorBrokerId))) {
      lockPanel('Moderatorul nu are un broker valid configurat în adminUsers. Acces blocat.');
      return;
    }
    currentRole = isAdmin ? 'super_admin' : 'broker_moderator';
    ratingPanel.hidden = !isAdmin;
    window.AutoCheckAdmin.setRole(currentRole);
    roleLabel.textContent = isAdmin ? 'Super Admin – Acces autorizat' : 'Moderator – Acces autorizat';
    roleLabel.hidden = false;
    demoPanel.hidden = false;
    status.textContent = 'Rol verificat. Se încarcă recenziile aprobate și în așteptare din Firestore...';
    applyRoleScope(isModerator ? 'broker_moderator' : 'super_admin', moderatorBrokerId);
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
  if (!auth.currentUser || !currentRole || item.status !== 'pending' || (currentRole === 'broker_moderator' && item.broker !== authorizedBrokerId)) throw new Error('Acțiune nepermisă.');
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

// Reîmprospătare periodică, fără listeneri multipli sau cereri suprapuse.
setInterval(() => {
  if (auth.currentUser && currentRole && !document.hidden) {
    loadAdminReviews(currentRole === 'broker_moderator', authRevision).catch(error => {
      status.textContent = 'Actualizarea automată a eșuat (' + (error.code || 'eroare') + ').';
    });
  }
}, 60000);
