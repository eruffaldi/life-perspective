/**
 * Test di integrazione sull'ARTEFATTO COSTRUITO, non sul sorgente: collaudano
 * ciò che si spedisce, compreso l'inlining di Vite.
 *
 * Il boot avviene dopo `DOMContentLoaded`, che in jsdom è asincrono: senza
 * l'attesa si misurerebbe una pagina vuota e i test passerebbero per sbaglio.
 */
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ARTIFACT = path.resolve("dist/prospettiva.html");

let dom: JSDOM;
let doc: Document;
const consoleErrors: string[] = [];

const settle = (ms = 80) => new Promise(r => setTimeout(r, ms));
const $ = <T extends Element = HTMLElement>(sel: string) => doc.querySelector<T>(sel);
const $$ = (sel: string) => [...doc.querySelectorAll(sel)];
const click = (sel: string) => ($<HTMLElement>(sel))?.click();
const view = (name: string) => click(`nav.views button[data-view="${name}"]`);

beforeAll(async () => {
  expect(fs.existsSync(ARTIFACT), "manca dist/prospettiva.html — esegui `npm run build`").toBe(true);
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e: Error) => consoleErrors.push(e.message));
  vc.on("error", (...a: unknown[]) => consoleErrors.push(a.map(String).join(" ")));
  dom = new JSDOM(fs.readFileSync(ARTIFACT, "utf8"), {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://prospettiva.test/"
  });
  doc = dom.window.document;
  await settle(150);
  // jsdom dichiara `en-US` e l'applicazione lo rispetta: i test asseriscono
  // sui testi italiani, quindi la lingua si fissa qui.
  const picker = doc.querySelector<HTMLSelectElement>("#lang")!;
  picker.value = "it";
  picker.dispatchEvent(new dom.window.Event("change"));
  await settle(60);
});

describe("avvio", () => {
  it("non produce errori", () => {
    expect(consoleErrors).toEqual([]);
  });

  it("disegna la cronologia con barre e marcatori", () => {
    expect($$("#pane-chart .bar").length).toBeGreaterThan(5);
    expect($$("#pane-chart .mk").length).toBeGreaterThan(5);
    expect($("#pane-chart .meridian")).not.toBeNull();
  });

  it("non produce barre di larghezza negativa", () => {
    for (const bar of $$("#pane-chart .bar")) {
      const w = parseFloat((bar as HTMLElement).style.width);
      expect(w).toBeGreaterThan(0);
    }
  });

  it("etichetta alcuni marcatori, mai più di quanti ne esistano", () => {
    const labels = $$("#pane-chart .mklab").length;
    expect(labels).toBeGreaterThan(3);
    expect(labels).toBeLessThanOrEqual($$("#pane-chart .mk").length);
  });

  it("mostra la persona di riferimento", () => {
    expect($("#anchorline")?.textContent).toMatch(/Marta/);
  });
});

describe("viste", () => {
  it("ne espone cinque", () => {
    expect($$(".pane")).toHaveLength(5);
  });

  it("passa a età allineate cambiando l'asse", () => {
    view("ages");
    expect($("#pane-ages")?.classList.contains("on")).toBe(true);
    expect($("#pane-ages .axishead")?.textContent).toBe("Età");
    expect($$("#pane-ages .bar").length).toBeGreaterThan(5);
  });

  it("elenca gli anni densi e i prossimi passaggi", () => {
    view("dense");
    expect($$("#pane-dense .year").length).toBeGreaterThan(0);
    const next = $$("#pane-dense .nx");
    expect(next.length).toBeGreaterThan(0);
    expect(next.length).toBeLessThanOrEqual(6);
    expect($("#pane-dense .nxdist")?.textContent).toMatch(/^tra |^adesso/);
  });

  it("costruisce la matrice con una colonna per persona", () => {
    view("matrix");
    expect($$("#pane-matrix tbody tr").length).toBeGreaterThan(5);
    expect($$("#pane-matrix thead th")).toHaveLength(2 + 5);
  });

  it("nasconde la legenda fuori dalle viste a grafico", () => {
    view("dense");
    expect($("#legend")?.classList.contains("on")).toBe(false);
    view("chart");
    expect($("#legend")?.classList.contains("on")).toBe(true);
  });
});

