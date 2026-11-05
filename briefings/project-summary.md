# Project Briefing Lengkap: Bisindocam / Isyarat

> **Tujuan dokumen ini**: brief menyeluruh tentang seluruh codebase untuk diserahkan ke agent lain (Argon, dll).
> Dibuat: 2026-11-03. Workspace: `e:\projek kecil-kecilan\bisindocam`

---

## 1. Gambaran Umum Project

**Isyarat** adalah situs portofolio dwibahasa (Indonesia / English) milik **Bilal** yang memamerkan penerjemah **Bahasa Isyarat Indonesia (BISINDO)** berbasis kamera. Tagline: *"Tangan yang berbicara."*

Semua inferensi berjalan **100% di browser** — tidak ada satu frame video pun yang dikirim ke server. Privacy statement: *"Diproses di perangkat Anda · Tanpa server · Tanpa rekaman."* Project ini non-komersial, dibangun sebagai portofolio dan media edukasi tentang BISINDO dan komunitas Tuli.

Manifesto resmi yang tertanam di halaman:
> *"Bahasa isyarat adalah bahasa yang utuh, dengan tata bahasa, rasa, dan logatnya sendiri. Proyek ini tidak menggantikan juru bahasa isyarat. Ia hanyalah jembatan kecil untuk percakapan sehari-hari, dibuat dengan hormat kepada teman Tuli."*

---

## 2. Struktur Monorepo

```
bisindocam/
├── web/            Next.js 16 (App Router) + TypeScript + Tailwind v4
├── ml/             Python 3.12 (uv): ekstraksi landmark, training, ekspor ONNX
├── docs/           ATTRIBUTION.md — lisensi dataset
├── briefings/      Dokumen briefing & catatan bug aktif
├── README.md       Panduan ringkas (dwibahasa)
└── .gitignore
```

---

## 3. Stack Teknologi Lengkap

### 3a. Frontend (`web/`)

| Lapisan | Library / Tool | Versi |
|---|---|---|
| Framework | Next.js (App Router) | **16.4.3** |
| Runtime UI | React | **19.3.0** |
| 3D Rendering | React Three Fiber | ^9.8.2 |
| 3D Helpers | @react-three/drei | ^10.7.9 |
| 3D Engine | Three.js | ^0.186.1 |
| Animasi | Motion (Framer Motion generasi baru) | ^14.6.0 |
| Animasi lain | GSAP | ^3.15.0 |
| Styling | Tailwind CSS | **v4** (via `@tailwindcss/turbopack`) |
| Hand tracking | MediaPipe Tasks Vision | ^1.1.1 |
| ML inference | ONNX Runtime Web (WASM) | ^1.30.0 |
| Test | Vitest | ^5.0.5 |
| Type check | TypeScript | ^5 |
| Lint | ESLint | ^9 |
| Build | Turbopack (Next.js built-in) | — |

**Font** (via `next/font/google`):
- `Fraunces` — display / serif italic, dipakai untuk heading & kandidat huruf; mendukung optical size axis (opsz), SOFT, WONK
- `Hanken Grotesk` — body text
- `IBM Plex Mono` — label / caption

**Warna tema** (CSS variables):
- Light: clay (`#a65a3a`), moss (`#4f6146`), brass untuk crop marks, paper/ink
- Dark: ivory (`#e8dfce`), sage (`#9fb391`)

### 3b. ML Pipeline (`ml/`)

| Lapisan | Tool |
|---|---|
| Runtime Python | Python 3.12 (managed `uv`) |
| Landmark extraction | `mediapipe` (Python) |
| Training huruf | `scikit-learn` (MLPClassifier) → `skl2onnx` |
| Training kata | `torch >= 2.14.1` (CPU-only, custom `WordNet`) → `torch.onnx.export` |
| Data | `numpy`, `opencv-python` |
| Dataset download | `kaggle` CLI |
| Export validasi | `onnxruntime` |
| Test | `pytest >= 9.1.1` |
| Dependency lock | `uv.lock` |

---

## 4. Konfigurasi Next.js (`next.config.ts`)

```ts
// cacheComponents: true         — component-level caching
// partialPrefetching: true       — Next.js 16 partial prefetch
// turbopack dengan rule CSS → @tailwindcss/turbopack loader
// Custom HTTP headers:
//   /sw.js          → no-cache (service worker selalu fresh)
//   /models/:path*  → public, max-age=86400, stale-while-revalidate=604800
```

---

## 5. i18n & Routing

- Route: `app/[lang]/...` — semua halaman ada dalam `id` dan `en`
- Locale didapat via `getLocale()` (membaca dari `cookies()` / params)
- Teks antarmuka: `app/[lang]/dictionaries/{id,en}.json` — lengkap mencakup semua copy UI, tips, metadata
- `generateStaticParams()` di layout mengekspos `["id", "en"]`
- Alternatif bahasa dikembalikan di `<head>` untuk SEO

---

## 6. Layout Global (`app/[lang]/layout.tsx`)

