/**
 * ByTek IMG→PDF - "Fuel ByTek with Chai" Support Module
 * Centralized UPI Configuration, Dynamic UPI URI, Dynamic QR Code Generation, Mobile/Desktop Payment UX
 */

// CENTRALIZED SUPPORT CONFIGURATION
const SUPPORT_CONFIG = {
  UPI_ID: 'bytek@ptyes',                 // Updated UPI ID
  PAYEE_NAME: 'ByTek',                   // Payee Name
  TRANSACTION_NOTE: 'Fuel ByTek with Chai' // Note
};

const SupportManager = (function () {
  let selectedAmount = 20; // Default amount ₹20
  let isCustom = false;
  let qrCodeInstance = null;
  let activeTriggerEl = null;

  const elements = {
    modalOverlay: document.getElementById('supportOverlay'),
    closeBtn: document.getElementById('closeSupport'),
    footerTrigger: document.getElementById('footerSupportTrigger'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    customWrap: document.getElementById('customAmountWrap'),
    customInput: document.getElementById('customAmountInput'),
    validationMsg: document.getElementById('customValidationMsg'),
    upiMobilePayBtn: document.getElementById('upiMobilePayBtn'),
    toggleQrBtn: document.getElementById('toggleQrBtn'),
    qrSection: document.getElementById('qrSection'),
    qrLabel: document.getElementById('qrLabel'),
    qrCanvasContainer: document.getElementById('qrCanvasContainer'),
    postDownloadContainer: document.getElementById('postDownloadContainer')
  };

  function init() {
    if (!elements.modalOverlay) return;

    // Open modal via footer trigger
    if (elements.footerTrigger) {
      elements.footerTrigger.addEventListener('click', (e) => {
        activeTriggerEl = e.currentTarget;
        openModal();
      });
    }

    // Close modal
    if (elements.closeBtn) {
      elements.closeBtn.addEventListener('click', closeModal);
    }

    elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.modalOverlay) closeModal();
    });

    // Amount preset buttons
    elements.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.amount;
        elements.presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (val === 'custom') {
          isCustom = true;
          elements.customWrap.classList.add('visible');
          elements.customInput.focus();
          validateAndApplyCustom();
        } else {
          isCustom = false;
          elements.customWrap.classList.remove('visible');
          selectedAmount = parseFloat(val);
          updatePaymentDetails();
        }
      });
    });

    // Custom amount input listener
    if (elements.customInput) {
      elements.customInput.addEventListener('input', validateAndApplyCustom);
    }

    // Mobile QR toggle (<1024px)
    if (elements.toggleQrBtn) {
      elements.toggleQrBtn.addEventListener('click', () => {
        const isHidden = elements.qrSection.classList.contains('mobile-hidden');
        if (isHidden) {
          elements.qrSection.classList.remove('mobile-hidden');
          elements.toggleQrBtn.textContent = 'Hide QR Code';
        } else {
          elements.qrSection.classList.add('mobile-hidden');
          elements.toggleQrBtn.textContent = 'Prefer QR? Show QR';
        }
      });
    }
  }

  function openModal() {
    elements.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Reset mobile QR toggle state on modal open
    if (window.innerWidth < 1024) {
      elements.qrSection.classList.add('mobile-hidden');
      if (elements.toggleQrBtn) elements.toggleQrBtn.textContent = 'Prefer QR? Show QR';
    } else {
      elements.qrSection.classList.remove('mobile-hidden');
    }

    updatePaymentDetails();

    const closeBtn = elements.modalOverlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    elements.modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (activeTriggerEl) {
      activeTriggerEl.focus();
      activeTriggerEl = null;
    }
  }

  function validateAndApplyCustom() {
    const rawVal = elements.customInput.value.trim();
    const num = parseFloat(rawVal);

    if (rawVal === '' || isNaN(num) || num <= 0 || num > 10000) {
      elements.customInput.classList.add('invalid');
      elements.validationMsg.classList.add('visible');
      if (rawVal === '') {
        elements.validationMsg.textContent = 'Please enter an amount.';
      } else if (num <= 0) {
        elements.validationMsg.textContent = 'Amount must be greater than ₹0.';
      } else if (num > 10000) {
        elements.validationMsg.textContent = 'Maximum amount is ₹10,000.';
      } else {
        elements.validationMsg.textContent = 'Please enter a valid amount.';
      }
      if (elements.upiMobilePayBtn) {
        elements.upiMobilePayBtn.style.opacity = '0.5';
        elements.upiMobilePayBtn.style.pointerEvents = 'none';
      }
      return;
    }

    elements.customInput.classList.remove('invalid');
    elements.validationMsg.classList.remove('visible');
    if (elements.upiMobilePayBtn) {
      elements.upiMobilePayBtn.style.opacity = '1';
      elements.upiMobilePayBtn.style.pointerEvents = 'all';
    }

    selectedAmount = Math.round(num * 100) / 100;
    updatePaymentDetails();
  }

  function buildUpiUri(amount) {
    const pa = encodeURIComponent(SUPPORT_CONFIG.UPI_ID);
    const pn = encodeURIComponent(SUPPORT_CONFIG.PAYEE_NAME);
    const am = amount.toFixed(2);
    const cu = 'INR';
    const tn = encodeURIComponent(SUPPORT_CONFIG.TRANSACTION_NOTE);

    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}`;
  }

  function updatePaymentDetails() {
    const uri = buildUpiUri(selectedAmount);

    // Update Mobile UPI Button text: Send ₹XX ☕ via UPI
    if (elements.upiMobilePayBtn) {
      elements.upiMobilePayBtn.href = uri;
      elements.upiMobilePayBtn.innerHTML = `Send ₹${selectedAmount} ☕ via UPI`;
    }

    // Update Desktop QR Label
    if (elements.qrLabel) {
      elements.qrLabel.textContent = `Pay ₹${selectedAmount} via QR`;
    }

    // Render Dynamic QR Code
    renderQrCode(uri);
  }

  function renderQrCode(uri) {
    if (!elements.qrCanvasContainer) return;
    elements.qrCanvasContainer.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      try {
        qrCodeInstance = new QRCode(elements.qrCanvasContainer, {
          text: uri,
          width: 180,
          height: 180,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.error('QR Code Generation Error:', err);
        elements.qrCanvasContainer.innerHTML = '<span style="font-size:12px;color:red;">QR Error</span>';
      }
    } else {
      elements.qrCanvasContainer.innerHTML = '<span style="font-size:11px;color:var(--muted)">QR Code Library loading…</span>';
    }
  }

  // Display post-download secondary support prompt card
  function showPostDownloadPrompt() {
    if (!elements.postDownloadContainer) return;

    elements.postDownloadContainer.innerHTML = `
      <div class="post-download-support">
        <div class="support-prompt-text">
          <strong>PDF Ready ✓</strong> — Saved you some time?
        </div>
        <button class="btn-support-trigger" id="postDownloadSupportBtn" type="button">
          ☕ Fuel ByTek with Chai
        </button>
      </div>
    `;

    const btn = document.getElementById('postDownloadSupportBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        activeTriggerEl = e.currentTarget;
        openModal();
      });
    }
  }

  return {
    init,
    openModal,
    closeModal,
    showPostDownloadPrompt
  };
})();
