# Any to GIF Pro

A browser-based converter that turns professional video or image sequences into high-quality GIFs. Built entirely with client-side FFmpeg.wasm so it can be deployed on GitHub Pages with no backend services.

## ✨ Features

- 🎬 **Video to GIF**: Convert H.264 MP4, MOV (with alpha), and AVI sources directly in the browser.
- 🖼️ **PNG sequence support**: Drop an ordered PNG sequence (with transparency) to build an animated GIF.
- ⚙️ **Full output control**: Adjust width, height, frame rate, quality, and loop count.
- 🛡️ **Privacy friendly**: All processing happens locally in the browser—files never leave your machine.
- 🚀 **Optimized output**: Palette generation with Floyd–Steinberg dithering keeps colors crisp.

## 🚀 Getting started

1. Clone the repository and open `index.html` in any modern browser, or deploy the repo to GitHub Pages.
2. Load a source file:
   - Single MP4 / MOV / AVI video (H.264 recommended).
   - Multiple PNG frames (select them together) to treat as a sequence.
3. Configure the export options, then click **Convert to GIF**.
4. Wait for FFmpeg.wasm (~25&nbsp;MB) to download on first use, then track conversion progress in real time.
5. Preview the generated GIF and download it directly.

## 🧰 Tech stack

- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) for in-browser encoding.
- Vanilla HTML, CSS, and JavaScript—ideal for static hosting.

## 📦 Deployment tips

- Enable GitHub Pages (Settings → Pages → Deploy from branch) and select the main branch root directory.
- After publishing, the app will be accessible from your GitHub Pages URL with no additional configuration.

## 📝 Roadmap ideas

- Drag-and-drop reordering for PNG sequences.
- Presets for popular social media GIF sizes.
- Batch queue support for multiple conversions.

Contributions and suggestions are welcome!
