/**
 * PRISM PDF Export Service - Tests TDD Complets
 * 
 * Tests écrits AVANT l'implémentation conformément à TDD strict
 * Couverture cible : >= 95%
 * Pas de mocks - Tests avec vraies dépendances
 * 
 * @author PRISM Team
 * @date 2024-12-06
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PdfExportService, PdfExportOptions, ChatMessage, ExportResult } from '../../src/export/PdfExportService.js';
import fs from 'fs';
import path from 'path';

// Répertoire temporaire pour les tests
const TEST_OUTPUT_DIR = path.join(process.cwd(), 'test-output-pdf');

// ============================================================================
// SECTION 1: INITIALISATION ET CONFIGURATION
// ============================================================================

describe('PdfExportService - Initialisation', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  afterEach(() => {
    // Nettoyer les fichiers de test
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('Configuration par Défaut', () => {
    it('DOIT initialiser avec configuration premium par défaut', () => {
      const config = service.getConfig();
      
      expect(config).toHaveProperty('theme');
      expect(config).toHaveProperty('branding');
      expect(config).toHaveProperty('layout');
    });

    it('DOIT avoir le thème PRISM Corporate par défaut', () => {
      const config = service.getConfig();
      
      expect(config.theme.name).toBe('prism-corporate');
      expect(config.theme.primaryColor).toBeDefined();
      expect(config.theme.accentColor).toBeDefined();
    });

    it('DOIT initialiser avec branding PRISM', () => {
      const config = service.getConfig();
      
      expect(config.branding.logo).toBeDefined();
      expect(config.branding.companyName).toBe('PRISM');
      expect(config.branding.tagline).toBeDefined();
    });

    it('DOIT avoir des marges par défaut professionnelles', () => {
      const config = service.getConfig();
      
      expect(config.layout.margins).toHaveProperty('top');
      expect(config.layout.margins).toHaveProperty('bottom');
      expect(config.layout.margins).toHaveProperty('left');
      expect(config.layout.margins).toHaveProperty('right');
      expect(config.layout.margins.top).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Configuration Personnalisée', () => {
    it('DOIT accepter un thème personnalisé', () => {
      const customService = new PdfExportService({
        theme: {
          name: 'custom',
          primaryColor: '#FF0000',
          accentColor: '#00FF00',
          backgroundColor: '#FFFFFF'
        }
      });
      
      const config = customService.getConfig();
      expect(config.theme.primaryColor).toBe('#FF0000');
    });

    it('DOIT accepter un branding personnalisé', () => {
      const customService = new PdfExportService({
        branding: {
          companyName: 'Custom Corp',
          tagline: 'Custom tagline'
        }
      });
      
      const config = customService.getConfig();
      expect(config.branding.companyName).toBe('Custom Corp');
    });

    it('DOIT fusionner configuration partielle avec défauts', () => {
      const customService = new PdfExportService({
        theme: { primaryColor: '#123456' }
      });
      
      const config = customService.getConfig();
      expect(config.theme.primaryColor).toBe('#123456');
      expect(config.theme.name).toBe('prism-corporate'); // Valeur par défaut conservée
    });
  });
});

// ============================================================================
// SECTION 2: FORMATAGE DES MESSAGES
// ============================================================================

describe('PdfExportService - Formatage des Messages', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('Formatage Message Utilisateur', () => {
    it('DOIT formater un message utilisateur correctement', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Bonjour PRISM',
        timestamp: new Date('2024-12-06T10:00:00')
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.role).toBe('user');
      expect(formatted.displayName).toBe('Utilisateur');
      expect(formatted.content).toBe('Bonjour PRISM');
      expect(formatted.formattedTime).toMatch(/\d{2}:\d{2}/);
    });

    it('DOIT appliquer le style utilisateur', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.style.backgroundColor).toBeDefined();
      expect(formatted.style.textColor).toBeDefined();
      expect(formatted.style.alignment).toBe('right');
    });
  });

  describe('Formatage Message PRISM', () => {
    it('DOIT formater un message PRISM correctement', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Bonjour ! Comment puis-je vous aider ?',
        timestamp: new Date('2024-12-06T10:01:00'),
        model: 'gpt-4'
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.role).toBe('assistant');
      expect(formatted.displayName).toBe('PRISM');
      expect(formatted.model).toBe('gpt-4');
      expect(formatted.style.alignment).toBe('left');
    });

    it('DOIT inclure le modèle utilisé si disponible', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Réponse',
        timestamp: new Date(),
        model: 'claude-3'
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.modelBadge).toBe('Claude-3');
    });

    it('DOIT formater le modèle GPT-4 avec badge premium', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Réponse',
        timestamp: new Date(),
        model: 'gpt-4-turbo'
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.modelBadge).toContain('GPT-4');
      expect(formatted.isPremiumModel).toBe(true);
    });
  });

  describe('Formatage Message Système', () => {
    it('DOIT formater un message système', () => {
      const message: ChatMessage = {
        role: 'system',
        content: 'Session démarrée',
        timestamp: new Date()
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.role).toBe('system');
      expect(formatted.displayName).toBe('Système');
      expect(formatted.style.isItalic).toBe(true);
    });
  });

  describe('Nettoyage du Contenu', () => {
    it('DOIT nettoyer le markdown pour le PDF', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: '**Titre** et *italique* avec `code`',
        timestamp: new Date()
      };
      
      const formatted = service.formatMessage(message);
      
      // Le markdown doit être converti en texte formaté
      expect(formatted.contentRich).toHaveProperty('segments');
      expect(formatted.contentRich.segments.length).toBeGreaterThan(0);
    });

    it('DOIT gérer les liens dans le contenu', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Visitez https://prism.ai pour plus d\'infos',
        timestamp: new Date()
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.links).toContain('https://prism.ai');
    });

    it('DOIT préserver les sauts de ligne', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Ligne 1\nLigne 2\nLigne 3',
        timestamp: new Date()
      };
      
      const formatted = service.formatMessage(message);
      
      expect(formatted.contentRich.lineCount).toBe(3);
    });

    it('DOIT gérer les émojis', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Super ! 🎉 Excellent travail ! 👍',
        timestamp: new Date()
      };
      
      const formatted = service.formatMessage(message);
      
      // Les émojis doivent être préservés ou convertis
      expect(formatted.content.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// SECTION 3: GÉNÉRATION PDF
// ============================================================================

describe('PdfExportService - Génération PDF', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('Génération de Base', () => {
    it('DOIT générer un PDF avec un seul message', async () => {
      const messages: ChatMessage[] = [{
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      }];
      
      const result = await service.generatePdf(messages, {
        outputPath: path.join(TEST_OUTPUT_DIR, 'single-message.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(fs.existsSync(result.filePath)).toBe(true);
    });

    it('DOIT générer un PDF avec conversation complète', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Bonjour', timestamp: new Date() },
        { role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider ?', timestamp: new Date(), model: 'gpt-4' },
        { role: 'user', content: 'Je voudrais de l\'aide', timestamp: new Date() },
        { role: 'assistant', content: 'Bien sûr, je suis là pour vous aider.', timestamp: new Date(), model: 'gpt-4' }
      ];
      
      const result = await service.generatePdf(messages, {
        outputPath: path.join(TEST_OUTPUT_DIR, 'conversation.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(1000);
    });

    it('DOIT retourner le buffer PDF si pas de outputPath', async () => {
      const messages: ChatMessage[] = [{
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      }];
      
      const result = await service.generatePdf(messages);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('DOIT inclure les métadonnées PDF', async () => {
      const messages: ChatMessage[] = [{
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      }];
      
      const result = await service.generatePdf(messages, {
        title: 'Ma Conversation PRISM',
        author: 'John Doe'
      });
      
      expect(result.metadata.title).toBe('Ma Conversation PRISM');
      expect(result.metadata.author).toBe('John Doe');
      expect(result.metadata.creator).toBe('PRISM Export Service');
    });
  });

  describe('Structure du Document', () => {
    it('DOIT générer une page de couverture premium', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generatePdf(messages, {
        includeCoverPage: true,
        outputPath: path.join(TEST_OUTPUT_DIR, 'with-cover.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.hasCoverPage).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(2000);
    });

    it('DOIT inclure table des matières si > 10 messages', async () => {
      const messages: ChatMessage[] = [];
      for (let i = 0; i < 15; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}`,
          timestamp: new Date(Date.now() + i * 60000)
        });
      }
      
      const result = await service.generatePdf(messages, {
        includeTableOfContents: true,
        outputPath: path.join(TEST_OUTPUT_DIR, 'with-toc.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.hasTableOfContents).toBe(true);
    });

    it('DOIT inclure numérotation des pages', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'A'.repeat(5000), timestamp: new Date() }
      ];
      
      const result = await service.generatePdf(messages, {
        includePageNumbers: true,
        outputPath: path.join(TEST_OUTPUT_DIR, 'with-pages.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.hasPageNumbers).toBe(true);
    });

    it('DOIT inclure en-tête et pied de page', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generatePdf(messages, {
        includeHeader: true,
        includeFooter: true,
        outputPath: path.join(TEST_OUTPUT_DIR, 'with-header-footer.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.hasHeader).toBe(true);
      expect(result.hasFooter).toBe(true);
    });
  });

  describe('Thèmes Premium', () => {
    it('DOIT appliquer le thème Corporate (noir/doré)', async () => {
      const service = new PdfExportService({
        theme: { name: 'prism-corporate' }
      });
      
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generatePdf(messages, {
        outputPath: path.join(TEST_OUTPUT_DIR, 'theme-corporate.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.appliedTheme).toBe('prism-corporate');
    });

    it('DOIT appliquer le thème Light professionnel', async () => {
      const service = new PdfExportService({
        theme: { name: 'prism-light' }
      });
      
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generatePdf(messages, {
        outputPath: path.join(TEST_OUTPUT_DIR, 'theme-light.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.appliedTheme).toBe('prism-light');
    });

    it('DOIT appliquer le thème Executive', async () => {
      const service = new PdfExportService({
        theme: { name: 'prism-executive' }
      });
      
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generatePdf(messages, {
        outputPath: path.join(TEST_OUTPUT_DIR, 'theme-executive.pdf')
      });
      
      expect(result.success).toBe(true);
      expect(result.appliedTheme).toBe('prism-executive');
    });
  });
});

// ============================================================================
// SECTION 4: STATISTIQUES ET RÉSUMÉ
// ============================================================================

describe('PdfExportService - Statistiques', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('Calcul des Statistiques', () => {
    it('DOIT calculer le nombre total de messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'A', timestamp: new Date() },
        { role: 'assistant', content: 'B', timestamp: new Date() },
        { role: 'user', content: 'C', timestamp: new Date() },
        { role: 'assistant', content: 'D', timestamp: new Date() }
      ];
      
      const stats = service.calculateStats(messages);
      
      expect(stats.totalMessages).toBe(4);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(2);
    });

    it('DOIT calculer la durée de la conversation', () => {
      const start = new Date('2024-12-06T10:00:00');
      const end = new Date('2024-12-06T10:30:00');
      
      const messages: ChatMessage[] = [
        { role: 'user', content: 'A', timestamp: start },
        { role: 'assistant', content: 'B', timestamp: end }
      ];
      
      const stats = service.calculateStats(messages);
      
      expect(stats.duration).toBe(30 * 60 * 1000); // 30 minutes en ms
      expect(stats.durationFormatted).toBe('30 minutes');
    });

    it('DOIT calculer le nombre de mots', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Bonjour comment allez vous', timestamp: new Date() },
        { role: 'assistant', content: 'Je vais très bien merci', timestamp: new Date() }
      ];
      
      const stats = service.calculateStats(messages);
      
      // 4 + 5 = 9 mots
      expect(stats.totalWords).toBe(9);
    });

    it('DOIT identifier les modèles utilisés', () => {
      const messages: ChatMessage[] = [
        { role: 'assistant', content: 'A', timestamp: new Date(), model: 'gpt-4' },
        { role: 'assistant', content: 'B', timestamp: new Date(), model: 'claude-3' },
        { role: 'assistant', content: 'C', timestamp: new Date(), model: 'gpt-4' }
      ];
      
      const stats = service.calculateStats(messages);
      
      expect(stats.modelsUsed).toContain('gpt-4');
      expect(stats.modelsUsed).toContain('claude-3');
      expect(stats.modelsUsed.length).toBe(2);
    });

    it('DOIT calculer le temps de réponse moyen', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Q1', timestamp: new Date('2024-12-06T10:00:00') },
        { role: 'assistant', content: 'R1', timestamp: new Date('2024-12-06T10:00:02') },
        { role: 'user', content: 'Q2', timestamp: new Date('2024-12-06T10:00:10') },
        { role: 'assistant', content: 'R2', timestamp: new Date('2024-12-06T10:00:14') }
      ];
      
      const stats = service.calculateStats(messages);
      
      // (2s + 4s) / 2 = 3s
      expect(stats.averageResponseTime).toBe(3000);
    });
  });

  describe('Page de Résumé', () => {
    it('DOIT générer une page de résumé si demandé', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() },
        { role: 'assistant', content: 'Réponse', timestamp: new Date(), model: 'gpt-4' }
      ];
      
      const result = await service.generatePdf(messages, {
        includeSummaryPage: true
      });
      
      expect(result.success).toBe(true);
      expect(result.hasSummaryPage).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 5: GESTION DES ERREURS
// ============================================================================

describe('PdfExportService - Gestion des Erreurs', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('Validation des Entrées', () => {
    it('DOIT rejeter une liste de messages vide', async () => {
      const result = await service.generatePdf([]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('vide');
    });

    it('DOIT rejeter des messages invalides', async () => {
      const invalidMessages = [
        { role: 'user' } // Manque content et timestamp
      ] as ChatMessage[];
      
      const result = await service.generatePdf(invalidMessages);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('DOIT gérer les timestamps invalides', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: 'invalid' as unknown as Date }
      ];
      
      const result = await service.generatePdf(messages);
      
      // Doit réussir avec un timestamp par défaut
      expect(result.success).toBe(true);
    });
  });

  describe('Gestion des Fichiers', () => {
    it('DOIT créer le répertoire de sortie si inexistant', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const outputPath = path.join(TEST_OUTPUT_DIR, 'nested', 'deep', 'output.pdf');
      const result = await service.generatePdf(messages, { outputPath });
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Cleanup
      fs.rmSync(path.join(TEST_OUTPUT_DIR, 'nested'), { recursive: true, force: true });
    });

    it('DOIT gérer les erreurs d\'écriture', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      // Chemin invalide
      const result = await service.generatePdf(messages, {
        outputPath: '/root/impossible/path.pdf'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// SECTION 6: EXPORT NAVIGATEUR (BLOB)
// ============================================================================

describe('PdfExportService - Export Navigateur', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  describe('Génération pour Téléchargement', () => {
    it('DOIT générer un buffer téléchargeable', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generateForDownload(messages, {
        filename: 'conversation-prism.pdf'
      });
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toBe('conversation-prism.pdf');
    });

    it('DOIT générer un nom de fichier par défaut avec date', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generateForDownload(messages);
      
      expect(result.filename).toMatch(/prism-chat-\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('DOIT inclure la taille du fichier', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test', timestamp: new Date() }
      ];
      
      const result = await service.generateForDownload(messages);
      
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.fileSizeFormatted).toMatch(/\d+(\.\d+)?\s*(KB|MB|B)/);
    });
  });
});

// ============================================================================
// SECTION 7: PERFORMANCE
// ============================================================================

describe('PdfExportService - Performance', () => {
  let service: PdfExportService;

  beforeEach(() => {
    service = new PdfExportService();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  it('DOIT générer un PDF en moins de 5 secondes pour 100 messages', async () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 100; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message numéro ${i + 1} avec du contenu suffisant pour tester.`,
        timestamp: new Date(Date.now() + i * 1000),
        model: i % 2 === 1 ? 'gpt-4' : undefined
      });
    }
    
    const start = Date.now();
    const result = await service.generatePdf(messages);
    const duration = Date.now() - start;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(5000);
  });

  it('DOIT gérer une conversation de 500 messages', async () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 500; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
        timestamp: new Date(Date.now() + i * 1000)
      });
    }
    
    const result = await service.generatePdf(messages);
    
    expect(result.success).toBe(true);
    // 500 messages = PDF très volumineux
    expect(result.buffer.length).toBeGreaterThan(50000);
  });
});

