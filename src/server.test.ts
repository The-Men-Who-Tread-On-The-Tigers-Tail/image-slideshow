import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createApp, isImageFile, getImageFiles, getImageMetadata, IMAGE_EXTENSIONS } from './server';

describe('isImageFile', () => {
  it('should return true for supported image extensions', () => {
    expect(isImageFile('photo.jpg')).toBe(true);
    expect(isImageFile('photo.jpeg')).toBe(true);
    expect(isImageFile('photo.png')).toBe(true);
    expect(isImageFile('photo.gif')).toBe(true);
    expect(isImageFile('photo.webp')).toBe(true);
    expect(isImageFile('photo.bmp')).toBe(true);
    expect(isImageFile('photo.svg')).toBe(true);
  });

  it('should return true for uppercase extensions', () => {
    expect(isImageFile('photo.JPG')).toBe(true);
    expect(isImageFile('photo.PNG')).toBe(true);
    expect(isImageFile('photo.GIF')).toBe(true);
  });

  it('should return false for non-image files', () => {
    expect(isImageFile('document.pdf')).toBe(false);
    expect(isImageFile('script.js')).toBe(false);
    expect(isImageFile('data.json')).toBe(false);
    expect(isImageFile('readme.txt')).toBe(false);
    expect(isImageFile('noextension')).toBe(false);
  });
});

describe('getImageFiles', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideshow-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should return only image files from a directory', () => {
    fs.writeFileSync(path.join(testDir, 'image1.jpg'), '');
    fs.writeFileSync(path.join(testDir, 'image2.png'), '');
    fs.writeFileSync(path.join(testDir, 'document.pdf'), '');
    fs.writeFileSync(path.join(testDir, 'readme.txt'), '');

    const images = getImageFiles(testDir);
    expect(images).toHaveLength(2);
    expect(images).toContain('image1.jpg');
    expect(images).toContain('image2.png');
    expect(images).not.toContain('document.pdf');
    expect(images).not.toContain('readme.txt');
  });

  it('should return empty array for non-existent directory', () => {
    const images = getImageFiles('/non/existent/path');
    expect(images).toEqual([]);
  });

  it('should return empty array for empty directory', () => {
    const images = getImageFiles(testDir);
    expect(images).toEqual([]);
  });

  it('should find images in subdirectories recursively', () => {
    // Create nested directory structure
    const subdir1 = path.join(testDir, 'subdir1');
    const subdir2 = path.join(testDir, 'subdir1', 'subdir2');
    fs.mkdirSync(subdir1);
    fs.mkdirSync(subdir2);

    fs.writeFileSync(path.join(testDir, 'root.jpg'), '');
    fs.writeFileSync(path.join(subdir1, 'level1.png'), '');
    fs.writeFileSync(path.join(subdir2, 'level2.gif'), '');
    fs.writeFileSync(path.join(subdir1, 'document.pdf'), '');

    const images = getImageFiles(testDir);
    expect(images).toHaveLength(3);
    expect(images).toContain('root.jpg');
    expect(images).toContain('subdir1/level1.png');
    expect(images).toContain('subdir1/subdir2/level2.gif');
    expect(images).not.toContain('subdir1/document.pdf');
  });

  it('should handle empty subdirectories', () => {
    const emptySubdir = path.join(testDir, 'empty');
    fs.mkdirSync(emptySubdir);
    fs.writeFileSync(path.join(testDir, 'image.jpg'), '');

    const images = getImageFiles(testDir);
    expect(images).toHaveLength(1);
    expect(images).toContain('image.jpg');
  });
});

describe('IMAGE_EXTENSIONS', () => {
  it('should contain all expected image extensions', () => {
    expect(IMAGE_EXTENSIONS).toContain('.jpg');
    expect(IMAGE_EXTENSIONS).toContain('.jpeg');
    expect(IMAGE_EXTENSIONS).toContain('.png');
    expect(IMAGE_EXTENSIONS).toContain('.gif');
    expect(IMAGE_EXTENSIONS).toContain('.webp');
    expect(IMAGE_EXTENSIONS).toContain('.bmp');
    expect(IMAGE_EXTENSIONS).toContain('.svg');
  });
});

