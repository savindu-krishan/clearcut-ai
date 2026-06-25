import './style.css';
import { createIcons, icons } from 'lucide';
import { removeBackground } from '@imgly/background-removal';

// Initialize Lucide Icons
createIcons({ icons });

// State Variables
let originalFile = null;
let originalImgUrl = null;
let cutoutImgUrl = null;
let cutoutImage = null;
let bgMode = 'transparent'; // 'transparent' | 'color' | 'image'
let bgColor = '#ffffff';
let bgImage = null; // HTMLImageElement for custom background
let activePreset = null; // 'gradient-1', 'gradient-2', etc.

// Slider State
let isDraggingSlider = false;
let sliderPercentage = 50;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const controlsPanel = document.getElementById('controls-panel');
const viewerContainer = document.getElementById('viewer-container');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingStatus = document.getElementById('loading-status');
const loadingSubstatus = document.getElementById('loading-substatus');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercent = document.getElementById('progress-percent');
const previewPanel = document.getElementById('preview-panel');

const originalImage = document.getElementById('original-image');
const originalImageContainer = document.getElementById('original-image-container');
const outputCanvas = document.getElementById('output-canvas');
const comparisonSlider = document.getElementById('comparison-slider');
const sliderHandle = document.getElementById('slider-handle');

// Control Elements
const bgModeTransparent = document.getElementById('bg-mode-transparent');
const bgModeColor = document.getElementById('bg-mode-color');
const bgModeImage = document.getElementById('bg-mode-image');
const colorSettings = document.getElementById('color-settings');
const imageSettings = document.getElementById('image-settings');
const customColorPicker = document.getElementById('custom-color-picker');
const bgImageInput = document.getElementById('bg-image-input');
const btnUploadBg = document.getElementById('btn-upload-bg');
const exportFormat = document.getElementById('export-format');
const exportQuality = document.getElementById('export-quality');
const jpegQualityGroup = document.getElementById('jpeg-quality-group');
const qualityVal = document.getElementById('quality-val');

// Action Buttons
const btnDownload = document.getElementById('btn-download');
const btnCopy = document.getElementById('btn-copy');
const btnReset = document.getElementById('btn-reset');

/* ==========================================================================
   1. Drag & Drop & File Upload Handlers
   ========================================================================== */

// Trigger file browser click
dropzone.addEventListener('click', () => fileInput.click());

// File input change
fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleUploadedFile(e.target.files[0]);
  }
});

// Drag over class additions
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleUploadedFile(e.dataTransfer.files[0]);
  }
});

function handleUploadedFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload a valid image file.');
    return;
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    alert('File size exceeds 10MB limit.');
    return;
  }

  originalFile = file;
  originalImgUrl = URL.createObjectURL(file);
  originalImage.src = originalImgUrl;

  // Start background removal
  processImageBackgroundRemoval();
}

/* ==========================================================================
   2. Background Removal AI Engine Call
   ========================================================================== */

async function processImageBackgroundRemoval() {
  // Show Loading UI
  dropzone.classList.add('hidden');
  loadingOverlay.classList.remove('hidden');
  progressBarFill.style.width = '0%';
  progressPercent.textContent = '0%';
  loadingStatus.textContent = 'Initializing AI Engine...';
  loadingSubstatus.textContent = 'Downloading WebAssembly model (approx. 40MB). This will be cached for future runs.';

  try {
    const config = {
      progress: (key, current, total) => {
        // key will be like 'fetch:model', 'fetch:wasm', etc.
        const percentage = Math.round((current / total) * 100);
        progressBarFill.style.width = `${percentage}%`;
        progressPercent.textContent = `${percentage}%`;
        
        if (key.includes('fetch')) {
          loadingStatus.textContent = 'Downloading AI Model...';
          loadingSubstatus.textContent = 'Caching model elements onto your browser for local offline runs.';
        } else {
          loadingStatus.textContent = 'Segmenting Background...';
          loadingSubstatus.textContent = 'Running neural network locally on your device GPU/CPU.';
        }
      }
    };

    // Run the background removal locally
    const cutoutBlob = await removeBackground(originalFile, config);

    // Save cutout URL
    cutoutImgUrl = URL.createObjectURL(cutoutBlob);
    
    // Load cutout into image element
    cutoutImage = new Image();
    cutoutImage.src = cutoutImgUrl;
    
    cutoutImage.onload = () => {
      // Hide loading, show workspace
      loadingOverlay.classList.add('hidden');
      previewPanel.classList.remove('hidden');
      controlsPanel.classList.remove('hidden');

      // Initialize workspace view
      resetSlider();
      redrawCanvas();
      
      // Update Lucide icons inside controls if any new are rendered
      createIcons({ icons });
    };

    cutoutImage.onerror = () => {
      throw new Error('Failed to load the background-removed output.');
    };

  } catch (error) {
    console.error('Error removing background:', error);
    alert('An error occurred while removing background: ' + error.message);
    resetToInitialState();
  }
}

