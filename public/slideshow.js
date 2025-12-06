class Slideshow {
  constructor() {
    this.images = [];
    this.displayImages = [];
    this.currentIndex = 0;
    this.interval = 30000;
    this.timer = null;
    this.isPlaying = true;
    this.isShuffled = true;
    this.activeSlide = 1;
    this.cursorTimeout = null;
    this.showMetadata = false;

    this.initElements();
    this.bindEvents();
    this.loadImages();
    this.startClock();
  }

  initElements() {
    this.startScreen = document.getElementById('startScreen');
    this.startBtn = document.getElementById('startBtn');
    this.imageCountEl = document.getElementById('imageCount');
    this.slide1 = document.getElementById('slide1');
    this.slide2 = document.getElementById('slide2');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.intervalSelect = document.getElementById('intervalSelect');
    this.shuffleCheckbox = document.getElementById('shuffleCheckbox');
    this.shuffleBtn = document.getElementById('shuffleBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.imageCounter = document.getElementById('imageCounter');
    this.clock = document.getElementById('clock');
    this.metadata = document.getElementById('metadata');
    this.metadataBtn = document.getElementById('metadataBtn');
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.intervalSelect.addEventListener('change', (e) => this.changeInterval(e.target.value));
    this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    this.metadataBtn.addEventListener('click', () => this.toggleMetadata());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Mouse movement to show/hide cursor and controls
    document.addEventListener('mousemove', () => this.showCursor());

    // Touch events for mobile
    document.addEventListener('touchstart', (e) => this.handleTouch(e));
  }

  async loadImages() {
    try {
      const response = await fetch('/api/images');
      this.images = await response.json();

      if (this.images.length === 0) {
        this.imageCountEl.textContent = 'No images found in the folder';
        this.startBtn.disabled = true;
        this.startBtn.textContent = 'No Images';
      } else {
        this.imageCountEl.textContent = `${this.images.length} images found`;
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      this.imageCountEl.textContent = 'Error loading images';
    }
  }

  updateDisplayOrder() {
    if (this.isShuffled) {
      this.displayImages = [...this.images];
      for (let i = this.displayImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.displayImages[i], this.displayImages[j]] = [this.displayImages[j], this.displayImages[i]];
      }
    } else {
      this.displayImages = [...this.images];
    }
    this.updateShuffleButton();
  }

  updateShuffleButton() {
    this.shuffleBtn.textContent = this.isShuffled ? '🔀 Shuffle' : '➡️ Order';
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    const currentImage = this.displayImages[this.currentIndex];
    this.updateDisplayOrder();
    // Try to find the current image in the new order
    const newIndex = this.displayImages.indexOf(currentImage);
    this.currentIndex = newIndex >= 0 ? newIndex : 0;
    this.imageCounter.textContent = `${this.currentIndex + 1} / ${this.displayImages.length}`;
  }

  start() {
    this.isShuffled = this.shuffleCheckbox.checked;
    this.updateDisplayOrder();
    this.startScreen.classList.add('hidden');
    this.showImage(0);
    this.startTimer();
    this.requestFullscreen();
  }

  showImage(index) {
    if (this.displayImages.length === 0) return;

    this.currentIndex = ((index % this.displayImages.length) + this.displayImages.length) % this.displayImages.length;
    const imageName = this.displayImages[this.currentIndex];
    const imageUrl = `/images/${encodeURIComponent(imageName)}`;

    // Use double-buffering technique for smooth transitions
    const currentSlide = this.activeSlide === 1 ? this.slide1 : this.slide2;
    const nextSlide = this.activeSlide === 1 ? this.slide2 : this.slide1;

    // Preload image
    const img = new Image();
    img.onload = () => {
      nextSlide.innerHTML = '';
      nextSlide.appendChild(img);

      // Transition
      currentSlide.classList.remove('active');
      nextSlide.classList.add('active');

      this.activeSlide = this.activeSlide === 1 ? 2 : 1;
    };
    img.src = imageUrl;
    img.alt = imageName;

    // Update counter
    this.imageCounter.textContent = `${this.currentIndex + 1} / ${this.displayImages.length}`;

    // Update metadata if enabled
    if (this.showMetadata) {
      this.fetchMetadata();
    }
  }

  next() {
    this.showImage(this.currentIndex + 1);
    if (this.isPlaying) {
      this.restartTimer();
    }
  }

  prev() {
    this.showImage(this.currentIndex - 1);
    if (this.isPlaying) {
      this.restartTimer();
    }
  }

  startTimer() {
    this.timer = setInterval(() => {
      this.next();
    }, this.interval);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  restartTimer() {
    this.stopTimer();
    this.startTimer();
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.playPauseBtn.textContent = '⏸ Pause';
      this.startTimer();
    } else {
      this.playPauseBtn.textContent = '▶ Play';
      this.stopTimer();
    }
  }

  changeInterval(value) {
    this.interval = parseInt(value, 10);
    if (this.isPlaying) {
      this.restartTimer();
    }
  }

  async toggleFullscreen() {
    if (!document.fullscreenElement) {
      await this.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  async requestFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.log('Fullscreen not available:', error);
    }
  }

  showCursor() {
    document.body.classList.add('show-cursor');

    if (this.cursorTimeout) {
      clearTimeout(this.cursorTimeout);
    }

    this.cursorTimeout = setTimeout(() => {
      document.body.classList.remove('show-cursor');
    }, 20000);
  }

  startClock() {
    const updateClock = () => {
      const now = new Date();
      this.clock.textContent = now.toLocaleTimeString();
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  toggleMetadata() {
    this.showMetadata = !this.showMetadata;
    this.updateMetadataButton();
    if (this.showMetadata) {
      this.metadata.classList.add('enabled');
      this.fetchMetadata();
    } else {
      this.metadata.classList.remove('enabled');
    }
  }

  updateMetadataButton() {
    this.metadataBtn.textContent = this.showMetadata ? 'ℹ Info ✓' : 'ℹ Info';
  }

  async fetchMetadata() {
    if (!this.showMetadata || this.displayImages.length === 0) return;

    const imageName = this.displayImages[this.currentIndex];
    try {
      const response = await fetch(`/api/images/${encodeURIComponent(imageName)}/metadata`);
      if (!response.ok) {
        this.metadata.innerHTML = '<div>Metadata unavailable</div>';
        return;
      }
      const data = await response.json();
      this.displayMetadata(data);
    } catch (error) {
      this.metadata.innerHTML = '<div>Failed to load metadata</div>';
    }
  }

  displayMetadata(data) {
    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (isoString) => {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const escapeHtml = (str) => {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    let html = `<div><span class="label">Name:</span>${escapeHtml(data.filename)}</div>`;
    if (data.width && data.height) {
      html += `<div><span class="label">Dimensions:</span>${data.width} × ${data.height}</div>`;
    }
    html += `<div><span class="label">File size:</span>${formatSize(data.size)}</div>`;
    if (data.type) {
      html += `<div><span class="label">Format:</span>${data.type.toUpperCase()}</div>`;
    }

    // EXIF data
    if (data.exif) {
      const exif = data.exif;

      if (exif.dateTaken) {
        html += `<div><span class="label">Taken:</span>${escapeHtml(exif.dateTaken)}</div>`;
      }

      if (exif.camera) {
        html += `<div><span class="label">Camera:</span>${escapeHtml(exif.camera)}</div>`;
      }

      if (exif.lens) {
        html += `<div><span class="label">Lens:</span>${escapeHtml(exif.lens)}</div>`;
      }

      // Exposure settings on one line
      const exposure = [];
      if (exif.aperture) exposure.push(exif.aperture);
      if (exif.shutterSpeed) exposure.push(exif.shutterSpeed);
      if (exif.iso) exposure.push(`ISO ${exif.iso}`);
      if (exposure.length > 0) {
        html += `<div><span class="label">Exposure:</span>${exposure.join('  ')}</div>`;
      }

      if (exif.focalLength) {
        html += `<div><span class="label">Focal length:</span>${exif.focalLength}</div>`;
      }

      if (exif.flash) {
        html += `<div><span class="label">Flash:</span>${escapeHtml(exif.flash)}</div>`;
      }

      if (exif.gps) {
        const lat = exif.gps.latitude.toFixed(6);
        const lng = exif.gps.longitude.toFixed(6);
        html += `<div><span class="label">GPS:</span>${lat}, ${lng}</div>`;
      }

      if (exif.artist) {
        html += `<div><span class="label">Artist:</span>${escapeHtml(exif.artist)}</div>`;
      }

      if (exif.copyright) {
        html += `<div><span class="label">Copyright:</span>${escapeHtml(exif.copyright)}</div>`;
      }

      if (exif.software) {
        html += `<div><span class="label">Software:</span>${escapeHtml(exif.software)}</div>`;
      }
    }

    html += `<div><span class="label">Modified:</span>${formatDate(data.modified)}</div>`;

    this.metadata.innerHTML = html;
  }

  handleKeydown(e) {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        this.next();
        break;
      case 'ArrowLeft':
        this.prev();
        break;
      case 'Escape':
        if (this.startScreen.classList.contains('hidden')) {
          this.togglePlayPause();
        }
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 's':
      case 'S':
        this.toggleShuffle();
        break;
      case 'i':
      case 'I':
        this.toggleMetadata();
        break;
    }
  }

  handleTouch(e) {
    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;

    if (touchX > screenWidth * 0.7) {
      this.next();
    } else if (touchX < screenWidth * 0.3) {
      this.prev();
    } else {
      this.togglePlayPause();
    }
  }
}

// Initialize slideshow when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Slideshow();
});