describe('API endpoints', () => {
  let testDir: string;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideshow-test-'));
    app = createApp(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('GET /api/images', () => {
    it('should return empty array when no images exist', async () => {
      const response = await request(app).get('/api/images');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return list of image filenames', async () => {
      fs.writeFileSync(path.join(testDir, 'photo1.jpg'), 'fake image data');
      fs.writeFileSync(path.join(testDir, 'photo2.png'), 'fake image data');

      const response = await request(app).get('/api/images');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toContain('photo1.jpg');
      expect(response.body).toContain('photo2.png');
    });

    it('should not include non-image files', async () => {
      fs.writeFileSync(path.join(testDir, 'photo.jpg'), 'fake image data');
      fs.writeFileSync(path.join(testDir, 'readme.txt'), 'text content');

      const response = await request(app).get('/api/images');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(['photo.jpg']);
    });

    it('should return images from subdirectories with relative paths', async () => {
      const subdir = path.join(testDir, 'vacation');
      fs.mkdirSync(subdir);
      fs.writeFileSync(path.join(testDir, 'root.jpg'), 'fake image data');
      fs.writeFileSync(path.join(subdir, 'beach.png'), 'fake image data');

      const response = await request(app).get('/api/images');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toContain('root.jpg');
      expect(response.body).toContain('vacation/beach.png');
    });
  });

  describe('GET /images/:filename', () => {
    it('should serve an existing image file', async () => {
      const imageContent = Buffer.from('fake image binary data');
      fs.writeFileSync(path.join(testDir, 'test.jpg'), imageContent);

      const response = await request(app)
        .get('/images/test.jpg')
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(imageContent);
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app).get('/images/nonexistent.jpg');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Image not found');
    });

    it('should return 404 for non-image files', async () => {
      fs.writeFileSync(path.join(testDir, 'secret.txt'), 'secret data');

      const response = await request(app).get('/images/secret.txt');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Image not found');
    });

    it('should block path traversal attempts with encoded slashes', async () => {
      const response = await request(app).get('/images/..%2F..%2F..%2Fetc%2Fpasswd');
      expect(response.status).toBe(403);
      expect(response.text).toBe('Access denied');
    });

    it('should block path traversal with parent directory in filename', async () => {
      // Test encoded traversal that resolves outside the images folder
      const response = await request(app).get('/images/subdir%2F..%2F..%2Fsecret.jpg');
      expect(response.status).toBe(403);
      expect(response.text).toBe('Access denied');
    });

    it('should serve images from subdirectories', async () => {
      const subdir = path.join(testDir, 'photos');
      fs.mkdirSync(subdir);
      const imageContent = Buffer.from('subdirectory image data');
      fs.writeFileSync(path.join(subdir, 'nested.jpg'), imageContent);

      const response = await request(app)
        .get('/images/photos/nested.jpg')
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(imageContent);
    });

    it('should serve images from deeply nested subdirectories', async () => {
      const deepDir = path.join(testDir, 'a', 'b', 'c');
      fs.mkdirSync(deepDir, { recursive: true });
      const imageContent = Buffer.from('deep image data');
      fs.writeFileSync(path.join(deepDir, 'deep.png'), imageContent);

      const response = await request(app)
        .get('/images/a/b/c/deep.png')
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(imageContent);
    });
  });

  describe('GET /api/images/:filename/metadata', () => {
    it('should return metadata for an existing image', async () => {
      // Create a minimal valid PNG file (1x1 pixel)
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08, 0x02, // bit depth: 8, color type: 2 (RGB)
        0x00, 0x00, 0x00, // compression, filter, interlace
        0x90, 0x77, 0x53, 0xde, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4e, 0x44, // IEND
        0xae, 0x42, 0x60, 0x82  // CRC
      ]);
      fs.writeFileSync(path.join(testDir, 'test.png'), pngHeader);

      const response = await request(app).get('/api/images/test.png/metadata');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('filename', 'test.png');
      expect(response.body).toHaveProperty('width', 1);
      expect(response.body).toHaveProperty('height', 1);
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('modified');
      expect(response.body).toHaveProperty('type', 'png');
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app).get('/api/images/nonexistent.jpg/metadata');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Image not found');
    });

    it('should return 404 for non-image files', async () => {
      fs.writeFileSync(path.join(testDir, 'secret.txt'), 'secret data');

      const response = await request(app).get('/api/images/secret.txt/metadata');
      expect(response.status).toBe(404);
      expect(response.text).toBe('Image not found');
    });

    it('should block path traversal attempts', async () => {
      const response = await request(app).get('/api/images/..%2F..%2Fetc%2Fpasswd/metadata');
      expect(response.status).toBe(403);
      expect(response.text).toBe('Access denied');
    });

    it('should return metadata for images in subdirectories', async () => {
      const subdir = path.join(testDir, 'album');
      fs.mkdirSync(subdir);
      // Create a minimal valid PNG file (1x1 pixel)
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
        0x08, 0x02,
        0x00, 0x00, 0x00,
        0x90, 0x77, 0x53, 0xde,
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44,
        0xae, 0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(path.join(subdir, 'photo.png'), pngHeader);

      const response = await request(app).get('/api/images/album/photo.png/metadata');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('filename', 'album/photo.png');
      expect(response.body).toHaveProperty('width', 1);
      expect(response.body).toHaveProperty('height', 1);
    });
  });
});

describe('getImageMetadata', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should return metadata for a valid image', () => {
    // Create a minimal valid PNG file
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, // width: 16
      0x00, 0x00, 0x00, 0x10, // height: 16
      0x08, 0x02,
      0x00, 0x00, 0x00,
      0x90, 0x91, 0x68, 0x36,
      0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82
    ]);
    const filepath = path.join(testDir, 'test.png');
    fs.writeFileSync(filepath, pngHeader);

    const metadata = getImageMetadata(filepath, 'test.png');

    expect(metadata).not.toBeNull();
    expect(metadata!.filename).toBe('test.png');
    expect(metadata!.width).toBe(16);
    expect(metadata!.height).toBe(16);
    expect(metadata!.size).toBeGreaterThan(0);
    expect(metadata!.modified).toBeDefined();
    expect(metadata!.type).toBe('png');
  });

  it('should return null for non-existent file', () => {
    const metadata = getImageMetadata('/non/existent/path.jpg', 'path.jpg');
    expect(metadata).toBeNull();
  });

  it('should return metadata with null dimensions for unsupported format', () => {
    const filepath = path.join(testDir, 'fake.jpg');
    fs.writeFileSync(filepath, 'not a real image');

    const metadata = getImageMetadata(filepath, 'fake.jpg');

    expect(metadata).not.toBeNull();
    expect(metadata!.filename).toBe('fake.jpg');
    expect(metadata!.width).toBeNull();
    expect(metadata!.height).toBeNull();
    expect(metadata!.size).toBeGreaterThan(0);
  });
});