- Tiga font Google dimuat
- `themeScript` di-inject ke `<head>` **sebelum first paint** untuk menghindari flash: baca `localStorage["theme"]`, fallback ke `prefers-color-scheme`
- Header: `<SiteHeader>` (nav + locale switch + theme toggle)
- Footer: `<SiteFooter>`
- `<ServiceWorker>` — mendaftarkan `/sw.js`
- Skip link aksesibilitas: "Lompat ke konten utama"

---

## 7. Semua Halaman & Komponen Utama

### 7a. Beranda (`app/[lang]/page.tsx`)
- Hero dengan `<HeroStage>` — tangan 3D animasi + bisa aktifkan kamera
- Manifesto, stats (26 huruf, 63 kata, 0 byte video dikirim), chapter list

### 7b. Terjemah (`app/[lang]/translate/page.tsx`)
- Komponen utama: **`Translator`** (`components/translate/translator.tsx`)
- Mode: **Huruf** (fingerspelling) atau **Kata** (dynamic signs)
- Mode "Kata" hanya muncul jika `/models/words.json` ada (dicek via `HEAD` request saat mount)
- Switching ke mode Kata otomatis memanggil `enablePose()`
- Layout: kiri = CameraPrint, kanan = transkrip + kontrol
- Kontrol teks: Spasi, Hapus, Bersihkan, Bacakan (TTS), Salin, Unduh `.txt`, Auto-speak checkbox
- Keyboard shortcuts: `Space` = spasi, `Backspace` = hapus, `Escape` = bersihkan
- Ukuran teks: 3 pilihan (S/M/L via clamp CSS)
- Tips penggunaan (4 tips) ditampilkan di bawah

### 7c. Percakapan (`app/[lang]/conversation/page.tsx`)
- Komponen: **`Conversation`** (`components/conversation/conversation.tsx`)
- **Dua sisi**:
  - Kiri ("Teman Tuli"): kamera + fingerspelling + textarea ketikan → kirim/kirim & bacakan
  - Kanan ("Teman dengar"): tombol mic + speech-to-text → teks besar untuk dibaca Tuli
- Mode **berhadapan**: panel kanan rotate 180° agar ponsel bisa diletakkan di antara dua orang
- Speech-to-text bahasa bisa dipilih: `id-ID` atau `en-US`
- Riwayat percakapan (log) dengan timestamp, bisa diunduh `.txt` atau dihapus
- Outgoing message = gabungan `reader.text` (dari kamera) + `draft` (dari ketikan)
- Privacy note: kamera on-device, tapi STT di Chrome pakai Google server

### 7d. Kamus (`app/[lang]/dictionary/page.tsx`)
- Komponen: **`SignDictionary`** (`components/dictionary/sign-dictionary.tsx`)
- Dua tab: **Huruf** (26 huruf) | **Kata** (63 kata, searchable)
- Kiri: sticky 3D viewer (`CameraPrint` dengan `orbit=true` → OrbitControls)
- Kanan: grid/list pilihan huruf/kata
- Kata punya gloss English (ditampilkan jika locale = `en`)
- Deep link: `/dictionary#K` langsung ke huruf, `/dictionary#makan` langsung ke kata
- Tanda animasi kata: loop dengan jeda 0.6 detik (`signFrameAt`)
- `prefersReducedMotion`: jika aktif, animasi berhenti di pose tengah

### 7e. Belajar (`app/[lang]/learn/page.tsx`)
- Komponen: **`Practice`** (`components/learn/practice.tsx`)
- Dua mode:
  - **Latihan huruf**: urutan A–Z, satu per satu
  - **Eja namamu**: input nama → filter ke huruf valid → eja satu per satu
- Per target huruf:
  - Kiri: referensi 3D (dari dataset nyata, `orbit=true`, tanpa kamera)
  - Kanan: kamera live user
- Scoring: polling `scoresRef` setiap 100ms → jika confidence ≥ 0.7 selama 700ms → sukses
- Feedback visual: SVG lingkaran progress (stroke-dasharray animasi)
- Sukses: pesan "Tepat!", delay 900ms, lanjut huruf berikutnya
- Progress tersimpan di `localStorage["isyarat:mastered"]` (array huruf)
- Reset progress tersedia
- Deep link dari Kamus: `/learn#K`

### 7f. Tentang BISINDO (`app/[lang]/bisindo/page.tsx`)
- Konten statis: 3 seksi (Bahasa, Logat, Identitas)
- Tabel perbandingan BISINDO vs SIBI
- Etiket berkomunikasi dengan teman Tuli (5 tips)
- Atribusi dataset lengkap (tabel)

### 7g. Lab (`app/[lang]/lab/page.tsx`)
- Komponen: **`AccuracyBars`** (`components/lab/accuracy-bars.tsx`)
- Alur pipeline 6 langkah divisualisasi
- Hasil uji model huruf & kata (dibaca dari `content/model-report.json`)
- Keterbatasan model (5 poin)
- Privacy statement teknis
- Stack yang digunakan (7 item)

### 7h. Karya (`app/[lang]/work/page.tsx`)
- Data dari `content/projects.ts`

