interface ShelterMarkProps {
  size?: number;
  className?: string;
}

/**
 * Marca compacta do Shelter: anel industrial + porta de cofre.
 * Versão vetorial simplificada da logo, boa para tamanhos pequenos
 * (a logo completa fica em /shelter-logo.png).
 */
export default function ShelterMark({ size = 28, className }: ShelterMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" stroke="#b6f21f" strokeWidth="2" opacity="0.9" />
      <circle cx="24" cy="24" r="18" stroke="#2a3326" strokeWidth="3" />
      {/* porta do cofre */}
      <ellipse cx="19" cy="24" rx="8" ry="12" fill="#10150f" stroke="#b6f21f" strokeWidth="1.8" />
      <ellipse cx="19" cy="24" rx="3.2" ry="5" stroke="#b6f21f" strokeWidth="1.4" />
      <path d="M19 12v7M19 29v7M11 24h5M22 24h5" stroke="#b6f21f" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      {/* sinal (voz) */}
      <path d="M30 18c2.2 1.8 2.2 10.2 0 12" stroke="#b6f21f" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M34 15c3.6 3 3.6 15 0 18" stroke="#b6f21f" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
