document.addEventListener("DOMContentLoaded", () => {
  const accentColorInput = document.getElementById("accent-color");

  // Load saved accent color
  chrome.storage.sync.get(["accentColor"], (result) => {
    if (result.accentColor) {
      accentColorInput.value = result.accentColor;
    }
  });

  // Save accent color when changed
  accentColorInput.addEventListener("change", (e) => {
    const color = e.target.value;
    chrome.storage.sync.set({ accentColor: color }, () => {
      // Update the CSS variable in the options page
      document.documentElement.style.setProperty("--accent-color", color);
    });
  });
});
