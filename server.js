import express from 'express';
import { createPost } from './src/skills/createPost.js';
import { outlineContent } from './src/skills/outlineContent.js';
import { optimizeSEO } from './src/skills/optimizeSEO.js';
import { analyzeReadability } from './src/skills/analyzeReadability.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Helper to wrap skill calls and return uniform JSON responses
function skillHandler(skillFn) {
  return (req, res) => {
    try {
      const result = skillFn(req.body);
      res.json({ ok: true, data: result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  };
}

app.post('/api/create-post',        skillHandler(createPost));
app.post('/api/outline-content',    skillHandler(outlineContent));
app.post('/api/optimize-seo',       skillHandler(optimizeSEO));
app.post('/api/analyze-readability',skillHandler(analyzeReadability));

app.listen(PORT, () => {
  console.log(`Smart Blog Skills running at http://localhost:${PORT}`);
});
