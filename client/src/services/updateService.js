import {
  APP_VERSION,
  APP_VERSION_NAME,
  GITHUB_RELEASES_PAGE,
  GITHUB_LATEST_RELEASE_API,
  GITHUB_ALL_RELEASES_API
} from '../constants/version';

/**
 * Compare two semantic version strings (e.g. "2.0.0" vs "2.1.0", "v2.0" vs "2.0.0")
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if equal
 */
export function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean = v => String(v)
    .replace(/^v/i, '')
    .trim()
    .split(/[-_+.]/)
    .map(part => parseInt(part, 10))
    .filter(n => !isNaN(n));

  const p1 = clean(v1);
  const p2 = clean(v2);
  const length = Math.max(p1.length, p2.length);

  for (let i = 0; i < length; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check GitHub Releases for newer version of the application
 */
export async function checkForAppUpdate({ silent = false } = {}) {
  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };

    let releaseData = null;

    // 1. Try latest release endpoint
    try {
      const response = await fetch(GITHUB_LATEST_RELEASE_API, { headers });
      if (response.ok) {
        releaseData = await response.json();
      }
    } catch {
      // Ignore network errors on first try
    }

    // 2. If latest release endpoint returned nothing (e.g. only pre-releases or no release marked latest),
    // query all releases and pick the most recent one
    if (!releaseData) {
      try {
        const fallbackRes = await fetch(GITHUB_ALL_RELEASES_API, { headers });
        if (fallbackRes.ok) {
          const all = await fallbackRes.json();
          if (Array.isArray(all) && all.length > 0) {
            releaseData = all[0];
          }
        }
      } catch {
        // Ignore fallback error
      }
    }

    if (!releaseData || !releaseData.tag_name) {
      return {
        updateAvailable: false,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        message: "Aucune version publiée sur GitHub pour le moment."
      };
    }

    const latestTag = releaseData.tag_name.trim();
    const isNewer = compareVersions(latestTag, APP_VERSION) > 0;

    // Find APK in assets
    const apkAsset = Array.isArray(releaseData.assets)
      ? releaseData.assets.find(a => (a.name || '').toLowerCase().endsWith('.apk'))
      : null;

    const downloadUrl = apkAsset?.browser_download_url || releaseData.html_url || GITHUB_RELEASES_PAGE;
    const apkSizeMb = apkAsset?.size ? Math.round((apkAsset.size / (1024 * 1024)) * 10) / 10 : null;

    const dismissedVersion = localStorage.getItem('wana_dismissed_update_version');
    const isDismissed = Boolean(dismissedVersion && dismissedVersion === latestTag);

    return {
      updateAvailable: isNewer,
      isDismissed,
      currentVersion: APP_VERSION,
      currentVersionName: APP_VERSION_NAME,
      latestVersion: latestTag,
      releaseName: releaseData.name || latestTag,
      releaseNotes: releaseData.body || "Mise à jour disponible.",
      publishedAt: releaseData.published_at || null,
      downloadUrl,
      apkFileName: apkAsset?.name || 'WanaAllmand.apk',
      apkSizeMb,
      htmlUrl: releaseData.html_url || GITHUB_RELEASES_PAGE
    };
  } catch (error) {
    if (!silent) {
      console.warn('[UpdateService] Erreur lors de la vérification de mise à jour:', error);
    }
    return {
      updateAvailable: false,
      currentVersion: APP_VERSION,
      error: error.message
    };
  }
}

/**
 * Remember that the user dismissed this specific version
 */
export function dismissVersion(version) {
  if (version) {
    try {
      localStorage.setItem('wana_dismissed_update_version', String(version));
    } catch {}
  }
}

/**
 * Clear dismissed version so it prompts again
 */
export function resetDismissedVersion() {
  try {
    localStorage.removeItem('wana_dismissed_update_version');
  } catch {}
}

/**
 * Open download URL (works in browser and Capacitor native webview)
 */
export function openUpdateDownload(url) {
  const targetUrl = url || GITHUB_RELEASES_PAGE;
  try {
    if (typeof window !== 'undefined') {
      const win = window.open(targetUrl, '_blank');
      if (!win) {
        window.location.href = targetUrl;
      }
    }
  } catch {
    if (typeof window !== 'undefined') {
      window.location.href = targetUrl;
    }
  }
}
