import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// Get images folder from command line argument or use default
const imagesFolder = process.argv[2] || path.join(__dirname, '../images');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function getImageFiles(folder: string): string[] {
  try {
    const files = fs.readdirSync(folder);
    return files.filter(isImageFile);
  } catch (error) {
    console.error(`Error reading folder ${folder}:`, error);
    return [];
  }
}

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
