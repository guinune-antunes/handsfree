/* ============================================
   UPDATER — Shelter
   Consulta as releases do GitHub para saber se existe versão mais nova
   ============================================ */

import { APP_VERSION, GITHUB_REPO, compareVersions, parseVersion } from './version';

export interface UpdateInfo {
  /** Tag da release, ex: "v0.1.2-beta" */
  tag: string;
  /** Versão sem o "v", ex: "0.1.2-beta" */
  version: string;
  /** Página da release no GitHub */
  releaseUrl: string;
  /** Link direto do instalador (.exe/.msi), se existir na release */
  downloadUrl: string | null;
  /** Notas da release (markdown cru) */
  notes: string;
  publishedAt: string | null;
  isPrerelease: boolean;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubAsset[];
}

const REQUEST_TIMEOUT_MS = 8000;
const IGNORED_KEY = 'shelter:ignored-update';

function pickInstallerAsset(assets: GitHubAsset[]): string | null {
  const installers = assets.filter((a) => /\.(exe|msi)$/i.test(a.name));
  if (installers.length === 0) return null;
  const preferred = installers.find((a) => /instalador|installer|setup/i.test(a.name));
  return (preferred ?? installers[0]).browser_download_url;
}

/**
 * Verifica no GitHub se há uma versão mais nova que a atual.
 * - Versões beta (pré-release) recebem também releases beta; versões estáveis só estáveis.
 * - Retorna `null` se estiver atualizado ou se a verificação falhar (sem rede, rate limit...).
 *   Falhas nunca devem atrapalhar o uso do app.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const current = parseVersion(APP_VERSION);
  if (!current) return null;
  const allowPrerelease = current.pre.length > 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[Updater] GitHub respondeu ${res.status}`);
      return null;
    }

    const releases = (await res.json()) as GitHubRelease[];

    let best: { release: GitHubRelease; parsed: NonNullable<ReturnType<typeof parseVersion>> } | null = null;
    for (const release of releases) {
      if (release.draft) continue;
      if (release.prerelease && !allowPrerelease) continue;
      const parsed = parseVersion(release.tag_name);
      if (!parsed) continue;
      if (!best || compareVersions(parsed, best.parsed) > 0) {
        best = { release, parsed };
      }
    }

    if (!best || compareVersions(best.parsed, current) <= 0) return null;

    const { release } = best;
    return {
      tag: release.tag_name,
      version: release.tag_name.replace(/^v/i, ''),
      releaseUrl: release.html_url,
      downloadUrl: pickInstallerAsset(release.assets ?? []),
      notes: (release.body ?? '').trim(),
      publishedAt: release.published_at,
      isPrerelease: release.prerelease,
    };
  } catch (err) {
    console.warn('[Updater] Não foi possível verificar atualizações:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Usuário escolheu "Ignorar esta versão" — não incomodar até sair outra mais nova. */
export function isUpdateIgnored(tag: string): boolean {
  try {
    return localStorage.getItem(IGNORED_KEY) === tag;
  } catch {
    return false;
  }
}

export function ignoreUpdate(tag: string): void {
  try {
    localStorage.setItem(IGNORED_KEY, tag);
  } catch {
    /* sem storage disponível */
  }
}
