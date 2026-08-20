// Persistenza: verifico i tre casi (localStorage, window.storage, nessuno)
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "dist", "prospettiva.html"), "utf8");
let pass=0,fail=0;
const ok=(c,n,x)=>c?pass++:(fail++,console.log("  FAIL: "+n+(x?" -> "+x:"")));

function make(opts){
  const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
  if(opts.noLocal) Object.defineProperty(dom.window,"localStorage",{get(){throw new Error("blocked")}});
  if(opts.appStore){ const mem=new Map();
    dom.window.storage={ async set(k,v){mem.set(k,v);return{key:k,value:v}},
      async get(k){ if(!mem.has(k)) throw new Error("nope"); return {key:k,value:mem.get(k)} },
      async delete(k){mem.delete(k);return{key:k,deleted:true}} };
    dom.window.__mem=mem; }
  return dom;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  // 1. localStorage disponibile: salva, ricarica, ritrova
  let d=make({}); await wait(120);
  let doc=d.window.document;
  doc.querySelector("#btnData").click();
  const mini={version:1,meta:{anchor:"z"},people:[{id:"z",name:"Zeta",birth:"1990-06-01"}]};
  doc.querySelector("#json").value=JSON.stringify(mini);
  doc.querySelector("#btnApply").click();
  doc.querySelector("#btnData").click();
  doc.querySelector("#btnSave").click(); await wait(60);
  ok(!doc.querySelector("#msg").classList.contains("err"),"salvataggio senza errori: "+doc.querySelector("#msg").textContent);
  const raw=d.window.localStorage.getItem("prospettiva:data");
  ok(raw && JSON.parse(raw).people[0].name==="Zeta","il JSON finisce in localStorage");
  ok(d.window.localStorage.getItem("prospettiva:filtri")!=null,"anche i filtri vengono salvati");

  // 2. nuova sessione con lo stesso storage: deve ripartire dai dati salvati
  const d2=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/"});
  d2.window.localStorage.setItem("prospettiva:data",raw);
  d2.window.localStorage.setItem("prospettiva:filtri",JSON.stringify(["home","work"]));
  await wait(160);
  const doc2=d2.window.document;
  ok(/Zeta/.test(doc2.querySelector("#anchorline").textContent),"al riavvio ricarica i dati salvati: "+doc2.querySelector("#anchorline").textContent);
  const checked=[...doc2.querySelectorAll("#filters input")].filter(c=>c.checked).length;
  eqn(checked,2,"e ripristina i filtri salvati");

  // 3. dimentica
  doc.querySelector("#btnForget").click(); await wait(60);
  ok(d.window.localStorage.getItem("prospettiva:data")==null,"'Dimentica' cancella la copia");

  // 4. window.storage (contesto app) ha la precedenza
  let d3=make({appStore:true}); await wait(140);
  const doc3=d3.window.document;
  doc3.querySelector("#btnData").click();
  doc3.querySelector("#btnSave").click(); await wait(80);
  ok(d3.window.__mem.has("prospettiva:data"),"usa window.storage quando c'e'");
  ok(d3.window.localStorage.getItem("prospettiva:data")==null,"e non tocca localStorage");

  // 5. nessuno storage: l'app vive lo stesso
  let d4=make({noLocal:true}); await wait(140);
  const doc4=d4.window.document;
  ok(doc4.querySelectorAll("#pane-chart .bar").length>5,"senza storage il grafico si disegna comunque");
  doc4.querySelector("#btnData").click();
  ok(doc4.querySelector("#btnSave").disabled,"il pulsante Salva viene disabilitato");
  ok(!doc4.querySelector("#msg").classList.contains("err"),"nessun errore mostrato all'utente");

  console.log("\n"+pass+" passati, "+fail+" falliti");
  process.exit(fail?1:0);
})();
function eqn(a,b,n){ ok(a===b,n,a+" != "+b); }
