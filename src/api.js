const DEFAULT_TIMEOUT_MS = 12000;
const API_URL_STORAGE_KEY = 'acms:appsScriptUrl';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwc8DoEupx3mwkaL2dVR2YMITr_NvpNnDSdTk72wwW1WU-5IJD3ujJwEqJHVFSGS0cH/exec';

export function getApiUrl() {
  return localStorage.getItem(API_URL_STORAGE_KEY) || import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
}

export function setApiUrl(url) {
  localStorage.setItem(API_URL_STORAGE_KEY, url || '');
}

export async function callAcms(action, payload = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return { ok: false, offline: true, message: 'No Apps Script URL configured. Using demo data.' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload, source: 'web' }),
      signal: controller.signal
    });
    const text = await response.text();
    try { return JSON.parse(text); } catch { return { ok: response.ok, raw: text }; }
  } catch (error) {
    return { ok: false, error: error.message, message: 'Backend call failed. Demo mode is still available.' };
  } finally {
    clearTimeout(timer);
  }
}
