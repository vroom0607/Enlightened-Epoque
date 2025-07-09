const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const { marked } = require('marked');

// List all articles or filter by category
router.get('/', async (req, res) => {
  const { category } = req.query;

  const filter = category
    ? { category: new RegExp('^' + category + '$', 'i') }
    : {};

  try {
    const articles = await Article.find(filter).sort({ date: -1 });

    if (category) {
      res.render('category', {
        title: `Category: ${category}`,
        articles,
      });
    } else {
      res.render('index', {
        title: 'Home',
        articles,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Show a single article by slug
router.get('/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug });

    if (!article) {
      return res.status(404).send('Article not found');
    }

    const fs = require('fs').promises;
    const path = require('path');
    const matter = require('gray-matter');

    const filePath = path.join(__dirname, '../articles', article.markdownPath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { content } = matter(fileContent);
    const htmlContent = marked(content);

    res.render('article', {
      article,
      content: htmlContent,
      title: article.title,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;