/* ==========================================================================
   3. Canvas Drawing & Background Customization
   ========================================================================== */

function redrawCanvas() {
  if (!cutoutImage) return;

  const ctx = outputCanvas.getContext('2d');
  
  // Set dimensions to match original image resolution
  outputCanvas.width = cutoutImage.naturalWidth;
  outputCanvas.height = cutoutImage.naturalHeight;
  
  const w = outputCanvas.width;
  const h = outputCanvas.height;

  // Clear previous drawing
  ctx.clearRect(0, 0, w, h);

  // 1. Draw Background style
  if (bgMode === 'color') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
  } else if (bgMode === 'image') {
    if (bgImage) {
      // Draw uploaded custom background (cover resize mode)
      drawCoverImage(ctx, bgImage, w, h);
    } else if (activePreset) {
      // Draw gradient presets
      drawPresetGradient(ctx, activePreset, w, h);
    }
  }

  // 2. Draw background-removed subject on top
  ctx.drawImage(cutoutImage, 0, 0, w, h);

  // Sync original image dimensions visually to match output-canvas dimensions in UI layout
  syncOriginalImageSize();
}

// Draw image covering the canvas (similar to CSS background-size: cover)
function drawCoverImage(ctx, img, canvasW, canvasH) {
  const canvasRatio = canvasW / canvasH;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  let drawW, drawH, drawX, drawY;

  if (imgRatio > canvasRatio) {
    drawH = canvasH;
    drawW = canvasH * imgRatio;
    drawX = (canvasW - drawW) / 2;
    drawY = 0;
  } else {
    drawW = canvasW;
    drawH = canvasW / imgRatio;
    drawX = 0;
    drawY = (canvasH - drawH) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

// Draw gradient preset backgrounds
function drawPresetGradient(ctx, preset, canvasW, canvasH) {
  const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
  
  switch (preset) {
    case 'gradient-1': // Sunset Glow
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#e11d48');
      break;
    case 'gradient-2': // Neon Cyber
      grad.addColorStop(0, '#a855f7');
      grad.addColorStop(1, '#3b82f6');
      break;
    case 'gradient-3': // Emerald Mist
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#06b6d4');
      break;
    case 'gradient-4': // Soft Studio
      grad.addColorStop(0, '#e2e8f0');
      grad.addColorStop(1, '#94a3b8');
      break;
    default:
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#ffffff');
  }
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

function syncOriginalImageSize() {
  // Sync the visual size of the original overlay image to match layout size of output-canvas
  // This is required so the slider comparison aligns perfectly pixel-for-pixel
  setTimeout(() => {
    if (outputCanvas.offsetWidth > 0) {
      originalImage.style.width = `${outputCanvas.offsetWidth}px`;
      originalImage.style.height = `${outputCanvas.offsetHeight}px`;
    }
  }, 50);
}

// Window resize listener to keep image alignment synced
window.addEventListener('resize', syncOriginalImageSize);

/* ==========================================================================
   4. Background Mode Settings Events
   ========================================================================== */

// Background Mode Toggle buttons
const bgModeButtons = [bgModeTransparent, bgModeColor, bgModeImage];

bgModeButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget;
    const selectedMode = target.getAttribute('data-mode');
    
    // Toggle active state
    bgModeButtons.forEach(b => b.classList.remove('active'));
    target.classList.add('active');

    bgMode = selectedMode;

    // Toggle settings panel subgroups
    colorSettings.classList.add('hidden');
    imageSettings.classList.add('hidden');

    if (bgMode === 'color') {
      colorSettings.classList.remove('hidden');
    } else if (bgMode === 'image') {
      imageSettings.classList.remove('hidden');
    }

    redrawCanvas();
  });
});

// Color Preset clicks
document.querySelectorAll('.color-preset').forEach(preset => {
  preset.addEventListener('click', (e) => {
    document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    
    bgColor = e.target.getAttribute('data-color');
    redrawCanvas();
  });
});

// Custom Color Picker input
customColorPicker.addEventListener('input', (e) => {
  document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
  bgColor = e.target.value;
  redrawCanvas();
});

// Preset Gradients clicks
document.querySelectorAll('.bg-preset[data-preset]').forEach(preset => {
  preset.addEventListener('click', (e) => {
    document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    activePreset = e.currentTarget.getAttribute('data-preset');
    bgImage = null; // Clear custom image
    redrawCanvas();
  });
});

// Custom Background Image upload
btnUploadBg.addEventListener('click', () => bgImageInput.click());

bgImageInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
        btnUploadBg.classList.add('active');
        
        bgImage = img;
        activePreset = null;
        redrawCanvas();
      };
    };
    reader.readAsDataURL(file);
  }
});

/* ==========================================================================
   5. Interactive Comparison Slider Logic
   ========================================================================== */

function resetSlider() {
  sliderPercentage = 50;
  updateSliderPosition();
}

