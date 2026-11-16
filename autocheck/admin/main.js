'use strict';
// Etapa 8: numai recenzii aprobate, citite din Firestore; fără operații de scriere.
let reviews=[];
const root=document.getElementById('reviews');
const brokerNames={'gcc-asigurari':'GCC Asigurări','broker-demo-promoted':'Broker DEMO Promovat','broker-demo-standard':'Broker DEMO Standard'};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function render(){
 const broker=document.getElementById('broker').value,status=document.getElementById('status').value;
 root.replaceChildren();const scoped=reviews.filter(r=>broker==='all'||r.broker===broker);
 for(const key of ['pending','approved','reported'])document.getElementById(key).textContent=key==='approved'?scoped.length:'—';
 const data=scoped.filter(r=>status==='all'||r.status===status);
 if(!data.length){root.append(el('p','empty',status==='pending'||status==='reported'?'Recenziile nepublicate nu sunt încă accesibile în această etapă.':'Nu există recenzii aprobate în Firestore pentru filtrul selectat.'));return;}
 for(const r of data){const card=el('article','review'),top=el('div','review-top'),info=el('div');
 info.append(el('h3','',r.author),el('div','broker',brokerNames[r.broker]||r.broker));top.append(info,el('span','tag approved','Aprobată'));
 card.append(top,el('div','stars','★'.repeat(r.stars)+'☆'.repeat(5-r.stars)),el('p','',r.comment));
 const actions=el('div','actions');for(const label of ['Aprobă','Respinge','Răspunde']){const b=el('button','',label);b.disabled=true;b.title='Acțiunile de moderare nu sunt încă implementate';actions.append(b);}card.append(actions);root.append(card);
 }
}
window.AutoCheckAdmin={setReviews(data){reviews=data;render();},setError(message){reviews=[];render();root.prepend(el('p','empty',message));},clear(){reviews=[];render();}};
document.getElementById('broker').addEventListener('change',render);
document.getElementById('status').addEventListener('change',render);
render();
