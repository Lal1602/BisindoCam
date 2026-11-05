// Site map shared by the header, footer and placeholder pages.

export const navItems = [
  { key: "translate", slug: "translate" },
  { key: "conversation", slug: "conversation" },
  { key: "dictionary", slug: "dictionary" },
  { key: "learn", slug: "learn" },
  { key: "bisindo", slug: "bisindo" },
  { key: "lab", slug: "lab" },
  { key: "work", slug: "work" },
  { key: "about", slug: "about" },
] as const;

export type NavKey = (typeof navItems)[number]["key"];
