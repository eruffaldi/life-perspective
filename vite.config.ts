import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Il sorgente e' modulare, l'artefatto no: `viteSingleFile` reinlinea JS, CSS
// e la base cartografica in un unico HTML senza riferimenti esterni.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    // IIFE, non ESM: uno script `type="module"` non viene eseguito quando la
    // pagina e' aperta via file://, che e' il modo in cui l'artefatto vive.
    // `tools/verify.mjs` toglie l'attributo residuo e lo verifica.
    rollupOptions: { output: { format: "iife" } },
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    reportCompressedSize: false
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"]
  }
});
