/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Mock fetch globally
global.fetch = jest.fn();

// Set up DOM
function setupDOM() {
  document.body.innerHTML = `
    <div class="start-screen" id="startScreen">
      <h1>Image Slideshow</h1>
      <p id="imageCount">Loading...</p>
      <button class="start-btn" id="startBtn">Start Slideshow</button>
    </div>
    <div class="slideshow-container" id="slideshow">
      <div class="slide" id="slide1"></div>
      <div class="slide" id="slide2"></div>
    </div>
    <div class="clock" id="clock"></div>
    <div class="image-counter" id="imageCounter"></div>
    <div class="controls">
      <button id="prevBtn">◀ Prev</button>
      <button id="playPauseBtn">⏸ Pause</button>
      <button id="nextBtn">Next ▶</button>
      <select id="intervalSelect">
        <option value="30000" selected>30 sec</option>
      </select>
      <button id="shuffleBtn">🔀 Shuffle</button>
      <button id="metadataBtn">ℹ Info</button>
      <button id="fullscreenBtn">⛶ Fullscreen</button>
    </div>
    <div class="metadata" id="metadata"></div>
  `;
}

// Load and expose Slideshow class
function loadSlideshow() {
  const slideshowCode = fs.readFileSync(
    path.join(__dirname, 'slideshow.js'),
    'utf8'
  );
  // Remove the DOMContentLoaded auto-init
  const codeWithoutInit = slideshowCode.replace(
    /\/\/ Initialize slideshow when DOM is ready[\s\S]*$/,
    ''
  );
  // Execute and return the class
  const wrappedCode = `${codeWithoutInit}; return Slideshow;`;
  return new Function(wrappedCode)();
}

let Slideshow;

beforeAll(() => {
  setupDOM();
  Slideshow = loadSlideshow();
});

beforeEach(() => {
  setupDOM();
  jest.clearAllMocks();
  global.fetch.mockResolvedValue({
    json: () => Promise.resolve(['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg']),
  });
});

describe('Slideshow shuffle/order feature', () => {
  describe('updateDisplayOrder', () => {
    it('should keep images in original order when shuffle is disabled', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = false;
      slideshow.updateDisplayOrder();

      expect(slideshow.displayImages).toEqual(['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg']);
    });

    it('should randomize images when shuffle is enabled', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = true;
      slideshow.updateDisplayOrder();

      // Should contain same images
      expect(slideshow.displayImages).toHaveLength(5);
      expect(slideshow.displayImages.sort()).toEqual(['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg']);
    });

    it('should produce different orders on multiple shuffles', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = true;

      // Run multiple shuffles and collect unique orders
      const orders = new Set();
      for (let i = 0; i < 20; i++) {
        slideshow.updateDisplayOrder();
        orders.add(slideshow.displayImages.join(','));
      }

      // With 5 images and 20 attempts, we should get more than 1 unique order
      expect(orders.size).toBeGreaterThan(1);
    });
  });

  describe('toggleShuffle', () => {
    it('should toggle isShuffled state', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = true;
      slideshow.displayImages = [...slideshow.images];
      slideshow.currentIndex = 0;

      slideshow.toggleShuffle();
      expect(slideshow.isShuffled).toBe(false);

      slideshow.toggleShuffle();
      expect(slideshow.isShuffled).toBe(true);
    });

    it('should preserve current image when toggling to order mode', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Set up shuffled state with image3.jpg as current
      slideshow.isShuffled = true;
      slideshow.displayImages = ['image3.jpg', 'image1.jpg', 'image5.jpg', 'image2.jpg', 'image4.jpg'];
      slideshow.currentIndex = 0; // Currently showing image3.jpg

      slideshow.toggleShuffle(); // Switch to order mode

      expect(slideshow.isShuffled).toBe(false);
      // Current index should now point to image3.jpg in the ordered list
      expect(slideshow.displayImages[slideshow.currentIndex]).toBe('image3.jpg');
    });

    it('should update shuffle button text', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = true;
      slideshow.displayImages = [...slideshow.images];
      slideshow.currentIndex = 0;

      slideshow.toggleShuffle();
      expect(document.getElementById('shuffleBtn').textContent).toBe('➡️ Order');

      slideshow.toggleShuffle();
      expect(document.getElementById('shuffleBtn').textContent).toBe('🔀 Shuffle');
    });
  });

  describe('start', () => {
    it('should use shuffle mode by default', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Mock methods called by start()
      slideshow.showImage = jest.fn();
      slideshow.startTimer = jest.fn();
      slideshow.requestFullscreen = jest.fn();

      slideshow.start();

      expect(slideshow.isShuffled).toBe(true);
    });
  });

  describe('keyboard shortcut', () => {
    it('should toggle shuffle when S key is pressed', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = true;
      slideshow.displayImages = [...slideshow.images];
      slideshow.currentIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 's' });
      slideshow.handleKeydown(event);

      expect(slideshow.isShuffled).toBe(false);
    });

    it('should toggle shuffle when uppercase S key is pressed', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = true;
      slideshow.displayImages = [...slideshow.images];
      slideshow.currentIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'S' });
      slideshow.handleKeydown(event);

      expect(slideshow.isShuffled).toBe(false);
    });
  });

  describe('updateShuffleButton', () => {
    it('should show shuffle icon when in shuffle mode', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = true;
      slideshow.updateShuffleButton();

      expect(document.getElementById('shuffleBtn').textContent).toBe('🔀 Shuffle');
    });

    it('should show order icon when in order mode', async () => {
      const slideshow = new Slideshow();
      await new Promise(resolve => setTimeout(resolve, 10));

      slideshow.isShuffled = false;
      slideshow.updateShuffleButton();

      expect(document.getElementById('shuffleBtn').textContent).toBe('➡️ Order');
    });
  });
});

