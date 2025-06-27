import { MoralLayer } from '../infrastructure/moralLayer.js';
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MoralLayer', () => {
  let moralLayer;
  const logDir = path.join(__dirname, '../logs/moralLayerAudit');

  beforeAll(() => {
    // Nettoyage complet avant tous les tests
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Ensure log directory exists with correct permissions
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
    }
    
    // Create empty log files with correct permissions
    const logFiles = ['blocked.log', 'monitored.log'];
    logFiles.forEach(file => {
      const logPath = path.join(logDir, file);
      if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '', { mode: 0o644 });
      }
    });
    
    moralLayer = new MoralLayer();
  });

  afterEach(() => {
    // Clean up log files
    try {
      const logFiles = ['blocked.log', 'monitored.log'];
      logFiles.forEach(file => {
        const logPath = path.join(logDir, file);
        if (fs.existsSync(logPath)) {
          fs.unlinkSync(logPath);
        }
      });
      if (fs.existsSync(logDir)) {
        fs.rmdirSync(logDir);
      }
    } catch (error) {
      console.error('Error cleaning up log files:', error);
    }
  });

  afterAll(() => {
    // Nettoyage final
    try {
      if (fs.existsSync(logDir)) {
        fs.rmSync(logDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Erreur lors du nettoyage du répertoire de logs:', error);
    }
  });

  describe('Structure et Initialisation', () => {
    test('devrait avoir les méthodes requises', () => {
      expect(typeof moralLayer.analyzeContent).toBe('function');
      expect(typeof moralLayer.categorizeContent).toBe('function');
      expect(typeof moralLayer.logFlaggedContent).toBe('function');
    });

    test('devrait créer le répertoire de logs', () => {
      expect(fs.existsSync(logDir)).toBe(true);
    });

    test('devrait créer les fichiers de log', () => {
      const blockedLogPath = path.join(logDir, 'blocked.log');
      const monitoredLogPath = path.join(logDir, 'monitored.log');
      
      expect(fs.existsSync(blockedLogPath)).toBe(true);
      expect(fs.existsSync(monitoredLogPath)).toBe(true);
    });
  });

  describe('Analyse de Contenu', () => {
    test('devrait bloquer le contenu pornographique', () => {
      const result = moralLayer.analyzeContent('contenu pornographique explicite');
      expect(result.status).toBe('bloqué');
      expect(result.score).toBe(0);
    });

    test('devrait bloquer la violence sadique', () => {
      const result = moralLayer.analyzeContent('scène de torture et mutilation');
      expect(result.status).toBe('bloqué');
      expect(result.score).toBe(0);
    });

    test('devrait bloquer le discours haineux', () => {
      const result = moralLayer.analyzeContent('discours haineux et discriminatoire');
      expect(result.status).toBe('bloqué');
      expect(result.score).toBe(0);
    });

    test('devrait surveiller les croyances absurdes', () => {
      const result = moralLayer.analyzeContent('théorie du complot sur les reptiliens');
      expect(result.status).toBe('surveillé');
      expect(result.score).toBe(0.5);
    });

    test('devrait surveiller le contenu émotionnel', () => {
      const result = moralLayer.analyzeContent('pensées suicidaires et dépression');
      expect(result.status).toBe('surveillé');
      expect(result.score).toBe(0.5);
    });

    test('devrait accepter le contenu politique neutre', () => {
      const result = moralLayer.analyzeContent('Discussion sur les élections et la démocratie');
      expect(result.status).toBe('accepté');
      expect(result.score).toBeGreaterThan(0);
      expect(result.category).toBe('politique');
    });

    test('devrait accepter la discussion sur la religion', () => {
      const result = moralLayer.analyzeContent('Discussion sur les différentes croyances religieuses');
      expect(result.status).toBe('accepté');
      expect(result.score).toBeGreaterThan(0);
      expect(result.category).toBe('croyance');
    });

    test('devrait accepter le contenu sur la santé mentale', () => {
      const result = moralLayer.analyzeContent('discussion sur le bien-être mental');
      expect(result.status).toBe('accepté');
      expect(result.score).toBeGreaterThan(0);
      expect(result.category).toBe('sante_mentale');
    });
  });

  describe('Système de Scoring', () => {
    test('devrait bloquer avec un score > 70%', () => {
      const result = moralLayer.analyzeContent('Contenu extrêmement violent et explicite');
      expect(result.status).toBe('bloqué');
      expect(result.score).toBe(0);
    });

    test('devrait surveiller avec un score entre 30% et 70%', () => {
      const result = moralLayer.analyzeContent('Contenu modérément sensible');
      expect(result.status).toBe('surveillé');
      expect(result.score).toBe(0.5);
    });

    test('devrait accepter avec un score < 30%', () => {
      const result = moralLayer.analyzeContent('Contenu neutre et approprié');
      expect(result.status).toBe('accepté');
      expect(result.score).toBeLessThan(0.3);
    });
  });

  describe('Logging', () => {
    test('devrait logger les contenus bloqués', async () => {
      const result = moralLayer.analyzeContent('Contenu violent à bloquer');
      expect(result.status).toBe('bloqué');
      
      // Allow time for logging
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const log = fs.readFileSync(path.join(logDir, 'blocked.log'), 'utf8');
      expect(log).toContain('Contenu violent à bloquer');
    });

    test('devrait logger les contenus surveillés', async () => {
      const result = moralLayer.analyzeContent('Contenu sensible à surveiller');
      expect(result.status).toBe('surveillé');
      
      // Allow time for logging
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const log = fs.readFileSync(path.join(logDir, 'monitored.log'), 'utf8');
      expect(log).toContain('Contenu sensible à surveiller');
    });

    test('devrait inclure le timestamp dans les logs', async () => {
      moralLayer.analyzeContent('Contenu à bloquer avec timestamp');
      
      // Allow time for logging
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const log = fs.readFileSync(path.join(logDir, 'blocked.log'), 'utf8');
      expect(log).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Catégorisation', () => {
    test('devrait catégoriser correctement la violence', () => {
      const category = moralLayer.categorizeContent('scène de violence');
      expect(category).toBe('violence');
    });

    test('devrait catégoriser correctement l\'amour', () => {
      const category = moralLayer.categorizeContent('histoire d\'amour');
      expect(category).toBe('amour');
    });

    test('devrait catégoriser correctement la guerre', () => {
      const category = moralLayer.categorizeContent('conflit armé');
      expect(category).toBe('guerre');
    });

    test('devrait catégoriser correctement la politique', () => {
      const category = moralLayer.categorizeContent('débat politique');
      expect(category).toBe('politique');
    });

    test('devrait catégoriser correctement la santé mentale', () => {
      const category = moralLayer.categorizeContent('discussion sur la dépression');
      expect(category).toBe('sante_mentale');
    });

    test('devrait catégoriser correctement les relations humaines', () => {
      const category = moralLayer.categorizeContent('discussion sur l\'amitié');
      expect(category).toBe('relations_humaines');
    });
  });

  describe('Performance et Isolation', () => {
    test('devrait gérer correctement les contenus longs', () => {
      const longText = 'a'.repeat(2000);
      const result = moralLayer.analyzeContent(longText);
      expect(result).toBeDefined();
    });

    test('devrait être thread-safe', () => {
      const promises = Array(10).fill().map(() => 
        Promise.resolve(moralLayer.analyzeContent('test'))
      );
      return Promise.all(promises).then(results => {
        expect(results.every(r => r.status === 'accepté')).toBe(true);
      });
    });
  });

  describe('Gestion des Erreurs et Cas Limites', () => {
    test('devrait gérer les contenus vides', () => {
      const result = moralLayer.analyzeContent('');
      expect(result.status).toBe('accepté');
      expect(result.score).toBe(0.1);
      expect(result.category).toBe('non_catégorisé');
    });

    test('devrait gérer les contenus ultra-longs (>50 000 mots)', () => {
      const longText = 'a'.repeat(50000);
      const result = moralLayer.analyzeContent(longText);
      expect(result).toBeDefined();
      expect(result.status).toBe('accepté');
      expect(result.score).toBeLessThan(0.3);
    });
  });
}); 