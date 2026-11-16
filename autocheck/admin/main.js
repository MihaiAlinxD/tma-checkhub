'use strict';
// EXCLUSIV date demonstrative. Nu include Firebase SDK si nu trimite cereri de modificare.
const reviews = [
  {broker:'gcc-asigurari',name:'GCC Asigurări',author:'Client demonstrativ A',stars:2,status:'pending',comment:'Am așteptat două zile pentru o ofertă. Mi-aș dori un răspuns mai rapid.'},
  {broker:'gcc-asigurari',name:'GCC Asigurări',author:'Client demonstrativ B',stars:5,status:'approved',comment:'Comunicare bună și ofertă clară. Mulțumesc!'},
  {broker:'broker-demo-promoted',name:'Broker DEMO Promovat',author:'Client demonstrativ C',stars:1,status:'reported',comment:'Exemplu de recenzie raportată, fără conținut ofensator.'},
  {broker:'broker-demo-standard',name:'Broker DEMO Standard',author:'Client demonstrativ D',stars:4,status:'pending',comment:'Serviciu bun, dar procesul a durat puțin mai mult decât mă așteptam.'}
];
const labels={pending:'În așteptare',approved:'Aprobată',reported:'Raportată'};
const root=document.getElementById('reviews');
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function render(){const broker=document.getElementById('broker').value,status=document.getElementById('status').value;root.replaceChildren();const scoped=reviews.filter(r=>broker==='all'||r.broker===broker);for(const key of ['pending','approved','reported'])document.getElementById(key).textContent=scoped.filter(r=>r.status===key).length;const data=scoped.filter(r=>status==='all'||r.status===status);if(!data.length){root.append(el('p','empty','Nu există exemple pentru filtrul selectat.'));return;}for(const r of data){const card=el('article','review');const top=el('div','review-top');const info=el('div');info.append(el('h3','',r.author),el('div','broker',r.name));top.append(info,el('span','tag '+r.status,labels[r.status]));card.append(top,el('div','stars','★'.repeat(r.stars)+'☆'.repeat(5-r.stars)),el('p','',r.comment));const actions=el('div','actions');for(const label of ['Aprobă','Respinge','Răspunde']){const b=el('button','',label);b.disabled=true;b.title='Disponibil după integrarea securizată Firebase';actions.append(b);}card.append(actions);root.append(card);}}
document.getElementById('broker').addEventListener('change',render);document.getElementById('status').addEventListener('change',render);render();
