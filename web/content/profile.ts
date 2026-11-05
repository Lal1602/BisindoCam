// Personal details shown across the site. Fill these in — everything else reads from here.

export const profile = {
  name: "Bilal",
  // TODO(Bilal): adjust role and bio to your own words.
  role: {
    id: "Pengembang & perancang antarmuka",
    en: "Developer & interface designer",
  },
  bio: {
    id: "Saya membangun antarmuka yang tenang dan berguna, dan sedang belajar bagaimana teknologi bisa menjembatani bahasa — dimulai dari Isyarat, penerjemah BISINDO yang berjalan di peramban.",
    en: "I build calm, useful interfaces, and I am learning how technology can bridge languages — starting with Isyarat, a BISINDO translator that runs in the browser.",
  },
  location: "Indonesia",
  /** Shown on the About page when filled in. */
  email: "",
  /** e.g. { label: "GitHub", href: "https://github.com/..." } */
  links: [] as { label: string; href: string }[],
};
