// Training data credited on the About BISINDO page. Keep in sync with
// docs/ATTRIBUTION.md and ml/scripts/download.py.

export type Dataset = {
  name: string;
  href: string;
  contents: { id: string; en: string };
  /** null when the uploader did not state one. */
  licence: string | null;
};

export const datasets: Dataset[] = [
  {
    name: "Dataset Bisindo 40 Kata 5 Subjek",
    href: "https://www.kaggle.com/datasets/aridone/dataset-bisindo-40-kata-5-subjek",
    contents: { id: "40 kata · 5 peraga · ±10.000 video", en: "40 words · 5 signers · ~10,000 videos" },
    licence: null,
  },
  {
    name: "WL-BISINDO (Procedia Computer Science, 2025)",
    href: "https://github.com/AceKinnn/WL-BISINDO",
    contents: { id: "32 kata · 5 peraga dari Banten · 1.600 video", en: "32 words · 5 signers from Banten · 1,600 videos" },
    licence: "CC BY-NC 4.0",
  },
  {
    name: "Bahasa Isyarat Indonesia (BISINDO) Alphabets",
    href: "https://www.kaggle.com/datasets/achmadnoer/alfabet-bisindo",
    contents: { id: "Huruf A–Z · 312 foto", en: "Letters A–Z · 312 photos" },
    licence: null,
  },
  {
    name: "bisindo dataset (yunitayupratiwi)",
    href: "https://www.kaggle.com/datasets/yunitayupratiwi/bisindo-dataset",
    contents: { id: "Huruf A–Z · 390 foto", en: "Letters A–Z · 390 photos" },
    licence: null,
  },
  {
    name: "BISINDO Dataset — MediaPipe Hand Landmarks",
    href: "https://www.kaggle.com/datasets/suryaadji/bisindo-alphabet-mediapipe-hand-landmarks",
    contents: { id: "Huruf A–Z · 9.468 contoh landmark", en: "Letters A–Z · 9,468 landmark samples" },
    licence: null,
  },
  {
    name: "MediaPipe Hand & Pose Landmarker (Google)",
    href: "https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker",
    contents: { id: "Model pelacak titik tangan dan tubuh", en: "Hand and body landmark models" },
    licence: "Apache 2.0",
  },
];