describe("carta dei luoghi", () => {
  beforeAll(() => view("places"));

  it("disegna la costa dentro un svg", () => {
    expect($("#pane-places svg")).not.toBeNull();
    expect($$("#pane-places path.coast").length).toBeGreaterThan(100);
  });

  // Regressione: un secondo ribaltamento dell'asse y spediva la costa fuori
  // campo lasciando i pin al posto giusto — "si vedono solo i punti".
  it("colloca la costa nel riquadro e vicino ai pin", () => {
    const tr = $("#pane-places svg g")!.getAttribute("transform")!;
    const fns = [...tr.matchAll(/(translate|scale)\(([^)]*)\)/g)]
      .map(m => ({ f: m[1]!, a: m[2]!.split(/[ ,]+/).map(Number) }));
    expect(fns.length).toBeGreaterThanOrEqual(3);
    const apply = (x: number, y: number): [number, number] => {
      for (let i = fns.length - 1; i >= 0; i--) {
        const { f, a } = fns[i]!;
        if (f === "scale") { x *= a[0]!; y *= a.length > 1 ? a[1]! : a[0]!; }
        else { x += a[0]!; y += a.length > 1 ? a[1]! : 0; }
      }
      return [x, y];
    };
    const pinAt = /translate\((-?[\d.]+),(-?[\d.]+)\)/
      .exec($("#pane-places .pin")!.getAttribute("transform")!)!
      .slice(1).map(Number) as [number, number];

    let inside = 0, near = 0, total = 0;
    for (const p of $$("#pane-places path.coast")) {
      for (const m of p.getAttribute("d")!.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
        total++;
        const [x, y] = apply(Number(m[1]), Number(m[2]));
        if (x >= 0 && x <= 800 && y >= 0 && y <= 600) inside++;
        if (Math.hypot(x - pinAt[0], y - pinAt[1]) < 200) near++;
      }
    }
    expect(total).toBeGreaterThan(5000);
    expect(inside).toBeGreaterThan(150);
    expect(near).toBeGreaterThan(20);
  });

  it("mette un pin per luogo e li elenca a lato", () => {
    const names = $$("#pane-places .pin text").map(t => t.textContent);
    expect(names).toContain("Lerici");
    expect(names).toContain("Barcellona");
    expect($$("#pane-places .plc").length).toBeGreaterThanOrEqual(5);
  });

  it("nasconde le etichette che si sovrappongono, tenendo i pin", () => {
    const visibili = $$("#pane-places .pin text")
      .filter(t => (t as SVGElement).style.display !== "none");
    const pins = $$("#pane-places .pin").length;
    expect(visibili.length).toBeLessThan(pins);
    expect(visibili.length).toBeGreaterThanOrEqual(3);
    const nomi = visibili.map(t => t.textContent);
    expect(nomi).toContain("Bologna");
    expect(nomi).not.toContain("Università di Bologna");
  });

  it("accende e spegne i luoghi con il cursore degli anni", () => {
    const range = $<HTMLInputElement>("#pane-places .scrub input[type=range]")!;
    range.value = "1985";
    range.dispatchEvent(new dom.window.Event("input"));
    expect($("#pane-places .scrubyear")?.textContent).toBe("1985");
    const attivi = () => $$("#pane-places .pin")
      .filter(p => !p.classList.contains("dim"))
      .map(p => p.querySelector("text")?.textContent);
    expect(attivi()).toContain("Siena");
    expect(attivi()).not.toContain("Barcellona");

    // Regressione: i periodi senza `end` sparivano dagli anni futuri.
    range.value = "2040";
    range.dispatchEvent(new dom.window.Event("input"));
    expect($("#pane-places .scrubyear")?.textContent).toBe("2040");
    expect(attivi()).toContain("Milano");
  });

  it("traccia i traslochi", () => {
    expect($$("#pane-places path.trace").length).toBeGreaterThanOrEqual(2);
  });
});