function updateSliderPosition() {
  originalImageContainer.style.width = `${sliderPercentage}%`;
  sliderHandle.style.left = `${sliderPercentage}%`;
}

// Mouse / Touch Event Handlers for Slider
function handleSliderMove(clientX) {
  const rect = comparisonSlider.getBoundingClientRect();
  const x = clientX - rect.left;
  let percent = (x / rect.width) * 100;
  
  // Constrain
  percent = Math.max(0, Math.min(100, percent));
  sliderPercentage = percent;
  
  updateSliderPosition();
}

// Mouse events
comparisonSlider.addEventListener('mousedown', (e) => {
  isDraggingSlider = true;
  handleSliderMove(e.clientX);
});

window.addEventListener('mousemove', (e) => {
  if (!isDraggingSlider) return;
  handleSliderMove(e.clientX);
});

window.addEventListener('mouseup', () => {
  isDraggingSlider = false;
});

// Touch events (for mobile devices)
comparisonSlider.addEventListener('touchstart', (e) => {
  isDraggingSlider = true;
  handleSliderMove(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isDraggingSlider) return;
  handleSliderMove(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchend', () => {
  isDraggingSlider = false;
});

/* ==========================================================================
   6. Exporting Options (Download, Quality sliders)
   ========================================================================== */

// Show/Hide quality slider based on export format (only JPEG supports quality compression)
exportFormat.addEventListener('change', (e) => {
  if (e.target.value === 'image/jpeg') {
    jpegQualityGroup.classList.remove('hidden');
  } else {
    jpegQualityGroup.classList.add('hidden');
  }
});

// Quality slider value display update
exportQuality.addEventListener('input', (e) => {
  qualityVal.textContent = `${e.target.value}%`;
});

// Download button trigger
btnDownload.addEventListener('click', () => {
  if (!outputCanvas) return;

  const format = exportFormat.value;
  const quality = parseInt(exportQuality.value) / 100;

  // For JPEG, we need to make sure we don't save with transparent pixels.
  // If the mode is transparent, JPEG will render transparent pixels as black by default.
  // Let's draw a white background for JPEGs if mode is set to transparent.
  let downloadCanvas = outputCanvas;
  
  if (format === 'image/jpeg' && bgMode === 'transparent') {
    // Create temporary canvas to fill background with white
    downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = outputCanvas.width;
    downloadCanvas.height = outputCanvas.height;
    
    const ctx = downloadCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // default to white background for JPEG cutouts
    ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
    ctx.drawImage(outputCanvas, 0, 0);
  }

  // Perform download
  const dataUrl = downloadCanvas.toDataURL(format, format === 'image/jpeg' ? quality : undefined);
  
  const link = document.createElement('a');
  // Clean original filename or default
  const origName = originalFile ? originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) : 'clearcut';
  const ext = format === 'image/jpeg' ? 'jpg' : 'png';
  
  link.download = `${origName}_clearcut.${ext}`;
  link.href = dataUrl;
  link.click();
});

// Copy to Clipboard feature
btnCopy.addEventListener('click', async () => {
  try {
    outputCanvas.toBlob(async (blob) => {
      if (!blob) {
        alert('Could not copy image to clipboard.');
        return;
      }
      
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        
        // Show success visual feedback (simple button text change temporary)
        const oldHtml = btnCopy.innerHTML;
        btnCopy.innerHTML = `<i data-lucide="check"></i> Copied!`;
        btnCopy.classList.add('btn-secondary'); // keep styling
        createIcons({ icons });
        
        setTimeout(() => {
          btnCopy.innerHTML = oldHtml;
          createIcons({ icons });
        }, 2000);

      } catch (err) {
        console.error('Browser clipboard write error:', err);
        alert('Your browser does not support direct image copying. Please download the image instead.');
      }
    }, 'image/png');
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
  }
});

/* ==========================================================================
   7. Reset / Start Over logic
   ========================================================================== */

btnReset.addEventListener('click', resetToInitialState);

function resetToInitialState() {
  // Clear file states
  originalFile = null;
  if (originalImgUrl) URL.revokeObjectURL(originalImgUrl);
  if (cutoutImgUrl) URL.revokeObjectURL(cutoutImgUrl);
  originalImgUrl = null;
  cutoutImgUrl = null;
  cutoutImage = null;
  bgImage = null;
  activePreset = null;

  // Reset controls inputs
  bgMode = 'transparent';
  bgModeButtons.forEach(b => b.classList.remove('active'));
  bgModeTransparent.classList.add('active');
  colorSettings.classList.add('hidden');
  imageSettings.classList.add('hidden');
  document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
  customColorPicker.value = '#ffffff';
  bgImageInput.value = '';
  fileInput.value = '';

  // Show dropzone, hide other workspace panels
  dropzone.classList.remove('hidden');
  previewPanel.classList.add('hidden');
  controlsPanel.classList.add('hidden');
  loadingOverlay.classList.add('hidden');
}
