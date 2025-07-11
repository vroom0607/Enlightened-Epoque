const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  category: { type: String },
  tags: [{ type: String }],
  slug: { type: String, required: true, unique: true },
  markdownPath: { type: String, required: true },  
  content: { type: String }
});

module.exports = mongoose.model('Article', articleSchema);