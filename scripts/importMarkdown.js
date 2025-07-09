require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const matter = require('gray-matter');  // Import gray-matter
const Article = require('../models/Article'); // Adjust if needed

const articlesDir = path.join(__dirname, '../articles');

async function importMarkdownFiles() {
  try {
    const files = fs.readdirSync(articlesDir);

    for (const file of files) {
      if (path.extname(file) === '.md') {
        const filePath = path.join(articlesDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Parse frontmatter with gray-matter
        const { data, content } = matter(fileContent);
        // console.log(`Description for ${file}:`, data.description);
        
        // Required fields fallback:
        //const slug = path.basename(file, '.md');
        const slug = data.slug || path.basename(file, '.md');
        const title = data.title || slug.replace(/-/g, ' ');
        const date = data.date ? new Date(data.date) : new Date();
        const description = data.description || '';
        const markdownPath = file;
        const category = data.category;

        const articleData = {
          title,
          slug,
          date,
          category,
          description,
          content,
          markdownPath,
        };

        await Article.findOneAndUpdate(
          { slug }, 
          {
            title,
            slug,
            date,
            description,
            category,
            markdownPath,
          },
          { upsert: true }
        );

        console.log(`Imported: ${file}`);
      }
    }

    console.log('All markdown files imported!');
  } catch (err) {
    console.error('Error importing markdown files:', err);
  }
}

module.exports = importMarkdownFiles;