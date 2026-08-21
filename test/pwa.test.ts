/**
 * La confezione per GitHub Pages. L'artefatto autosufficiente e la copia
 * ospitata escono dallo stesso bundle e non devono divergere: qui si verifica
 * che siano lo stesso codice con confezioni diverse.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIST = (f: string) => path.resolve("dist", f);
const read = (f: string) => fs.readFileSync(DIST(f), "utf8");

describe("le due uscite", () => {
  it("escono entrambe dalla build", () => {
    expect(fs.existsSync(DIST("prospettiva.html"))).toBe(true);
    expect(fs.existsSync(DIST("index.html"))).toBe(true);
  });

  it("contengono lo stesso codice", () => {
    const standalone = read("prospettiva.html");
    const page = read("index.html");
    // La copia ospitata aggiunge solo intestazioni: il corpo è identico.
    const body = (html: string) => html.slice(html.indexOf("<body"));
    expect(body(page)).toBe(body(standalone));
  });

  it("il file autosufficiente non rimanda a nulla", () => {
    const html = read("prospettiva.html");
    // Un manifest da file:// sarebbe solo un 404 nella console.
    expect(html).not.toMatch(/rel="manifest"/);
    expect(html).not.toMatch(/(?:src|href)\s*=\s*["']https?:/i);
    expect(html).not.toMatch(/<link[^>]+rel=["']?stylesheet/i);
  });

  it("la copia ospitata si dichiara installabile", () => {
    const html = read("index.html");
    expect(html).toMatch(/rel="manifest" href="manifest\.webmanifest"/);
    expect(html).toMatch(/name="theme-color"/);
    expect(html).toMatch(/rel="apple-touch-icon"/);
  });
});

describe("manifest", () => {
  const manifest = JSON.parse(read("manifest.webmanifest")) as Record<string, unknown>;

  it("usa percorsi relativi", () => {
    // GitHub Pages serve sotto /nome-repo/: un percorso assoluto punterebbe
    // alla radice del dominio e l'installazione fallirebbe.
    expect(manifest["start_url"]).toBe(".");
    expect(manifest["scope"]).toBe(".");
    for (const icon of manifest["icons"] as { src: string }[]) {
      expect(icon.src.startsWith("/"), icon.src).toBe(false);
      expect(icon.src.startsWith("http"), icon.src).toBe(false);
    }
  });

  it("dichiara quanto serve per l'installazione", () => {
    expect(manifest["name"]).toBeTruthy();
    expect(manifest["short_name"]).toBeTruthy();
    expect(manifest["display"]).toBe("standalone");
    const sizes = (manifest["icons"] as { sizes: string }[]).map(i => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("include un'icona ritagliabile", () => {
    const maskable = (manifest["icons"] as { purpose?: string }[])
      .filter(i => i.purpose === "maskable");
    expect(maskable.length).toBeGreaterThan(0);
  });

  it("ha davvero i file che dichiara", () => {
    for (const icon of manifest["icons"] as { src: string }[]) {
      expect(fs.existsSync(DIST(icon.src)), icon.src).toBe(true);
      expect(fs.statSync(DIST(icon.src)).size).toBeGreaterThan(500);
    }
  });
});

describe("service worker", () => {
  const sw = read("sw.js");

  it("riceve un'impronta di build al posto del segnaposto", () => {
    expect(sw).not.toContain("__BUILD__");
    expect(sw).toMatch(/VERSION = "[0-9a-f]{12}"/);
  });

  it("precarica tutto ciò che il manifest dichiara", () => {
    const manifest = JSON.parse(read("manifest.webmanifest")) as { icons: { src: string }[] };
    expect(sw).toContain("index.html");
    expect(sw).toContain("manifest.webmanifest");
    for (const icon of manifest.icons) expect(sw, icon.src).toContain(icon.src);
  });

  it("serve dalla cache, non dalla rete", () => {
    // Per un'applicazione che è un file solo, "network first" sarebbe solo un
    // modo di essere lenti e fragili.
    expect(sw).toContain("caches.match");
    expect(sw.indexOf("caches.match")).toBeLessThan(sw.indexOf("await fetch("));
  });

  it("fa pulizia delle versioni precedenti", () => {
    expect(sw).toContain("caches.delete");
  });

  it("ignora ciò che non è una lettura sulla propria origine", () => {
    expect(sw).toContain('request.method !== "GET"');
    expect(sw).toContain("self.location.origin");
  });
});

describe("registrazione", () => {
  const html = read("prospettiva.html");

  it("non tenta nulla quando la pagina arriva da file://", () => {
    // La guardia sta nel codice, non nella confezione: lo stesso bundle serve
    // entrambe le uscite.
    expect(html).toContain("https?:");
    expect(html).toContain("serviceWorker");
  });

  it("chiede al browser di non sfrattare i dati", () => {
    expect(html).toMatch(/persist/);
  });
});
