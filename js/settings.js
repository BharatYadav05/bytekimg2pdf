/**
 * ByTek IMG→PDF - Settings Manager
 * PDF Sizing, Quality, Margin & Filename preferences
 * Includes custom listbox UI for dropdown controls matching ByTek design system
 */

const SettingsManager = (function () {
  const elements = {
    pageSize: document.getElementById('pageSize'),
    orientation: document.getElementById('orientation'),
    fitMode: document.getElementById('fitMode'),
    quality: document.getElementById('quality'),
    qualLabel: document.getElementById('qualLabel'),
    margin: document.getElementById('margin'),
    filenameMode: document.getElementById('filenameMode'),
    accordion: document.getElementById('settingsAccordion'),
    trigger: document.getElementById('settingsTrigger'),
    hint: document.querySelector('.settings-trigger-hint')
  };

  function init() {
    if (!elements.quality) return;

    // Quality label sync
    elements.quality.addEventListener('input', () => {
      elements.qualLabel.textContent = elements.quality.value;
      updateHint();
    });

    // Accordion toggle
    if (elements.trigger) {
      elements.trigger.addEventListener('click', () => {
        elements.accordion.classList.toggle('open');
      });
    }

    // Attach listeners to all setting inputs to update summary hint
    const inputs = ['pageSize', 'orientation', 'fitMode', 'margin', 'filenameMode'];
    inputs.forEach(id => {
      const el = elements[id];
      if (el) {
        el.addEventListener('change', updateHint);
      }
    });

    // Build custom styled dropdown listbox UI
    buildCustomSelects();

    updateHint();
  }

  function buildCustomSelects() {
    const inputs = ['pageSize', 'orientation', 'fitMode', 'margin', 'filenameMode'];

    inputs.forEach(id => {
      const selectEl = elements[id];
      if (!selectEl) return;

      const parent = selectEl.parentElement;
      if (!parent || parent.classList.contains('custom-select-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'custom-select-wrapper';
      parent.insertBefore(wrapper, selectEl);
      wrapper.appendChild(selectEl);

      // Custom Trigger Button
      const trigger = document.createElement('div');
      trigger.className = 'custom-select-trigger';
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('role', 'combobox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-haspopup', 'listbox');

      const labelSpan = document.createElement('span');
      labelSpan.className = 'custom-select-label';

      const chevronSpan = document.createElement('span');
      chevronSpan.className = 'custom-select-chevron';
      chevronSpan.innerHTML = `<svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

      trigger.appendChild(labelSpan);
      trigger.appendChild(chevronSpan);
      wrapper.appendChild(trigger);

      // Custom Floating Menu Container
      const menu = document.createElement('div');
      menu.className = 'custom-select-menu';
      menu.setAttribute('role', 'listbox');
      wrapper.appendChild(menu);

      function renderOptions() {
        menu.innerHTML = '';
        const currentVal = selectEl.value;
        const currentText = selectEl.options[selectEl.selectedIndex] ? selectEl.options[selectEl.selectedIndex].text : '';
        labelSpan.textContent = currentText;

        Array.from(selectEl.options).forEach((opt, idx) => {
          const optionDiv = document.createElement('div');
          optionDiv.className = 'custom-select-option' + (opt.value === currentVal ? ' selected' : '');
          optionDiv.setAttribute('role', 'option');
          optionDiv.setAttribute('data-value', opt.value);
          optionDiv.setAttribute('data-index', idx);

          const optText = document.createElement('span');
          optText.textContent = opt.text;
          optionDiv.appendChild(optText);

          if (opt.value === currentVal) {
            const check = document.createElement('span');
            check.className = 'custom-select-check';
            check.textContent = '✓';
            optionDiv.appendChild(check);
          }

          optionDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            selectOption(opt.value);
          });

          menu.appendChild(optionDiv);
        });
      }

      function selectOption(val) {
        if (selectEl.value !== val) {
          selectEl.value = val;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        renderOptions();
        closeMenu();
      }

      function closeMenu() {
        wrapper.classList.remove('open', 'open-up');
        trigger.setAttribute('aria-expanded', 'false');
      }

      function openMenu() {
        // Close any other open dropdowns
        document.querySelectorAll('.custom-select-wrapper.open').forEach(other => {
          if (other !== wrapper) {
            other.classList.remove('open', 'open-up');
            const otherTrig = other.querySelector('.custom-select-trigger');
            if (otherTrig) otherTrig.setAttribute('aria-expanded', 'false');
          }
        });

        renderOptions();

        // Check viewport boundary for opening upward if necessary
        wrapper.classList.remove('open-up');
        const rect = wrapper.getBoundingClientRect();
        const menuHeight = Math.min(selectEl.options.length * 42 + 16, 240);
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
          wrapper.classList.add('open-up');
        }

        wrapper.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }

      function toggleMenu() {
        if (wrapper.classList.contains('open')) {
          closeMenu();
        } else {
          openMenu();
        }
      }

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
      });

      // Keyboard Accessibility
      let highlightedIdx = -1;

      trigger.addEventListener('keydown', (e) => {
        const isOpen = wrapper.classList.contains('open');
        const opts = Array.from(menu.querySelectorAll('.custom-select-option'));

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isOpen) {
            if (highlightedIdx >= 0 && opts[highlightedIdx]) {
              const val = opts[highlightedIdx].getAttribute('data-value');
              selectOption(val);
            } else {
              closeMenu();
            }
          } else {
            openMenu();
            highlightedIdx = selectEl.selectedIndex;
            updateHighlight(opts);
          }
        } else if (e.key === 'Escape') {
          if (isOpen) {
            e.preventDefault();
            closeMenu();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!isOpen) openMenu();
          highlightedIdx = (highlightedIdx + 1) % opts.length;
          updateHighlight(opts);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!isOpen) openMenu();
          highlightedIdx = (highlightedIdx - 1 + opts.length) % opts.length;
          updateHighlight(opts);
        } else if (e.key === 'Tab') {
          closeMenu();
        }
      });

      function updateHighlight(opts) {
        opts.forEach((o, i) => {
          o.classList.toggle('highlighted', i === highlightedIdx);
        });
      }

      selectEl.addEventListener('change', () => {
        renderOptions();
      });

      renderOptions();
    });

    // Global click outside handler
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(wrapper => {
          wrapper.classList.remove('open', 'open-up');
          const trig = wrapper.querySelector('.custom-select-trigger');
          if (trig) trig.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  function updateHint() {
    if (!elements.hint) return;
    const size = elements.pageSize.options[elements.pageSize.selectedIndex].text.split(' ')[0];
    const rawOrient = elements.orientation.value;
    const orient = rawOrient === 'auto' ? 'Auto' : rawOrient.charAt(0).toUpperCase() + rawOrient.slice(1);
    const fitVal = elements.fitMode.value;
    const fit = fitVal === 'fit' ? 'Fit' : fitVal === 'fill' ? 'Fill' : 'Original';
    const q = elements.quality.value + '%';

    elements.hint.textContent = `${size} · ${orient} · ${fit} · ${q}`;
  }

  function getSettings() {
    return {
      pageSize: elements.pageSize.value.toUpperCase(),
      orientPref: elements.orientation.value,
      fitMode: elements.fitMode.value,
      quality: parseInt(elements.quality.value, 10) / 100,
      marginMM: parseInt(elements.margin.value, 10),
      filenameMode: elements.filenameMode.value
    };
  }

  return {
    init,
    getSettings,
    updateHint
  };
})();
