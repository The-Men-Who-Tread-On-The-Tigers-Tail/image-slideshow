# Image Slideshow

A fullscreen image slideshow application with a TypeScript Express backend and vanilla JavaScript frontend.

## Installation

```bash
npm install
```

## Usage

```bash
npm run build    # Compile TypeScript
npm run start    # Run the server
npm run dev      # Build and run in one command
npm test         # Run tests
```

Run with a custom images folder:
```bash
node dist/server.js /path/to/images
```

Then open http://localhost:3000 in your browser.

## Features

- Fullscreen slideshow with smooth crossfade transitions
- Start screen showing image count before launching
- Controls: previous/next, play/pause, interval selection (3s-5min), fullscreen toggle
- Shuffle or ordered display (toggle on start screen or during slideshow)
- Keyboard shortcuts:
  - Arrow keys: navigate
  - Space: next image
  - Escape: pause
  - F: toggle fullscreen
  - S: toggle shuffle/order
- Touch support: tap left/right edges to navigate, center to pause
- Auto-hides cursor and controls after 3 seconds of inactivity

## Supported Formats

jpg, jpeg, png, gif, webp, bmp, svg

## Architecture

**Backend (`src/server.ts`)**: Express server on port 3000
- Serves static files from `public/`
- `GET /api/images` - returns list of image filenames
- `GET /images/:filename` - serves individual images with path traversal protection

**Frontend (`public/`)**: Single-page application
- Double-buffered slide transitions for smooth crossfades
- Responsive controls with auto-hide functionality
