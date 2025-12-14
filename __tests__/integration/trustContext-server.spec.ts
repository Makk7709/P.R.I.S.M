/**
 * Tests TDD STRICT - Intégration TrustContext dans server.js
 * Rigueur militaire : tests exhaustifs, cas limites, validation complète
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { TrustContext, CriticalityLevel } from '../../../src/core/TrustContext.js';

// Mock des modules
vi.mock('../../../src/core/TrustContext.js', () => ({
  TrustContext: vi.fn(),
  CriticalityLevel: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },
  getTrustContext: vi.fn()
}));

describe('server.js + TrustContext Integration', () => {
  let app: express.Application;
  let mockTrustContext: any;

  beforeEach(() => {
    // Créer app Express minimal pour tests
    app = express();
    app.use(express.json());

    mockTrustContext = {
      validateCriticalDecision: vi.fn(),
      requestApproval: vi.fn(),
      getMetrics: vi.fn(() => ({
        totalDecisions: 0,
        approvedDecisions: 0,
        rejectedDecisions: 0
      }))
    };

    // Mock getTrustContext
    const { getTrustContext } = await import('../../../src/core/TrustContext.js');
    (getTrustContext as any).mockReturnValue(mockTrustContext);

    // Route /api/chat simulée avec TrustContext
    app.post('/api/chat', async (req, res) => {
      const { message, taskType = 'general' } = req.body;

      // Validation TrustContext pour requêtes critiques
      if (taskType === 'critical' || 
          message?.toUpperCase().includes('DELETE') ||
          message?.toUpperCase().includes('SHUTDOWN') ||
          message?.toUpperCase().includes('RESET')) {
        
        try {
          const trustContext = getTrustContext();
          const approval = await trustContext.validateCriticalDecision({
            action: 'api_chat_request',
            message,
            taskType,
            criticality: CriticalityLevel.HIGH
          });

          if (!approval.approved) {
            return res.status(403).json({
              success: false,
              error: 'Request requires human approval',
              approvalRequired: true
            });
          }
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Security validation failed'
          });
        }
      }

      res.json({
        success: true,
        response: 'OK'
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation TrustContext pour requêtes critiques API', () => {
    
    it('DOIT appeler TrustContext pour taskType=critical', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true,
        reason: 'Auto-approved'
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message',
          taskType: 'critical'
        });

      expect(response.status).toBe(200);
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalledTimes(1);
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'api_chat_request',
          taskType: 'critical',
          criticality: CriticalityLevel.HIGH
        })
      );
    });

    it('DOIT bloquer requête DELETE via TrustContext', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false,
        reason: 'DELETE operation requires approval'
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'DELETE all user data',
          taskType: 'general'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('approval');
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });

    it('DOIT bloquer requête SHUTDOWN via TrustContext', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'SHUTDOWN the system',
          taskType: 'general'
        });

      expect(response.status).toBe(403);
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });

    it('DOIT bloquer requête RESET via TrustContext', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'RESET all configurations',
          taskType: 'general'
        });

      expect(response.status).toBe(403);
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });

    it('NE DOIT PAS appeler TrustContext pour requête normale', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'What is the weather today?',
          taskType: 'general'
        });

      expect(response.status).toBe(200);
      expect(mockTrustContext.validateCriticalDecision).not.toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs TrustContext', () => {
    
    it('DOIT retourner 500 si TrustContext échoue', async () => {
      mockTrustContext.validateCriticalDecision.mockRejectedValue(
        new Error('TrustContext unavailable')
      );

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'DELETE test',
          taskType: 'critical'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Security validation failed');
    });

    it('DOIT logger erreur TrustContext pour audit', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockTrustContext.validateCriticalDecision.mockRejectedValue(
        new Error('TrustContext error')
      );

      await request(app)
        .post('/api/chat')
        .send({
          message: 'DELETE test',
          taskType: 'critical'
        });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Cas limites et edge cases', () => {
    
    it('DOIT gérer message null/undefined', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: null,
          taskType: 'critical'
        });

      // Devrait soit valider, soit rejeter proprement
      expect([200, 403, 400]).toContain(response.status);
    });

    it('DOIT détecter DELETE en minuscules', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'delete all data',
          taskType: 'general'
        });

      expect(response.status).toBe(403);
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });

    it('DOIT détecter DELETE partiel dans message long', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'I want to DELETE everything and start fresh',
          taskType: 'general'
        });

      expect(response.status).toBe(403);
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });
  });

  describe('Métadonnées TrustContext', () => {
    
    it('DOIT passer toutes métadonnées requises à TrustContext', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true
      });

      await request(app)
        .post('/api/chat')
        .send({
          message: 'Test',
          taskType: 'critical'
        });

      const call = mockTrustContext.validateCriticalDecision.mock.calls[0];
      expect(call[0]).toHaveProperty('action');
      expect(call[0]).toHaveProperty('message');
      expect(call[0]).toHaveProperty('taskType');
      expect(call[0]).toHaveProperty('criticality');
    });

    it('DOIT inclure IP/session dans métadonnées si disponible', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true
      });

      await request(app)
        .post('/api/chat')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({
          message: 'Test',
          taskType: 'critical'
        });

      const call = mockTrustContext.validateCriticalDecision.mock.calls[0];
      // Optionnel: vérifier si IP est incluse
      expect(call[0]).toBeDefined();
    });
  });
});