### 7i. Tentang (`app/[lang]/about/page.tsx`)
- Data dari `content/profile.ts`:
  ```ts
  profile.name = "Bilal"
  profile.role.id = "Pengembang & perancang antarmuka"
  profile.bio.id = "Saya membangun antarmuka yang tenang dan berguna..."
  profile.location = "Indonesia"
  profile.email = ""   // belum diisi
  profile.links = []   // belum diisi
  ```

---

## 8. Komponen Shared

### 8a. `CameraPrint` (`components/stage/camera-print.tsx`)
Wrapper utama untuk semua tampilan kamera/3D di seluruh app.

```
<div perspective:1600px>
  <div rotate(rx, ry)>          ← tilt on pointer (±5° horizontal, ±4° vertical)
    <video mirrored grayscale-70% sepia-25% opacity-45>  ← feed kamera
    <HandSculpture>              ← 3D overlay di atas video
    crop marks (brass color)     ← 4 sudut seperti tanda potong foto
    {children}                   ← label, readout, dll
  </div>
</div>
```

- **Video styling kritis** (`className` di elemen `<video>`):
  ```
  -scale-x-100        ← mirror horizontal (selfie view)
  object-cover        ← fill container, crop jika perlu
  grayscale-[0.7]     ← 70% grayscale
  sepia-[0.25]        ← 25% sepia (filter cokelatan yang disengaja untuk estetika)
  opacity-45          ← ketika live (dark: opacity-30)
  opacity-0           ← ketika off
  ```
- Tilt animasi dimatikan jika `prefers-reduced-motion`
- `orbit` prop: aktifkan OrbitControls di Kamus & Belajar (referensi)
- `mirrored` prop: default `true` untuk kamera live, `false` untuk referensi dataset

### 8b. `HandSculpture` (`components/three/hand-sculpture.tsx`)
Renderer 3D tangan berbasis React Three Fiber. Di-`dynamic import` dengan `ssr: false`.

**Struktur scene:**
```
<Canvas dpr=[1,2] camera={position:[0,0,6], fov:32} gl={alpha:true, antialias}>
  <Studio theme>                     ← lighting rig
    ambientLight
    2x directionalLight (warm tones)
    <Environment resolution=64>
      3x Lightformer (rect/ring)     ← local HDR, no file download, works offline
    </Environment>
    <ContactShadows>                 ← drop shadow
  </Studio>
  <Hand side="Right" color={GLAZES[theme][0]}>  ← clay (#a65a3a) / ivory (#e8dfce)
  <Hand side="Left"  color={GLAZES[theme][1]}>  ← moss (#4f6146) / sage (#9fb391)
  [<OrbitControls>]                 ← hanya jika orbit=true
</Canvas>
```

**Komponen `Hand`** — rendering tangan tiap frame:
- **State**: `stateRef = { points: Vector3[21], presence: 0..1, seeded: bool }`
- `useFrame` dipanggil per frame (60fps):
  1. Baca `source.current()` → HandFrame → cari tangan sesuai `side`
  2. Presence di-lerp (fade in/out, exp decay `k=6`)
  3. Landmark di-lerp ke posisi target (exp decay `k=18`) — smoothing
  4. Konversi dari MediaPipe coords ke THREE world space:
     ```
     frameW = max(vpWidth, vpHeight * ratio)
     frameH = frameW / ratio
     x = (mirrored ? 0.5 - p.x : p.x - 0.5) * frameW
     y = (0.5 - p.y) * frameH
     z = -p.z * frameW * 1.4
     ```
  5. Thickness = `dist(wrist, MCP9) * 2.1` → proporsional dengan jarak kamera
- **Geometri** per tangan:
  - `InstancedMesh` joints: 21 sphere (r = JOINT_RADIUS × thickness × presence)
  - `InstancedMesh` bones: 21 koneksi cylinder (lihat HAND_BONES)
  - `Mesh` palm: fan triangle fill dari 6 landmark (PALM = [0,1,5,9,13,17])
- **Material**: `MeshPhysicalMaterial` dengan `roughness=0.62, clearcoat=0.35, sheen=0.4`
- Semua mesh `frustumCulled={false}` — jangan di-cull walau keluar bounding box

### 8c. `LiveSubtitle` (`components/subtitle/live-subtitle.tsx`)
Subtitle real-time dengan animasi progress commit.

```
[committed text][kandidat dalam italic merah muda]  [cursor berkedip]
                 └─── garis bawah scaleX(progress) ──┘
```
- Screen reader hanya mendengar `committed text` (via `aria-live="polite"` tersembunyi)
- Visual hidden: `aria-hidden` — agar screen reader tidak membaca kandidat yang berfluktuasi
- Tail: hanya tampilkan N karakter terakhir (default 28, translate pakai 400)

### 8d. `HeroStage` (`components/hero/hero-stage.tsx`)
Beranda kamera + live subtitle. Menampilkan readout landmark `x y z fps` di pojok kiri bawah (direct DOM, bukan React state).

### 8e. `SiteHeader` / `SiteFooter`
Nav + locale switch (id/en) + theme toggle (dark/light). Theme disimpan di `localStorage["theme"]`.

### 8f. `ServiceWorker` (`components/service-worker.tsx`)
Mendaftarkan `/sw.js` saat mount.

---

## 9. Service Worker (`public/sw.js`)

