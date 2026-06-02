# LofiStation — Cozy Desktop Radio & Rain Mixer (Tauri 2)

A beautiful, lightweight, and interactive desktop application that streams live Lofi & Synthwave web radio channels, paired with a custom procedural rain synthesizer and dynamic backgrounds. Built using **Tauri 2** (HTML/CSS/JS frontend and **Rust** backend), running natively on both **macOS** and **Windows**.

## Features

*   **Premium Glassmorphic Design**: Translucent interfaces, borderless windows, and sleek custom audio mixers.
*   **3 Distinct Curated Stations**:
    *   ☕ **Chillhop Café**: Streams live chillhop/lofi beats, set against a cozy room background featuring slow-pulsing lights and warm, twinkling starry skies.
    *   🌌 **Retrowave Sunset**: Streams retro outrun/synthwave beats, featuring an interactive scrolling 3D grid road, wireframe mountains, and a glowing retro sun, complete with a toggleable CRT TV scanline filter.
    *   🪐 **Ambient Nebula**: Streams deep cosmic synthesizers, featuring a slowly drifting starfield canvas.
*   **Procedural Web Audio Rain Synthesizer**: Generates relaxing rain audio in real-time using white noise and a low-pass filter modulated by a slow LFO to simulate natural gusts.
*   **Volume Mixer**: Individually mix the radio stream volume and the rain sound volume to find your perfect relaxation balance.
*   **Dynamic Visual Rain Overlay**: Spawns realistic falling rain droplets that splash and ripple at the bottom of the screen when rain is active.
*   **Organic Audio Visualizer**: Renders a beautiful dual-sine wave visualizer that responds to playback state and active volume levels, custom-colored to match each station's theme.
*   **Sleep Timer**: Automatically closes the application after a set duration (15m, 30m, 45m, 60m) by smoothly fading out the volume.
*   **Automated Cloud Releases**: Pre-compiled binaries for Windows (`.msi` / `.exe`) and macOS (`.dmg`) are automatically generated and uploaded to GitHub Releases using GitHub Actions.

## Project Structure

*   `src/`: Frontend interface (Vanilla HTML, CSS, JavaScript, and Audio synthesis engine).
*   `src-tauri/`: Rust backend (Window configurations and core window managers).

## Development Prerequisites

Ensure you have installed:
*   [Node.js](https://nodejs.org/) (version 16+ recommended)
*   [Rust & Cargo](https://www.rust-lang.org/)

## Getting Started

1.  Install JavaScript dependencies:
    ```bash
    npm install
    ```
2.  Run the application in development mode:
    ```bash
    npm run tauri dev
    ```

## Build Native App Bundle

To compile the production release optimized app:

```bash
npm run tauri build
```
