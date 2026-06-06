/**
 * Tests TDD pour Vérification Identité KOREV AI
 * Processus TDD strict - Pas de simplification
 * 
 * Vérifie que tous les prompts contiennent l'identité KOREV AI
 * et non OpenAI
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PersonaActivator } from '../../src/core/PersonaActivator.js';
import { ConsciousnessLayer } from '../../src/core/ConsciousnessLayer.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Identité KOREV AI - Vérification Prompts', () => {
  describe('PersonaActivator - Prompts KOREV AI', () => {
    let personaActivator: PersonaActivator;

    beforeEach(() => {
      personaActivator = new PersonaActivator();
    });

    it('DOIT contenir "KOREV AI" dans le prompt General', () => {
      const persona = personaActivator.activate('general');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
      expect(prompt).toContain('développé par KOREV AI');
    });

    it('DOIT contenir "pas un produit OpenAI" dans le prompt General', () => {
      const persona = personaActivator.activate('general');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('pas un produit OpenAI');
      expect(prompt).not.toContain('PRISM-OpenAI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Strategic', () => {
      const persona = personaActivator.activate('strategie');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
      expect(prompt).toContain('développé par KOREV AI');
    });

    it('DOIT contenir "pas un produit OpenAI" dans le prompt Strategic', () => {
      const persona = personaActivator.activate('strategie');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('pas un produit OpenAI');
      expect(prompt).not.toContain('PRISM-OpenAI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Financial', () => {
      const persona = personaActivator.activate('finance');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Marketing', () => {
      const persona = personaActivator.activate('marketing');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Research', () => {
      const persona = personaActivator.activate('research');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Data', () => {
      const persona = personaActivator.activate('data');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Technical', () => {
      const persona = personaActivator.activate('technical');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Ethics', () => {
      const persona = personaActivator.activate('ethics');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
    });

    it('DOIT contenir "KOREV AI" dans le prompt Creative', () => {
      const persona = personaActivator.activate('creative');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('KOREV AI');
    });

    it('DOIT contenir "pas un produit OpenAI" dans tous les prompts', () => {
      const taskTypes = ['general', 'strategie', 'finance', 'marketing', 'research', 'data', 'technical', 'ethics', 'creative'];
      
      taskTypes.forEach(taskType => {
        const persona = personaActivator.activate(taskType);
        const prompt = persona.getSystemPrompt();
        
        expect(prompt).toContain('pas un produit OpenAI');
        expect(prompt).toContain('pas OpenAI');
      });
    });
  });

  describe('ConsciousnessLayer - Identité KOREV AI', () => {
    let consciousness: ConsciousnessLayer;

    beforeEach(() => {
      consciousness = new ConsciousnessLayer();
    });

    it('DOIT avoir l\'identité KOREV AI dans identity', () => {
      const identity = consciousness.getSelfAwareness();
      
      expect(identity.company).toBe('KOREV AI');
      expect(identity.note).toContain('KOREV AI');
      expect(identity.note).toContain('pas par OpenAI');
    });

    it('DOIT enrichir les prompts avec identité KOREV AI', () => {
      const basePrompt = 'Tu es PRISM';
      const enriched = consciousness.enrichPromptWithAwareness(basePrompt, {
        taskType: 'general'
      });
      
      expect(enriched).toContain('KOREV AI');
      expect(enriched).toContain('pas un produit OpenAI');
    });

    it('DOIT mentionner KOREV AI dans la conscience de soi', () => {
      const awareness = consciousness.getSelfAwareness();
      
      expect(awareness.company).toBe('KOREV AI');
    });
  });

  describe('VoicePersonalityEnhancer - Prompts KOREV AI', () => {
    it('DOIT contenir "KOREV AI" dans le fichier voicePersonalityEnhancer.js', () => {
      const filePath = join(__dirname, '../../backend/voicePersonalityEnhancer.js');
      const content = readFileSync(filePath, 'utf8');
      
      expect(content).toContain('KOREV AI');
      expect(content).toContain('développé par KOREV AI');
    });

    it('NE DOIT PAS contenir "PRISM-OpenAI" (sans parenthèses) dans voicePersonalityEnhancer.js', () => {
      const filePath = join(__dirname, '../../backend/voicePersonalityEnhancer.js');
      const content = readFileSync(filePath, 'utf8');
      
      // Vérifier qu'il n'y a pas "PRISM-OpenAI" seul (sans parenthèses ou contexte)
      const hasStandalonePRISMOpenAI = /PRISM-OpenAI[^(]/.test(content);
      expect(hasStandalonePRISMOpenAI).toBe(false);
    });

    it('DOIT contenir "PRISM (KOREV AI)" dans voicePersonalityEnhancer.js', () => {
      const filePath = join(__dirname, '../../backend/voicePersonalityEnhancer.js');
      const content = readFileSync(filePath, 'utf8');
      
      expect(content).toContain('PRISM (KOREV AI)');
    });
  });

  describe('orchestrator.js - Prompt KOREV AI', () => {
    it('DOIT contenir "KOREV AI" dans orchestrator.js', () => {
      const filePath = join(__dirname, '../../backend/orchestrator.js');
      const content = readFileSync(filePath, 'utf8');
      
      expect(content).toContain('KOREV AI');
      expect(content).toContain('développé par KOREV AI');
    });

    it('DOIT contenir "pas un produit OpenAI" dans orchestrator.js', () => {
      const filePath = join(__dirname, '../../backend/orchestrator.js');
      const content = readFileSync(filePath, 'utf8');
      
      // Vérifier qu'il contient "pas un produit OpenAI" ou "pas OpenAI"
      expect(content).toMatch(/pas (un )?produit OpenAI|pas OpenAI/i);
    });
  });
});

