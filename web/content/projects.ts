// Work shown on the Work page, newest first. Add your other projects here.

export type Project = {
  slug: string;
  year: string;
  title: string;
  summary: { id: string; en: string };
  role: { id: string; en: string };
  tags: string[];
  /** Internal path (without locale) or external URL. */
  href?: string;
};

export const projects: Project[] = [
  {
    slug: "isyarat",
    year: "2026",
    title: "Isyarat",
    summary: {
      id: "Penerjemah Bahasa Isyarat Indonesia yang berjalan sepenuhnya di peramban: kamera, titik tangan, model kecil, dan subtitle — tanpa server.",
      en: "An Indonesian Sign Language translator that runs entirely in the browser: camera, hand points, a small model and subtitles — no server.",
    },
    role: { id: "Desain, pengembangan, dan pelatihan model", en: "Design, development and model training" },
    tags: ["Next.js", "Three.js", "MediaPipe", "ONNX", "Python"],
    href: "/lab",
  },
];