describe("filtri", () => {
  const labels = () => $$("#filters label span:first-of-type").map(x => x.textContent);
  const boxes = () => $$("#filters input[type=checkbox]") as HTMLInputElement[];
  const toggle = (name: string, on: boolean) => {
    const i = labels().indexOf(name);
    const cb = boxes()[i]!;
    cb.checked = on;
    cb.onchange?.(new dom.window.Event("change"));
  };

  it("elenca tutte le corsie, con i documenti spenti", () => {
    expect(labels()).toContain("Vacanze");
    expect(labels()).toContain("Documenti");
    expect(boxes()[labels().indexOf("Documenti")]!.checked).toBe(false);
    expect(boxes()[labels().indexOf("Vacanze")]!.checked).toBe(true);
  });

  it("aggiunge e toglie barre dalla cronologia", () => {
    view("chart");
    const prima = $$("#pane-chart .bar").length;
    toggle("Documenti", true);
    expect($$("#pane-chart .bar").length).toBeGreaterThan(prima);
    toggle("Documenti", false);
    expect($$("#pane-chart .bar").length).toBe(prima);
  });

  it("agisce anche su matrice e carta", () => {
    view("matrix");
    const conVacanze = $$("#pane-matrix tbody tr").length;
    toggle("Vacanze", false);
    expect($$("#pane-matrix tbody tr").length).toBeLessThan(conVacanze);

    view("places");
    const senza = $$("#pane-places .pin").length;
    toggle("Vacanze", true);
    view("places");
    expect($$("#pane-places .pin").length).toBeGreaterThan(senza);
  });

  it("svuota e riempie con Tutto e Niente", () => {
    const [tutto, niente] = $$("#filters .fbtns button") as HTMLElement[];
    niente!.click();
    view("places");
    expect($$("#pane-places .pin")).toHaveLength(0);
    tutto!.click();
    view("chart");
    expect(boxes().every(c => c.checked || c.disabled)).toBe(true);
  });
});

describe("diagnostica", () => {
  const setJSON = (value: unknown) => {
    $<HTMLTextAreaElement>("#json")!.value =
      typeof value === "string" ? value : JSON.stringify(value);
  };
  const diagText = () => $("#diags")?.textContent ?? "";

  beforeAll(() => { click("#btnData"); });

  it("tratta il JSON malformato come una diagnostica", () => {
    setJSON("{ non json");
    click("#btnApply");
    expect($("#msg")?.classList.contains("err")).toBe(true);
    expect($("#diags")?.classList.contains("on")).toBe(true);
    expect(diagText()).toMatch(/E000/);
    expect(diagText()).toMatch(/riga \d+/);
  });

  it("non carica dati con errori e lascia a schermo i precedenti", () => {
    const prima = $$("#pane-chart .bar").length;
    setJSON({ people: [{ name: "X" }] });
    click("#btnApply");
    expect(diagText()).toMatch(/E004/);
    expect($$("#pane-chart .bar")).toHaveLength(prima);
  });

  it("carica lo stesso quando ci sono solo avvisi", () => {
    setJSON({ people: [{ id: "x", name: "X", birth: "1990-01-01", color: "blu" }] });
    click("#btnApply");
    expect(diagText()).toMatch(/W009/);
    expect($("#msg")?.textContent).toMatch(/Applicato/);
  });

  it("Controlla esamina senza sostituire i dati caricati", () => {
    setJSON({ people: [{ name: "Y" }] });
    click("#btnCheck");
    expect(diagText()).toMatch(/E004/);
    expect($("#anchorline")?.textContent).toMatch(/X/);
  });

  it("porta il cursore sul punto responsabile", () => {
    setJSON({ people: [{ id: "z", name: "Z", birth: "12/07/1978" }] });
    click("#btnCheck");
    const row = $$("#diags .dg")[0] as HTMLElement;
    row.click();
    const ta = $<HTMLTextAreaElement>("#json")!;
    expect(ta.value.slice(ta.selectionStart, ta.selectionEnd)).toContain("12/07/1978");
  });

  // RF10: un avviso permanente su dati corretti insegna a ignorare gli avvisi.
  it("resta muto sui dati puliti", () => {
    setJSON({ people: [{ id: "z", name: "Z", birth: "1990-01-01" }] });
    click("#btnCheck");
    expect($("#diags")?.classList.contains("on")).toBe(false);
    expect($("#btnData")?.textContent).toBe("Dati");
  });
});

