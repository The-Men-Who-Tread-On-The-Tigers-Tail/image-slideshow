import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import sizeOf from 'image-size';
import ExifReader from 'exifreader';

// Supported image extensions
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

export function getImageFiles(folder: string): string[] {
  try {
    const files = fs.readdirSync(folder);
    return files.filter(isImageFile);
  } catch (error) {
    console.error(`Error reading folder ${folder}:`, error);
    return [];
  }
}

export interface ImageMetadata {
  filename: string;
  width: number | null;
  height: number | null;
  size: number;
  modified: string;
  type: string | null;
  exif?: {
    camera?: string;
    lens?: string;
    dateTaken?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    focalLength?: string;
    flash?: string;
    gps?: {
      latitude: number;
      longitude: number;
    };
    software?: string;
    artist?: string;
    copyright?: string;
  };
}

export function getImageMetadata(filepath: string, filename: string): ImageMetadata | null {
  try {
    const stats = fs.statSync(filepath);
    const buffer = fs.readFileSync(filepath);

    let width: number | null = null;
    let height: number | null = null;
    let type: string | null = null;

    try {
      const dimensions = sizeOf(buffer);
      width = dimensions.width || null;
      height = dimensions.height || null;
      type = dimensions.type || null;
    } catch {
      // Dimensions not available for this image type
    }

    // Extract EXIF data
    let exif: ImageMetadata['exif'] = undefined;
    try {
      const tags = ExifReader.load(buffer, { expanded: true });

      const exifData: ImageMetadata['exif'] = {};

      // Camera info
      const make = tags.exif?.Make?.description;
      const model = tags.exif?.Model?.description;
      if (make || model) {
        exifData.camera = [make, model].filter(Boolean).join(' ');
      }

      // Lens info
      const lens = tags.exif?.LensModel?.description;
      if (lens) {
        exifData.lens = lens;
      }

      // Date taken
      const dateTaken = tags.exif?.DateTimeOriginal?.description ||
                        tags.exif?.DateTime?.description;
      if (dateTaken) {
        exifData.dateTaken = dateTaken;
      }

      // Aperture
      const aperture = tags.exif?.FNumber?.description || tags.exif?.ApertureValue?.description;
      if (aperture) {
        exifData.aperture = `f/${aperture}`;
      }

      // Shutter speed
      const shutterSpeed = tags.exif?.ExposureTime?.description;
      if (shutterSpeed) {
        exifData.shutterSpeed = `${shutterSpeed}s`;
      }

      // ISO
      const iso = tags.exif?.ISOSpeedRatings?.description;
      if (iso) {
        exifData.iso = parseInt(iso, 10);
      }

      // Focal length
      const focalLength = tags.exif?.FocalLength?.description;
      if (focalLength) {
        exifData.focalLength = `${focalLength}mm`;
      }

      // Flash
      const flash = tags.exif?.Flash?.description;
      if (flash) {
        exifData.flash = flash;
      }

      // GPS
      if (tags.gps?.Latitude && tags.gps?.Longitude) {
        exifData.gps = {
          latitude: tags.gps.Latitude,
          longitude: tags.gps.Longitude,
        };
      }

      // Software
      const software = tags.exif?.Software?.description;
      if (software) {
        exifData.software = software;
      }

      // Artist
      const artist = tags.exif?.Artist?.description;
      if (artist) {
        exifData.artist = artist;
      }

      // Copyright
      const copyright = tags.exif?.Copyright?.description;
      if (copyright) {
        exifData.copyright = copyright;
      }

      // Only include exif if we found any data
      if (Object.keys(exifData).length > 0) {
        exif = exifData;
      }
    } catch {
      // EXIF not available for this image
    }

    return {
      filename,
      width,
      height,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      type,
      exif,
    };
  } catch {
    return null;
  }
}

export function createApp(imagesFolder: string) {
  const app = express();

  // Serve static files from public folder
  app.use(express.static(path.join(__dirname, '../public')));

  // API endpoint to get list of images
  app.get('/api/images', (_req: Request, res: Response) => {
    const images = getImageFiles(imagesFolder);
    res.json(images);
  });

  // Serve images from the specified folder
  app.get('/images/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filepath = path.join(imagesFolder, filename);

    // Security check: ensure the resolved path is within the images folder
    const resolvedPath = path.resolve(filepath);
    const resolvedFolder = path.resolve(imagesFolder);

    if (!resolvedPath.startsWith(resolvedFolder)) {
      res.status(403).send('Access denied');
      return;
    }

    if (fs.existsSync(filepath) && isImageFile(filename)) {
      res.sendFile(resolvedPath);
    } else {
      res.status(404).send('Image not found');
    }
  });

  // API endpoint to get image metadata
  app.get('/api/images/:filename/metadata', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filepath = path.join(imagesFolder, filename);

    // Security check: ensure the resolved path is within the images folder
    const resolvedPath = path.resolve(filepath);
    const resolvedFolder = path.resolve(imagesFolder);

    if (!resolvedPath.startsWith(resolvedFolder)) {
      res.status(403).send('Access denied');
      return;
    }

    if (!fs.existsSync(filepath) || !isImageFile(filename)) {
      res.status(404).send('Image not found');
      return;
    }

    const metadata = getImageMetadata(resolvedPath, filename);
    if (metadata) {
      res.json(metadata);
    } else {
      res.status(500).send('Failed to read metadata');
    }
  });

  return app;
}

// Only start the server if this file is run directly
if (require.main === module) {
  const PORT = 3000;
  const imagesFolder = process.argv[2] || path.join(__dirname, '../images');
  const app = createApp(imagesFolder);

  app.listen(PORT, () => {
    console.log(`Slideshow server running at http://localhost:${PORT}`);
    console.log(`Serving images from: ${path.resolve(imagesFolder)}`);

    const images = getImageFiles(imagesFolder);
    console.log(`Found ${images.length} images`);

    if (images.length === 0) {
      console.log('\nNo images found! Add images to the folder or specify a different folder:');
      console.log('  npm start /path/to/your/images');
    }
  });
}