Cache version: `"isyarat-v1"`. Strategi:

| Path pattern | Strategi |
|---|---|
| `/models/`, `/mediapipe/`, `/ort/`, `/signs/`, `/_next/static/` | **Cache-first** (download sekali, selamanya dari cache) |
| `navigate` (halaman) | **Network-first**, fallback ke cache, fallback terakhir ke `/id` |
| Method bukan GET, cross-origin | Dibiarkan (tidak diintersep) |

Saat aktivasi: hapus semua cache dengan version lama.

---

## 10. Vision / Hand Tracking Layer

### 10a. Data Model (`lib/vision/hand.ts`)
```ts
type Point3 = { x: number; y: number; z: number }
// x, y: normalized [0,1] dari top-left frame (unmirrored)
// z: depth relatif wrist, skala ~sama dengan x

type HandLandmarks = Point3[]  // 21 titik, MediaPipe order
// 0=wrist, 1-4=thumb(CMC,MCP,PIP,TIP), 5-8=index, 9-12=middle,
// 13-16=ring, 17-20=pinky

type TrackedHand = { side: "Left"|"Right"; landmarks: HandLandmarks; score: number }

type HandFrame = {
  hands: TrackedHand[]
  timestamp: number
  pose?: Point3[] | null  // 33 upper-body pose points (hanya jika pose tracking aktif)
}

HAND_BONES: [number,number][]  // 21 edge connections (sama dengan HandLandmarker.HAND_CONNECTIONS)
FINGERTIPS: [4,8,12,16,20]
```

### 10b. Tracker (`lib/vision/tracker.ts`)
```ts
// createHandTracker() → HandTracker
// - HandLandmarker: numHands=2, minDetection/Presence/Tracking=0.5
// - GPU dulu, fallback CPU
// - detect(video, timestamp) → HandFrame
//   - Flip handedness: MediaPipe label "Left" → signer's "Right" (dan sebaliknya)
//     karena frame raw (bukan cermin), jadi label terbalik
// - enablePose() → lazy load PoseLandmarker (numPoses=1), GPU/CPU fallback
// - close() → bersihkan kedua landmarker
```

### 10c. `useHandTracking` (`lib/vision/use-hand-tracking.ts`)
```ts
// Owns: camera stream + detection loop
// Returns: videoRef, frameRef, fpsRef, aspectRef, status, start, stop, enablePose

// Status: "off" | "starting" | "on" | "denied" | "unavailable" | "error"

// start():
//   1. getUserMedia({ video: { facingMode:"user", width:ideal 960, height:ideal 720 } })
//   2. createHandTracker() (GPU/CPU)
//   3. video.play() → set aspectRef = videoWidth/videoHeight
//   4. Loop: requestVideoFrameCallback (preferred) atau requestAnimationFrame
//   5. Per frame: tracker.detect(video, performance.now()) → frameRef.current
//   6. FPS tracking: EMA 0.9/0.1

// frameRef = ref (bukan state) → 30fps landmark TIDAK trigger re-render React
// aspectRef = ref (bukan state) → width/height ratio, default 4/3
```

### 10d. `useFrameSource` (`lib/vision/use-frame-source.ts`)
```ts
// Pull-based source untuk HandSculpture:
//   - live=true  → sourceRef.current = () => frameRef.current
//   - live=false → sourceRef.current = () => demoFrame(t, still)
// handCount: polling setiap 150ms, hanya update state jika berubah
```

### 10e. Demo Hand (`lib/vision/demo-hand.ts`)
Animasi prosedural tangan saat kamera mati. **Bukan isyarat BISINDO nyata** (label "Animasi demo · bukan isyarat").
- Forward kinematics dari 5 curl + spread parameter
- 6 pose preset, interpolasi smooth (ease smoothstep) setiap 2.4 detik
- Rotasi: roll (-0.12 + sin), yaw (0.62 + sin), animated gently
- `still=true`: pose pertama, tanpa animasi

---

## 11. Feature Engineering

### 11a. Frame Features (`lib/vision/features.ts` ↔ `ml/isyarat/features.py`)

**WAJIB IDENTIK** di kedua sisi. `FEATURE_VERSION = 1`.

```
Per frame, 131 nilai total (FRAME_FEATURES = 131):

Slot 0 (Right hand):
  [0..62]  : 21 landmark × 3 (x,y,z), relatif ke wrist, x&z × aspect, ÷ palmSize
  [63]     : presence flag (1 jika tangan ada, 0 jika tidak ada)

Slot 1 (Left hand):
  [64..126]: sama dengan slot 0
  [127]    : presence flag

Cross-hand (hanya jika keduanya ada):
  [128]    : (right_wrist.x * aspect - left_wrist.x * aspect) / meanPalm
  [129]    : (right_wrist.y - left_wrist.y) / meanPalm
  [130]    : log(palmSize_right / palmSize_left)  ← relative depth cue

palmSize = hypot(
  (landmark[9].x - landmark[0].x) * aspect,
  landmark[9].y - landmark[0].y,
  (landmark[9].z - landmark[0].z) * aspect
)  // wrist → middle MCP distance, isotropic
```

