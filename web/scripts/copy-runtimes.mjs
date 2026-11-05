// Copies the WASM runtimes into public/ so they are served from our own
// origin (works offline, and always matches the installed package versions).
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("public/mediapipe", { recursive: true });
cpSync("node_modules/@mediapipe/tasks-vision/wasm", "public/mediapipe/wasm", { recursive: true });

// ONNX Runtime Web: only the plain SIMD build — we run single-threaded, which
// needs no cross-origin isolation headers.
mkdirSync("public/ort", { recursive: true });
for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  cpSync(`node_modules/onnxruntime-web/dist/${file}`, `public/ort/${file}`);
}
console.log("runtimes → public/mediapipe/wasm, public/ort");
