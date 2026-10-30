/* ============================================
   VERSION — Shelter
   Fonte única da versão: package.json
   ============================================ */

import pkg from '../../package.json';

export const APP_NAME = 'Shelter';

/** Versão semântica completa, ex: "0.1.1-beta" */
export const APP_VERSION: string = pkg.version;

/** Parte numérica da versão, ex: "0.1.1" */
export const APP_VERSION_BASE: string = APP_VERSION.split('-')[0];

/** Canal de pré-release, ex: "beta" (null em versões estáveis) */
export const APP_CHANNEL: string | null = APP_VERSION.includes('-')
  ? APP_VERSION.split('-').slice(1).join('-')
  : null;


/** Repositório GitHub onde as releases são publicadas */
export const GITHUB_REPO = 'guinune-antunes/handsfree';

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  /** Identificadores de pré-release, ex: ["beta", "2"]. Vazio = versão estável. */
  pre: string[];
}

/** Interpreta "v0.1.1-beta.2" / "0.1.1" em partes comparáveis. */
export function parseVersion(raw: string): ParsedVersion | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(raw.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ? m[4].split('.') : [],
  };
}

/** Retorna >0 se a > b, <0 se a < b, 0 se iguais (regras do SemVer). */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Versão estável é maior que qualquer pré-release da mesma base
  if (a.pre.length === 0 && b.pre.length === 0) return 0;
  if (a.pre.length === 0) return 1;
  if (b.pre.length === 0) return -1;

  const len = Math.max(a.pre.length, b.pre.length);
  for (let i = 0; i < len; i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d;
    } else if (xn !== yn) {
      return xn ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** "0.1.1-beta" -> "0.1.1 (beta)" */
export function formatVersion(raw: string): string {
  const p = parseVersion(raw);
  if (!p) return raw;
  const base = `${p.major}.${p.minor}.${p.patch}`;
  return p.pre.length ? `${base} (${p.pre.join('.')})` : base;
}