Saat tangan tidak ada: 64 nilai = 0 (landmark zeros + flag=0).
Cross-hand: 3 nilai = 0 jika salah satu tangan tidak ada.

### 11b. Word Features (`lib/vision/word-features.ts` ↔ `ml/isyarat/word_features.py`)

**WAJIB IDENTIK**. `WORD_FEATURE_VERSION = 1`.

```
Per frame, 138 nilai (WORD_FRAME_FEATURES = 138):
  [0..130]   : frame features (131 nilai di atas)
  [131..137] : body features (7 nilai):
    [131] : right_wrist.x * aspect - cx) / shoulderWidth
    [132] : (right_wrist.y - cy) / shoulderWidth
    [133] : (left_wrist.x * aspect - cx) / shoulderWidth
    [134] : (left_wrist.y - cy) / shoulderWidth
    [135] : (nose.x * aspect - cx) / shoulderWidth
    [136] : (nose.y - cy) / shoulderWidth
    [137] : pose presence flag

// cx = (left_shoulder.x + right_shoulder.x) / 2 * aspect
// cy = (left_shoulder.y + right_shoulder.y) / 2
// shoulderWidth = hypot(ls - rs)
// Pose landmarks: NOSE=0, L_SHOULDER=11, R_SHOULDER=12
```

**Clip features**: sequence 32 frame (`SEQ_LEN = 32`):
- Trim dari frame pertama ada tangan sampai frame terakhir ada tangan
- Resample ke 32 frame via **nearest-index** (identik numpy `round(linspace(0, n-1, 32))`)
- Implementasi `roundHalfEven` untuk match numpy "round half to even"
- Output: `Float32Array(32 × 138)` = 4.416 nilai

**Total input model kata**: `(1, 32, 138)` tensor

---

## 12. Inference Layer

### 12a. Classifier (`lib/inference/classifier.ts`)
```ts
// loadClassifier(name, expectedFeatureVersion) → Classifier
// 1. Load ONNX Runtime Web (lazy, singleton)
//    ort.env.wasm.wasmPaths = "/ort/"
//    ort.env.wasm.numThreads = 1  // no COOP/COEP headers
// 2. Fetch /models/{name}.json → ModelMeta (featureVersion, inputSize, labels, shape?, english?)
// 3. Verifikasi featureVersion === expected (throw jika tidak cocok)
// 4. InferenceSession.create("/models/{name}.onnx", { executionProviders: ["wasm"] })
// 5. scikit-learn export: output nama mengandung "prob" → probabilitas
//    PyTorch export: output terakhir → probabilitas
// predict(features: Float32Array) → probabilities: Float32Array
//   Tensor shape: [1, ...(meta.shape ?? [meta.inputSize])]
```

### 12b. Stabilizer (`lib/inference/stabilizer.ts`)
Mengubah stream probabilitas per-frame yang berisik menjadi huruf yang dikonfirmasi.

```ts
// Config default:
//   threshold: 0.7   — confidence minimum untuk jadi kandidat
//   holdMs:    450   — harus bertahan selama ini sebelum commit
//   smoothing: 0.35  — EMA alpha (frame baru)
//   releaseMs: 300   — tangan hilang selama ini → reset lastCommitted (allow double letter)

// update(probs | null, now) → StabilizerState:
//   candidate: huruf terkuat saat ini
//   confidence: EMA probability-nya
//   progress: 0..1 menuju commit
//   committed: string | null (set HANYA satu frame saat commit)

// EMA: ema[i] = ema[i] * (1-α) + probs[i] * α
// Deteksi kandidat berganti: reset timer "since"
// lastCommitted: mencegah commit huruf yang sama dua kali berturut
//   (reset ketika kandidat berganti shape ATAU tangan hilang > releaseMs)
```

### 12c. `useLetterReader` (`lib/inference/use-letter-reader.ts`)
```ts
// Options: frameRef, aspectRef, active
// Returns: status, text, candidate, confidence, progress, scoresRef, space, backspace, clear

// Saat active=true:
// - Load model "letters" (FEATURE_VERSION)
// - rAF loop: per frame baru, hitung frameFeatures → predict → Stabilizer.update
// - setState dipanggil maks ~12x/detik (hanya jika committed atau lastPush > 80ms)
// - scoresRef = Map<label, smoothed_prob> → dipakai Learn untuk scoring real-time
// - space(): tambah spasi jika text tidak kosong dan belum diakhiri spasi
// - backspace(): hapus karakter terakhir
// - clear(): kosongkan text
```

### 12d. `useWordReader` (`lib/inference/use-word-reader.ts`)
```ts
// Options: frameRef, aspectRef, active, english?
// Returns: status, text, candidate, confidence, backspace, clear

// Konstanta timing:
//   END_GAP_MS = 400   — tangan hilang sekian ms = tanda selesai
//   MAX_SIGN_MS = 3000 — klasifikasi paksa setelah sekian ms
//   MIN_SIGN_MS = 350  — minimum durasi valid
//   PREVIEW_MS = 300   — update preview tiap sekian ms
//   COMMIT_AT = 0.45   — commit jika confidence >= ini

// Alur per frame:
//   1. Jika ada tangan: lastHandAt = now
//   2. Push frame ke segment (jika ada tangan atau segment sudah mulai)
//   3. Cek ended: hands hilang > END_GAP_MS atau span > MAX_SIGN_MS
//   4. Jika ended & span >= MIN_SIGN_MS: classify(segment) → commit jika p >= 0.45
//   5. Jika tidak ended & span >= MIN_SIGN_MS & lastPreview > 300ms: preview update

// classify(frames):
//   clipFeatures(frames, aspectRef) → predict → best index → label
// backspace(): hapus kata terakhir (split(" ").slice(0,-1).join(" "))
```