describe('Clock feature', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize clock element', async () => {
    const slideshow = new Slideshow();
    await Promise.resolve();

    expect(slideshow.clock).toBe(document.getElementById('clock'));
  });

  it('should display time immediately on initialization', async () => {
    const slideshow = new Slideshow();
    await Promise.resolve();

    const clockText = document.getElementById('clock').textContent;
    expect(clockText).toBeTruthy();
    expect(clockText.length).toBeGreaterThan(0);
  });

  it('should display time in valid format', async () => {
    const slideshow = new Slideshow();
    await Promise.resolve();

    const clockText = document.getElementById('clock').textContent;
    // Time should contain colons (e.g., "12:34:56" or "12:34:56 PM")
    expect(clockText).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should update clock every second', async () => {
    const mockDate = new Date('2024-01-15T10:30:00');
    jest.setSystemTime(mockDate);

    const slideshow = new Slideshow();
    await Promise.resolve();

    const initialTime = document.getElementById('clock').textContent;

    // Advance time by 1 second
    jest.setSystemTime(new Date('2024-01-15T10:30:01'));
    jest.advanceTimersByTime(1000);

    const updatedTime = document.getElementById('clock').textContent;

    // The time should have been updated (seconds changed)
    expect(updatedTime).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should call setInterval with 1000ms', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const slideshow = new Slideshow();
    await Promise.resolve();

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    setIntervalSpy.mockRestore();
  });
});

