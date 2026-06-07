/**
 * PRISM PDF Export Service - Export Premium des Conversations
 *
 * Service d'export PDF haute qualité pour les conversations PRISM.
 * Design corporate avec thèmes premium et branding personnalisable.
 *
 * @author PRISM Team
 * @version 1.0.0
 */

import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { InfographicGenerator } from '../infographic/InfographicGenerator.js';

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'|'system'} role
 * @property {string} content
 * @property {Date} timestamp
 * @property {string} [model]
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} PdfTheme
 * @property {string} name
 * @property {string} primaryColor
 * @property {string} accentColor
 * @property {string} backgroundColor
 * @property {string} textColor
 * @property {string} userBubbleColor
 * @property {string} assistantBubbleColor
 */

/**
 * @typedef {Object} PdfBranding
 * @property {string} [logo]
 * @property {string} companyName
 * @property {string} tagline
 * @property {string} [website]
 */

/**
 * @typedef {Object} PdfLayout
 * @property {Object} margins
 * @property {string} pageSize
 * @property {string} orientation
 */

/**
 * @typedef {Object} PdfExportOptions
 * @property {string} [outputPath]
 * @property {string} [title]
 * @property {string} [author]
 * @property {boolean} [includeCoverPage]
 * @property {boolean} [includeTableOfContents]
 * @property {boolean} [includePageNumbers]
 * @property {boolean} [includeHeader]
 * @property {boolean} [includeFooter]
 * @property {boolean} [includeSummaryPage]
 * @property {string} [filename]
 */

/**
 * @typedef {Object} ExportResult
 * @property {boolean} success
 * @property {string} [filePath]
 * @property {Buffer} [buffer]
 * @property {number} [pageCount]
 * @property {string} [error]
 * @property {Object} [metadata]
 * @property {boolean} [hasCoverPage]
 * @property {boolean} [hasTableOfContents]
 * @property {boolean} [hasPageNumbers]
 * @property {boolean} [hasHeader]
 * @property {boolean} [hasFooter]
 * @property {boolean} [hasSummaryPage]
 * @property {string} [appliedTheme]
 */

// ============================================================================
// THÈMES PREMIUM
// ============================================================================

const THEMES = {
  'prism-corporate': {
    name: 'prism-corporate',
    primaryColor: '#050B14',
    accentColor: '#FFD700',
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A1A',
    userBubbleColor: '#F0F4F8',
    assistantBubbleColor: '#050B14',
    userTextColor: '#1A1A1A',
    assistantTextColor: '#FFFFFF',
    headerColor: '#050B14',
    footerColor: '#6B7280',
  },
  'prism-light': {
    name: 'prism-light',
    primaryColor: '#3B82F6',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#374151',
    userBubbleColor: '#EFF6FF',
    assistantBubbleColor: '#F0FDF4',
    userTextColor: '#1E40AF',
    assistantTextColor: '#166534',
    headerColor: '#3B82F6',
    footerColor: '#9CA3AF',
  },
  'prism-executive': {
    name: 'prism-executive',
    primaryColor: '#1F2937',
    accentColor: '#B8860B',
    backgroundColor: '#FAFAFA',
    textColor: '#111827',
    userBubbleColor: '#F3F4F6',
    assistantBubbleColor: '#1F2937',
    userTextColor: '#374151',
    assistantTextColor: '#F9FAFB',
    headerColor: '#1F2937',
    footerColor: '#6B7280',
  },
};

const DEFAULT_CONFIG = {
  theme: THEMES['prism-corporate'],
  branding: {
    logo: null,
    companyName: 'PRISM',
    tagline: 'Advanced AI Orchestration System',
    website: 'prism.ai',
  },
  layout: {
    margins: { top: 60, bottom: 60, left: 50, right: 50 },
    pageSize: 'A4',
    orientation: 'portrait',
  },
};

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

export class PdfExportService {
  constructor(config = {}) {
    this.config = this._mergeConfig(DEFAULT_CONFIG, config);

    // Appliquer le thème si nom fourni
    if (config.theme?.name && THEMES[config.theme.name]) {
      this.config.theme = { ...THEMES[config.theme.name], ...config.theme };
    }

    // ✨ Générateur d'infographies
    this.infographicGenerator = new InfographicGenerator();
  }

