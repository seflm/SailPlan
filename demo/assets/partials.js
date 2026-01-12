// Tiny helper for shared inline SVG icons used across pages.
// (Static demo: no build step, so we keep this small and optional.)
window.BoatraIcons = {
  sail: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c3.4 3.7 6 8.1 7.6 13.3-3.4 1.9-7.2 2.8-11.4 2.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 3v16.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 6.2c-2.4 2.6-4.4 5.8-6 9.6 2.5 1.4 5.2 2.1 8 2.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
      <path d="M4 21h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
    </svg>
  `,
  calendar: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M4.5 8.2h15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
      <path d="M6.6 6h10.8c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6.6c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 12h3M13 12h3M8 15.5h3M13 15.5h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    </svg>
  `,
  map: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
    </svg>
  `,
  users: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16.8 20c-.4-2.5-2.2-4-4.8-4s-4.4 1.5-4.8 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 13.6c2.1 0 3.8-1.7 3.8-3.8S14.1 6 12 6 8.2 7.7 8.2 9.8s1.7 3.8 3.8 3.8z" stroke="currentColor" stroke-width="1.6"/>
      <path d="M19.5 20c-.2-1.4-.9-2.6-2-3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
    </svg>
  `,
  checklist: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7h12M7 12h12M7 17h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
      <path d="M4.2 7.2l.9.9 1.6-1.8M4.2 12.2l.9.9 1.6-1.8M4.2 17.2l.9.9 1.6-1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  settings: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" stroke="currentColor" stroke-width="1.6"/>
      <path d="M19.4 13.2l1.2-1.2-1.6-2.8-1.6.4a7.8 7.8 0 0 0-1.3-1.3l.4-1.6L13.7 5 12.5 6.2h-1L10.3 5 7.5 6.7l.4 1.6c-.5.4-.9.8-1.3 1.3l-1.6-.4L3.4 12l1.2 1.2v1l-1.2 1.2L5 18.2l1.6-.4c.4.5.8.9 1.3 1.3l-.4 1.6 2.8 1.6 1.2-1.2h1l1.2 1.2 2.8-1.6-.4-1.6c.5-.4.9-.8 1.3-1.3l1.6.4 1.6-2.8-1.2-1.2v-1z" stroke="currentColor" stroke-width="1.2" opacity=".85" stroke-linejoin="round"/>
    </svg>
  `,
};