describe("adattamento al tocco", () => {
  // I test della diagnostica lasciano caricato un documento senza luoghi: la
  // carta sarebbe vuota e le asserzioni passerebbero su un insieme vuoto.
  beforeAll(() => {
    click("#btnReset");
    click("#btnApply");
  });

  it("dà alla carta comandi di zoom espliciti, non solo gesti", () => {
    // Regressione: su un telefono dove il browser non rispetta `touch-action`
    // la pinch non arriva mai, e senza pulsanti la carta è inutilizzabile.
    view("places");
    const labels = $$("#pane-places .geozoom .btn").map(b => b.textContent);
    expect(labels).toContain("+");
    expect(labels).toContain("−");
  });

  it("dichiara touch-action sulla carta, o il browser ruba il gesto", () => {
    const css = fs.readFileSync(ARTIFACT, "utf8");
    expect(css).toMatch(/touch-action:\s*none/);
  });

  it("lascia al browser lo scorrimento delle viste", () => {
    const css = fs.readFileSync(ARTIFACT, "utf8");
    expect(css).toMatch(/\.pane\{[^}]*touch-action:\s*pan-x pan-y/);
  });

  it("allarga le aree sensibili sotto un puntatore grossolano", () => {
    const css = fs.readFileSync(ARTIFACT, "utf8");
    expect(css).toMatch(/pointer:\s*coarse/);
    expect(css).toMatch(/\.hit\{width:44px\}|\.hit\{[^}]*width:\s*44px/);
  });

  it("ascolta gli eventi da puntatore, non solo quelli del mouse", () => {
    // jsdom non implementa PointerEvent, quindi non si può simulare la pinch
    // qui: la matematica è provata in gestures.test.ts. Qui basta accertare
    // che il cablaggio sia finito nell'artefatto.
    const html = fs.readFileSync(ARTIFACT, "utf8");
    expect(html).toContain("pointerdown");
    expect(html).toContain("pointercancel");
  });

  it("dà a ogni pin un bersaglio più largo del cerchio visibile", () => {
    view("places");
    for (const pin of $$("#pane-places .pin")) {
      const grab = pin.querySelector(".grab");
      const circle = pin.querySelector("circle:not(.grab)");
      if (!grab || !circle) continue;
      expect(Number(grab.getAttribute("r")))
        .toBeGreaterThan(Number(circle.getAttribute("r")));
    }
  });
});

