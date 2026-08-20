/* =====================================================================
   1bis. POSIZIONI NEL TESTO JSON
   Uno scanner minimo che, oltre al valore, registra dove ogni percorso
   comincia e finisce nel sorgente. Serve per portare il cursore sul punto
   esatto quando si clicca una diagnostica.
   ===================================================================== */
function scanJSON(text){
  const pos = new Map();
  let i = 0;
  const ws = () => { while (i < text.length && /\s/.test(text[i])) i++; };
  const str = () => {
    i++;                                   // apice iniziale
    let out = "";
    while (i < text.length && text[i] !== '"'){
      if (text[i] === "\\"){
        const c = text[++i];
        out += c === "n" ? "\n" : c === "t" ? "\t" : c === "u"
             ? String.fromCharCode(parseInt(text.substr(i+1,4),16))
             : c;
        if (c === "u") i += 4;
        i++;
      } else out += text[i++];
    }
    i++;                                   // apice finale
    return out;
  };
  function value(path){
    ws();
    const start = i;
    const c = text[i];
    if (c === "{"){ i++; obj(path); }
    else if (c === "["){ i++; arr(path); }
    else if (c === '"'){ str(); }
    else while (i < text.length && !/[,\]}\s]/.test(text[i])) i++;
    pos.set(path, [start, i]);
  }
  function obj(path){
    ws();
    if (text[i] === "}"){ i++; return; }
    for (;;){
      ws();
      const kStart = i;
      const key = str();
      ws(); i++;                           // due punti
      value(path ? path + "." + key : key);
      pos.set((path ? path + "." + key : key) + "\u0000key", [kStart, i]);
      ws();
      if (text[i] === ","){ i++; continue; }
      if (text[i] === "}"){ i++; return; }
      return;
    }
  }
  function arr(path){
    ws();
    if (text[i] === "]"){ i++; return; }
    let n = 0;
    for (;;){
      value(path + "[" + (n++) + "]");
      ws();
      if (text[i] === ","){ i++; continue; }
      if (text[i] === "]"){ i++; return; }
      return;
    }
  }
  try { value(""); } catch(e){ /* testo malformato: nessuna posizione */ }
  return pos;
}

/* =====================================================================
   1ter. VALIDAZIONE
   Raccoglie TUTTE le diagnostiche invece di fermarsi alla prima.
   Gli errori bloccano il caricamento, gli avvisi no.
   Ogni regola ha un codice stabile, citato nei test e in docs/requisiti.md.
   ===================================================================== */
const REPLACE_KEYS = ["primary","middle","highschool","bachelor","master"];
const DOC_TYPES = ["patente","passaporto","identita"];
const KNOWN_CATEGORIES = ["school","work","home","holiday","finance","doc",
                          "life","family","sport","history"];

