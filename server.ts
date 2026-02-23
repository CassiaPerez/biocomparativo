import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initDb, BiologicosModel, BiologicoInput } from './src/db.js';

// Initialize Database
initDb();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // POST /api/registros
  app.post('/api/registros', (req, res) => {
    try {
      const input = req.body as BiologicoInput;
      
      // Basic validation
      if (!input.Produto || input.Concentracao_por_ml_ou_g == null || input.Dose_ha_ml_ou_g == null || input["Custo_R$_por_L_ou_kg"] == null) {
         res.status(400).json({ error: 'Missing required fields' });
         return;
      }

      const record = BiologicosModel.create(input);
      res.status(201).json(record);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/registros/:id
  app.put('/api/registros/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = req.body as BiologicoInput;

      if (isNaN(id)) {
         res.status(400).json({ error: 'Invalid ID' });
         return;
      }

      // Basic validation
      if (!input.Produto || input.Concentracao_por_ml_ou_g == null || input.Dose_ha_ml_ou_g == null || input["Custo_R$_por_L_ou_kg"] == null) {
         res.status(400).json({ error: 'Missing required fields' });
         return;
      }

      const record = BiologicosModel.update(id, input);
      if (!record) {
         res.status(404).json({ error: 'Record not found' });
         return;
      }

      res.json(record);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/registros/by-produto
  app.get('/api/registros/by-produto', (req, res) => {
    try {
      const produto = req.query.Produto as string;
      if (!produto) {
         res.status(400).json({ error: 'Missing Produto query parameter' });
         return;
      }

      const record = BiologicosModel.getByProduto(produto);
      if (!record) {
         res.status(404).json({ error: 'Record not found' });
         return;
      }

      res.json(record);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/registros/:id
  app.get('/api/registros/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
         res.status(400).json({ error: 'Invalid ID' });
         return;
      }

      const record = BiologicosModel.getById(id);
      if (!record) {
         res.status(404).json({ error: 'Record not found' });
         return;
      }

      res.json(record);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/registros (Optional admin list)
  app.get('/api/registros', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const records = BiologicosModel.getAll(limit, offset);
      res.json(records);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
