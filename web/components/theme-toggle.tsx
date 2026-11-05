"use client";

type Labels = { toLight: string; toDark: string };

export function ThemeToggle({ labels }: { labels: Labels }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  // Icon and label are both driven by CSS from data-theme, so server and
  // client markup stay identical and nothing flashes on hydration.
  return (
    <button
      type="button"
      onClick={toggle}
      className="group grid size-10 place-items-center rounded-full border hairline transition-colors duration-500 hover:border-ink"
    >
      <span className="sr-only dark:hidden">{labels.toDark}</span>
      <span className="sr-only hidden dark:inline">{labels.toLight}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-4 transition-transform duration-700 ease-(--ease-quiet) group-hover:rotate-45"
      >
        {/* A half-filled disc: the filled half swaps sides with the theme. */}
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" className="dark:hidden" />
        <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" className="hidden dark:block" />
      </svg>
    </button>
  );
}