---

## 13. Speech Layer

### 13a. Text-to-Speech (`lib/speech/speak.ts`)
```ts
speak(text: string, lang = "id-ID")
// SpeechSynthesis.cancel() → speak (utterance.lang = lang)
// text.toLowerCase() sebelum diucapkan
// No-op jika window undefined atau tidak support
```

### 13b. Speech Recognition (`lib/speech/use-speech-recognition.ts`)
```ts
// useSpeechRecognition(lang, onFinal) → { supported, status, interim, start, stop }

// SpeechRecognition / webkitSpeechRecognition
// continuous: true, interimResults: true
// onresult: accumulate interim, fire onFinal per final result
// onerror: "not-allowed"/"service-not-allowed" → "denied"; lainnya → "error"
// onend: auto-restart jika wantRef.current = true (browser stop setelah pause)
// Status: "idle" | "listening" | "denied" | "error"
```

---

## 14. Sign Data (`lib/vision/signs.ts`)

Data referensi untuk Kamus dan Belajar. Dimuat dari `/signs/letters.json` dan `/signs/words.json` (dibuat oleh `ml/scripts/export_signs.py`).

**Format file**:
```ts
// Huruf: { version, slots: ["Right","Left"], signs: { "A": { aspect, hands: [RawHand, RawHand] } } }
// Kata:  { version, slots, signs: { "makan": { aspect, fps, en:"eat", frames: [RawHand[][]] } } }
// RawHand: [number,number,number][] | null  (null = tangan tidak ada)
```

**`fit(sequence, aspect)`**: normalisasi agar setiap tanda mengisi stage sama besarnya:
- Pose statis: scale = `0.42 / maxExtent`
- Pose dinamis (kata): scale berdasarkan median palm size, centre dari active middle half clip
- Output: koordinat di frame 4:3, centred near (0.5, 0.46)

**`signFrameAt(sign, time)`**: playback loop kata:
- Durasi = `frames.length / fps + 0.6s rest`
- `t % length` → frame index

Cache: `Map<kind, Promise<Sign[]>>` — load sekali per session.

---

## 15. ML Pipeline Detail

### 15a. Augmentasi (`ml/isyarat/augment.py`)

**Huruf** (`augment(hands, aspect, rng)`):
- 50% mirror (flip x + swap slot kanan/kiri)
- 3D rotation: roll ±10°, yaw ±15°, pitch ±10° (dilakukan di isotropic space)
- Per-hand scale non-uniform: `rng.normal(1.0, 0.05, size=3)` × (x,y,z)
- Landmark jitter: `rng.normal(0, 0.002)` semua landmark

**Kata** (`augment_clip(hands, pose, aspect, rng)`):
- Satu set random param untuk seluruh clip (agar motion tetap koheren)
- 50% mirror (flip x + swap slot + swap pose shoulder landmarks)
- 3D rotation: roll ±8°, yaw ±12°, pitch ±8°
- Scale: `rng.normal(1.0, 0.05, size=3)` per tangan (bukan per frame)
- Shift posisi: `rng.normal(0, 0.02, size=2)` pada x,y (simulasi framing kamera berbeda)
- Landmark jitter: `rng.normal(0, 0.002)` semua tangan semua frame
- **Temporal augmentation**: drop 0..15% di awal dan 0..15% di akhir clip

### 15b. Training Huruf (`ml/scripts/train_letters.py`)

**Arsitektur**: `StandardScaler → MLPClassifier(hidden=(256,128), alpha=1e-3, batch=256, lr=1e-3, max_iter=200, early_stopping, n_iter_no_change=12)`

**Dataset balancing**: `TARGET_PER_SOURCE = 12_000` — tiap sumber diaugmentasi sampai ~12k sample agar tidak ada yang mendominasi.

**Evaluasi**: leave-one-dataset-out (GroupKFold, 3 sumber = 3 fold)
```
bisindo-landmarks-surya hold-out: acc 55.4%
bisindo-yunita hold-out:          acc 85.6%
alfabet-bisindo hold-out:         acc 83.7%
mean over sources: 74.9%
overall held-out:  57.3%   (mayoritas test set = surya, sehingnya rendah)
top-3 accuracy:    73.7%
```

**Export**: `skl2onnx.to_onnx(final, x_sample, options={MLPClassifier: {"zipmap": False}}, target_opset=17)`
**Validasi**: ONNX Runtime vs scikit-learn `assert_allclose(atol=1e-4)` pada 256 sample
**Output**: `web/public/models/letters.onnx` (276 KB) + `letters.json`

### 15c. Training Kata (`ml/scripts/train_words.py`)

