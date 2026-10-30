/* ============================================
   UPDATER — Shelter
   Consulta as releases, tags e package.json do GitHub
   para saber se existe versão mais nova.
   ============================================ */

import { APP_VERSION, GITHUB_REPO, compareVersions, parseVersion } from './version';

export interface UpdateInfo {
  /** Tag da release, ex: "v0.1.2-beta" */
  tag: string;
  /** Versão sem o "v", ex: "0.1.2-beta" */
  version: string;
  /** Página da release ou commit no GitHub */
  releaseUrl: string;
  /** Link direto para baixar o instalador (.exe) */
  downloadUrl: string | null;
  /** Notas da release (markdown ou texto) */
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

interface GitHubTag {
  name: string;
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
 * Verifica no GitHub se há uma versão mais nova que a instalada.
 * Consulta com fallback em 3 níveis:
 * 1. GitHub Releases formais (/releases)
 * 2. Tags do repositório Git (/tags)
 * 3. Versão no package.json do branch client (raw.githubusercontent.com)
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const current = parseVersion(APP_VERSION);
  if (!current) return null;
  const allowPrerelease = current.pre.length > 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // 1. Tenta consultar GitHub Releases formais
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      });

      if (res.ok) {
        const releases = (await res.json()) as GitHubRelease[];
        if (Array.isArray(releases) && releases.length > 0) {
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

          if (best && compareVersions(best.parsed, current) > 0) {
            const { release } = best;
            return {
              tag: release.tag_name,
              version: release.tag_name.replace(/^v/i, ''),
              releaseUrl: release.html_url,
              downloadUrl: pickInstallerAsset(release.assets ?? []) || `https://github.com/${GITHUB_REPO}/raw/client/Instalador-Shelter.exe`,
              notes: (release.body ?? '').trim(),
              publishedAt: release.published_at,
              isPrerelease: release.prerelease,
            };
          }
        }
      }
    } catch (relErr) {
      console.warn('[Updater] Falha ao consultar releases formais:', relErr);
    }

    // 2. Fallback: Consultar Tags do Git (/tags)
    try {
      const tagsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/tags?per_page=10`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      });

      if (tagsRes.ok) {
        const tags = (await tagsRes.json()) as GitHubTag[];
        if (Array.isArray(tags) && tags.length > 0) {
          let bestTag: { name: string; parsed: NonNullable<ReturnType<typeof parseVersion>> } | null = null;
          for (const t of tags) {
            const parsed = parseVersion(t.name);
            if (!parsed) continue;
            if (parsed.pre.length > 0 && !allowPrerelease) continue;
            if (!bestTag || compareVersions(parsed, bestTag.parsed) > 0) {
              bestTag = { name: t.name, parsed };
            }
          }

          if (bestTag && compareVersions(bestTag.parsed, current) > 0) {
            const cleanVer = bestTag.name.replace(/^v/i, '');
            return {
              tag: bestTag.name,
              version: cleanVer,
              releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/${bestTag.name}`,
              downloadUrl: `https://github.com/${GITHUB_REPO}/raw/client/Instalador-Shelter.exe`,
              notes: `Nova versão ${bestTag.name} publicada no repositório Git do Shelter.`,
              publishedAt: new Date().toISOString(),
              isPrerelease: bestTag.parsed.pre.length > 0,
            };
          }
        }
      }
    } catch (tagsErr) {
      console.warn('[Updater] Falha ao consultar tags do Git:', tagsErr);
    }

    // 3. Fallback: Consultar package.json no branch client no GitHub
    try {
      const pkgRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/client/package.json?t=${Date.now()}`, {
        signal: controller.signal,
      });

      if (pkgRes.ok) {
        const remotePkg = (await pkgRes.json()) as { version?: string };
        if (remotePkg?.version) {
          const parsed = parseVersion(remotePkg.version);
          if (parsed && compareVersions(parsed, current) > 0) {
            const tag = `v${remotePkg.version}`;
            return {
              tag,
              version: remotePkg.version,
              releaseUrl: `https://github.com/${GITHUB_REPO}/tree/client`,
              downloadUrl: `https://github.com/${GITHUB_REPO}/raw/client/Instalador-Shelter.exe`,
              notes: `Nova versão ${tag} disponível no branch client do Shelter.`,
              publishedAt: new Date().toISOString(),
              isPrerelease: parsed.pre.length > 0,
            };
          }
        }
      }
    } catch (pkgErr) {
      console.warn('[Updater] Falha ao consultar package.json remoto:', pkgErr);
    }

    return null;
  } catch (err) {
    console.warn('[Updater] Não foi possível verificar atualizações no GitHub:', err);
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
