/**
 * @fileoverview Module de compression des données historiques PRISM
 * @module utils/prismCompression
 */

import LZString from './lz-string.js';

export class PrismCompression {
  constructor() {
    this.compressionThreshold = 1000; // Nombre d'entrées avant compression
    this.compressionRatio = 0.7; // Ratio de compression (70% des données)
  }

  /**
   * Compresse les données historiques
   * @param {Array} data - Données à compresser
   * @returns {string} Données compressées
   */
  compress(data) {
    if (!data || data.length === 0) return '';
    
    const jsonString = JSON.stringify(data);
    return LZString.compressToUTF16(jsonString);
  }

  /**
   * Décompresse les données historiques
   * @param {string} compressedData - Données compressées
   * @returns {Array} Données décompressées
   */
  decompress(compressedData) {
    if (!compressedData) return [];
    
    const jsonString = LZString.decompressFromUTF16(compressedData);
    return JSON.parse(jsonString);
  }

  /**
   * Optimise les données historiques en appliquant la compression
   * @param {Array} data - Données à optimiser
   * @returns {Object} Données optimisées et métadonnées
   */
  optimize(data) {
    // Simuler une compression simple
    return {
      data: data,
      compressionRatio: 1
    };
  }

  /**
   * Restaure les données optimisées
   * @param {Object} optimizedData - Données optimisées
   * @returns {Array} Données restaurées
   */
  restore(optimizedData) {
    if (!optimizedData || !optimizedData.data) return [];
    
    if (!optimizedData.compressed) {
      return optimizedData.data;
    }

    return this.decompress(optimizedData.data);
  }
} 