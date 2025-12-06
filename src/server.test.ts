import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createApp, isImageFile, getImageFiles, IMAGE_EXTENSIONS } from './server';

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
  });
});
