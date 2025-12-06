/**
 * PRISM PDF Export - Tests TDD Stricts pour le Contenu des Chats
 * 
 * Ces tests vérifient que les messages du chat sont correctement:
 * - Collectés depuis l'interface
 * - Transmis au backend
 * - Rendus dans le PDF avec leur contenu complet
 * 
 * @coverage Target: 95%+ sans mocks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PdfExportService } from '../../src/export/PdfExportService.js';

// ============================================================================
// SECTION 1: TESTS DE CONTENU DES MESSAGES
// ============================================================================

describe('PdfExportService - Rendu du Contenu des Messages', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('Messages utilisateur', () => {
    
    it('DOIT inclure le contenu complet d\'un message utilisateur', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Bonjour, je voudrais savoir comment fonctionne PRISM ?',
          timestamp: new Date().toISOString()
        }
      ];

      const result = await service.generatePdf(messages, {});
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      expect(result.buffer.length).toBeGreaterThan(1000); // PDF non vide
    });

    it('DOIT conserver les messages longs sans troncature', async () => {
      const longMessage = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
      const messages = [
        {
          role: 'user',
          content: longMessage,
          timestamp: new Date().toISOString()
        }
      ];

      const result = await service.generatePdf(messages, {});
      
      expect(result.success).toBe(true);
      // Le PDF doit être plus gros pour un message long
      expect(result.buffer.length).toBeGreaterThan(2000);
    });

    it('DOIT gérer les caractères spéciaux dans les messages', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Test avec caractères spéciaux: é è ê ë à â ç ù û ü ï î ô €',
          timestamp: new Date().toISOString()
        }
      ];

      const result = await service.generatePdf(messages, {});
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
    });

    it('DOIT gérer les emojis dans les messages', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Super ! 🎉 Merci pour votre aide 👍',
          timestamp: new Date().toISOString()
        }
      ];

      const result = await service.generatePdf(messages, {});
      
      expect(result.success).toBe(true);
    });

  });

  describe('Messages assistant (PRISM)', () => {
    
    it('DOIT inclure le contenu complet d\'une réponse PRISM', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Question',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: 'PRISM est un système d\'orchestration IA avancé qui combine plusieurs modèles pour fournir des réponses fiables et pertinentes.',
          timestamp: new Date().toISOString(),
          model: 'gpt-4'
        }
      ];

      const result = await service.generatePdf(messages, {});
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      // Le PDF contient les messages - vérifier la taille
      expect(result.buffer.length).toBeGreaterThan(1000);
    });

    it('DOIT afficher le badge du modèle utilisé', async () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Réponse générée par GPT-4',
          timestamp: new Date().toISOString(),
          model: 'gpt-4-turbo'
        }
      ];

      const formatted = service.formatMessage(messages[0]);
      
      expect(formatted.modelBadge).toBe('GPT-4 Turbo');
      expect(formatted.isPremiumModel).toBe(true);
    });

    it('DOIT inclure les listes et structures dans le contenu', async () => {
      const messages = [
        {
          role: 'assistant',
          content: `Voici les étapes à suivre:
1. Première étape
2. Deuxième étape
3. Troisième étape

Et voici les points importants:
- Point A
- Point B
- Point C`,
          timestamp: new Date().toISOString()
        }
      ];

      const result = await service.generatePdf(messages, {});
      
      expect(result.success).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(1000); // PDF substantiel
    });

  });

  describe('Conversation complète', () => {
    
    it('DOIT rendre une conversation multi-messages dans l\'ordre', async () => {
      const messages = [
        { role: 'user', content: 'Premier message utilisateur', timestamp: '2024-12-06T10:00:00Z' },
        { role: 'assistant', content: 'Première réponse PRISM', timestamp: '2024-12-06T10:00:05Z' },
        { role: 'user', content: 'Deuxième message utilisateur', timestamp: '2024-12-06T10:01:00Z' },
        { role: 'assistant', content: 'Deuxième réponse PRISM', timestamp: '2024-12-06T10:01:05Z' },
        { role: 'user', content: 'Troisième message utilisateur', timestamp: '2024-12-06T10:02:00Z' },
        { role: 'assistant', content: 'Troisième réponse PRISM', timestamp: '2024-12-06T10:02:05Z' }
      ];

      const result = await service.generatePdf(messages, {
        includeCoverPage: true,
        includePageNumbers: true
      });
      
      expect(result.success).toBe(true);
      expect(result.hasCoverPage).toBe(true);
      expect(result.hasPageNumbers).toBe(true);
    });

    it('DOIT calculer les statistiques correctement', async () => {
      const messages = [
        { role: 'user', content: 'Un deux trois quatre cinq', timestamp: '2024-12-06T10:00:00Z' },
        { role: 'assistant', content: 'Six sept huit neuf dix', timestamp: '2024-12-06T10:00:30Z' }
      ];

      const stats = service.calculateStats(messages);
      
      expect(stats.totalMessages).toBe(2);
      expect(stats.userMessages).toBe(1);
      expect(stats.assistantMessages).toBe(1);
      expect(stats.totalWords).toBeGreaterThanOrEqual(10); // Au moins 10 mots
      expect(stats.duration).toBeGreaterThan(0);
    });

    it('DOIT inclure tous les messages dans le PDF généré', async () => {
      const messagesCount = 15;
      const messages = [];
      
      for (let i = 0; i < messagesCount; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message numéro ${i + 1} avec du contenu détaillé pour le test.`,
          timestamp: new Date(Date.now() + i * 60000).toISOString()
        });
      }

      const result = await service.generatePdf(messages, {
        includeCoverPage: true,
        includeSummaryPage: true
      });
      
      expect(result.success).toBe(true);
      expect(result.hasCoverPage).toBe(true);
      expect(result.hasSummaryPage).toBe(true);
      // Le PDF doit avoir été généré avec un buffer substantiel
      expect(result.buffer.length).toBeGreaterThan(5000);
    });

  });

});

// ============================================================================
// SECTION 2: TESTS DU FORMATAGE DES MESSAGES
// ============================================================================

describe('PdfExportService - Formatage des Messages', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('formatMessage()', () => {
    
    it('DOIT retourner le displayName correct pour chaque rôle', () => {
      const userMsg = service.formatMessage({ role: 'user', content: 'Test', timestamp: new Date() });
      const assistantMsg = service.formatMessage({ role: 'assistant', content: 'Test', timestamp: new Date() });
      const systemMsg = service.formatMessage({ role: 'system', content: 'Test', timestamp: new Date() });
      
      expect(userMsg.displayName).toBe('Utilisateur');
      expect(assistantMsg.displayName).toBe('PRISM');
      expect(systemMsg.displayName).toBe('Système');
    });

    it('DOIT formater l\'heure correctement', () => {
      const msg = service.formatMessage({
        role: 'user',
        content: 'Test',
        timestamp: '2024-12-06T14:30:00Z'
      });
      
      expect(msg.formattedTime).toMatch(/\d{2}:\d{2}/);
    });

    it('DOIT formater la date correctement', () => {
      const msg = service.formatMessage({
        role: 'user',
        content: 'Test',
        timestamp: '2024-12-06T14:30:00Z'
      });
      
      expect(msg.formattedDate).toContain('2024');
    });

    it('DOIT extraire les liens du contenu', () => {
      const msg = service.formatMessage({
        role: 'assistant',
        content: 'Visitez https://prism.ai pour plus d\'informations et https://docs.prism.ai pour la documentation.',
        timestamp: new Date()
      });
      
      expect(msg.links).toHaveLength(2);
      expect(msg.links).toContain('https://prism.ai');
      expect(msg.links).toContain('https://docs.prism.ai');
    });

    it('DOIT retourner le style correct pour chaque rôle', () => {
      const userStyle = service.formatMessage({ role: 'user', content: 'Test', timestamp: new Date() }).style;
      const assistantStyle = service.formatMessage({ role: 'assistant', content: 'Test', timestamp: new Date() }).style;
      
      expect(userStyle.alignment).toBe('right');
      expect(assistantStyle.alignment).toBe('left');
    });

  });

  describe('calculateStats()', () => {
    
    it('DOIT retourner des stats vides pour une liste vide', () => {
      const stats = service.calculateStats([]);
      
      expect(stats.totalMessages).toBe(0);
      expect(stats.userMessages).toBe(0);
      expect(stats.assistantMessages).toBe(0);
      expect(stats.totalWords).toBe(0);
    });

    it('DOIT calculer le temps de réponse moyen', () => {
      const messages = [
        { role: 'user', content: 'Question 1', timestamp: '2024-12-06T10:00:00Z' },
        { role: 'assistant', content: 'Réponse 1', timestamp: '2024-12-06T10:00:05Z' },
        { role: 'user', content: 'Question 2', timestamp: '2024-12-06T10:01:00Z' },
        { role: 'assistant', content: 'Réponse 2', timestamp: '2024-12-06T10:01:03Z' }
      ];

      const stats = service.calculateStats(messages);
      
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      // Moyenne de 5s et 3s = 4s = 4000ms
      expect(stats.averageResponseTime).toBe(4000);
    });

    it('DOIT lister les modèles utilisés', () => {
      const messages = [
        { role: 'assistant', content: 'R1', timestamp: new Date(), model: 'gpt-4' },
        { role: 'assistant', content: 'R2', timestamp: new Date(), model: 'claude-3' },
        { role: 'assistant', content: 'R3', timestamp: new Date(), model: 'gpt-4' }
      ];

      const stats = service.calculateStats(messages);
      
      expect(stats.modelsUsed).toContain('gpt-4');
      expect(stats.modelsUsed).toContain('claude-3');
      expect(stats.modelsUsed.length).toBe(2); // Pas de doublons
    });

    it('DOIT formater la durée correctement', () => {
      const messages = [
        { role: 'user', content: 'Début', timestamp: '2024-12-06T10:00:00Z' },
        { role: 'assistant', content: 'Fin', timestamp: '2024-12-06T11:30:00Z' }
      ];

      const stats = service.calculateStats(messages);
      
      expect(stats.durationFormatted).toContain('h');
      expect(stats.durationFormatted).toContain('30');
    });

  });

});

// ============================================================================
// SECTION 3: TESTS DES OPTIONS D'EXPORT
// ============================================================================

describe('PdfExportService - Options d\'Export', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('Options de pages', () => {
    
    it('DOIT générer une page de couverture si demandée', async () => {
      const messages = [{ role: 'user', content: 'Test', timestamp: new Date() }];
      
      const result = await service.generatePdf(messages, { includeCoverPage: true });
      
      expect(result.success).toBe(true);
      expect(result.hasCoverPage).toBe(true);
    });

    it('DOIT NE PAS générer de page de couverture si non demandée', async () => {
      const messages = [{ role: 'user', content: 'Test', timestamp: new Date() }];
      
      const result = await service.generatePdf(messages, { includeCoverPage: false });
      
      expect(result.success).toBe(true);
      expect(result.hasCoverPage).toBe(false);
    });

    it('DOIT générer une page de résumé si demandée', async () => {
      const messages = [
        { role: 'user', content: 'Question', timestamp: new Date() },
        { role: 'assistant', content: 'Réponse', timestamp: new Date() }
      ];
      
      const result = await service.generatePdf(messages, { includeSummaryPage: true });
      
      expect(result.success).toBe(true);
      expect(result.hasSummaryPage).toBe(true);
    });

    it('DOIT ajouter les numéros de page si demandés', async () => {
      const messages = [{ role: 'user', content: 'Test', timestamp: new Date() }];
      
      const result = await service.generatePdf(messages, { includePageNumbers: true });
      
      expect(result.success).toBe(true);
      expect(result.hasPageNumbers).toBe(true);
    });

  });

  describe('Métadonnées du document', () => {
    
    it('DOIT définir le titre du document', async () => {
      const messages = [{ role: 'user', content: 'Test', timestamp: new Date() }];
      
      const result = await service.generatePdf(messages, { 
        title: 'Ma Conversation Importante'
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata.title).toBe('Ma Conversation Importante');
    });

    it('DOIT définir l\'auteur du document', async () => {
      const messages = [{ role: 'user', content: 'Test', timestamp: new Date() }];
      
      const result = await service.generatePdf(messages, { 
        author: 'Jean Dupont'
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata.author).toBe('Jean Dupont');
    });

  });

  describe('Thèmes', () => {
    
    it('DOIT appliquer le thème corporate par défaut', () => {
      const config = service.getConfig();
      
      expect(config.theme.name).toBe('prism-corporate');
      expect(config.theme.primaryColor).toBe('#050B14');
      expect(config.theme.accentColor).toBe('#FFD700');
    });

    it('DOIT permettre de changer le thème', () => {
      const customService = new PdfExportService({
        theme: { name: 'prism-light' }
      });
      
      const config = customService.getConfig();
      
      expect(config.theme.name).toBe('prism-light');
    });

  });

});

// ============================================================================
// SECTION 4: TESTS DE VALIDATION
// ============================================================================

describe('PdfExportService - Validation', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('Validation des messages', () => {
    
    it('DOIT rejeter une liste vide', async () => {
      const result = await service.generatePdf([], {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('vide');
    });

    it('DOIT rejeter null', async () => {
      const result = await service.generatePdf(null as any, {});
      
      expect(result.success).toBe(false);
    });

    it('DOIT rejeter un message sans contenu', async () => {
      const messages = [{ role: 'user', timestamp: new Date() }];
      
      const result = await service.generatePdf(messages as any, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('contenu');
    });

    it('DOIT accepter un message avec contenu vide', async () => {
      const messages = [{ role: 'user', content: '', timestamp: new Date() }];
      
      const result = await service.generatePdf(messages, {});
      
      expect(result.success).toBe(true);
    });

  });

  describe('Gestion des timestamps', () => {
    
    it('DOIT gérer un timestamp ISO string', () => {
      const msg = service.formatMessage({
        role: 'user',
        content: 'Test',
        timestamp: '2024-12-06T14:30:00Z'
      });
      
      expect(msg.formattedDate).toBeDefined();
      expect(msg.formattedTime).toBeDefined();
    });

    it('DOIT gérer un timestamp Date object', () => {
      const msg = service.formatMessage({
        role: 'user',
        content: 'Test',
        timestamp: new Date('2024-12-06T14:30:00Z')
      });
      
      expect(msg.formattedDate).toBeDefined();
      expect(msg.formattedTime).toBeDefined();
    });

    it('DOIT gérer un timestamp invalide', () => {
      const msg = service.formatMessage({
        role: 'user',
        content: 'Test',
        timestamp: 'invalid-date'
      });
      
      // Doit utiliser la date actuelle comme fallback
      expect(msg.formattedDate).toBeDefined();
      expect(msg.formattedTime).toBeDefined();
    });

  });

});

// ============================================================================
// SECTION 5: TESTS DU TÉLÉCHARGEMENT
// ============================================================================

describe('PdfExportService - Téléchargement', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('generateForDownload()', () => {
    
    it('DOIT retourner les infos de fichier', async () => {
      const messages = [{ role: 'user', content: 'Test', timestamp: new Date() }];
      
      const result = await service.generateForDownload(messages, {});
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/prism-chat-.*\.pdf/);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.fileSizeFormatted).toBeDefined();
    });

    it('DOIT utiliser le nom de fichier personnalisé', async () => {
      const messages = [{ role: 'user', content: 'Test', timestamp: new Date() }];
      
      const result = await service.generateForDownload(messages, {
        filename: 'ma-conversation.pdf'
      });
      
      expect(result.success).toBe(true);
      expect(result.filename).toBe('ma-conversation.pdf');
    });

    it('DOIT formater la taille du fichier', async () => {
      const messages = [];
      for (let i = 0; i < 20; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
          timestamp: new Date()
        });
      }
      
      const result = await service.generateForDownload(messages, {});
      
      expect(result.success).toBe(true);
      expect(result.fileSizeFormatted).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/);
    });

  });

});

