import type { CSSProperties } from "react";

// Icônes maison, sur-mesure — jamais d'emoji ni de librairie d'icônes
// générique. Toutes en `currentColor` pour hériter de la couleur du
// contexte (section, badge, etc.) et rester cohérentes avec la palette
// blanc + corail/vert/ambre du site.

type IconProps = { className?: string; style?: CSSProperties };

// Marque KAIROS — fichier fourni par l'utilisateur (public/logo.svg,
// identique à app/icon.svg pour le favicon). Couleurs figées dans le
// fichier lui-même, pas du currentColor — ne pas la redessiner à la main.
export function Logo({ className, style }: IconProps) {
  // eslint-disable-next-line @next/next/no-img-element -- logo statique, jamais optimisé/redimensionné dynamiquement
  return <img src="/logo.svg" alt="" className={className} style={style} />;
}

export function IconRanking({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <rect x="3" y="12" width="4.5" height="9" rx="1.2" fill="currentColor" />
      <rect x="9.75" y="7" width="4.5" height="14" rx="1.2" fill="currentColor" />
      <rect x="16.5" y="3" width="4.5" height="18" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconCoin({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M12 7v10M15 9.5c0-1.4-1.34-2.5-3-2.5s-3 .9-3 2.2c0 3 6 1.4 6 4.3 0 1.3-1.34 2.5-3 2.5s-3-1.1-3-2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPipeline({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <circle cx="5" cy="5" r="2.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="19" cy="19" r="2.6" stroke="currentColor" strokeWidth="2" fill="currentColor" />
      <path d="M7.2 6.8 9.8 9.8M14.2 14.2 16.8 16.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconScript({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9L20 8.5V19.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 3v4.5a1 1 0 0 0 1 1H20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 13h8M8 16.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconGauge({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M4 15a8 8 0 1 1 16 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M12 15 16 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function IconStar({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M12 3.5 14.6 9.2 20.8 9.9 16.2 14.1 17.5 20.3 12 17.1 6.5 20.3 7.8 14.1 3.2 9.9 9.4 9.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMic({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17.5V21M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPackage({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M12 3 20.5 7.5V16.5L12 21 3.5 16.5V7.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
