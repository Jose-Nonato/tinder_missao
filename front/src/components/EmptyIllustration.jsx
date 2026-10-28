export default function EmptyIllustration() {
  return <svg className="empty-illustration" viewBox="0 0 160 120" fill="none" aria-hidden="true">
    <rect x="23" y="18" width="65" height="88" rx="12" stroke="currentColor" strokeWidth="2" transform="rotate(-12 55 62)" />
    <rect x="73" y="14" width="65" height="88" rx="12" fill="var(--c-brand)" transform="rotate(12 105 58)" />
    <path d="M82 54c0-13 16-15 23-3 8-12 24-10 24 3 0 13-24 29-24 29S82 67 82 54Z" stroke="var(--c-on-brand)" strokeWidth="3" />
    <path d="M13 19h12M19 13v12M140 100h12M146 94v12" stroke="currentColor" strokeWidth="2" />
  </svg>
}
