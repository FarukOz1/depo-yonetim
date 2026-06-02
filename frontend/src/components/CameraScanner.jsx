import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

export default function CameraScanner({ onScan, onClose }) {
  // loading → kamera başlatılıyor
  // scanning → canlı kamera aktif
  // fallback → HTTPS/izin sorunu, dosya/fotoğraf modu
  const [status, setStatus] = useState('loading');
  const onScanRef  = useRef(onScan);
  const qrRef      = useRef(null);
  const scannedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    const qr = new Html5Qrcode('html5-qr-live');
    qrRef.current = qr;

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        qr.stop()
          .then(() => onScanRef.current(text))
          .catch(() => onScanRef.current(text));
      },
      () => {}                          // "QR bulunamadı" frame hatalarını bastır
    )
      .then(() => {
        startedRef.current = true;
        setStatus('scanning');
      })
      .catch(() => {
        // Canlı kamera açılamadı → fotoğraf moduna geç
        setStatus('fallback');
      });

    return () => {
      if (startedRef.current && qrRef.current?.isScanning) {
        qrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Fotoğraf / galeri seçilince QR/barkodu tara
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // html5-qrcode'un scanFile'ı için geçici bir DOM elementi gerekiyor
    const tempId = 'qr-file-tmp-' + Date.now();
    const div    = document.createElement('div');
    div.id       = tempId;
    div.style.display = 'none';
    document.body.appendChild(div);

    try {
      const scanner = new Html5Qrcode(tempId);
      const text    = await scanner.scanFile(file, false);
      onScanRef.current(text);
    } catch {
      toast.error('Görselde QR/barkod bulunamadı — farklı açıdan tekrar deneyin.');
      e.target.value = '';
    } finally {
      document.body.removeChild(div);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Başlık ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <span className="font-semibold text-gray-800">📷 QR / Barkod Tara</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {/* ── Yükleniyor ── */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Kamera açılıyor…</span>
            </div>
          )}

          {/* ── Canlı kamera görüntüsü ─── html5-qrcode bu div'e render eder */}
          <div
            id="html5-qr-live"
            style={{ width: '100%', display: status !== 'scanning' ? 'none' : undefined }}
          />
          {status === 'scanning' && (
            <p className="text-xs text-center text-gray-400">
              Barkodu veya QR kodu kameranın önüne tutun
            </p>
          )}

          {/* ── Fallback: fotoğraf / galeri ── */}
          {status === 'fallback' && (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-snug">
                <strong>Canlı kamera açılamadı.</strong><br />
                Cihazdan HTTPS ile bağlanılması gerekiyor.<br />
                Aşağıdan fotoğraf çekerek QR okuyabilirsiniz.
              </div>

              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <span className="text-4xl mb-1">📸</span>
                <span className="text-sm font-medium text-gray-700">Fotoğraf Çek / Galeri</span>
                <span className="text-xs text-gray-400 mt-0.5">QR veya barkod görselini seçin</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"  /* Mobil: doğrudan arka kamerayı açar */
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
