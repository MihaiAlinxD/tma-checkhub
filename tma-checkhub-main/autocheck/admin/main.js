'use strict';
let reviews=[];
const root=document.getElementById('reviews');
const brokerNames={'gcc-asigurari':'GCC Asigurări','broker-demo-promoted':'Broker DEMO Promovat','broker-demo-standard':'Broker DEMO Standard'};
const statusNames={approved:'Aprobat',pending:'În așteptare',rejected:'Respins',resolved:'Rezolvat',dismissed:'Respins',removed:'Conținut eliminat'};
const kindNames={review:'Recenzie',revision:'Revizie',reply:'Răspuns',report:'Raportare'};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function render(){
 const broker=document.getElementById('broker').value,filter=document.getElementById('status').value;
 root.replaceChildren();const scoped=reviews.filter(r=>broker==='all'||r.broker===broker);
 document.getElementById('pending').textContent=scoped.filter(r=>r.status==='pending'&&r.kind!=='report').length;
 document.getElementById('approved').textContent=scoped.filter(r=>r.status==='approved'&&r.kind==='review').length;
 document.getElementById('reported').textContent=scoped.filter(r=>r.kind==='report'&&r.status==='pending').length;
 const data=scoped.filter(r=>filter==='all'||(filter==='reported'?r.kind==='report':r.status===filter&&r.kind!=='report'));
 if(!data.length){root.append(el('p','empty','Nu există documente pentru filtrul selectat.'));return;}
 for(const r of data){
  const card=el('article','review'),top=el('div','review-top'),info=el('div');
  info.append(el('h3','',kindNames[r.kind]+' · '+r.author),el('div','broker',brokerNames[r.broker]||r.broker));
  top.append(info,el('span',r.status==='pending'?'tag pending':'tag approved',statusNames[r.status]||r.status||'Necunoscut'));
  card.append(top);
  if(r.stars)card.append(el('div','stars','★'.repeat(Math.max(0,Math.min(5,r.stars)))));
  card.append(el('p','',r.comment));
  const actions=el('div','actions');
  const decisions=r.kind==='report'?[['Respinge raportarea','dismiss'],['Rezolvă','resolve'],['Elimină conținut','remove_content']]:[['Aprobă','approve'],['Respinge','reject']];
  for(const [label,decision] of decisions){
    const b=el('button','action-btn',label);b.disabled=r.status!=='pending'||!window.AutoCheckAdmin.role;
    b.addEventListener('click',async()=>{b.disabled=true;try{await window.AutoCheckAdmin.moderate(r,decision);}catch(e){alert('Moderarea a eșuat: '+(e.code||e.message||'eroare'));render();}});
    actions.append(b);
  }
  card.append(actions);root.append(card);
 }
}
window.AutoCheckAdmin={role:null,setRole(role){this.role=role;render();},setReviews(data){reviews=data;render();},setError(message){reviews=[];render();root.prepend(el('p','empty',message));},clear(){reviews=[];render();}};
document.getElementById('broker').addEventListener('change',render);
document.getElementById('status').addEventListener('change',render);
render();