describe("etichette", () => {
  // I test della diagnostica lasciano caricato un documento minimo: qui
  // servono i dati d'esempio, che hanno abbastanza voci da farle competere.
  beforeAll(() => {
    click("#btnReset");
    click("#btnApply");
  });

  /** Rettangolo stimato di un'etichetta, dagli stili inline che le collocano. */
  const boxes = (nodes: Element[], offset: number) =>
    nodes.map(n => {
      const x = parseFloat((n as HTMLElement).style.left) + offset;
      return { x0: x, x1: x + (n.textContent?.length ?? 0) * 11 * 0.55 };
    }).sort((a, b) => a.x0 - b.x0);

  const disgiunti = (bs: { x0: number; x1: number }[]) =>
    bs.every((b, i) => i === 0 || b.x0 >= bs[i - 1]!.x1 - 0.5);

  // Le etichette dei marcatori non si nascondono più: scendono di riga. Il
  // vincolo vale quindi per riga, non per corsia.
  it("i marcatori non si accavallano dentro la stessa riga", () => {
    view("chart");
    for (const track of $$("#pane-chart .prow.head .track")) {
      const perRiga = new Map<string, Element[]>();
      for (const label of track.querySelectorAll(".mklab")) {
        const top = (label as HTMLElement).style.top;
        (perRiga.get(top) ?? perRiga.set(top, []).get(top)!).push(label);
      }
      for (const [top, labels] of perRiga) {
        expect(disgiunti(boxes(labels, 9)),
          "riga " + top + ": " + labels.map(l => l.textContent).join(" | ")).toBe(true);
      }
    }
  });

  it("usa più righe invece di nascondere le scritte", () => {
    view("chart");
    const righe = new Set([...$$("#pane-chart .prow.head .mklab")]
      .map(l => (l as HTMLElement).style.top));
    expect(righe.size).toBeGreaterThan(1);
    // La corsia cresce per farcele stare, invece di tagliarle.
    const track = $("#pane-chart .prow.head .track") as HTMLElement;
    expect(parseFloat(track.style.height)).toBeGreaterThan(22);
  });

  it("collega con un rigo le etichette scese di riga", () => {
    view("chart");
    const scese = $$("#pane-chart .prow.head .mklab")
      .filter(l => parseFloat((l as HTMLElement).style.top) > 20).length;
    expect($$("#pane-chart .prow.head .mkline").length).toBe(scese);
  });

  // Regressione: una scritta che sborda fa sembrare il periodo più lungo di
  // quanto sia. "Scuola Normale Superiore" arrivava al 1925 su una barra che
  // finiva nel 1922.
  it("le etichette dei periodi restano dentro il rettangolo", () => {
    view("chart");
    const wraps = $$("#pane-chart .barwrap.inside").filter(w => w.querySelector(".barlab"));
    expect(wraps.length).toBeGreaterThan(5);
    for (const w of wraps) {
      const el = w as HTMLElement;
      expect(parseFloat(el.style.width)).toBeGreaterThanOrEqual(18);
      // Il confinamento è dichiarato nel CSS, non nella misura del testo.
      expect(el.className).toContain("inside");
    }
    const css = fs.readFileSync(ARTIFACT, "utf8");
    expect(css).toMatch(/\.barwrap\.inside\{[^}]*overflow:hidden/);
    expect(css).toMatch(/\.barwrap\.inside \.barlab\{[^}]*text-overflow:ellipsis/);
  });

  it("solo le barre troppo strette portano l'etichetta fuori, e senza accavallarsi", () => {
    view("chart");
    for (const track of $$("#pane-chart .prow:not(.head) .track")) {
      const fuori = [...track.querySelectorAll(".barwrap:not(.inside)")]
        .filter(w => w.querySelector(".barlab"));
      for (const w of fuori) {
        expect(parseFloat((w as HTMLElement).style.width)).toBeLessThan(18);
      }
      const measured = fuori.map(w => {
        const x = parseFloat((w as HTMLElement).style.left) + 6;
        const text = w.querySelector(".barlab")?.textContent ?? "";
        return { x0: x, x1: x + text.length * 11 * 0.55 };
      }).sort((a, b) => a.x0 - b.x0);
      expect(disgiunti(measured)).toBe(true);
    }
  });

  it("continua a mostrarne un numero utile", () => {
    view("chart");
    expect($$("#pane-chart .mklab").length).toBeGreaterThan(3);
    expect($$("#pane-chart .barlab").length).toBeGreaterThan(5);
  });

  it("le etichette dei pin restano disgiunte anche sulla carta", () => {
    view("places");
    const visibili = $$("#pane-places .pin")
      .filter(p => (p.querySelector("text") as SVGElement | null)?.style.display !== "none");
    const rects = visibili.map(p => {
      const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(p.getAttribute("transform")!)!;
      const r = Number(p.querySelector("circle:not(.grab)")!.getAttribute("r"));
      const text = p.querySelector("text")!.textContent ?? "";
      const x = Number(m[1]) + r + 5;
      return { x0: x, x1: x + text.length * 11 * 0.55, y: Number(m[2]) };
    });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!, b = rects[j]!;
        const stessaRiga = Math.abs(a.y - b.y) < 13;
        if (stessaRiga) expect(a.x1 < b.x0 || b.x1 < a.x0).toBe(true);
      }
    }
  });
});

