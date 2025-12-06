class Slideshow {
  constructor() {
    this.images = [];
    this.displayImages = [];
    this.currentIndex = 0;
    this.interval = 5000;
    this.timer = null;
    this.isPlaying = true;
    this.isShuffled = true;
    this.activeSlide = 1;
    this.cursorTimeout = null;

    this.initElements();
    this.bindEvents();
    this.loadImages();
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
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.intervalSelect.addEventListener('change', (e) => this.changeInterval(e.target.value));
    this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
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
    }, 3000);
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