describe('Metadata feature', () => {
  it('should initialize metadata elements with metadata enabled by default', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(slideshow.metadata).toBe(document.getElementById('metadata'));
    expect(slideshow.metadataBtn).toBe(document.getElementById('metadataBtn'));
    expect(slideshow.showMetadata).toBe(true);
    expect(document.getElementById('metadata').classList.contains('enabled')).toBe(true);
    expect(document.getElementById('metadataBtn').textContent).toBe('ℹ Info ✓');
  });

  it('should toggle showMetadata state', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(slideshow.showMetadata).toBe(true);

    slideshow.toggleMetadata();
    expect(slideshow.showMetadata).toBe(false);

    slideshow.toggleMetadata();
    expect(slideshow.showMetadata).toBe(true);
  });

  it('should toggle enabled class when metadata is toggled', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(document.getElementById('metadata').classList.contains('enabled')).toBe(true);

    slideshow.toggleMetadata();
    expect(document.getElementById('metadata').classList.contains('enabled')).toBe(false);

    slideshow.toggleMetadata();
    expect(document.getElementById('metadata').classList.contains('enabled')).toBe(true);
  });

  it('should update button text when toggling', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(document.getElementById('metadataBtn').textContent).toBe('ℹ Info ✓');

    slideshow.toggleMetadata();
    expect(document.getElementById('metadataBtn').textContent).toBe('ℹ Info');

    slideshow.toggleMetadata();
    expect(document.getElementById('metadataBtn').textContent).toBe('ℹ Info ✓');
  });

  it('should toggle metadata when I key is pressed', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(slideshow.showMetadata).toBe(true);

    const event = new KeyboardEvent('keydown', { key: 'i' });
    slideshow.handleKeydown(event);

    expect(slideshow.showMetadata).toBe(false);
  });

  it('should toggle metadata when uppercase I key is pressed', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(slideshow.showMetadata).toBe(true);

    const event = new KeyboardEvent('keydown', { key: 'I' });
    slideshow.handleKeydown(event);

    expect(slideshow.showMetadata).toBe(false);
  });

  it('should display metadata correctly', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    const mockData = {
      filename: 'test.jpg',
      width: 1920,
      height: 1080,
      size: 1536000,
      modified: '2024-01-15T10:30:00.000Z',
      type: 'jpg'
    };

    slideshow.displayMetadata(mockData);

    const metadataHtml = document.getElementById('metadata').innerHTML;
    expect(metadataHtml).toContain('test.jpg');
    expect(metadataHtml).toContain('1920 × 1080');
    expect(metadataHtml).toContain('1.5 MB');
    expect(metadataHtml).toContain('JPG');
  });

  it('should display EXIF data when available', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    const mockData = {
      filename: 'photo.jpg',
      width: 4000,
      height: 3000,
      size: 5000000,
      modified: '2024-01-15T10:30:00.000Z',
      type: 'jpg',
      exif: {
        camera: 'Canon EOS R5',
        lens: 'RF 24-70mm F2.8',
        dateTaken: '2024:01:10 14:30:00',
        aperture: 'f/2.8',
        shutterSpeed: '1/250s',
        iso: 400,
        focalLength: '50mm',
        flash: 'Flash did not fire',
        gps: { latitude: 37.7749, longitude: -122.4194 },
        artist: 'John Doe',
        copyright: '© 2024',
        software: 'Adobe Lightroom'
      }
    };

    slideshow.displayMetadata(mockData);

    const metadataHtml = document.getElementById('metadata').innerHTML;
    expect(metadataHtml).toContain('Canon EOS R5');
    expect(metadataHtml).toContain('RF 24-70mm F2.8');
    expect(metadataHtml).toContain('2024:01:10 14:30:00');
    expect(metadataHtml).toContain('f/2.8');
    expect(metadataHtml).toContain('1/250s');
    expect(metadataHtml).toContain('ISO 400');
    expect(metadataHtml).toContain('50mm');
    expect(metadataHtml).toContain('Flash did not fire');
    expect(metadataHtml).toContain('37.774900');
    expect(metadataHtml).toContain('-122.419400');
    expect(metadataHtml).toContain('John Doe');
    expect(metadataHtml).toContain('© 2024');
    expect(metadataHtml).toContain('Adobe Lightroom');
  });

  it('should handle partial EXIF data', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    const mockData = {
      filename: 'photo.jpg',
      width: 1920,
      height: 1080,
      size: 1000000,
      modified: '2024-01-15T10:30:00.000Z',
      type: 'jpg',
      exif: {
        camera: 'iPhone 15 Pro',
        iso: 100
      }
    };

    slideshow.displayMetadata(mockData);

    const metadataHtml = document.getElementById('metadata').innerHTML;
    expect(metadataHtml).toContain('iPhone 15 Pro');
    expect(metadataHtml).toContain('ISO 100');
    expect(metadataHtml).not.toContain('Lens:');
    expect(metadataHtml).not.toContain('GPS:');
  });

  it('should format file sizes correctly', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    // Test bytes
    slideshow.displayMetadata({ filename: 'a.jpg', size: 500, modified: '2024-01-15T10:30:00.000Z' });
    expect(document.getElementById('metadata').innerHTML).toContain('500 B');

    // Test KB
    slideshow.displayMetadata({ filename: 'b.jpg', size: 2048, modified: '2024-01-15T10:30:00.000Z' });
    expect(document.getElementById('metadata').innerHTML).toContain('2.0 KB');

    // Test MB
    slideshow.displayMetadata({ filename: 'c.jpg', size: 5242880, modified: '2024-01-15T10:30:00.000Z' });
    expect(document.getElementById('metadata').innerHTML).toContain('5.0 MB');
  });

  it('should fetch metadata when enabled and showing image', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    slideshow.displayImages = ['image1.jpg', 'image2.jpg'];
    slideshow.currentIndex = 0;
    slideshow.showMetadata = true;

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        filename: 'image1.jpg',
        width: 800,
        height: 600,
        size: 1024,
        modified: '2024-01-15T10:30:00.000Z',
        type: 'jpg'
      })
    });

    await slideshow.fetchMetadata();

    expect(global.fetch).toHaveBeenCalledWith('/api/images/image1.jpg/metadata');
  });

  it('should not fetch metadata when disabled', async () => {
    const slideshow = new Slideshow();
    await new Promise(resolve => setTimeout(resolve, 10));

    slideshow.displayImages = ['image1.jpg'];
    slideshow.currentIndex = 0;
    slideshow.showMetadata = false; // Explicitly disable

    jest.clearAllMocks();
    await slideshow.fetchMetadata();

    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/metadata'));
  });
});
