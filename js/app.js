/**
 * ByTek IMG→PDF - Application Controller
 * Orchestrates module initialization, event bindings, and workflow execution
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all application modules
  SettingsManager.init();
  ImageHandler.init();
  UIManager.init();
  SupportManager.init();

  // Bind Convert Button action
  const convertBtn = document.getElementById('convertBtn');
  if (convertBtn) {
    convertBtn.addEventListener('click', async () => {
      const images = ImageHandler.getImages();
      if (!images || !images.length) return;

      const settings = SettingsManager.getSettings();

      await PDFGenerator.generatePDF(
        images,
        settings,
        (filename, count) => {
          // Success callback: Show download completion toast & secondary support prompt
          UIManager.showToast(filename, count);
          SupportManager.showPostDownloadPrompt();
        }
      );
    });
  }
});
