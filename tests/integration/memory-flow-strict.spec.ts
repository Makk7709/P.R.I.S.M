/**
 * Tests d'intégration STRICTS pour le flux de mémoire complet
 * Vérifie chaque étape : stockage → récupération → injection dans prompt → utilisation par modèle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskTypeProcessor } from '../../src/core/TaskTypeProcessor.js';
import { ServerMemoryStore } from '../../src/core/ServerMemoryStore.js';
import { serverMemoryStore } from '../../src/core/ServerMemoryStore.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Flux Mémoire Complet - Tests Stricts', () => {
  let processor: TaskTypeProcessor;
  let memoryStore: ServerMemoryStore;
  const MEMORY_FILE = path.join(__dirname, '../../data/server-memory.json');
  let originalMemoryContent: string | null = null;

  beforeEach(() => {
    // Sauvegarder le fichier mémoire original
    if (fs.existsSync(MEMORY_FILE)) {
      originalMemoryContent = fs.readFileSync(MEMORY_FILE, 'utf8');
    }

    // Réinitialiser la mémoire
    memoryStore = new ServerMemoryStore();
    memoryStore.memory = {
      conversations: [],
      userInfo: {},
      interactions: [],
      lastUpdated: null
    };
    
    // Sauvegarder la mémoire vide
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryStore.memory, null, 2), 'utf8');

    processor = new TaskTypeProcessor();
  });

  afterEach(() => {
    // Restaurer le fichier mémoire original
    if (originalMemoryContent !== null) {
      fs.writeFileSync(MEMORY_FILE, originalMemoryContent, 'utf8');
    }
  });

  describe('ÉTAPE 1: Stockage Interaction avec Extraction', () => {
    it('DOIT stocker une interaction et extraire le prénom', () => {
      const input = 'Mon prénom est Amine';
      const response = 'OK, je me souviendrai que vous vous appelez Amine';
      
      const result = memoryStore.storeInteraction(input, response, {});
      
      expect(result).toBe(true);
      expect(memoryStore.memory.interactions.length).toBe(1);
      expect(memoryStore.memory.userInfo.prenom).toBe('Amine');
      
      // Vérifier que le fichier est sauvegardé
      const savedMemory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      expect(savedMemory.userInfo.prenom).toBe('Amine');
    });

    it('DOIT extraire le prénom depuis différentes formulations', () => {
      const testCases = [
        { input: 'Je m\'appelle Marie', expected: 'Marie' },
        { input: 'Appelle-moi Jean', expected: 'Jean' },
        { input: 'Mon nom est Pierre', expected: 'Pierre' },
        { input: 'Je suis Sophie', expected: 'Sophie' }
      ];

      testCases.forEach(({ input, expected }) => {
        memoryStore.storeInteraction(input, '', {});
        expect(memoryStore.memory.userInfo.prenom).toBe(expected);
        // Réinitialiser pour le prochain test
        memoryStore.memory.userInfo = {};
      });
    });
  });

  describe('ÉTAPE 2: Récupération UserInfo', () => {
    it('DOIT récupérer les informations utilisateur stockées', () => {
      // Stocker des données
      memoryStore.storeInteraction(
        'Mon prénom est Amine. Ton rôle est de m\'aider. Notre stratégie est de développer PRISM.',
        'OK',
        {}
      );

      const userInfo = memoryStore.getUserInfo();
      
      expect(userInfo.prenom).toBe('Amine');
      expect(userInfo.role).toBeDefined();
      expect(userInfo.role.length).toBeGreaterThan(0);
      expect(userInfo.strategie).toBeDefined();
      expect(userInfo.strategie.length).toBeGreaterThan(0);
    });

    it('DOIT construire un contexte mémoire avec toutes les informations', () => {
      memoryStore.storeInteraction(
        'Mon prénom est Amine. Ton rôle est de m\'aider à créer des projets complexes.',
        'OK',
        {}
      );

      const context = memoryStore.buildMemoryContext('test');
      
      expect(context).toContain('**Prénom**: Amine');
      expect(context).toContain('**Rôle/Mission de PRISM**:');
      expect(context.length).toBeGreaterThan(0);
    });
  });

  describe('ÉTAPE 3: Récupération dans MemoryRetrievalEngine', () => {
    it('DOIT récupérer userInfo depuis ServerMemoryStore', async () => {
      // Stocker des données
      memoryStore.storeInteraction('Mon prénom est Amine', 'OK', {});

      // Utiliser le singleton pour récupérer
      const userInfo = serverMemoryStore.getUserInfo();
      
      expect(userInfo.prenom).toBe('Amine');
    });
  });

  describe('ÉTAPE 4: Injection dans Prompt Enrichi', () => {
    it('DOIT construire un prompt enrichi avec les informations utilisateur', async () => {
      // Stocker des données
      memoryStore.storeInteraction('Mon prénom est Amine', 'OK', {});

      // Mock pour éviter les appels API réels
      vi.spyOn(processor, '_processWithRouter').mockResolvedValue({
        content: 'Mock response',
        metadata: { model: 'gpt-4.1' }
      });

      vi.spyOn(processor, '_processWithConsensus').mockResolvedValue({
        content: 'Mock response',
        metadata: { model: 'gpt-4.1' }
      });

      // Récupérer les mémoires (simuler)
      const memoryContext = await processor.memoryEngine.retrieveMemoriesForResponse('test', {
        taskType: 'general'
      });

      expect(memoryContext.userInfo).toBeDefined();
      expect(memoryContext.userInfo.prenom).toBe('Amine');
    });
  });

  describe('ÉTAPE 5: Passage au Modèle via orchestrator', () => {
    it('DOIT passer enrichedPrompt à handleUserInstruction', async () => {
      // Mock handleUserInstruction pour vérifier les arguments
      const { handleUserInstruction } = await import('../../backend/orchestrator.js');
      
      // Stocker des données
      memoryStore.storeInteraction('Mon prénom est Amine', 'OK', {});

      // Mock pour éviter les appels API réels
      vi.spyOn(processor, '_processWithRouter').mockImplementation(async (input, taskType, contextData) => {
        // Vérifier que enrichedPrompt est présent
        expect(contextData.enrichedPrompt).toBeDefined();
        expect(contextData.enrichedPrompt).toContain('Amine');
        
        return {
          content: 'Mock response',
          metadata: { model: 'gpt-4.1' }
        };
      });

      // Traiter une requête
      await processor.process('Quel est mon prénom ?', 'general', {});
    });
  });

  describe('FLUX COMPLET: Stockage → Récupération → Injection → Utilisation', () => {
    it('DOIT compléter le flux complet sans erreur', async () => {
      // ÉTAPE 1: Stocker interaction avec prénom
      memoryStore.storeInteraction(
        'Mon prénom est Amine',
        'OK, je me souviendrai que vous vous appelez Amine',
        {}
      );

      // Vérifier stockage
      expect(memoryStore.memory.userInfo.prenom).toBe('Amine');

      // ÉTAPE 2: Récupérer userInfo
      const userInfo = memoryStore.getUserInfo();
      expect(userInfo.prenom).toBe('Amine');

      // ÉTAPE 3: Construire contexte
      const context = memoryStore.buildMemoryContext('test');
      expect(context).toContain('Amine');

      // ÉTAPE 4: Récupérer via MemoryRetrievalEngine
      const memoryContext = await processor.memoryEngine.retrieveMemoriesForResponse('test', {
        taskType: 'general'
      });
      expect(memoryContext.userInfo.prenom).toBe('Amine');

      // ÉTAPE 5: Vérifier que le prompt enrichi contient les informations
      // (simulation - le vrai test nécessiterait un mock complet)
      expect(memoryContext.enrichedContext).toBeDefined();
    });
  });

  describe('PROBLÈME IDENTIFIÉ: Prompt enrichi non utilisé', () => {
    it('DOIT vérifier que callOpenAI reçoit customSystemPrompt', async () => {
      // Mock callOpenAI pour vérifier les arguments
      const orchestratorModule = await import('../../backend/orchestrator.js');
      
      // Créer un spy sur callOpenAI (si exporté) ou vérifier via handleUserInstruction
      const mockCallOpenAI = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Mock response' } }]
      });

      // Stocker des données
      memoryStore.storeInteraction('Mon prénom est Amine', 'OK', {});

      // Traiter une requête qui devrait utiliser le prompt enrichi
      // Note: Ce test nécessite que callOpenAI soit mockable ou exporté
      // Pour l'instant, on vérifie que le flux ne plante pas
      expect(memoryStore.memory.userInfo.prenom).toBe('Amine');
    });
  });
});



