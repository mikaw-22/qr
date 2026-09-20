(function () {
  const CM_TO_PX = 37.795275591; // 96dpi
  const DEFAULT_CM = 2.2;

  const linkInput   = document.getElementById('link-input');
  const laengeInput = document.getElementById('laenge');
  const breiteInput = document.getElementById('breite');
  const qrColorInput = document.getElementById('qr-color');
  const bgColorInput = document.getElementById('bg-color');
  const qrContainer = document.getElementById('qrcode');
  const downloadBtn = document.getElementById('download-btn');
  const resetBtn    = document.getElementById('reset-size');
  const toast       = document.getElementById('toast');
  const qrResult = document.getElementById('qr-result');
  const copyQrBtn = document.getElementById('copy-qr-btn');
  const settingsToggle = document.getElementById('settings-toggle');
  const testLinkBtn = document.getElementById('test-link-btn');
    const sidebar = document.querySelector('.sidebar');

    settingsToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Klick außerhalb schließt das Panel
    document.addEventListener('click', (e) => {
      if (!sidebar.classList.contains('open')) return;
      if (sidebar.contains(e.target) || settingsToggle.contains(e.target)) return;
      sidebar.classList.remove('open');
    });

  const DEFAULT_QR_COLOR = '#000000';
  const DEFAULT_BG_COLOR = '#ffffff';

  let lastQrSourceEl = null;
  let toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function parseCm(value) {
    const n = parseFloat(String(value).replace(',', '.'));
    if (isNaN(n) || n <= 0) return DEFAULT_CM;
    return Math.min(n, 20); // Sicherheitslimit
  }

  function currentSizePx() {
    const laenge = laengeInput.value.trim() === '' ? DEFAULT_CM : parseCm(laengeInput.value);
    const breite = breiteInput.value.trim() === '' ? DEFAULT_CM : parseCm(breiteInput.value);
    return {
      w: Math.round(breite * CM_TO_PX),
      h: Math.round(laenge * CM_TO_PX)
    };
  }

  function clearQr() {
    qrContainer.innerHTML = '';
    qrContainer.style.width = '';
    qrContainer.style.height = '';
    lastQrSourceEl = null;
  }

function renderPlaceholder() {
  clearQr();
  qrResult.classList.remove('visible');
  downloadBtn.disabled = true;
  copyQrBtn.disabled = true;
  testLinkBtn.disabled = true;
}

function renderQr() {
  const text = linkInput.value.trim();
  const size = currentSizePx();

  if (!text) {
    renderPlaceholder();
    return;
  }

  qrResult.classList.add('visible');

  clearQr();
  qrContainer.style.width = size.w + 'px';
  qrContainer.style.height = size.h + 'px';

    const qrColor = qrColorInput.value || DEFAULT_QR_COLOR;
    const bgColor = bgColorInput.value || DEFAULT_BG_COLOR;
    qrContainer.style.background = bgColor;

    new QRCode(qrContainer, {
      text: text,
      width: size.w,
      height: size.h,
      colorDark: qrColor,
      colorLight: bgColor,
      correctLevel: QRCode.CorrectLevel.H
    });

    // qrcodejs erzeugt das <img>/<canvas> teils asynchron -> kurz pollen
    let tries = 0;
    const findEl = () => {
      const el = qrContainer.querySelector('canvas, img');
      if (el) {
        lastQrSourceEl = el;
        downloadBtn.disabled = false;
        copyQrBtn.disabled = false;
        testLinkBtn.disabled = false;
      } else if (tries < 20) {
        tries++;
        requestAnimationFrame(findEl);
      }
    };
    findEl();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const debouncedRender = debounce(renderQr, 150);

  linkInput.addEventListener('input', debouncedRender);
  laengeInput.addEventListener('input', debouncedRender);
  breiteInput.addEventListener('input', debouncedRender);
  qrColorInput.addEventListener('input', renderQr);
  bgColorInput.addEventListener('input', renderQr);

  resetBtn.addEventListener('click', () => {
    laengeInput.value = '';
    breiteInput.value = '';
    qrColorInput.value = DEFAULT_QR_COLOR;
    bgColorInput.value = DEFAULT_BG_COLOR;
    renderQr();
  });

  function getQrBlob() {
  return new Promise((resolve, reject) => {
    if (!lastQrSourceEl) {
      reject(new Error('kein QR-Code vorhanden'));
      return;
    }
    if (lastQrSourceEl.tagName === 'CANVAS') {
      lastQrSourceEl.toBlob((blob) => {
        blob ? resolve(blob) : reject(new Error('Blob-Erstellung fehlgeschlagen'));
      }, 'image/png');
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = lastQrSourceEl.naturalWidth || lastQrSourceEl.width;
      canvas.height = lastQrSourceEl.naturalHeight || lastQrSourceEl.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(lastQrSourceEl, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        blob ? resolve(blob) : reject(new Error('Blob-Erstellung fehlgeschlagen'));
      }, 'image/png');
    }
  });
}

testLinkBtn.addEventListener('click', () => {
  const text = linkInput.value.trim();
  if (!text) return;
  const url = /^https?:\/\//i.test(text) ? text : 'https://' + text;
  window.open(url, '_blank', 'noopener,noreferrer');
});

copyQrBtn.addEventListener('click', async () => {
  if (!lastQrSourceEl) return;
  try {
    const blob = await getQrBlob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    showToast('QR-Code kopiert');
  } catch (e) {
    showToast('Kopieren nicht möglich');
  }
});

  downloadBtn.addEventListener('click', () => {
    if (!lastQrSourceEl) return;
    let dataUrl;
    if (lastQrSourceEl.tagName === 'CANVAS') {
      dataUrl = lastQrSourceEl.toDataURL('image/png');
    } else {
      dataUrl = lastQrSourceEl.src;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qr-code.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Initialer Zustand: leerer QR-Code Platzhalter bei 2.2cm x 2.2cm
  renderQr();
})();


