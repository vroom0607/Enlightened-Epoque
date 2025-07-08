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

const app = express();

const ejsMate = require('ejs-mate');

// Connect to MongoDB
//mongoose.connect(process.env.MONGO_URI)
  //.then(() => console.log('MongoDB connected'))
  //.catch(err => console.error('MongoDB connection error:', err));

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Route: Home page - list all articles
app.get('/', async (req, res) => {
  try {
    const articles = await Article.find({}).sort({ date: -1 });
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

app.use('/', articlesRouter);

// Route: Individual article
app.get('/articles/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug });
    if (!article) {
      return res.status(404).send('Article not found');
    }

    if (!article.markdownPath) {
      console.error('Error: markdownPath is undefined for article:', article.slug);
      return res.status(500).send('Article markdown path is missing');
    }

    const markdownFilePath = path.join(__dirname, 'articles', article.markdownPath);

    let markdownContent;
    try {
      markdownContent = await fs.readFile(markdownFilePath, 'utf-8');
    } catch (err) {
      console.error('Error reading markdown file:', err);
      return res.status(500).send('Error reading article content');
    }

    if (!markdownContent) {
      console.error('Markdown content is empty for file:', markdownFilePath);
      return res.status(500).send('Article content is empty');
    }

    // Parse frontmatter and content
    const { content } = matter(markdownContent);

    // Convert only markdown content (no frontmatter) to HTML
    const htmlContent = marked(content);

    res.render('article', {
      title: article.title,
      date: article.date,
      description: article.description,
      content: htmlContent,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

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