**Arsitektur WordNet** (PyTorch):
```python
class WordNet(nn.Module):
    # Input: (B, T=32, F=138)
    # 1. Normalisasi: (x - mean) / std  (mean/std dari training data, jadi buffer)
    # 2. Concat delta: cat([x, x[:,1:]-x[:,:-1]])  → (B, T, F*2=276)
    # 3. inp: Linear(276, 160) → GELU → Dropout(0.2)
    # 4. conv: Conv1d(160,160,k=5,p=2) → GELU → Dropout → Conv1d → GELU  (residual add)
    # 5. gru: GRU(160, 80, bidirectional=True)  → output (B, T, 160)
    # 6. pooling: cat(mean(dim=1), amax(dim=1))  → (B, 320)
    # 7. head: Dropout(0.3) → Linear(320, n_classes) → softmax
```

**Training setup**:
- Loss: label smoothing manual (0.9 true + 0.1/n_classes uniform), pada probabilitas (bukan logit)
- Optimizer: AdamW, lr=2e-3, weight_decay=1e-2
- Scheduler: OneCycleLR, max_lr=3e-3
- Batch: 128
- Epochs: 30 (default)
- Augmentasi: AUG_COPIES=6 (setiap clip punya 1 original + 6 augmented), tiap epoch pilih 1 random
- Feature cache: `data/processed/word_clips.npz` — regenerasi jika file list berubah

**Evaluasi**: signer-independent 5-fold (hold out 1 signer per dataset per fold)
```
Fold 1 (aridone-s1, wl-s0):  acc 93.5%
Fold 2 (aridone-s2, wl-s1):  acc 88.7%
Fold 3 (aridone-s3, wl-s2):  acc 65.9%  ← worst fold
Fold 4 (aridone-s4, wl-s3):  acc 79.7%
Fold 5 (aridone-s5, wl-s4):  acc 87.1%
Mean accuracy: 83.0%
Mean top-3:    93.1%
```

**Export**: `torch.onnx.export(model, dummy=(1,32,138), opset=17)`, input name="clip", output="probabilities"
**Validasi**: ORT vs PyTorch `assert_allclose(atol=1e-4)` 32 sample (batch=1, GRU fixed batch)
**Output**: `web/public/models/words.onnx` (1.757 KB) + `words.json`

### 15d. `words.json` format
```json
{
  "featureVersion": 1,
  "inputSize": 4416,         // 32 * 138
  "shape": [32, 138],        // untuk tensor reshape di browser
  "labels": ["air", ...],    // 63 kata (Indonesian)
  "english": ["water", ...] // gloss English
}
```

### 15e. Dataset & Sources

**Huruf (static)**:
| Source | Count | Notes |
|---|---|---|
| `bisindo-landmarks-surya` | 9.468 | Dataset landmark langsung (paling besar). Konvensi handedness dicalibrasi via `calibrate_surya.py` (mirrored, tangan paling kiri = kanan peraga) |
| `alfabet-bisindo` | 288 | Foto, Kaggle achmadnoer |
| `bisindo-yunita` | 390 | Foto, Kaggle yunitayupratiwi |

**Kata (dynamic)**:
| Source | Signers | Clips | Notes |
|---|---|---|---|
| `aridone/dataset-bisindo-40-kata-5-subjek` | 5 (aridone-s1..s5) | ~4.000 | 40 kata |
| `WL-BISINDO` / `glennleonali/wl-bisindo` | 5 (wl-s0..s4) | ~1.600 | 32 kata, CC BY-NC 4.0, dari Banten |

Glosses dikumpulkan: hanya kata yang dimainkan oleh ≥ 3 penandatangan (default `--min-signers=3`) dimasukkan.

---

## 16. Feature Contract & Testing

**File yang harus selalu identik:**

| TypeScript | Python |
|---|---|
| `web/lib/vision/features.ts` | `ml/isyarat/features.py` |
| `web/lib/vision/word-features.ts` | `ml/isyarat/word_features.py` |

**Test fixture** di `ml/tests/fixtures/`:
- `features.json` — input/output pasangan untuk `frameFeatures`
- `word_features.json` — input/output untuk `clipFeatures`

**Test Python** (`ml/tests/test_features.py`, `test_word_features.py`):
- Load fixture → jalankan Python implementation → assert allclose
- Fixture dibuat oleh test Vitest di web

**Test TypeScript** (`web/lib/vision/features.test.ts`, `word-features.test.ts`):
- Load fixture → jalankan TS implementation → assert allclose
- Juga tulis fixture untuk Python test

Jalankan: `cd ml && uv run pytest`

---

## 17. Bug Aktif (dari `briefings/bugissues.md`)

Tiga bug yang harus diperbaiki, tanpa merusak komponen/elemen yang sudah ada:

### Bug #1 — Kedua Tangan Tidak Terbaca Jelas Saat Menumpuk

**Gejala**: Huruf yang membutuhkan kedua tangan overlap (M, N, dll.) tidak terbaca dengan benar. Kata yang memerlukan dua tangan untuk merangkai isyarat juga bermasalah.

