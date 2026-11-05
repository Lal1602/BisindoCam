/** Public origin of the deployed site (set SITE_URL in the hosting environment). */
export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
