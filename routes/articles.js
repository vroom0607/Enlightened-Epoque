const express = require('express');
const router = express.Router();
const Article = require('../models/Article'); // Your Mongoose model for articles
const { marked } = require('marked');

// Route to list all articles (homepage)
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find().sort({ date: -1 }); // Newest first
    res.render('index', { articles, title: 'Home' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Route to get a single article by slug
router.get('/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug });
    if (!article) {
      return res.status(404).send('Article not found');
    }

    const htmlContent = marked(article.content); // Convert markdown to HTML
    res.render('article', { article, htmlContent, title: article.title });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;