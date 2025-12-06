# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build    # Compile TypeScript to dist/
npm run start    # Run the compiled server
npm run dev      # Build and run in one command
```

Run with a custom images folder:
```bash
node dist/server.js /path/to/images
```

## Architecture

This is a fullscreen image slideshow application with a TypeScript Express backend and vanilla JavaScript frontend.

**Backend (`src/server.ts`)**: Express server on port 3000 that:
- Serves static files from `public/`
- Provides `/api/images` endpoint returning image filenames from the configured folder
- Serves images via `/images/:filename` with path traversal protection

**Frontend (`public/`)**: Single-page slideshow with:
- Double-buffered slide transitions for smooth crossfades
- Start screen showing image count before launching
- Controls: prev/next, play/pause, interval selection (3s-5min), fullscreen
- Keyboard shortcuts: arrows (nav), space (next), Escape (pause), F (fullscreen)
- Touch support: left/right edges for nav, center for pause
- Auto-hides cursor and controls after 3 seconds of inactivity

Images are shuffled on load. Supported formats: jpg, jpeg, png, gif, webp, bmp, svg.