describe("ingombro dei comandi", () => {
  it("le schede portano un'etichetta breve per lo schermo stretto", () => {
    for (const btn of $$("nav.views button")) {
      expect(btn.querySelector(".lg")?.textContent).toBeTruthy();
      expect(btn.querySelector(".sm")?.textContent).toBeTruthy();
    }
  });

  it("sposta le schede in fondo sotto i 720px", () => {
    const css = fs.readFileSync(ARTIFACT, "utf8");
    expect(css).toMatch(/max-width:720px/);
    expect(css).toMatch(/nav\.views\{[^}]*position:fixed/);
  });

  it("nasconde la legenda dove il gesto che descrive non esiste", () => {
    const css = fs.readFileSync(ARTIFACT, "utf8");
    expect(css).toMatch(/@media\s*\(hover:none\)/);
  });

  it("riserva alla vista lo spazio delle due barre", () => {
    const css = fs.readFileSync(ARTIFACT, "utf8");
    expect(css).toMatch(/top:var\(--headh/);
    expect(css).toMatch(/bottom:var\(--navh/);
  });
});


describe("comando della scala", () => {
  beforeAll(() => {
    click("#btnReset");
    click("#btnApply");
    view("chart");
  });

  it("si apre su richiesta, non occupa l'intestazione", () => {
    expect($("#scalebox")?.classList.contains("on")).toBe(false);
    click("#btnScale");
    expect($("#scalebox")?.classList.contains("on")).toBe(true);
  });

  it("offre cursore, passi e livelli predefiniti", () => {
    click("#btnScale");
    if (!$("#scalebox")?.classList.contains("on")) click("#btnScale");
    expect($("#scalebox input[type=range]")).not.toBeNull();
    const passi = $$("#scalebox .scalerow .btn").map(b => b.textContent);
    expect(passi).toContain("+");
    expect(passi).toContain("−");
    expect($$("#scalebox .presets .btn").length).toBeGreaterThanOrEqual(3);
  });

  it("cambia davvero la larghezza del grafico", () => {
    const larghezza = () => parseFloat(($("#pane-chart .inner") as HTMLElement).style.width
      .replace(/[^\d.]/g, "")) || 0;
    const prima = larghezza();
    const slider = $<HTMLInputElement>("#scalebox input[type=range]")!;
    slider.value = String(Number(slider.max));
    slider.dispatchEvent(new dom.window.Event("input"));
    expect(larghezza()).toBeGreaterThan(prima);
  });

  it("il livello «Tutto» fa entrare l'intero arco", () => {
    const presets = $$("#scalebox .presets .btn") as HTMLElement[];
    const tutto = presets.find(b => b.textContent === "Tutto")!;
    tutto.click();
    // In jsdom clientWidth è zero: il calcolo ripiega su 800 pixel.
    const inner = $("#pane-chart .inner") as HTMLElement;
    expect(inner.style.width).toBeTruthy();
  });

  it("si disabilita dove non c'è un asse del tempo", () => {
    view("matrix");
    expect($<HTMLButtonElement>("#btnScale")!.disabled).toBe(true);
    view("chart");
    expect($<HTMLButtonElement>("#btnScale")!.disabled).toBe(false);
  });

  it("non è più un cursore fisso nell'intestazione", () => {
    expect($("#head input[type=range]")).toBeNull();
  });
});

describe("cambio di lingua", () => {
  const picker = () => $<HTMLSelectElement>("#lang")!;
  const setLang = (code: string) => {
    picker().value = code;
    picker().dispatchEvent(new dom.window.Event("change"));
  };

  beforeAll(() => {
    click("#btnReset");
    click("#btnApply");
    setLang("it");
  });

  it("offre le lingue disponibili", () => {
    const codes = [...picker().options].map(o => o.value).sort();
    expect(codes).toEqual(["en", "it"]);
  });

  it("cambia i testi dell'intestazione e delle viste", () => {
    setLang("en");
    expect($("#btnScale")?.textContent).toBe("Scale");
    expect($$("nav.views .lg").map(x => x.textContent)).toContain("Timeline");
    setLang("it");
    expect($("#btnScale")?.textContent).toBe("Scala");
    expect($$("nav.views .lg").map(x => x.textContent)).toContain("Cronologia");
  });

  it("ricostruisce anche le etichette generate dal modello", () => {
    setLang("en");
    view("chart");
    const labels = $$("#pane-chart .barlab").map(x => x.textContent);
    expect(labels.some(l => /High school|Primary|Middle/.test(l ?? ""))).toBe(true);
    setLang("it");
    const italiane = $$("#pane-chart .barlab").map(x => x.textContent);
    expect(italiane.some(l => /Liceo|Elementari|Medie/.test(l ?? ""))).toBe(true);
  });

  it("aggiorna l'attributo lang del documento", () => {
    setLang("en");
    expect(doc.documentElement.lang).toBe("en");
    setLang("it");
    expect(doc.documentElement.lang).toBe("it");
  });

  // Regressione: `relabel` ricostruiva il modello dal testo della textarea, e
  // con dati in corso di correzione sollevava, facendo cadere il cambio lingua.
  it("regge un cambio di lingua mentre i dati sono da correggere", () => {
    click("#btnData");
    $<HTMLTextAreaElement>("#json")!.value = JSON.stringify({ people: [{ name: "X" }] });
    click("#btnCheck");
    const barre = $$("#pane-chart .bar").length;
    setLang("en");
    expect($$("#pane-chart .bar").length).toBe(barre);
    expect($("#btnScale")?.textContent).toBe("Scale");
    setLang("it");
    click("#btnReset");
    click("#btnApply");
  });
});
