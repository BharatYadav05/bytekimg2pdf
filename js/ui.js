/**
 * ByTek IMG→PDF - UI Manager
 * Feature accordions, Terms of Use modal, Toast notifications, Accessibility controls
 */

const UIManager = (function () {
  const elements = {
    toast: document.getElementById('toast'),
    toastSub: document.getElementById('toastSub'),
    termsOverlay: document.getElementById('termsOverlay'),
    openTermsBtn: document.getElementById('openTerms'),
    closeTermsBtn: document.getElementById('closeTerms'),
    acceptTermsBtn: document.getElementById('acceptTerms')
  };

  let activeModalTrigger = null;

  function init() {
    // Feature accordions
    document.querySelectorAll('.feat-header').forEach(header => {
      const toggle = () => {
        const feat = header.closest('.feat');
        const isOpen = feat.classList.contains('open');

        // Close all existing open feature items
        document.querySelectorAll('.feat.open').forEach(f => {
          f.classList.remove('open');
          const h = f.querySelector('.feat-header');
          if (h) h.setAttribute('aria-expanded', 'false');
        });

        // Toggle target if it was closed
        if (!isOpen) {
          feat.classList.add('open');
          header.setAttribute('aria-expanded', 'true');
        }
      };

      header.addEventListener('click', toggle);
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });

    // Terms of Use Modal
    if (elements.openTermsBtn && elements.termsOverlay) {
      elements.openTermsBtn.addEventListener('click', (e) => {
        activeModalTrigger = e.currentTarget;
        openModal(elements.termsOverlay);
      });
    }

    if (elements.closeTermsBtn) {
      elements.closeTermsBtn.addEventListener('click', () => closeModal(elements.termsOverlay));
    }

    if (elements.acceptTermsBtn) {
      elements.acceptTermsBtn.addEventListener('click', () => closeModal(elements.termsOverlay));
    }

    if (elements.termsOverlay) {
      elements.termsOverlay.addEventListener('click', (e) => {
        if (e.target === elements.termsOverlay) {
          closeModal(elements.termsOverlay);
        }
      });
    }

    // Global Keydown (Escape key for open modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(modal => {
          closeModal(modal);
        });
      }
    });
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus close button or first focusable element for accessibility
    const closeBtn = modalEl.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';

    if (activeModalTrigger) {
      activeModalTrigger.focus();
      activeModalTrigger = null;
    }
  }

  function showToast(filename, count) {
    if (!elements.toast) return;
    if (elements.toastSub) {
      elements.toastSub.textContent = `${count} image${count !== 1 ? 's' : ''} → ${filename}`;
    }
    elements.toast.classList.add('show');
    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 4000);
  }

  return {
    init,
    openModal,
    closeModal,
    showToast
  };
})();
