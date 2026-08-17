/**
 * ByTek IMG→PDF - Image & Grid Handler
 * File selection, Input Limit Safeguards, Preview Grid, Page Reordering, Object URL lifecycle, Smooth Auto-Scroll
 */

const ImageHandler = (function () {
  let images = []; // Array of { file, url, name }
  let dragSrcIdx = null;

  // CENTRALIZED SAFEGUARDS
  const LIMITS = {
    MAX_IMAGES: 50,
    MAX_FILE_SIZE_MB: 25,
    MAX_TOTAL_SIZE_MB: 150
  };

  const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    browseBtn: document.getElementById('browseBtn'),
    headerChooseBtn: document.getElementById('headerChooseBtn'),
    imageGrid: document.getElementById('imageGrid'),
    previewSection: document.getElementById('previewSection'),
    convertArea: document.getElementById('convertArea'),
    clearBtn: document.getElementById('clearBtn'),
    countBadge: document.getElementById('countBadge')
  };

  function init() {
    if (!elements.dropzone) return;

    if (elements.browseBtn) {
      elements.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
      });
    }

    if (elements.headerChooseBtn) {
      elements.headerChooseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
      });
    }

    elements.dropzone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => addFiles(e.target.files));

    // Dropzone drag and drop
    elements.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dropzone.classList.add('dragover');
    });

    elements.dropzone.addEventListener('dragleave', () => {
      elements.dropzone.classList.remove('dragover');
    });

    elements.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent bubbling up to document.body drop handler!
      elements.dropzone.classList.remove('dragover');
      addFiles(e.dataTransfer.files);
    });

    // Global dragover & drop prevention (only handle drops outside dropzone if any)
    document.body.addEventListener('dragover', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      // If dropped outside the dropzone and not a card reorder drag
      if (e.target !== elements.dropzone && !elements.dropzone.contains(e.target) && dragSrcIdx === null) {
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          addFiles(e.dataTransfer.files);
        }
      }
    });

    if (elements.clearBtn) {
      elements.clearBtn.addEventListener('click', clearAll);
    }
  }

  function addFiles(files) {
    if (!files || !files.length) return;

    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/bmp', 'image/avif', 'image/tiff', 'image/svg+xml'
    ];

    const warnings = [];
    let addedCount = 0;

    // Check max image limit
    if (images.length >= LIMITS.MAX_IMAGES) {
      alert(`IMG→PDF supports up to ${LIMITS.MAX_IMAGES} images per PDF.`);
      return;
    }

    // Calculate current total size
    let currentTotalBytes = images.reduce((acc, curr) => acc + curr.file.size, 0);

    Array.from(files).forEach(file => {
      // Check total images limit
      if (images.length >= LIMITS.MAX_IMAGES) {
        if (!warnings.includes('limit_reached')) {
          warnings.push(`IMG→PDF supports up to ${LIMITS.MAX_IMAGES} images per PDF.`);
          warnings.push('limit_reached');
        }
        return;
      }

      if (!file.type.startsWith('image/') && !allowed.includes(file.type)) {
        warnings.push(`File "${file.name}" is not a supported image format.`);
        return;
      }

      // Check single file size
      if (file.size > LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024) {
        warnings.push(`"${file.name}" exceeds the ${LIMITS.MAX_FILE_SIZE_MB} MB limit per file.`);
        return;
      }

      // Check cumulative size
      if (currentTotalBytes + file.size > LIMITS.MAX_TOTAL_SIZE_MB * 1024 * 1024) {
        warnings.push(`Combined input size exceeds the ${LIMITS.MAX_TOTAL_SIZE_MB} MB limit.`);
        return;
      }

      currentTotalBytes += file.size;

      // Create persistent preview Object URL (Retained while card is in UI)
      const url = URL.createObjectURL(file);
      images.push({ file, url, name: file.name });
      addedCount++;
    });

    if (warnings.length > 0) {
      const displayWarnings = warnings.filter(w => w !== 'limit_reached');
      alert(displayWarnings.join('\n'));
    }

    if (addedCount > 0) {
      renderGrid();

      // Smooth auto-scroll to Images preview section & Generate PDF button
      setTimeout(() => {
        if (elements.previewSection) {
          elements.previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  function renderGrid() {
    elements.imageGrid.innerHTML = '';

    images.forEach((img, idx) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.draggable = true;
      card.dataset.idx = idx;

      card.innerHTML = `
        <img src="${img.url}" alt="${escapeHtml(img.name)}" loading="lazy">
        <div class="card-overlay">
          <span class="card-num">${idx + 1}</span>
          <div class="card-actions">
            <button class="card-btn card-btn-del" title="Remove image" data-idx="${idx}" aria-label="Remove page ${idx + 1}">✕</button>
          </div>
        </div>
      `;

      // HTML5 Drag & Drop for reordering
      card.addEventListener('dragstart', (e) => {
        dragSrcIdx = idx;
        setTimeout(() => card.classList.add('dragging'), 10);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-over');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drag-over');

        if (dragSrcIdx !== null && dragSrcIdx !== idx) {
          const movedItem = images.splice(dragSrcIdx, 1)[0];
          images.splice(idx, 0, movedItem);
          renderGrid();
        }
        dragSrcIdx = null;
      });

      // Remove single image button
      const delBtn = card.querySelector('.card-btn-del');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeImage(idx);
      });

      elements.imageGrid.appendChild(card);
    });

    elements.countBadge.textContent = images.length;
    const hasImages = images.length > 0;
    elements.previewSection.classList.toggle('visible', hasImages);
    elements.convertArea.classList.toggle('visible', hasImages);
  }

  function removeImage(idx) {
    if (images[idx]) {
      // Memory cleanup: revoke persistent preview Object URL ONLY on user removal
      URL.revokeObjectURL(images[idx].url);
      images.splice(idx, 1);
      renderGrid();
    }
  }

  function clearAll() {
    // Memory cleanup: revoke all preview Object URLs
    images.forEach(img => URL.revokeObjectURL(img.url));
    images = [];
    renderGrid();
    if (elements.fileInput) {
      elements.fileInput.value = '';
    }
  }

  function getImages() {
    return images;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  return {
    init,
    addFiles,
    getImages,
    clearAll,
    LIMITS
  };
})();
