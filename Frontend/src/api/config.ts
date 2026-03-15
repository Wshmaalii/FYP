const DEFAULT_PROD_API_URL = 'https://fyp-mnrg.onrender.com';

function normalizeUrl(value: string) {
  return value.trim().replace(/\/$/, '');
}

function isInvalidProductionApiUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const parsed = new URL(value);

    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;

      if (parsed.hostname === currentHost) {
        return true;
      }
    }

    if (parsed.hostname.endsWith('.vercel.app')) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export function getApiBaseUrl() {
  const configuredUrl = normalizeUrl(import.meta.env.VITE_API_URL || '');

  if (import.meta.env.PROD) {
    return isInvalidProductionApiUrl(configuredUrl) ? DEFAULT_PROD_API_URL : configuredUrl;
  }

  return configuredUrl;
}