**Data pendukung dari model**: `N accuracy = 33.8%`, `M accuracy = 64.3%` — N adalah huruf terendah ketiga, dan N membutuhkan jari-jari kedua tangan yang saling berdekatan.

**Kemungkinan penyebab** (perlu investigasi):
- MediaPipe sendiri mungkin kesulitan memisahkan landmark tangan yang overlap secara fisik (z-occlusion)
- Hand landmarker dengan `minHandPresenceConfidence=0.5` mungkin drop salah satu tangan saat overlap
- Di `HandSculpture`, kedua tangan dirender dari `SLOTS = ["Right", "Left"]` independen — tidak ada logika occlusion handling khusus
- Di inference, feature cross-hand (`[128..130]`) akan nol jika salah satu tangan drop

**Lokasi relevan**:
- [`web/lib/vision/tracker.ts`](file:///e:/projek%20kecil-kecilan/bisindocam/web/lib/vision/tracker.ts) — MediaPipe config `numHands=2`
- [`web/components/three/hand-sculpture.tsx`](file:///e:/projek%20kecil-kecilan/bisindocam/web/components/three/hand-sculpture.tsx) — rendering kedua tangan

### Bug #2 — Jarak Pandang Kamera Terlalu Dekat

**Gejala**: FoV tidak sesuai default kamera, tampak zoom-in, pengguna harus mundur jauh agar seluruh tangan kelihatan.

**Kemungkinan penyebab**:
- `getUserMedia` dengan `{ width: { ideal: 960 }, height: { ideal: 720 } }` di beberapa device/browser mungkin memilih resolusi yang tidak match dan menyebabkan zoom
- CSS `object-cover` pada `<video>` bisa memotong area (crop) jika aspect ratio container tidak cocok
- Aspect container di `CameraPrint` bervariasi: `aspect-[4/5]` di halaman Terjemah, `aspect-[4/3]` di Percakapan, dll.

**Lokasi relevan**:
- [`web/lib/vision/use-hand-tracking.ts`](file:///e:/projek%20kecil-kecilan/bisindocam/web/lib/vision/use-hand-tracking.ts) — constraint `getUserMedia`
- [`web/components/stage/camera-print.tsx`](file:///e:/projek%20kecil-kecilan/bisindocam/web/components/stage/camera-print.tsx) — `<video className="...object-cover...">`

### Bug #3 — Tampilan Kamera Buram Kecokelatan

**Gejala**: Feed kamera tampak seperti diberi filter coklat/buram, tidak natural.

**Perhatian penting**: Filter ini **disengaja oleh desain** di `CameraPrint`:
```html
<video className="... grayscale-[0.7] sepia-[0.25] ..." />
```
Ini adalah estetika fotografi vintage yang Bilal pilih untuk CameraPrint (`"a softly toned, mirrored video ... framed like a photograph on paper"`).

Namun jika Bilal menganggap ini terlalu ekstrem, solusinya adalah mengurangi nilai di class tersebut atau menghapusnya sama sekali.

**Lokasi**: [`web/components/stage/camera-print.tsx`](file:///e:/projek%20kecil-kecilan/bisindocam/web/components/stage/camera-print.tsx), baris `<video className="...grayscale-[0.7] sepia-[0.25]...">`.

---

## 18. Roadmap Setelah Bug Fix

Setelah ketiga bug diperbaiki:
1. **Expand ML**: model lebih pintar, kosakata lebih banyak, bisa baca ekspresi wajah
2. **Fitur baru kreatif** yang tidak ada di website isyarat serupa (masih di-brainstorm)

---

## 19. Aturan Kritis Untuk Agent

1. **Feature contract wajib dijaga**: ubah `features.ts` → ubah `features.py`, jalankan `uv run pytest`.
2. **Model version check**: `FEATURE_VERSION` di TS harus match `featureVersion` di `letters.json`. Jika beda, app throw error.
3. **Next.js 16 breaking changes**: API, conventions, file structure bisa berbeda dari training data agent. Baca `node_modules/next/dist/docs/` sebelum modifikasi.
4. **MediaPipe label flip**: `"Left"` dari MediaPipe = `"Right"` signer (karena raw frame, bukan mirror). Jangan ubah logika flip di `tracker.ts`.
5. **ONNX Runtime single-thread**: `numThreads=1` disengaja — multi-thread butuh COOP/COEP headers yang belum diaktifkan.
6. **Filter video intentional**: `grayscale-[0.7] sepia-[0.25]` adalah desain, bukan bug CSS yang tidak sengaja — kecuali Bilal minta diubah.
7. **Tangan kanan = slot 0** di feature vector (perspektif signer, bukan kamera).
8. **App offline**: SW cache `/models/`, `/mediapipe/`, `/ort/`, `/signs/` sebagai cache-first. Setelah kunjungan pertama, app berfungsi tanpa internet.
9. **Demo hand bukan BISINDO**: `demoFrame()` adalah animasi prosedural, bukan isyarat asli — jangan ubah menjadi isyarat tertentu tanpa label yang jelas.
10. **Konten personal belum diisi**: `profile.ts` (email, links) dan `projects.ts` masih placeholder — jangan hapus atau isi tanpa instruksi Bilal.
