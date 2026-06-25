# ClearCut AI — Local Image Background Remover

ClearCut AI is a high-performance, premium, browser-based web application that removes image backgrounds instantly and entirely offline. By leveraging WebAssembly and local AI models, it ensures that your photos never leave your device, offering 100% privacy and zero server fees.

## ✨ Features

- **100% Offline & Private**: All image segmentation neural networks run locally in the browser. No uploads, no server databases, complete privacy.
- **Interactive Comparison Slider**: A premium side-by-side sliding viewer to inspect the cutout precision in real-time.
- **Custom Background Customizer**:
  - **Transparent Mode**: The standard checkered grid transparent cutout.
  - **Solid Color Mode**: Instantly replace backgrounds with preset colors or a custom color picker.
  - **Custom Presets & Image Uploads**: Set gradient presets or upload custom background photos.
- **Advanced Export Options**:
  - Download as lossless transparent **PNG** or compressed solid-color **JPEG**.
  - Control export quality compression for JPEG files.
  - Copy directly to clipboard for immediate pasting into other apps.
- **Ultra Responsive UI**: Glassmorphic dark-theme styled using vanilla CSS, optimized for mobile, tablet, and desktop screens.

## 🛠️ Tech Stack

- **Framework/Bundler**: [Vite](https://vite.dev/) (Vanilla JS project configuration)
- **AI Core Engine**: [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) (ONNX Runtime Web + WASM)
- **UI Design System**: Vanilla CSS (CSS Variables, Flexbox, CSS Grid, Backdrop Filters)
- **Icons**: [Lucide Icons](https://lucide.dev/)

---

## 🚀 Getting Started

Follow these steps to run the project locally on your machine:

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ recommended).

### 2. Clone and Install Dependencies

```bash
# Navigate to the project directory
cd "new project 09"

# Install package dependencies
npm install
```

### 3. Run Local Dev Server

Start the local development server:

```bash
npm run dev
```

The app will start running. Open your browser and navigate to the address shown (usually `http://localhost:5173/`).

### 4. Build for Production

Compile and bundle assets for production deployment:

```bash
npm run build
```

The production assets will be generated in the `/dist` directory, ready to be hosted on any static hosting service (GitHub Pages, Vercel, Netlify, etc.).

---

## ℹ️ How It Works (Under the Hood)

1. **WASM Execution**: When the app first runs, it downloads a lightweight, pre-trained image segmentation model (cached in the browser's cache storage for subsequent runs) and executes it using **WebAssembly** and **WebGL/WebGPU** hardware acceleration.
2. **Canvas Composition**: Once the neural network isolates the foreground subject, the app uses HTML5 **2D Canvas Context API** to paint background styles (solid colors or custom images) and overlay the subject dynamically. This ensures that the generated downloads are rendered at full original resolution.

## 📄 License

This project is open-source and licensed under the MIT License.
