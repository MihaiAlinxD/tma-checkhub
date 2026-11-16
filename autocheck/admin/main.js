'use strict';
// Etapa 8: numai recenzii aprobate, citite din Firestore; fără operații de scriere.
let reviews=[];
const root=document.getElementById('reviews');
const brokerNames={'gcc-asigurari':'GCC Asigurări','broker-demo-promoted':'Broker DEMO Promovat','broker-demo-standard':'Broker DEMO Standard'};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function render(){
 const broker=document.getElementById('broker').value,status=document.getElementById('status').value;
 root.replaceChildren();const scoped=reviews.filter(r=>broker==='all'||r.broker===broker);
 for(const key of ['pending','approved','reported'])document.getElementById(key).textContent=key==='reported'?'—':scoped.filter(r=>r.status===key).length;
 const data=scoped.filter(r=>status==='all'||r.status===status);
 if(!data.length){root.append(el('p','empty',status==='reported'?'Recenziile raportate nu sunt încă disponibile.':'Nu există recenzii în Firestore pentru filtrul selectat.'));return;}
 for(const r of data){const card=el('article','review'),top=el('div','review-top'),info=el('div');
 info.append(el('h3','',r.author),el('div','broker',brokerNames[r.broker]||r.broker));top.append(info,el('span',r.status==='pending'?'tag pending':'tag approved',r.status==='pending'?'În așteptare':'Aprobată'));
 card.append(top,el('div','stars','★'.repeat(r.stars)+'☆'.repeat(5-r.stars)),el('p','',r.comment));
 const actions=el('div','actions');
 for(const [label,decision] of [['Aprobă','approved'],['Respinge','rejected']]){
   const b=el('button','',label);
   const allowed=r.status==='pending' && (window.AutoCheckAdmin.role==='super_admin' || (window.AutoCheckAdmin.role==='broker_moderator' && decision==='approved'));
   b.disabled=!allowed;
   b.title=allowed?'Confirmă decizia de moderare':'Acțiune indisponibilă pentru rolul sau statusul curent';
   b.addEventListener('click',async()=>{b.disabled=true;try{await window.AutoCheckAdmin.moderate(r,decision);}catch(e){alert('Moderarea a eșuat: '+(e.code||e.message||'eroare'));render();}});
   actions.append(b);
 }
 const reply=el('button','','Răspunde');reply.disabled=true;reply.title='Răspunsurile oficiale vor fi implementate separat';actions.append(reply);
 card.append(actions);root.append(card);
 }
}
window.AutoCheckAdmin={role:null,setRole(role){this.role=role;render();},setReviews(data){reviews=data;render();},setError(message){reviews=[];render();root.prepend(el('p','empty',message));},clear(){reviews=[];render();}};
document.getElementById('broker').addEventListener('change',render);
document.getElementById('status').addEventListener('change',render);
render();
