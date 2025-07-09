require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { marked } = require('marked');
const Article = require('./models/Article');
const articlesRouter = require('./routes/articles');
const matter = require('gray-matter');
const importMarkdownFiles = require('./scripts/importMarkdown');
const Grid = require('gridfs-stream');
const multer = require('multer');
const mongooseGridFSBucket = require('mongoose').mongo.GridFSBucket;
const sharp = require('sharp');

let gridfsBucket;

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const ejsMate = require('ejs-mate');

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
  try {
    const categories = await Article.distinct('category');
    res.locals.categories = categories.filter(Boolean).sort();
    next();
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.locals.categories = [];
    next();
  }
});

// Route: Home page - list all articles
app.get('/', async (req, res) => {
  try {
    const articles = await Article.find({})
      .sort({ date: -1 })  
      .limit(5);

    res.render('index', { title: 'Home', articles });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About' });
});

app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact' });
});

app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('Upload route hit');

  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize({ width: 350, withoutEnlargement: true })
      .jpeg({ quality: 100 }) 
      .toBuffer();

    const writeStream = gridfsBucket.openUploadStream(req.file.originalname, {
      contentType: 'image/jpeg', 
    });

    const fileId = writeStream.id;

    writeStream.end(processedImageBuffer);

    writeStream.on('finish', () => {
      res.json({
        fileId: fileId.toString(),
        fileName: req.file.originalname,
      });
    });

    writeStream.on('error', (err) => {
      console.error('Error writing to GridFS:', err);
      res.status(500).send(err.message);
    });
  } catch (err) {
    console.error('Image processing failed:', err);
    res.status(500).send('Error processing image');
  }
});

app.get('/images/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const files = await gridfsBucket.find({ _id: fileId }).toArray();

    if (!files || files.length === 0) {
      return res.status(404).send('File not found');
    }

    const file = files[0];
    res.set('Content-Type', file.contentType);

    const readStream = gridfsBucket.openDownloadStream(fileId);
    readStream.pipe(res);
  } catch (err) {
    res.status(400).send('Invalid file ID');
  }
});

app.use('/articles', articlesRouter);

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    gridfsBucket = new mongooseGridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    console.log('GridFSBucket initialized');

    await importMarkdownFiles();
    console.log('Markdown files imported');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error);
  }
}

start();