/**
 * Dati d'esempio: una famiglia inventata, scelta per esercitare la carta —
 * l'Italia in lunghezza, una costa riconoscibile, una tappa fuori confine.
 *
 * Deve restare a ZERO diagnostiche (RNF2 in docs/requisiti.md): un esempio che
 * genera avvisi insegna che gli avvisi sono normali.
 */
import type { RawDocumentRoot } from "../core/types.js";

export const SAMPLE: RawDocumentRoot = {
  version: 1,
  meta: { title: "Prospettiva famiglia", anchor: "marta" },
  settings: { ageDisplay: "midpoint", milestones: [5,10,20,25,50], horizon: "2060" },

  people: [
    {
      id:"marta", name:"Marta", role:"self", birth:"1977-03-09", color:"#16606B",
      documents:[
        {label:"Patente B", type:"patente", expires:"2029-03-09"},
        {label:"Passaporto", type:"passaporto", expires:"2030-06-14"},
        {label:"Carta d'identità", type:"identita", expires:"2032-01-20"}
      ],
      periods:[
        {label:"Liceo classico", start:"1991-09", end:"1996-07", track:"school", place:"Siena"},
        {label:"Lettere, Università di Bologna", start:"1996-09", end:"2002-07", track:"school", place:"Bologna"},
        {label:"Casa dei genitori", start:"1977-03", end:"1996-09", track:"home", place:"Siena"},
        {label:"Casa di via Saragozza", start:"1996-09", end:"2018-05", track:"home", place:"Bologna"},
        {label:"Casa attuale", start:"2018-05", track:"home", place:"Milano"},
        {label:"Casa editrice", start:"2002-10", end:"2016-03", track:"work", place:"Bologna"},
        {label:"Agenzia letteraria", start:"2016-04", track:"work", place:"Milano"}
      ],
      events:[
        {label:"Laurea", date:"2002-07-16", category:"school", place:"Università di Bologna"},
        {label:"Prima barca a vela", date:"2014", category:"life", circa:true, place:"Lerici"},
        {label:"Prima nuotata di Tommaso", date:"2021-08-11", category:"family",
         place:"Baia di Fiascherino"}
      ]
    },
    {
      id:"davide", name:"Davide", role:"partner", birth:"1980-11-14", color:"#98402F",
      documents:[
        {label:"Patente B", type:"patente", expires:"2028-11-14"}
      ],
      periods:[
        {label:"Ingegneria", start:"1999-09", end:"2004-07", track:"school", place:"Padova"},
        {label:"Erasmus", start:"2002-09", end:"2003-06", track:"school", place:"Barcellona"},
        {label:"Casa dei genitori", start:"1980-11", end:"1999-09", track:"home", place:"Padova"},
        {label:"Casa attuale", start:"2018-05", track:"home", place:"Milano"},
        {label:"Studio di progettazione", start:"2005-01", track:"work", place:"Milano"}
      ],
      events:[]
    },
    {
      id:"sofia", name:"Sofia", role:"child", birth:"2012-09-03", color:"#35407E",
      school:{ system:"it", through:"bachelor", early:false, delays:{} },
      documents:[
        {label:"Carta d'identità", type:"identita", expires:"2027-09-03"}
      ],
      events:[]
    },
    {
      id:"tommaso", name:"Tommaso", role:"child", birth:"2016-05-21", color:"#9A7412",
      school:{ system:"it", through:"highschool" },
      events:[]
    },
    {
      id:"elsa", name:"Nonna Elsa", role:"grandparent", birth:"1924", death:"2001-05", color:"#4E656D",
      periods:[
        {label:"Sartoria", start:"1946", end:"1988", track:"work", circa:true, place:"Siena"}
      ],
      events:[
        {label:"Trasferimento in città", date:"1952", category:"life", circa:true}
      ]
    }
  ],

  events:[
    {id:"wedding", label:"Matrimonio", date:"2007-06-16", category:"family",
     who:["marta","davide"], place:{name:"Lerici", coord:[44.0757, 9.9114]},
     recurrences:[10, 25, 50]},
    {label:"Mondiali di Spagna", date:"1982-07-11", category:"sport"},
    {label:"Caduta del Muro", date:"1989-11-09", category:"history"},
    {label:"Olimpiadi Milano-Cortina", date:"2026-02-06", category:"sport"}
  ],

  holidays:[
    {label:"Grecia, Cicladi", start:"2019-08-03", end:"2019-08-18", place:"Atene", who:["marta","davide"]},
    {label:"Sardegna", start:"2022-07-30", end:"2022-08-14", place:"La Maddalena", who:["marta","davide"]},
    {label:"Golfo dei Poeti", start:"2024-08-05", end:"2024-08-25", place:"Lerici", who:["marta","davide"]},
    {label:"Settimana bianca", start:"2025-02-15", end:"2025-02-22", place:"Bolzano", who:["marta","davide"]},
    {label:"Golfo dei Poeti", start:"2026-08-01", end:"2026-08-22", place:"Lerici", who:["marta","davide"]}
  ],

  places:{
    "Università di Bologna":[44.4962, 11.3517],
    "Baia di Fiascherino":[44.0583, 9.9133]
  },

  periods:[
    {id:"mortgage", label:"Mutuo casa", start:"2018-05-01", end:"2043-05-01",
     category:"finance", track:"finance", who:["marta","davide"]}
  ]
};
