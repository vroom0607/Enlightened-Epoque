const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

let marked;

(async () => {
  const mod = await import('marked');
  marked = mod.marked;
})();

// List all articles or filter by category
router.get('/', async (req, res) => {
  const { category } = req.query;

  const filter = category
    ? { category: new RegExp('^' + category + '$', 'i') }
    : {};

  try {
    const articles = await Article.find(filter).sort({ date: -1 });

    const pageTitle = category ? `Category: ${category}` : 'All Articles';
    const heading = category || 'All Articles';

    res.render('category', {
      title: pageTitle,
      heading,
      articles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.render('search', {
      articles: [],
      query: '',
      title: 'Search',
      heading: 'Search'
    });
  }

  try {
    const results = await Article.aggregate([
      {
        $search: {
          index: 'default',
          compound: {
            should: [
              {
                text: {
                  query: q,
                  path: 'title',
                  fuzzy: { maxEdits: 1 }
                }
              },
              {
                text: {
                  query: q,
                  path: 'description',
                  fuzzy: { maxEdits: 1 }
                }
              },
              {
                text: {
                  query: q,
                  path: 'content',
                  fuzzy: { maxEdits: 1 }
                }
              },
              {
                text: {
                  query: q,
                  path: 'tags',
                  fuzzy: { maxEdits: 1 }
                }
              }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $limit: 10 }
    ]);

    res.render('search', {
      articles: results,
      query: q,
      title: `Search results for "${q}"`,
      heading: `Search results for "${q}"`
    });

  } catch (err) {
    console.error('Atlas Search Error:', err);
    res.status(500).send('Search failed');
  }
});

// Show a single article by slug
router.get('/:slug', async (req, res) => {
  try {
    if (!marked) {
      const mod = await import('marked');
      marked = mod.marked;
    }
    
    const article = await Article.findOne({ slug: req.params.slug });

    if (!article) {
      return res.status(404).send('Article not found');
    }

    const htmlContent = marked(article.content || '');

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