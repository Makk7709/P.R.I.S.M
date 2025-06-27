import request from 'supertest';
import express from 'express';

describe('API Chat Route - Test Simple Phase Red', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Route temporaire pour les tests - elle n'existe pas encore dans simple-dashboard.js
    // C'est normal que ça échoue (phase Red du TDD)
  });

  test('Phase Red: La route /api/chat n\'existe pas encore', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello PRISM' });

    // Ce test doit échouer car la route n'existe pas encore
    expect(response.status).toBe(404);
  });

  test('Vérification que Express fonctionne', async () => {
    // Test de base pour s'assurer que notre setup de test fonctionne
    app.get('/test', (req, res) => {
      res.json({ status: 'ok' });
    });

    const response = await request(app)
      .get('/test');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
}); 