function validate(data){
  const D = [];
  // dichiarata qui perché `place()` la usa già durante la scansione delle persone
  const usedPlaces = new Set();
  const err  = (code, path, message, hint) => D.push({level:"error",   code, path, message, hint});
  const warn = (code, path, message, hint) => D.push({level:"warning", code, path, message, hint});

  if (!data || typeof data !== "object" || Array.isArray(data)){
    err("E001", "", "Il documento non è un oggetto JSON.",
        "La radice deve essere { … } con almeno la chiave `people`.");
    return D;
  }

  /* ---------- date ---------- */
  const dcache = new Map();
  function date(v, path, label){
    if (v == null){ return null; }
    const s = String(v).trim();
    const m = /^(-?\d{1,4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(s);
    if (!m){
      err("E005", path, label + ': "' + s + '" non è una data riconoscibile.',
          "Ammessi solo AAAA, AAAA-MM e AAAA-MM-GG, per esempio 1978, 1978-04 o 1978-04-12.");
      return null;
    }
    const y = +m[1], mo = m[2] ? +m[2] : null, d = m[3] ? +m[3] : null;
    if (mo != null && (mo < 1 || mo > 12)){
      err("E006", path, label + ": il mese " + mo + " non esiste.", "I mesi vanno da 01 a 12.");
      return null;
    }
    if (d != null){
      const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      if (d < 1 || d > last){
        err("E006", path, label + ": il " + d + " non esiste in quel mese.",
            "Quel mese ha " + last + " giorni.");
        return null;
      }
    }
    if ((m[2] && m[2].length === 1) || (m[3] && m[3].length === 1))
      warn("W010", path, label + ': "' + s + '" non è in forma canonica.',
           "Meglio due cifre per mese e giorno: " + y +
           (mo != null ? "-" + String(mo).padStart(2,"0") : "") +
           (d != null ? "-" + String(d).padStart(2,"0") : "") + ".");
    let dt = dcache.get(s);
    if (!dt){ try { dt = parseDate(s); dcache.set(s, dt); } catch(e){ return null; } }
    return dt;
  }

  /* ---------- settings ---------- */
  const settings = data.settings || {};
  if (settings.ageDisplay && ["midpoint","range"].indexOf(settings.ageDisplay) < 0)
    err("E019", "settings.ageDisplay", 'Valore "' + settings.ageDisplay + '" non ammesso.',
        "Usa `midpoint` (~77 anni) oppure `range` (76–77 anni).");
  const horizon = settings.horizon != null
    ? date(settings.horizon, "settings.horizon", "Orizzonte") : parseDate("2060");
  if (settings.milestones != null && (!Array.isArray(settings.milestones) ||
      settings.milestones.some(n => !Number.isInteger(n) || n <= 0)))
    err("E016", "settings.milestones", "Deve essere una lista di interi positivi.",
        "Per esempio [5, 10, 25, 50].");
  if (settings.filters != null && !Array.isArray(settings.filters))
    err("E021", "settings.filters", "Deve essere una lista di corsie.",
        "Valori ammessi: " + TRACKS.map(t=>t.k).join(", ") + ".");

  /* ---------- people ---------- */
  if (!Array.isArray(data.people)){
    err("E002", "people", "Manca l'elenco delle persone.",
        "Serve `\"people\": [ … ]` con almeno una persona.");
    return D;
  }
  if (!data.people.length)
    err("E002", "people", "L'elenco delle persone è vuoto.",
        "Aggiungi almeno una persona con `name` e `birth`.");

  const ids = new Map(), names = new Map(), births = new Map(), deaths = new Map();
  data.people.forEach((p, i) => {
    const P = "people[" + i + "]";
    if (!p || typeof p !== "object"){
      err("E003", P, "Questa voce non è un oggetto.", "Ogni persona è { \"name\": …, \"birth\": … }.");
      return;
    }
    const who = p.name || p.id || "#" + i;
    if (!p.name) err("E003", P + ".name", "Persona senza nome.", "Serve `name`, per esempio \"Anna\".");
    if (!p.id) warn("W014", P + ".id", who + " non ha un `id`.",
                    "Senza id nessun evento condiviso potrà riferirsi a questa persona con `who`.");
    else if (ids.has(p.id))
      err("E007", P + ".id", 'L\'id "' + p.id + '" è già usato da ' + ids.get(p.id) + ".",
          "Gli id devono essere unici: servono a collegare eventi e periodi condivisi.");
    else ids.set(p.id, who);
    if (p.name){
      if (names.has(p.name))
        warn("W007", P + ".name", "Due persone si chiamano " + p.name + ".",
             "Le colonne della matrice saranno indistinguibili: aggiungi un cognome o un soprannome.");
      names.set(p.name, i);
    }

    if (p.birth == null)
      err("E004", P + ".birth", who + " non ha una data di nascita.",
          "`birth` è obbligatoria: da lì discendono tutte le età.");
    const b = date(p.birth, P + ".birth", "Nascita di " + who);
    if (b) births.set(i, b);
    const dd = p.death != null ? date(p.death, P + ".death", "Morte di " + who) : null;
    if (dd) deaths.set(i, dd);
    if (b && dd && dd.t1 <= b.t0)
      err("E010", P + ".death", who + " risulta morto prima di nascere.",
          "Nascita " + fmtDate(b) + ", morte " + fmtDate(dd) + ".");

    if (p.color != null && !/^#[0-9a-fA-F]{6}$/.test(String(p.color)))
      warn("W009", P + ".color", '"' + p.color + '" non è un colore esadecimale a sei cifre.',
           "Verrà usato un colore della tavolozza. Formato atteso: \"#35407E\".");

    /* scuola */
    if (p.school != null){
      if (typeof p.school !== "object")
        err("E013", P + ".school", "Deve essere un oggetto.", "Per esempio { \"through\": \"highschool\" }.");
      else {
        if (p.school.through != null && REPLACE_KEYS.indexOf(p.school.through) < 0)
          err("E013", P + ".school.through", '"' + p.school.through + '" non è un ciclo noto.',
              "Ammessi: " + REPLACE_KEYS.join(", ") + ".");
        for (const k of Object.keys(p.school.delays || {})){
          if (REPLACE_KEYS.indexOf(k) < 0)
            err("E014", P + ".school.delays." + k, '"' + k + '" non è un ciclo noto.',
                "Ammessi: " + REPLACE_KEYS.join(", ") + ".");
          else if (!Number.isInteger(p.school.delays[k]) || p.school.delays[k] < 0)
            err("E014", P + ".school.delays." + k, "Il ritardo dev'essere un intero non negativo.",
                "Un anno perso alle medie si scrive 1.");
        }
      }
    }

    /* documenti */
    (p.documents || []).forEach((doc, j) => {
      const Q = P + ".documents[" + j + "]";
      if (doc.expires == null)
        err("E017", Q + ".expires", "Documento senza scadenza.",
            "`expires` è obbligatoria: è da lì che si proiettano i rinnovi.");
      const e = date(doc.expires, Q + ".expires", "Scadenza");
      if (doc.type != null && DOC_TYPES.indexOf(doc.type) < 0 && doc.validity == null)
        warn("W016", Q + ".type", '"' + doc.type + '" non ha regole di rinnovo note.',
             "Verrà usata una validità di 10 anni. Ammessi: " + DOC_TYPES.join(", ") +
             ", oppure indica `validity` in anni.");
      if (doc.validity != null && (!Number.isInteger(doc.validity) || doc.validity <= 0))
        err("E018", Q + ".validity", "La validità dev'essere un intero positivo di anni.",
            "Per esempio 4.");
      if (e && b && e.t1 < b.t0)
        err("E009", Q + ".expires", "Il documento scade prima della nascita.",
            "Nascita " + fmtDate(b) + ", scadenza " + fmtDate(e) + ".");
      if (e && e.t1 < todayDec() - 10)
        warn("W008", Q + ".expires", "Scadenza vecchia di oltre dieci anni: " + fmtDate(e) + ".",
             "La catena dei rinnovi partirà da lì e riempirà la corsia di voci passate. " +
             "Di solito conviene indicare la scadenza attuale.");
    });

    (p.periods || []).forEach((q, j) => span(q, P + ".periods[" + j + "]", i));
    (p.events  || []).forEach((e, j) => point(e, P + ".events[" + j + "]", i));
  });

  /* ---------- radice ---------- */
  (data.events   || []).forEach((e, i) => point(e, "events[" + i + "]", null));
  (data.periods  || []).forEach((q, i) => span(q, "periods[" + i + "]", null));
  (data.holidays || []).forEach((q, i) => span(q, "holidays[" + i + "]", null, true));

  if (data.meta && data.meta.anchor && !ids.has(data.meta.anchor))
    err("E020", "meta.anchor", 'Nessuna persona ha l\'id "' + data.meta.anchor + '".',
        ids.size ? "Id disponibili: " + [...ids.keys()].join(", ") + "." : "Dai un `id` a una persona.");

  /* ---------- places ---------- */
  const dict = {};
  if (data.places != null){
    if (typeof data.places !== "object" || Array.isArray(data.places))
      err("E021", "places", "Deve essere un dizionario nome → coordinate.",
          'Per esempio { "Porto Ercole": [42.394, 11.207] }.');
    else for (const [k, v] of Object.entries(data.places)){
      if (!Array.isArray(v) || v.length < 2 || typeof v[0] !== "number" || typeof v[1] !== "number")
        err("E015", "places." + k, "Coordinate non valide.", "Servono due numeri: [latitudine, longitudine].");
      else if (v[0] < -90 || v[0] > 90 || v[1] < -180 || v[1] > 180)
        err("E015", "places." + k, "Coordinate fuori scala: [" + v[0] + ", " + v[1] + "].",
            "Latitudine fra -90 e 90, longitudine fra -180 e 180. Forse sono invertite?");
      else dict[k] = v;
    }
  }
  // `usedPlaces` è completo solo ora: i luoghi si raccolgono scorrendo persone,
  // eventi e periodi, che vengono prima.
  for (const k of Object.keys(dict))
    if (!usedPlaces.has(k))
      warn("W005", "places." + k, '"' + k + '" non è usato da nessun evento o periodo.',
           "Innocuo, ma forse il nome non coincide con quello scritto in `place`.");

  return D;

  /* ---------- helper condivisi ---------- */
  function place(v, path){
    if (v == null) return;
    if (typeof v === "string"){ usedPlaces.add(v); return; }
    if (typeof v !== "object" || !v.name){
      err("E015", path, "Luogo non valido.",
          'Una stringa ("Milano") oppure { "name": …, "coord": [lat, lon] }.');
      return;
    }
    usedPlaces.add(v.name);
    if (v.coord != null){
      if (!Array.isArray(v.coord) || v.coord.length < 2 ||
          typeof v.coord[0] !== "number" || typeof v.coord[1] !== "number")
        err("E015", path + ".coord", "Coordinate non valide.", "Servono due numeri: [latitudine, longitudine].");
      else if (v.coord[0] < -90 || v.coord[0] > 90 || v.coord[1] < -180 || v.coord[1] > 180)
        err("E015", path + ".coord", "Coordinate fuori scala.",
            "Latitudine fra -90 e 90, longitudine fra -180 e 180. Forse sono invertite?");
    }
  }
  function whoRefs(x, path){
    if (x.who == null) return;
    if (!Array.isArray(x.who)){
      err("E021", path + ".who", "Deve essere una lista di id.", 'Per esempio ["me", "laura"].');
      return;
    }
    x.who.forEach((id, k) => {
      if (!ids.has(id))
        err("E008", path + ".who[" + k + "]", 'Nessuna persona ha l\'id "' + id + '".',
            ids.size ? "Id disponibili: " + [...ids.keys()].join(", ") + "." : "Dai un `id` alle persone.");
    });
    // Solo se l'id esiste: altrimenti l'avviso si accavallerebbe all'errore E008.
    if (x.who.length === 1 && ids.has(x.who[0]))
      warn("W004", path + ".who", "Un solo riferimento in `who`.",
           "Se riguarda solo " + ids.get(x.who[0]) +
           ", sta meglio dentro `people[].events` o `people[].periods`.");
  }
  function category(x, path){
    if (x.category != null && KNOWN_CATEGORIES.indexOf(x.category) < 0)
      warn("W006", path + ".category", '"' + x.category + '" non è una categoria nota.',
           "Finirà nella corsia Vita. Note: " + KNOWN_CATEGORIES.join(", ") + ".");
    if (x.track != null && TRACKS.every(t => t.k !== x.track))
      warn("W006", path + ".track", '"' + x.track + '" non è una corsia nota.',
           "Corsie: " + TRACKS.map(t=>t.k).join(", ") + ".");
  }
  function lifeSpan(dt, personIx, path, label){
    if (personIx == null || !dt) return;
    const b = births.get(personIx), dd = deaths.get(personIx);
    if (b && dt.t1 < b.t0)
      warn("W002", path, label + " precede la nascita (" + fmtDate(b) + ").",
           "Non comparirà nella vista Età allineate.");
    if (dd && dt.t0 > dd.t1)
      warn("W002", path, label + " è successivo alla morte (" + fmtDate(dd) + ").",
           "Comparirà comunque sulla cronologia, ma le età risulteranno vuote.");
  }
  function point(e, path, personIx){
    if (!e || typeof e !== "object"){
      err("E011", path, "Questa voce non è un oggetto.", 'Un evento è { "label": …, "date": … }.');
      return;
    }
    if (!e.label) warn("W015", path + ".label", "Evento senza etichetta.", "Comparirà come voce vuota.");
    if (e.date == null)
      err("E011", path + ".date", "Evento senza data.",
          "Un evento è puntuale e usa `date`; per un intervallo usa `start` e `end`.");
    if (e.start != null || e.end != null)
      err("E011", path, "Un evento non può avere `start` o `end`.",
          "Punto nel tempo → `date`. Intervallo → spostalo in `periods` con `start`/`end`.");
    const d = date(e.date, path + ".date", "Data");
    lifeSpan(d, personIx, path + ".date", "L'evento");
    if (d && horizon && d.t0 > horizon.t1)
      warn("W003", path + ".date", "Oltre l'orizzonte (" + fmtDate(horizon) + ").",
           "Non verrà disegnato: alza `settings.horizon`.");
    if (e.recurrences != null && e.recurrences !== true &&
        (!Array.isArray(e.recurrences) || e.recurrences.some(n => !Number.isInteger(n) || n <= 0)))
      err("E016", path + ".recurrences", "Deve essere `true` o una lista di interi positivi.",
          "Per esempio [10, 25, 50], oppure true per usare `settings.milestones`.");
    place(e.place, path + ".place");
    whoRefs(e, path);
    category(e, path);
  }
  function span(q, path, personIx, isHoliday){
    if (!q || typeof q !== "object"){
      err("E011", path, "Questa voce non è un oggetto.", 'Un periodo è { "label": …, "start": … }.');
      return;
    }
    if (!q.label) warn("W015", path + ".label", "Periodo senza etichetta.", "La barra risulterà anonima.");
    if (q.start == null)
      err("E011", path + ".start", "Periodo senza inizio.",
          "`start` è obbligatorio; `end` si può omettere per indicare «ancora in corso».");
    if (q.date != null)
      err("E011", path + ".date", "Un periodo non usa `date`.",
          "Intervallo → `start` e `end`. Punto nel tempo → spostalo in `events`.");
    const s = date(q.start, path + ".start", "Inizio");
    const e = q.end != null ? date(q.end, path + ".end", "Fine") : null;
    if (s && e && e.t1 <= s.t0)
      err("E009", path + ".end", "La fine precede l'inizio.",
          "Inizio " + fmtDate(s) + ", fine " + fmtDate(e) + ".");
    lifeSpan(s, personIx, path + ".start", "Il periodo");
    if (s && horizon && s.t0 > horizon.t1)
      warn("W003", path + ".start", "Oltre l'orizzonte (" + fmtDate(horizon) + ").",
           "Non verrà disegnato: alza `settings.horizon`.");
    if (q.replaces != null && REPLACE_KEYS.indexOf(q.replaces) < 0)
      err("E012", path + ".replaces", '"' + q.replaces + '" non è un ciclo scolastico noto.',
          "Ammessi: " + REPLACE_KEYS.join(", ") + ".");
    if (q.replaces != null && personIx != null && !(data.people[personIx] || {}).school)
      warn("W011", path + ".replaces", "Non c'è nulla da sostituire.",
           "`replaces` ha effetto solo se la persona ha un blocco `school`.");
    if (isHoliday && s && e && (e.mid - s.mid) > 0.5)
      warn("W012", path, "Vacanza di oltre sei mesi.",
           "Se è un trasferimento, sta meglio come periodo con `track` `home` o `work`.");
    place(q.place, path + ".place");
    whoRefs(q, path);
    category(q, path);
  }
}
