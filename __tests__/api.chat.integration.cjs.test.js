const request = require('supertest');

describe('API Chat Route - Tests d\'Intégration Réels', () => {
  let app;

  beforeAll(async () => {
    // Importer l'app réelle (attention: cela va démarrer le serveur)
    // Pour les tests, nous devons mocker l'orchestrateur
    jest.mock('../backend/orchestrator.js', () => ({
      handleUserInstruction: jest.fn()
    }));
    
    // Importer l'app après le mock
    const appModule = await import('../simple-dashboard.js');
    app = appModule.default;
  });

  afterAll(() => {
    // Nettoyer les mocks
    jest.clearAllMocks();
  });

  describe('Tests de la route /api/chat réelle', () => {
    test('La route /api/chat existe maintenant', async () => {
      // Mock de l'orchestrateur pour ce test
      const { handleUserInstruction } = require('../backend/orchestrator.js');
      handleUserInstruction.mockResolvedValue({
        choices: [{ message: { content: 'Test response from orchestrator' } }]
      });

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello PRISM' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });

    test('Validation des paramètres fonctionne', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Message is required');
      expect(response.body.code).toBe('MISSING_MESSAGE');
    });

    test('Gestion des erreurs de l\'orchestrateur', async () => {
      const { handleUserInstruction } = require('../backend/orchestrator.js');
      handleUserInstruction.mockRejectedValue(new Error('Orchestrator test error'));

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test error' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Orchestrator test error');
      expect(response.body.code).toBe('PROCESSING_ERROR');
    });

    test('Métadonnées de réponse complètes', async () => {
      const { handleUserInstruction } = require('../backend/orchestrator.js');
      handleUserInstruction.mockResolvedValue({
        choices: [{ message: { content: 'Metadata test' } }]
      });

      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Test metadata',
          taskType: 'analysis',
          model: 'claude'
        });

      expect(response.status).toBe(200);
      expect(response.body.metadata).toMatchObject({
        taskType: 'analysis',
        model: 'claude',
        timestamp: expect.any(String),
        processingTime: expect.any(Number)
      });

      // Vérifier que le timestamp est valide
      const timestamp = new Date(response.body.metadata.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
}); 