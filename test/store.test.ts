/**
 * Persistenza nei tre contesti previsti. Il terzo — nessuno storage — non è un
 * errore: da file:// alcuni browser lo negano, e l'app deve reggere.
 */
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ARTIFACT = path.resolve("dist/prospettiva.html");
const HTML = fs.readFileSync(ARTIFACT, "utf8");
const settle = (ms = 140) => new Promise(r => setTimeout(r, ms));

interface Options { noLocal?: boolean; appStore?: boolean }

/** Fissa l'italiano: jsdom dichiara `en-US` e l'applicazione lo rispetta. */
function italiano(dom: JSDOM): void {
  const picker = dom.window.document.querySelector<HTMLSelectElement>("#lang");
  if (!picker) return;
  picker.value = "it";
  picker.dispatchEvent(new dom.window.Event("change"));
}

function open(opts: Options = {}): JSDOM {
  const dom = new JSDOM(HTML, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://prospettiva.test/"
  });
  if (opts.noLocal) {
    Object.defineProperty(dom.window, "localStorage", {
      get() { throw new Error("negato"); }
    });
  }
  if (opts.appStore) {
    const mem = new Map<string, string>();
    (dom.window as unknown as { storage: unknown }).storage = {
      async set(k: string, v: string) { mem.set(k, v); return { key: k, value: v }; },
      async get(k: string) {
        if (!mem.has(k)) throw new Error("assente");
        return { key: k, value: mem.get(k)! };
      },
      async delete(k: string) { mem.delete(k); return { key: k, deleted: true }; }
    };
    (dom.window as unknown as { __mem: Map<string, string> }).__mem = mem;
  }
  return dom;
}

const MINIMAL = {
  version: 1, meta: { anchor: "z" },
  people: [{ id: "z", name: "Zeta", birth: "1990-06-01" }]
};

describe("localStorage disponibile", () => {
  let dom: JSDOM;
  let doc: Document;

  beforeAll(async () => {
    dom = open();
    await settle();
    italiano(dom);
    doc = dom.window.document;
    doc.querySelector<HTMLElement>("#btnData")!.click();
    doc.querySelector<HTMLTextAreaElement>("#json")!.value = JSON.stringify(MINIMAL);
    doc.querySelector<HTMLElement>("#btnApply")!.click();
    doc.querySelector<HTMLElement>("#btnData")!.click();
    doc.querySelector<HTMLElement>("#btnSave")!.click();
    await settle(60);
  });

  it("salva senza errori", () => {
    expect(doc.querySelector("#msg")?.classList.contains("err")).toBe(false);
  });

  it("scrive dati e filtri", () => {
    const raw = dom.window.localStorage.getItem("prospettiva:data");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).people[0].name).toBe("Zeta");
    expect(dom.window.localStorage.getItem("prospettiva:filtri")).not.toBeNull();
  });

  it("dimentica su richiesta", async () => {
    doc.querySelector<HTMLElement>("#btnForget")!.click();
    await settle(60);
    expect(dom.window.localStorage.getItem("prospettiva:data")).toBeNull();
  });
});

describe("riavvio", () => {
  it("riparte dai dati e dai filtri salvati", async () => {
    const dom = open();
    dom.window.localStorage.setItem("prospettiva:data", JSON.stringify(MINIMAL));
    dom.window.localStorage.setItem("prospettiva:filtri", JSON.stringify(["home", "work"]));
    await settle(180);
    const doc = dom.window.document;
    expect(doc.querySelector("#anchorline")?.textContent).toMatch(/Zeta/);
    const checked = [...doc.querySelectorAll<HTMLInputElement>("#filters input")]
      .filter(c => c.checked);
    expect(checked).toHaveLength(2);
  });

  it("non usa una copia salvata che contiene errori", async () => {
    const dom = open();
    dom.window.localStorage.setItem("prospettiva:data",
      JSON.stringify({ people: [{ name: "Rotto" }] }));
    await settle(180);
    const doc = dom.window.document;
    // Il messaggio è nella lingua rilevata: si asserisce sul codice, che non
    // cambia, non sul testo.
    expect(doc.querySelector("#diags")?.textContent).toMatch(/E004/);
    expect(doc.querySelector("#msg")?.textContent?.length).toBeGreaterThan(10);
  });
});

describe("window.storage", () => {
  it("ha la precedenza e non tocca localStorage", async () => {
    const dom = open({ appStore: true });
    await settle(160);
    const doc = dom.window.document;
    doc.querySelector<HTMLElement>("#btnData")!.click();
    doc.querySelector<HTMLElement>("#btnSave")!.click();
    await settle(80);
    const mem = (dom.window as unknown as { __mem: Map<string, string> }).__mem;
    expect(mem.has("prospettiva:data")).toBe(true);
    expect(dom.window.localStorage.getItem("prospettiva:data")).toBeNull();
  });
});

describe("nessuno storage", () => {
  it("l'app funziona lo stesso e disabilita il salvataggio", async () => {
    const dom = open({ noLocal: true });
    await settle(160);
    const doc = dom.window.document;
    expect(doc.querySelectorAll("#pane-chart .bar").length).toBeGreaterThan(5);
    doc.querySelector<HTMLElement>("#btnData")!.click();
    expect(doc.querySelector<HTMLButtonElement>("#btnSave")!.disabled).toBe(true);
    expect(doc.querySelector("#msg")?.classList.contains("err")).toBe(false);
  });
});
