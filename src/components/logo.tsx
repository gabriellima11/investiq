/**
 * Marca do app (do design): duas barras crescentes + lupa com cauda verde.
 * Usa as cores do tema, então no tema escuro o quadrado fica claro.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <rect x="15" y="30" width="8" height="20" rx="2" className="fill-primary-foreground" />
      <rect x="28" y="20" width="8" height="30" rx="2" className="fill-primary-foreground" />
      <path d="M42 44 49 37" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
      <circle cx="44" cy="29" r="8" fill="none" strokeWidth="4" className="stroke-primary-foreground" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-base tracking-tight">
      <LogoMark />
      <span>
        <span className="font-medium">Invest</span>
        <span className="font-extrabold">IQ</span>
      </span>
    </span>
  );
}
