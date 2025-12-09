/**
 * PRISM PDF Export - Module Navigateur
 * 
 * Gère l'export PDF des conversations depuis l'interface.
 * Design premium avec modal de configuration.
 * 
 * @version 1.0.0
 * @author PRISM Team
 */

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const THEMES = [
    { id: 'prism-corporate', name: 'Corporate (Noir & Or)', description: 'Design premium noir et doré' },
    { id: 'prism-light', name: 'Light Professional', description: 'Design clair et professionnel' },
    { id: 'prism-executive', name: 'Executive', description: 'Design sobre et élégant' }
  ];

  // ============================================================================
  // CLASSE PRINCIPALE
  // ============================================================================

  class PrismPdfExport {
    constructor(prismChatInstance) {
      this.chat = prismChatInstance;
      this.modal = null;
      this.exportButton = null;
      this.isExporting = false;
      
      this._init();
    }

    _init() {
      this._createExportButton();
      this._createModal();
      this._bindEvents();
      
      console.log('[PrismPdfExport] ✅ Module d\'export PDF initialisé');
    }

    // ============ CRÉATION UI ============

    _createExportButton() {
      // Chercher la zone de contrôle vocale du chat PRISM
      const voiceRow = document.querySelector('.prism-voice-row');
      const chatHeader = document.querySelector('.prism-chat-header');
      const inputArea = document.querySelector('.prism-input-area');
      
      this.exportButton = document.createElement('button');
      this.exportButton.className = 'prism-button prism-export-pdf-btn';
      this.exportButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        Export PDF
      `;
      this.exportButton.title = 'Exporter la conversation en PDF premium';
      
      // Priorité 1: Dans la ligne vocale (à côté des boutons)
      if (voiceRow) {
        voiceRow.appendChild(this.exportButton);
        console.log('[PrismPdfExport] Bouton ajouté dans la zone vocale');
      }
      // Priorité 2: Dans le header du chat
      else if (chatHeader) {
        // Créer un conteneur pour le bouton dans le header
        const headerActions = document.createElement('div');
        headerActions.className = 'prism-header-actions';
        headerActions.style.cssText = 'margin-left: auto; display: flex; align-items: center;';
        headerActions.appendChild(this.exportButton);
        chatHeader.appendChild(headerActions);
        console.log('[PrismPdfExport] Bouton ajouté dans le header');
      }
      // Priorité 3: Avant la zone input
      else if (inputArea) {
        inputArea.parentNode.insertBefore(this.exportButton, inputArea);
        this.exportButton.style.margin = '8px 16px';
        console.log('[PrismPdfExport] Bouton ajouté avant la zone input');
      }
      // Fallback: bouton flottant discret
      else {
        this.exportButton.classList.add('floating');
        document.body.appendChild(this.exportButton);
        console.log('[PrismPdfExport] Bouton flottant (fallback)');
      }

      // Styles pour le bouton
      this._addStyles();
    }

    _addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        /* Bouton Export PDF - Style intégré PRISM */
        .prism-export-pdf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(184, 134, 11, 0.1) 100%);
          color: #FFD700;
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .prism-export-pdf-btn:hover {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(184, 134, 11, 0.2) 100%);
          border-color: #FFD700;
          box-shadow: 0 4px 20px rgba(255, 215, 0, 0.25);
          transform: translateY(-1px);
        }
        
        .prism-export-pdf-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(255, 215, 0, 0.2);
        }
        
        .prism-export-pdf-btn.floating {
          position: fixed;
          bottom: 100px;
          right: 20px;
          z-index: 1000;
          padding: 12px 20px;
          background: linear-gradient(135deg, #050B14 0%, #0F151C 100%);
          box-shadow: 0 4px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.1);
        }
        
        .prism-export-pdf-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .prism-export-pdf-btn svg {
          stroke: #FFD700;
          flex-shrink: 0;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .prism-export-pdf-btn {
            padding: 8px 12px;
            font-size: 12px;
          }
          
          .prism-export-pdf-btn span:not(.spinner) {
            display: none;
          }
          
          .prism-export-pdf-btn::after {
            content: 'PDF';
            font-size: 11px;
          }
        }
        
        /* Modal Export */
        .prism-export-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(5, 11, 20, 0.9);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        
        .prism-export-modal-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        
        .prism-export-modal {
          background: linear-gradient(180deg, #0A1018 0%, #050B14 100%);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.1);
          transform: scale(0.9);
          transition: transform 0.3s ease;
        }
        
        .prism-export-modal-overlay.active .prism-export-modal {
          transform: scale(1);
        }
        
        .prism-export-modal-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid rgba(255, 215, 0, 0.1);
        }
        
        .prism-export-modal-header h2 {
          margin: 0;
          font-size: 24px;
          color: #FFD700;
          font-weight: 600;
        }
        
        .prism-export-modal-header p {
          margin: 8px 0 0;
          color: #9CA3AF;
          font-size: 14px;
        }
        
        .prism-export-modal-body {
          padding: 24px;
        }
        
        .prism-export-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .prism-export-stat {
          text-align: center;
          padding: 16px;
          background: rgba(255, 215, 0, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 215, 0, 0.1);
        }
        
        .prism-export-stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #FFD700;
        }
        
        .prism-export-stat-label {
          font-size: 12px;
          color: #9CA3AF;
          margin-top: 4px;
        }
        
        .prism-export-section {
          margin-bottom: 20px;
        }
        
        .prism-export-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #E5E7EB;
          margin-bottom: 12px;
        }
        
        .prism-export-themes {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .prism-export-theme {
          display: flex;
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 215, 0, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .prism-export-theme:hover {
          background: rgba(255, 215, 0, 0.05);
          border-color: rgba(255, 215, 0, 0.3);
        }
        
        .prism-export-theme.selected {
          background: rgba(255, 215, 0, 0.1);
          border-color: #FFD700;
        }
        
        .prism-export-theme input {
          margin-right: 12px;
          accent-color: #FFD700;
        }
        
        .prism-export-theme-info {
          flex: 1;
        }
        
        .prism-export-theme-name {
          font-size: 14px;
          font-weight: 500;
          color: #F8F9FA;
        }
        
        .prism-export-theme-desc {
          font-size: 12px;
          color: #6B7280;
        }
        
        .prism-export-options {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .prism-export-option {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #E5E7EB;
        }
        
        .prism-export-option input {
          accent-color: #FFD700;
        }
        
        .prism-export-modal-footer {
          padding: 16px 24px 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .prism-export-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .prism-export-btn-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #9CA3AF;
        }
        
        .prism-export-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #E5E7EB;
        }
        
        .prism-export-btn-export {
          background: linear-gradient(135deg, #FFD700 0%, #B8860B 100%);
          border: none;
          color: #050B14;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .prism-export-btn-export:hover {
          background: linear-gradient(135deg, #FFF000 0%, #FFD700 100%);
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        }
        
        .prism-export-btn-export:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .prism-export-btn-export .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top-color: #050B14;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .prism-export-title-input {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 8px;
          color: #F8F9FA;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        
        .prism-export-title-input:focus {
          border-color: #FFD700;
        }
        
        .prism-export-title-input::placeholder {
          color: #6B7280;
        }
      `;
      document.head.appendChild(style);
    }

    _createModal() {
      this.modal = document.createElement('div');
      this.modal.className = 'prism-export-modal-overlay';
      this.modal.innerHTML = `
        <div class="prism-export-modal">
          <div class="prism-export-modal-header">
            <h2>📄 Export PDF Premium</h2>
            <p>Exportez votre conversation avec un design professionnel</p>
          </div>
          
          <div class="prism-export-modal-body">
            <div class="prism-export-stats">
              <div class="prism-export-stat">
                <div class="prism-export-stat-value" id="export-stat-messages">0</div>
                <div class="prism-export-stat-label">Messages</div>
              </div>
              <div class="prism-export-stat">
                <div class="prism-export-stat-value" id="export-stat-words">0</div>
                <div class="prism-export-stat-label">Mots</div>
              </div>
              <div class="prism-export-stat">
                <div class="prism-export-stat-value" id="export-stat-pages">~1</div>
                <div class="prism-export-stat-label">Pages</div>
              </div>
            </div>
            
            <div class="prism-export-section">
              <div class="prism-export-section-title">Titre du Document</div>
              <input type="text" class="prism-export-title-input" id="export-title" 
                     placeholder="Conversation PRISM" value="Conversation PRISM">
            </div>
            
            <div class="prism-export-section">
              <div class="prism-export-section-title">Thème</div>
              <div class="prism-export-themes" id="export-themes">
                ${THEMES.map((theme, i) => `
                  <label class="prism-export-theme ${i === 0 ? 'selected' : ''}" data-theme="${theme.id}">
                    <input type="radio" name="export-theme" value="${theme.id}" ${i === 0 ? 'checked' : ''}>
                    <div class="prism-export-theme-info">
                      <div class="prism-export-theme-name">${theme.name}</div>
                      <div class="prism-export-theme-desc">${theme.description}</div>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>
            
            <div class="prism-export-section">
              <div class="prism-export-section-title">Options</div>
              <div class="prism-export-options">
                <label class="prism-export-option">
                  <input type="checkbox" id="export-cover" checked>
                  Page de couverture
                </label>
                <label class="prism-export-option">
                  <input type="checkbox" id="export-summary">
                  Page de résumé
                </label>
                <label class="prism-export-option">
                  <input type="checkbox" id="export-pages" checked>
                  Numéros de page
                </label>
                <label class="prism-export-option prism-export-infographic">
                  <input type="checkbox" id="export-infographic" checked>
                  📊 Infographie synthèse
                </label>
              </div>
            </div>
          </div>
          
          <div class="prism-export-modal-footer">
            <button class="prism-export-btn prism-export-btn-cancel" id="export-cancel">
              Annuler
            </button>
            <button class="prism-export-btn prism-export-btn-export" id="export-confirm">
              <span>Télécharger PDF</span>
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(this.modal);
    }

    _bindEvents() {
      // Bouton export
      this.exportButton.addEventListener('click', () => this.openModal());
      
      // Fermer modal
      this.modal.querySelector('#export-cancel').addEventListener('click', () => this.closeModal());
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
      
      // Sélection thème
      this.modal.querySelectorAll('.prism-export-theme').forEach(theme => {
        theme.addEventListener('click', () => {
          this.modal.querySelectorAll('.prism-export-theme').forEach(t => t.classList.remove('selected'));
          theme.classList.add('selected');
          theme.querySelector('input').checked = true;
        });
      });
      
      // Bouton confirmer
      this.modal.querySelector('#export-confirm').addEventListener('click', () => this.exportPdf());
      
      // Échap pour fermer
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal.classList.contains('active')) {
          this.closeModal();
        }
      });
    }

    // ============ MÉTHODES PUBLIQUES ============

    openModal() {
      const messages = this._getMessages();
      
      if (messages.length === 0) {
        alert('Aucun message à exporter. Commencez une conversation d\'abord !');
        return;
      }
      
      this._updateStats(messages);
      this.modal.classList.add('active');
    }

    closeModal() {
      this.modal.classList.remove('active');
    }

    async exportPdf() {
      if (this.isExporting) return;
      
      const messages = this._getMessages();
      if (messages.length === 0) {
        alert('Aucun message à exporter');
        return;
      }
      
      this.isExporting = true;
      const exportBtn = this.modal.querySelector('#export-confirm');
      const originalContent = exportBtn.innerHTML;
      exportBtn.innerHTML = '<div class="spinner"></div><span>Export en cours...</span>';
      exportBtn.disabled = true;
      
      try {
        // Récupérer le taskType depuis le chat si disponible
        const taskType = this.chat?.currentTaskType || 
                         document.querySelector('.prism-task-select')?.value || 
                         'general';
        
        const options = {
          title: document.getElementById('export-title').value || 'Conversation PRISM',
          theme: this.modal.querySelector('input[name="export-theme"]:checked').value,
          includeCoverPage: document.getElementById('export-cover').checked,
          includeSummaryPage: document.getElementById('export-summary').checked,
          includePageNumbers: document.getElementById('export-pages').checked,
          includeInfographic: document.getElementById('export-infographic').checked,
          taskType: taskType,
          includeHeader: true,
          includeFooter: true
        };
        
        const response = await fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, options })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de l\'export');
        }
        
        // Télécharger le fichier
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prism-conversation-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('[PrismPdfExport] ✅ PDF téléchargé avec succès');
        this.closeModal();
        
      } catch (error) {
        console.error('[PrismPdfExport] ❌ Erreur:', error);
        alert('Erreur lors de l\'export: ' + error.message);
      } finally {
        this.isExporting = false;
        exportBtn.innerHTML = originalContent;
        exportBtn.disabled = false;
      }
    }

    // ============ MÉTHODES PRIVÉES ============

    _getMessages() {
      const messages = [];
      
      // ✅ PRIORITÉ 1: Utiliser l'historique du chat si disponible
      if (this.chat?.messageHistory && this.chat.messageHistory.length > 0) {
        console.log('[PrismPdfExport] Utilisation de l\'historique chat:', this.chat.messageHistory.length, 'messages');
        return this.chat.messageHistory;
      }
      
      // ✅ PRIORITÉ 2: Utiliser l'historique global si disponible
      if (window.prismMessageHistory && window.prismMessageHistory.length > 0) {
        console.log('[PrismPdfExport] Utilisation de l\'historique global:', window.prismMessageHistory.length, 'messages');
        return window.prismMessageHistory;
      }
      
      // ✅ PRIORITÉ 3: Parser les messages depuis le DOM avec les bons sélecteurs PRISM
      const messageElements = document.querySelectorAll('.prism-message');
      
      console.log('[PrismPdfExport] Parsing DOM:', messageElements.length, 'éléments trouvés');
      
      messageElements.forEach((el, index) => {
        const isUser = el.classList.contains('user');
        const isSystem = el.classList.contains('system');
        const isPrism = el.classList.contains('prism');
        
        // Extraire le contenu - le texte peut être directement dans l'élément ou dans un sous-élément
        let content = '';
        
        // Chercher d'abord dans les sous-éléments de contenu
        const contentEl = el.querySelector('.message-content, .message-text, p, span');
        if (contentEl) {
          content = contentEl.textContent?.trim() || '';
        }
        
        // Sinon, prendre le textContent complet de l'élément
        if (!content) {
          content = el.textContent?.trim() || '';
        }
        
        // Nettoyer le contenu (enlever les badges de modèle, etc.)
        content = this._cleanMessageContent(content);
        
        if (content) {
          const role = isUser ? 'user' : (isSystem ? 'system' : 'assistant');
          
          messages.push({
            role: role,
            content: content,
            timestamp: el.dataset?.timestamp || new Date(Date.now() - (messageElements.length - index) * 60000).toISOString(),
            model: el.dataset?.model || (role === 'assistant' ? 'openai' : null)
          });
          
          console.log(`[PrismPdfExport] Message ${index + 1}:`, role, content.substring(0, 50) + '...');
        }
      });
      
      console.log('[PrismPdfExport] Total messages collectés:', messages.length);
      return messages;
    }
    
    _cleanMessageContent(content) {
      if (!content) return '';
      
      // Supprimer les badges de modèle courants
      let cleaned = content
        .replace(/\[GPT-4\]/gi, '')
        .replace(/\[Claude\]/gi, '')
        .replace(/\[Perplexity\]/gi, '')
        .replace(/\[openai\]/gi, '')
        .replace(/\[consensus\]/gi, '')
        .trim();
      
      return cleaned;
    }

    _updateStats(messages) {
      const totalWords = messages.reduce((acc, m) => {
        return acc + (m.content || '').split(/\s+/).filter(w => w.length > 0).length;
      }, 0);
      
      const estimatedPages = Math.ceil(messages.length / 10) + 2;
      
      document.getElementById('export-stat-messages').textContent = messages.length;
      document.getElementById('export-stat-words').textContent = totalWords > 1000 ? 
        (totalWords / 1000).toFixed(1) + 'K' : totalWords;
      document.getElementById('export-stat-pages').textContent = '~' + estimatedPages;
    }
  }

  // ============================================================================
  // AUTO-INITIALISATION
  // ============================================================================

  global.PRISM = global.PRISM || {};
  global.PRISM.PdfExport = PrismPdfExport;

  // Auto-init quand DOM prêt
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (window.prismChat) {
          window.prismPdfExport = new PrismPdfExport(window.prismChat);
          console.log('[PRISM PDF Export] ✅ Module initialisé avec succès');
        } else {
          // Créer quand même le bouton sans référence au chat
          window.prismPdfExport = new PrismPdfExport(null);
          console.log('[PRISM PDF Export] ⚠️ Module initialisé sans référence chat');
        }
      }, 1500);
    });
  }

  console.log('[PRISM PDF Export] 📦 Module chargé - v1.0.0');

})(typeof window !== 'undefined' ? window : global);

