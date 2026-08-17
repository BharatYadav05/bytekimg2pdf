/**
 * ByTek IMG→PDF - Performance & Memory Optimized PDF Generator Engine
 * Sequential decoding pipeline, dynamic target DPI resolution scaling, device-aware safety checks, explicit error isolation
 */

const PDFGenerator = (function () {
  const elements = {
    convertBtn: document.getElementById('convertBtn'),
    progressWrap: document.getElementById('progressWrap'),
    progressFill: document.getElementById('progressFill'),
    progressMsg: document.getElementById('progressMsg'),
    progressPct: document.getElementById('progressPct')
  };

  // Standard Page Dimensions in Millimeters
  const PAGE_DIMS = {
    A4: [210, 297],
    LETTER: [215.9, 279.4],
    A3: [297, 420],
    A5: [148, 210],
    LEGAL: [215.9, 355.6]
  };

  // High quality print target DPI (300 DPI = 11.811 pixels per mm)
  const PRINT_DPI_PIXELS_PER_MM = 11.811;

  let reuseCanvas = null;

  function getCanvas(w, h) {
    if (!reuseCanvas) {
      reuseCanvas = document.createElement('canvas');
    }
    reuseCanvas.width = Math.max(1, Math.floor(w));
    reuseCanvas.height = Math.max(1, Math.floor(h));
    return reuseCanvas;
  }

  function releaseCanvas() {
    if (reuseCanvas) {
      reuseCanvas.width = 1;
      reuseCanvas.height = 1;
      const ctx = reuseCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 1, 1);
    }
  }

  async function generatePDF(images, settings, onSuccess) {
    if (!images || !images.length) return;

    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      alert('Error: jsPDF library is not loaded.');
      return;
    }

    elements.convertBtn.disabled = true;
    elements.progressWrap.classList.add('visible');
    setProgress(0, 'Preparing processing pipeline…');

    const [pw, ph] = PAGE_DIMS[settings.pageSize] || PAGE_DIMS.A4;
    const failedFiles = [];
    let pdf = null;
    let processedCount = 0;

    await sleep(50); // Yield to allow progress UI to render

    try {
      // STRICT SEQUENTIAL PIPELINE (One image at a time)
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const pct = Math.round((i / images.length) * 90);
        setProgress(pct, `Processing image ${i + 1} of ${images.length}: ${item.name}…`);
        await sleep(10); // Micro-yield to maintain UI responsiveness

        try {
          // STEP 1: Decode image & inspect dimensions
          const decoded = await decodeImage(item);
          const { source, naturalW, naturalH, isBitmap } = decoded;

          // STEP 2: Determine orientation
          let orient;
          if (settings.orientPref === 'auto') {
            orient = naturalH >= naturalW ? 'portrait' : 'landscape';
          } else {
            orient = settings.orientPref;
          }

          const [pageW, pageH] = orient === 'landscape' ? [ph, pw] : [pw, ph];
          const availW_mm = pageW - settings.marginMM * 2;
          const availH_mm = pageH - settings.marginMM * 2;

          // STEP 3: Calculate placement dimensions on PDF page
          let drawW, drawH, drawX, drawY;

          if (settings.fitMode === 'fill') {
            const scaleX = availW_mm / naturalW;
            const scaleY = availH_mm / naturalH;
            const scale = Math.max(scaleX, scaleY);
            drawW = naturalW * scale;
            drawH = naturalH * scale;
            drawX = settings.marginMM + (availW_mm - drawW) / 2;
            drawY = settings.marginMM + (availH_mm - drawH) / 2;
          } else if (settings.fitMode === 'original') {
            const mmPerPx = 0.264583; // 96 DPI factor
            drawW = naturalW * mmPerPx;
            drawH = naturalH * mmPerPx;
            drawW = Math.min(drawW, availW_mm);
            drawH = Math.min(drawH, availH_mm);
            drawX = settings.marginMM + (availW_mm - drawW) / 2;
            drawY = settings.marginMM + (availH_mm - drawH) / 2;
          } else {
            // Fit mode (Proportional aspect ratio)
            const scale = Math.min(availW_mm / naturalW, availH_mm / naturalH);
            drawW = naturalW * scale;
            drawH = naturalH * scale;
            drawX = settings.marginMM + (availW_mm - drawW) / 2;
            drawY = settings.marginMM + (availH_mm - drawH) / 2;
          }

          // STEP 4: Dynamic target resolution calculation (300 DPI print target)
          // Calculate printable pixels needed for the image placement bounds
          let targetCanvasW = drawW * PRINT_DPI_PIXELS_PER_MM;
          let targetCanvasH = drawH * PRINT_DPI_PIXELS_PER_MM;

          // Device memory safety ceiling (Emergency check for low-RAM devices)
          const deviceRamGb = (navigator.deviceMemory) ? navigator.deviceMemory : 4;
          if (deviceRamGb < 4) {
            const maxEmergencyEdge = 2000;
            if (targetCanvasW > maxEmergencyEdge || targetCanvasH > maxEmergencyEdge) {
              const capScale = Math.min(maxEmergencyEdge / targetCanvasW, maxEmergencyEdge / targetCanvasH);
              targetCanvasW *= capScale;
              targetCanvasH *= capScale;
            }
          }

          // Preserve natural resolution if source is smaller or close to 300 DPI
          if (naturalW <= targetCanvasW && naturalH <= targetCanvasH) {
            targetCanvasW = naturalW;
            targetCanvasH = naturalH;
          }

          // STEP 5: Resample onto temporary canvas & generate image data
          const canvas = getCanvas(targetCanvasW, targetCanvasH);
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(source, 0, 0, targetCanvasW, targetCanvasH);

          const fmt = detectFormat(item.file.type);
          const qualityVal = fmt === 'PNG' ? 1 : settings.quality;
          const dataUrl = canvas.toDataURL(fmt === 'PNG' ? 'image/png' : 'image/jpeg', qualityVal);

          // STEP 6: Add to PDF document
          if (!pdf) {
            pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: orient });
          } else {
            pdf.addPage([pageW, pageH], orient);
          }

          pdf.addImage(dataUrl, fmt, drawX, drawY, drawW, drawH, undefined, 'FAST');
          processedCount++;

          // STEP 7: Immediate resource cleanup for current step
          if (isBitmap && source.close) {
            source.close(); // Release ImageBitmap memory immediately!
          }

          await sleep(5); // Yield
        } catch (imgErr) {
          console.error(`Failed to process image ${item.name}:`, imgErr);
          failedFiles.push(item.name);
        }
      }

      // Check batch completion status
      if (processedCount === 0) {
        alert('Could not process any of the selected images. PDF generation aborted.');
        return;
      }

      setProgress(96, 'Saving PDF file…');
      await sleep(80);

      const filename = getFilename(settings.filenameMode);
      pdf.save(filename);

      setProgress(100, 'Done!');
      await sleep(200);

      releaseCanvas();

      // Explicit report if any image failed in batch
      if (failedFiles.length > 0) {
        alert(`${failedFiles.length} image(s) could not be processed and were excluded:\n\n${failedFiles.join('\n')}`);
      }

      if (typeof onSuccess === 'function') {
        onSuccess(filename, processedCount);
      }

    } catch (err) {
      console.error('PDF Generation Fatal Error:', err);
      alert('Error generating PDF: ' + (err.message || err));
    } finally {
      // Always restore UI controls
      elements.progressWrap.classList.remove('visible');
      elements.convertBtn.disabled = false;
    }
  }

  /**
   * Safe image decoding using createImageBitmap with Image() fallback
   */
  function decodeImage(item) {
    return new Promise((resolve, reject) => {
      // Attempt createImageBitmap first if available
      if (typeof window.createImageBitmap === 'function') {
        createImageBitmap(item.file)
          .then(bitmap => {
            resolve({
              source: bitmap,
              naturalW: bitmap.width,
              naturalH: bitmap.height,
              isBitmap: true
            });
          })
          .catch(() => {
            // Fallback to Image() object
            decodeViaImageElement(item.url, item.file).then(resolve).catch(reject);
          });
      } else {
        decodeViaImageElement(item.url, item.file).then(resolve).catch(reject);
      }
    });
  }

  function decodeViaImageElement(url, file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        resolve({
          source: img,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          isBitmap: false
        });
      };

      img.onerror = () => {
        // Second fallback: FileReader
        const fr = new FileReader();
        fr.onload = (e) => {
          const img2 = new Image();
          img2.onload = () => {
            resolve({
              source: img2,
              naturalW: img2.naturalWidth,
              naturalH: img2.naturalHeight,
              isBitmap: false
            });
          };
          img2.onerror = () => reject(new Error(`Unable to load image: ${file.name}`));
          img2.src = e.target.result;
        };
        fr.readAsDataURL(file);
      };

      img.src = url;
    });
  }

  function detectFormat(mimeType) {
    if (mimeType === 'image/png' || mimeType === 'image/svg+xml') return 'PNG';
    return 'JPEG';
  }

  function getFilename(mode) {
    if (mode === 'images') return 'images.pdf';
    if (mode === 'document') return 'document.pdf';
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    return `pdf_${ts}.pdf`;
  }

  function setProgress(pct, msg) {
    if (elements.progressFill) elements.progressFill.style.width = pct + '%';
    if (elements.progressMsg) elements.progressMsg.textContent = msg;
    if (elements.progressPct) elements.progressPct.textContent = pct + '%';
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    generatePDF
  };
})();