  // ============ API PUBLIQUE ============

  /**
   * Retourne la configuration actuelle
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Formate un message pour le PDF
   * @param {ChatMessage} message
   */
  formatMessage(message) {
    const role = message.role || 'user';
    const timestamp = this._parseTimestamp(message.timestamp);

    const displayNames = {
      user: 'Utilisateur',
      assistant: 'PRISM',
      system: 'Système',
    };

    const formatted = {
      role,
      displayName: displayNames[role] || role,
      content: message.content || '',
      formattedTime: this._formatTime(timestamp),
      formattedDate: this._formatDate(timestamp),
      model: message.model,
      modelBadge: this._formatModelBadge(message.model),
      isPremiumModel: this._isPremiumModel(message.model),
      style: this._getMessageStyle(role),
      contentRich: this._parseRichContent(message.content),
      links: this._extractLinks(message.content),
    };

    return formatted;
  }

  /**
   * Calcule les statistiques d'une conversation
   * @param {ChatMessage[]} messages
   */
  calculateStats(messages) {
    if (!messages || messages.length === 0) {
      return {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        duration: 0,
        durationFormatted: '0 minutes',
        totalWords: 0,
        modelsUsed: [],
        averageResponseTime: 0,
      };
    }

    const userMessages = messages.filter((m) => m.role === 'user').length;
    const assistantMessages = messages.filter((m) => m.role === 'assistant').length;

    // Durée
    const timestamps = messages.map((m) => this._parseTimestamp(m.timestamp).getTime());
    const duration = Math.max(...timestamps) - Math.min(...timestamps);

    // Mots
    const totalWords = messages.reduce((acc, m) => {
      return acc + (m.content || '').split(/\s+/).filter((w) => w.length > 0).length;
    }, 0);

    // Modèles
    const modelsUsed = [...new Set(messages.filter((m) => m.model).map((m) => m.model))];

    // Temps de réponse moyen
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant' && messages[i - 1].role === 'user') {
        const userTime = this._parseTimestamp(messages[i - 1].timestamp).getTime();
        const assistantTime = this._parseTimestamp(messages[i].timestamp).getTime();
        totalResponseTime += assistantTime - userTime;
        responseCount++;
      }
    }

    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      duration,
      durationFormatted: this._formatDuration(duration),
      totalWords,
      modelsUsed,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
    };
  }

  /**
   * Génère le PDF
   * @param {ChatMessage[]} messages
   * @param {PdfExportOptions} options
   * @returns {Promise<ExportResult>}
   */
  async generatePdf(messages, options = {}) {
    // Validation
    if (!messages || messages.length === 0) {
      return {
        success: false,
        error: 'La liste de messages est vide',
      };
    }

    // Valider les messages
    const validationError = this._validateMessages(messages);
    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      const doc = new PDFDocument({
        size: this.config.layout.pageSize,
        margins: this.config.layout.margins,
        bufferPages: true,
        info: {
          Title: options.title || 'Conversation PRISM',
          Author: options.author || 'PRISM User',
          Creator: 'PRISM Export Service',
          Producer: 'PRISM v2.0',
          CreationDate: new Date(),
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      // Génération du contenu
      const _pageCount = 0;
      const result = {
        success: true,
        metadata: {
          title: options.title || 'Conversation PRISM',
          author: options.author || 'PRISM User',
          creator: 'PRISM Export Service',
        },
        appliedTheme: this.config.theme.name,
        hasCoverPage: false,
        hasTableOfContents: false,
        hasPageNumbers: options.includePageNumbers || false,
        hasHeader: options.includeHeader || false,
        hasFooter: options.includeFooter || false,
        hasSummaryPage: options.includeSummaryPage || false,
      };

      // Page de couverture
      if (options.includeCoverPage) {
        this._addCoverPage(doc, messages, options);
        doc.addPage();
        result.hasCoverPage = true;
      }

      // Table des matières (si > 10 messages)
      if (options.includeTableOfContents && messages.length > 10) {
        this._addTableOfContents(doc, messages);
        doc.addPage();
        result.hasTableOfContents = true;
      }

      // ✨ Page Infographie (si activé)
      if (options.includeInfographic && options.taskType) {
        try {
          await this._addInfographicPage(doc, messages, options);
          result.hasInfographic = true;
        } catch (error) {
          console.warn('[PdfExport] Infographic generation failed:', error.message);
          result.infographicError = error.message;
        }
      }

      // Contenu principal
      this._addMessages(doc, messages, options);

      // Page de résumé
      if (options.includeSummaryPage) {
        doc.addPage();
        this._addSummaryPage(doc, messages);
        result.hasSummaryPage = true;
      }

      // Numérotation des pages
      if (options.includePageNumbers) {
        this._addPageNumbers(doc);
      }

      // Finaliser
      doc.end();

      // Attendre la fin
      await new Promise((resolve) => doc.on('end', resolve));

      const buffer = Buffer.concat(chunks);
      result.buffer = buffer;
      result.pageCount = doc.bufferedPageRange().count;

      // Écrire le fichier si outputPath spécifié
      if (options.outputPath) {
        await this._writeFile(options.outputPath, buffer);
        result.filePath = options.outputPath;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Génère un PDF pour téléchargement navigateur
   * @param {ChatMessage[]} messages
   * @param {Object} options
   */
  async generateForDownload(messages, options = {}) {
    const filename = options.filename || `prism-chat-${this._formatDateFilename(new Date())}.pdf`;

    const result = await this.generatePdf(messages, options);

    if (!result.success) {
      return result;
    }

    const fileSize = result.buffer.length;

    return {
      ...result,
      filename,
      mimeType: 'application/pdf',
      fileSize,
      fileSizeFormatted: this._formatFileSize(fileSize),
    };
  }

  // ============ MÉTHODES PRIVÉES - GÉNÉRATION ============

  _addCoverPage(doc, messages, options) {
    const theme = this.config.theme;
    const branding = this.config.branding;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Fond
    doc.rect(0, 0, pageWidth, pageHeight).fill(theme.primaryColor);

    // Accent doré en haut
    doc.rect(0, 0, pageWidth, 8).fill(theme.accentColor);

    // Titre PRISM
    doc
      .fontSize(48)
      .fillColor(theme.accentColor)
      .font('Helvetica-Bold')
      .text(branding.companyName, 0, pageHeight * 0.35, {
        align: 'center',
        width: pageWidth,
      });

    // Tagline
    doc
      .fontSize(14)
      .fillColor('#FFFFFF')
      .font('Helvetica')
      .text(branding.tagline, 0, pageHeight * 0.35 + 60, {
        align: 'center',
        width: pageWidth,
      });

    // Titre du document
    const title = options.title || 'Conversation Export';
    doc
      .fontSize(24)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .text(title, 0, pageHeight * 0.55, {
        align: 'center',
        width: pageWidth,
      });

    // Date
    doc
      .fontSize(12)
      .fillColor('#9CA3AF')
      .font('Helvetica')
      .text(this._formatDate(new Date()), 0, pageHeight * 0.55 + 40, {
        align: 'center',
        width: pageWidth,
      });

    // Stats rapides
    const stats = this.calculateStats(messages);
    doc
      .fontSize(11)
      .fillColor('#6B7280')
      .text(`${stats.totalMessages} messages • ${stats.durationFormatted}`, 0, pageHeight * 0.7, {
        align: 'center',
        width: pageWidth,
      });

    // Ligne dorée en bas
    doc.rect(0, pageHeight - 8, pageWidth, 8).fill(theme.accentColor);
  }

  _addTableOfContents(doc, messages) {
    const theme = this.config.theme;

    doc
      .fontSize(24)
      .fillColor(theme.primaryColor)
      .font('Helvetica-Bold')
      .text('Table des Matières', { align: 'center' });

    doc.moveDown(2);

    doc.fontSize(12).fillColor(theme.textColor).font('Helvetica');

    // Grouper par date
    const messagesByDate = this._groupMessagesByDate(messages);

    let tocIndex = 1;
    for (const [date, msgs] of Object.entries(messagesByDate)) {
      doc
        .font('Helvetica-Bold')
        .text(`${tocIndex}. ${date}`, { continued: true })
        .font('Helvetica')
        .text(` (${msgs.length} messages)`, { align: 'right' });
      doc.moveDown(0.5);
      tocIndex++;
    }
  }

  /**
   * Ajoute une page avec infographie générée
   * @param {PDFDocument} doc
   * @param {Array} messages
   * @param {Object} options
   */
  async _addInfographicPage(doc, messages, options) {
    const theme = this.config.theme;
    const pageWidth = doc.page.width;
    const _margins = this.config.layout.margins;

    doc.addPage();

    // Titre de la page
    doc
      .fontSize(24)
      .fillColor(theme.primaryColor)
      .font('Helvetica-Bold')
      .text('📊 Synthèse Visuelle', { align: 'center' });

    doc.moveDown(0.5);

    // Sous-titre avec type de tâche
    const taskTypeLabels = {
      finance: 'Analyse Financière',
      strategie: 'Vision Stratégique',
      marketing: 'Performance Marketing',
      recherche: 'Résultats de Recherche',
      technique: 'Rapport Technique',
      general: 'Synthèse Générale',
    };

    const taskType = options.taskType || 'general';
    const taskLabel = taskTypeLabels[taskType] || taskTypeLabels.general;

    doc
      .fontSize(14)
      .fillColor(theme.accentColor)
      .font('Helvetica')
      .text(taskLabel, { align: 'center' });

    doc.moveDown(2);

    try {
      // Générer l'infographie
      const infographic = await this.infographicGenerator.generateForPdf({
        messages,
        taskType,
        metadata: options.metadata,
      });

      if (infographic && infographic.buffer) {
        // Centrer l'image
        const imageX = (pageWidth - infographic.width) / 2;

        // Insérer l'image SVG
        if (infographic.format === 'svg') {
          // PDFKit ne supporte pas directement SVG, donc on affiche un placeholder élégant
          this._drawInfographicPlaceholder(doc, taskType, messages, imageX, infographic);
        } else {
          doc.image(infographic.buffer, imageX, doc.y, {
            width: infographic.width,
            height: infographic.height,
          });
        }

        doc.moveDown(1);

        // Légende
        doc
          .fontSize(10)
          .fillColor('#6B7280')
          .font('Helvetica-Oblique')
          .text('Infographie générée automatiquement par PRISM / KOREV AI', {
            align: 'center',
          });
      }
    } catch (error) {
      console.warn('[PdfExport] Infographic insertion failed:', error.message);

      // Afficher un message d'erreur élégant
      doc.fontSize(12).fillColor('#9CA3AF').text('Infographie non disponible', { align: 'center' });
    }
  }

  /**
   * Dessine un placeholder d'infographie élégant
   * @private
   */
  _drawInfographicPlaceholder(doc, taskType, messages, x, infographic) {
    const theme = this.config.theme;
    const width = infographic.width;
    const height = infographic.height;
    const y = doc.y;

    // Fond avec dégradé simulé
    doc.rect(x, y, width, height).fill('#F8FAFC');

    doc.rect(x, y, width, 4).fill(theme.accentColor);

    // Titre dans le placeholder
    doc
      .fontSize(18)
      .fillColor(theme.primaryColor)
      .font('Helvetica-Bold')
      .text('PRISM Analytics', x, y + 30, {
        width,
        align: 'center',
      });

    // Type de rapport
    const taskLabels = {
      finance: '💰 Rapport Financier',
      strategie: '🎯 Analyse Stratégique',
      marketing: '📈 Métriques Marketing',
      recherche: '🔬 Données de Recherche',
      technique: '⚙️ Rapport Technique',
      general: '📋 Synthèse Générale',
    };

    doc
      .fontSize(14)
      .fillColor(theme.accentColor)
      .font('Helvetica')
      .text(taskLabels[taskType] || taskLabels.general, x, y + 60, {
        width,
        align: 'center',
      });

    // Extraire quelques métriques du chat
    const extractedData = this.infographicGenerator.extractDataFromChat(messages, taskType);

    if (extractedData.metrics && extractedData.metrics.length > 0) {
      doc.moveDown(2);

      // Afficher les métriques clés
      doc
        .fontSize(12)
        .fillColor(theme.textColor)
        .font('Helvetica-Bold')
        .text('Métriques Clés:', x + 20, y + 100, { width: width - 40 });

      doc.font('Helvetica');
      let metricY = y + 120;

      for (const metric of extractedData.metrics.slice(0, 4)) {
        doc.text(`• ${metric.value}`, x + 30, metricY, { width: width - 60 });
        metricY += 18;
      }
    }

    // Footer KOREV AI
    doc
      .fontSize(10)
      .fillColor('#9CA3AF')
      .text('KOREV AI', x, y + height - 25, {
        width,
        align: 'center',
      });

    // Mettre à jour la position Y
    doc.y = y + height + 10;
  }

  _addMessages(doc, messages, options) {
    const theme = this.config.theme;
    const margins = this.config.layout.margins;
    const contentWidth = doc.page.width - margins.left - margins.right;

    // ✅ CORRECTION: Réinitialiser la position Y au début de la zone de contenu
    doc.y = margins.top;

    // En-tête si demandé
    if (options.includeHeader) {
      this._addHeader(doc);
      doc.y = margins.top + 30; // Espace après le header
    }

    doc.fontSize(10).fillColor(theme.textColor);

    let currentDate = null;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const formatted = this.formatMessage(message);
      const msgDate = formatted.formattedDate;

      // Séparateur de date
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .fillColor('#6B7280')
          .font('Helvetica-Bold')
          .text(`── ${msgDate} ──`, margins.left, doc.y, {
            align: 'center',
            width: contentWidth,
          });
        doc.moveDown(0.5);
      }

      // Vérifier si on a besoin d'une nouvelle page
      const estimatedHeight = this._estimateMessageHeight(doc, formatted, contentWidth);
      if (doc.y + estimatedHeight > doc.page.height - margins.bottom - 50) {
        doc.addPage();
        doc.y = margins.top;
        if (options.includeHeader) {
          this._addHeader(doc);
          doc.y = margins.top + 30;
        }
      }

      // Dessiner le message
      this._drawMessage(doc, formatted, contentWidth);
    }

    // Pied de page si demandé
    if (options.includeFooter) {
      this._addFooter(doc);
    }
  }

  _estimateMessageHeight(doc, formatted, contentWidth) {
    const bubbleWidth = contentWidth * 0.75;
    const bubblePadding = 12;

    doc.fontSize(11).font('Helvetica');
    const textHeight = doc.heightOfString(formatted.content || ' ', {
      width: bubbleWidth - bubblePadding * 2,
    });

    return textHeight + bubblePadding * 2 + 20 + 15; // header + padding + espacement
  }

  _drawMessage(doc, formatted, contentWidth) {
    const theme = this.config.theme;
    const isUser = formatted.role === 'user';
    const isSystem = formatted.role === 'system';

    const bubbleWidth = contentWidth * 0.75;
    const bubblePadding = 12;
    const borderRadius = 8;

    // Position X selon le rôle
    const x = isUser
      ? doc.page.width - this.config.layout.margins.right - bubbleWidth
      : this.config.layout.margins.left;

    // Couleurs
    let bgColor = theme.assistantBubbleColor;
    if (isUser) bgColor = theme.userBubbleColor;
    else if (isSystem) bgColor = '#F3F4F6';
    let textColor = theme.assistantTextColor;
    if (isUser) textColor = theme.userTextColor;
    else if (isSystem) textColor = '#6B7280';

    // ✅ CORRECTION: Sauvegarder la position Y de départ
    const startY = doc.y;

    // Calculer hauteur du texte
    doc.fontSize(11).font(isSystem ? 'Helvetica-Oblique' : 'Helvetica');
    const textHeight = doc.heightOfString(formatted.content || ' ', {
      width: bubbleWidth - bubblePadding * 2,
    });

    const headerHeight = 20;
    const bubbleHeight = textHeight + bubblePadding * 2 + headerHeight;

    // ✅ Dessiner la bulle à la position de départ
    doc.roundedRect(x, startY, bubbleWidth, bubbleHeight, borderRadius).fill(bgColor);

    // ✅ Header du message - position absolue depuis startY
    let headerColor = theme.accentColor;
    if (isUser) headerColor = '#6B7280';
    else if (isSystem) headerColor = '#9CA3AF';
    doc
      .fontSize(9)
      .fillColor(headerColor)
      .font('Helvetica-Bold')
      .text(formatted.displayName, x + bubblePadding, startY + bubblePadding, {
        width: bubbleWidth - bubblePadding * 2 - 80,
        lineBreak: false,
      });

    // ✅ Timestamp à droite du header
    doc
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(formatted.formattedTime, x + bubbleWidth - bubblePadding - 50, startY + bubblePadding, {
        width: 50,
        align: 'right',
        lineBreak: false,
      });

    // ✅ Badge modèle si assistant (sous le timestamp)
    if (formatted.model && !isUser && !isSystem && formatted.modelBadge) {
      doc
        .fontSize(7)
        .fillColor(theme.accentColor)
        .text(
          formatted.modelBadge,
          x + bubbleWidth - bubblePadding - 60,
          startY + bubblePadding + 10,
          {
            width: 60,
            align: 'right',
            lineBreak: false,
          }
        );
    }

    // ✅ Contenu du message - position absolue
    doc
      .fontSize(11)
      .fillColor(textColor)
      .font(isSystem ? 'Helvetica-Oblique' : 'Helvetica')
      .text(formatted.content || '', x + bubblePadding, startY + bubblePadding + headerHeight, {
        width: bubbleWidth - bubblePadding * 2,
        lineGap: 3,
      });

    // ✅ Avancer Y à la fin de la bulle + espacement
    doc.y = startY + bubbleHeight + 15;
  }

  _addHeader(doc) {
    const theme = this.config.theme;
    const branding = this.config.branding;

    // Ligne de séparation
    doc
      .moveTo(this.config.layout.margins.left, 40)
      .lineTo(doc.page.width - this.config.layout.margins.right, 40)
      .strokeColor(theme.accentColor)
      .lineWidth(2)
      .stroke();

    doc
      .fontSize(10)
      .fillColor(theme.headerColor)
      .font('Helvetica-Bold')
      .text(branding.companyName, this.config.layout.margins.left, 25, {
        continued: true,
      })
      .font('Helvetica')
      .fillColor('#9CA3AF')
      .text(` | ${branding.tagline}`);
  }

  _addFooter(doc) {
    const theme = this.config.theme;
    const branding = this.config.branding;
    const pageHeight = doc.page.height;

    doc
      .fontSize(8)
      .fillColor(theme.footerColor)
      .text(
        `Généré par ${branding.companyName} Export Service • ${this._formatDate(new Date())}`,
        this.config.layout.margins.left,
        pageHeight - 35,
        {
          align: 'center',
          width:
            doc.page.width - this.config.layout.margins.left - this.config.layout.margins.right,
        }
      );
  }

  _addPageNumbers(doc) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(9)
        .fillColor('#9CA3AF')
        .text(
          `Page ${i + 1} / ${pages.count}`,
          this.config.layout.margins.left,
          doc.page.height - 25,
          {
            align: 'center',
            width:
              doc.page.width - this.config.layout.margins.left - this.config.layout.margins.right,
          }
        );
    }
  }

  _addSummaryPage(doc, messages) {
    const theme = this.config.theme;
    const stats = this.calculateStats(messages);

    // Titre
    doc
      .fontSize(24)
      .fillColor(theme.primaryColor)
      .font('Helvetica-Bold')
      .text('Résumé de la Conversation', { align: 'center' });

    doc.moveDown(2);

    // Statistiques
    const statsItems = [
      { label: 'Messages totaux', value: stats.totalMessages },
      { label: 'Messages utilisateur', value: stats.userMessages },
      { label: 'Réponses PRISM', value: stats.assistantMessages },
      { label: 'Durée', value: stats.durationFormatted },
      { label: 'Mots échangés', value: stats.totalWords },
      { label: 'Modèles utilisés', value: stats.modelsUsed.join(', ') || 'N/A' },
      {
        label: 'Temps de réponse moyen',
        value:
          stats.averageResponseTime > 0
            ? `${(stats.averageResponseTime / 1000).toFixed(1)}s`
            : 'N/A',
      },
    ];

    for (const item of statsItems) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(theme.textColor)
        .text(`${item.label}: `, { continued: true })
        .font('Helvetica')
        .fillColor(theme.accentColor)
        .text(String(item.value));
      doc.moveDown(0.5);
    }

    // Note de pied
    doc.moveDown(3);
    doc
      .fontSize(9)
      .fillColor('#9CA3AF')
      .font('Helvetica-Oblique')
      .text('Ce document a été généré automatiquement par PRISM Export Service.', {
        align: 'center',
      });
  }

  // ============ MÉTHODES UTILITAIRES ============

  _mergeConfig(defaults, custom) {
    return {
      theme: { ...defaults.theme, ...custom.theme },
      branding: { ...defaults.branding, ...custom.branding },
      layout: {
        ...defaults.layout,
        ...custom.layout,
        margins: { ...defaults.layout.margins, ...custom.layout?.margins },
      },
    };
  }

  _validateMessages(messages) {
    for (const msg of messages) {
      if (!msg.content && msg.content !== '') {
        return 'Message invalide: contenu manquant';
      }
    }
    return null;
  }

  _parseTimestamp(timestamp) {
    if (timestamp instanceof Date && !isNaN(timestamp)) {
      return timestamp;
    }
    const parsed = new Date(timestamp);
    return isNaN(parsed) ? new Date() : parsed;
  }

  _formatTime(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  _formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  _formatDateFilename(date) {
    return date.toISOString().split('T')[0];
  }

  _formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return '< 1 minute';
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 1) return remainingMinutes > 0 ? `1h ${remainingMinutes}min` : '1 heure';
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours} heures`;
  }

  _formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  _formatModelBadge(model) {
    if (!model) return null;

    const badges = {
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5',
      'claude-3': 'Claude-3',
      'claude-3-opus': 'Claude-3 Opus',
      'claude-3-sonnet': 'Claude-3 Sonnet',
      perplexity: 'Perplexity',
    };

    return badges[model] || model.charAt(0).toUpperCase() + model.slice(1);
  }

  _isPremiumModel(model) {
    if (!model) return false;
    const premiumModels = ['gpt-4', 'gpt-4-turbo', 'claude-3-opus'];
    return premiumModels.some((pm) => model.toLowerCase().includes(pm));
  }

  _getMessageStyle(role) {
    const theme = this.config.theme;

    const styles = {
      user: {
        backgroundColor: theme.userBubbleColor,
        textColor: theme.userTextColor,
        alignment: 'right',
        isItalic: false,
      },
      assistant: {
        backgroundColor: theme.assistantBubbleColor,
        textColor: theme.assistantTextColor,
        alignment: 'left',
        isItalic: false,
      },
      system: {
        backgroundColor: '#F3F4F6',
        textColor: '#6B7280',
        alignment: 'center',
        isItalic: true,
      },
    };

    return styles[role] || styles.user;
  }

  _parseRichContent(content) {
    if (!content) return { segments: [], lineCount: 0 };

    const lines = content.split('\n');
    const segments = [];

    for (const line of lines) {
      // Parser le markdown basique
      let text = line;
      const formatting = [];

      // Bold
      text = text.replaceAll(/\*\*(.*?)\*\*/g, (_, match) => {
        formatting.push({ type: 'bold', text: match });
        return match;
      });

      // Italic
      text = text.replaceAll(/\*(.*?)\*/g, (_, match) => {
        formatting.push({ type: 'italic', text: match });
        return match;
      });

      // Code
      text = text.replaceAll(/`(.*?)`/g, (_, match) => {
        formatting.push({ type: 'code', text: match });
        return match;
      });

      segments.push({ text, formatting });
    }

    return { segments, lineCount: lines.length };
  }

  _extractLinks(content) {
    if (!content) return [];

    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = content.match(urlRegex);
    return matches || [];
  }

  _groupMessagesByDate(messages) {
    const groups = {};

    for (const msg of messages) {
      const date = this._formatDate(this._parseTimestamp(msg.timestamp));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    }

    return groups;
  }

  async _writeFile(filePath, buffer) {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
  }
}

export default PdfExportService;
