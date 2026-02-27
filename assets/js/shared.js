// Fonctions utilitaires partagées entre les deux applications
const Shared = (function() {
  // Génération d'ID unique avec fallback
  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Math.random().toString(36).substring(2) + Date.now();
  }

  // Gestion du localStorage avec gestion d'erreurs
  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  };

  // Formateur de monnaie (français)
  const fmtMoney = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Date du jour au format ISO
  function todayISO() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tz).toISOString().slice(0, 10);
  }

  // Clamp d'un nombre
  function clampNumber(n, min = 0) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, x);
  }

  // Extraction du MIME d'une dataURL
  function getDataUrlMime(dataUrl) {
    const m = /^data:(image\/(png|jpeg|jpg));base64,/i.exec(String(dataUrl || ''));
    if (!m) return null;
    const mime = m[1].toLowerCase();
    if (mime === 'image/jpg') return 'image/jpeg';
    return mime;
  }

  // Redimensionnement d'une image en dataURL (pour logo)
  async function downscaleImageToDataURL(file, { max = 320, quality = 0.85 } = {}) {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * ratio));
    const h = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const isPng = (file.type || '').toLowerCase() === 'image/png';
    const mime = isPng ? 'image/png' : 'image/jpeg';
    return canvas.toDataURL(mime, mime === 'image/jpeg' ? quality : undefined);
  }

  return {
    uid,
    storage,
    fmtMoney,
    todayISO,
    clampNumber,
    getDataUrlMime,
    downscaleImageToDataURL
  };
})();

// Rendre disponible globalement
window.Shared = Shared;