/**
 * PRISM Priority Queue Implementation
 * Implémentation maison d'une file de priorité avec complexité O(log n)
 * Utilisée par KernelBus pour prioriser les événements critiques
 */

/**
 * Niveaux de priorité pour les événements
 */
export const Priority = {
  CRITICAL: 3,
  HIGH: 2,
  NORMAL: 1
};

/**
 * Élément de la file de priorité
 */
class PriorityQueueItem {
  constructor(data, priority = Priority.NORMAL, timestamp = Date.now()) {
    this.data = data;
    this.priority = priority;
    this.timestamp = timestamp;
    this.id = Math.random().toString(36).substr(2, 9);
  }

  /**
   * Compare deux éléments pour le tri
   * @param {PriorityQueueItem} other - Autre élément à comparer
   * @returns {number} Résultat de la comparaison
   */
  compareTo(other) {
    // Priorité plus élevée d'abord
    if (this.priority !== other.priority) {
      return other.priority - this.priority;
    }
    
    // Si même priorité, FIFO (premier arrivé, premier servi)
    return this.timestamp - other.timestamp;
  }
}

/**
 * File de priorité basée sur un tas binaire (heap)
 * Complexité: O(log n) pour insertion/extraction, O(1) pour peek
 */
export class PriorityQueue {
  constructor() {
    this.heap = [];
    this.size = 0;
    this.metrics = {
      totalEnqueued: 0,
      totalDequeued: 0,
      criticalEvents: 0,
      highPriorityEvents: 0,
      normalEvents: 0,
      averageWaitTime: 0,
      maxWaitTime: 0
    };
  }

  /**
   * Ajoute un élément à la file de priorité
   * @param {*} data - Données à ajouter
   * @param {number} priority - Priorité de l'élément
   * @returns {string} ID de l'élément ajouté
   */
  enqueue(data, priority = Priority.NORMAL) {
    const item = new PriorityQueueItem(data, priority);
    this.heap.push(item);
    this.size++;
    this.metrics.totalEnqueued++;
    
    // Mettre à jour les métriques par priorité
    switch (priority) {
      case Priority.CRITICAL:
        this.metrics.criticalEvents++;
        break;
      case Priority.HIGH:
        this.metrics.highPriorityEvents++;
        break;
      default:
        this.metrics.normalEvents++;
    }
    
    // Remonter l'élément à sa position correcte
    this.heapifyUp(this.size - 1);
    
    return item.id;
  }

  /**
   * Retire et retourne l'élément de plus haute priorité
   * @returns {*} Données de l'élément de plus haute priorité, ou null si vide
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }

    const item = this.heap[0];
    const lastItem = this.heap.pop();
    this.size--;
    this.metrics.totalDequeued++;
    
    // Calculer le temps d'attente
    const waitTime = Date.now() - item.timestamp;
    this.updateWaitTimeMetrics(waitTime);

    // Si ce n'était pas le dernier élément, le placer en tête et redescendre
    if (this.size > 0) {
      this.heap[0] = lastItem;
      this.heapifyDown(0);
    }

    return item.data;
  }

  /**
   * Retourne l'élément de plus haute priorité sans le retirer
   * @returns {*} Données de l'élément de plus haute priorité, ou null si vide
   */
  peek() {
    return this.isEmpty() ? null : this.heap[0].data;
  }

  /**
   * Vérifie si la file est vide
   * @returns {boolean} True si la file est vide
   */
  isEmpty() {
    return this.size === 0;
  }

  /**
   * Retourne la taille de la file
   * @returns {number} Nombre d'éléments dans la file
   */
  getSize() {
    return this.size;
  }

  /**
   * Remonte un élément dans le tas pour maintenir la propriété de tas
   * @param {number} index - Index de l'élément à remonter
   */
  heapifyUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.heap[index].compareTo(this.heap[parentIndex]) >= 0) {
        break;
      }
      
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Descend un élément dans le tas pour maintenir la propriété de tas
   * @param {number} index - Index de l'élément à descendre
   */
  heapifyDown(index) {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      // Comparer avec l'enfant gauche
      if (leftChild < this.size && 
          this.heap[leftChild].compareTo(this.heap[minIndex]) < 0) {
        minIndex = leftChild;
      }

      // Comparer avec l'enfant droit
      if (rightChild < this.size && 
          this.heap[rightChild].compareTo(this.heap[minIndex]) < 0) {
        minIndex = rightChild;
      }

      // Si l'élément est à sa place, arrêter
      if (minIndex === index) {
        break;
      }

      this.swap(index, minIndex);
      index = minIndex;
    }
  }

  /**
   * Échange deux éléments dans le tas
   * @param {number} i - Premier index
   * @param {number} j - Deuxième index
   */
  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  /**
   * Met à jour les métriques de temps d'attente
   * @param {number} waitTime - Temps d'attente en ms
   */
  updateWaitTimeMetrics(waitTime) {
    // Mettre à jour le temps d'attente maximum
    if (waitTime > this.metrics.maxWaitTime) {
      this.metrics.maxWaitTime = waitTime;
    }

    // Mettre à jour le temps d'attente moyen
    const totalProcessed = this.metrics.totalDequeued;
    this.metrics.averageWaitTime = 
      (this.metrics.averageWaitTime * (totalProcessed - 1) + waitTime) / totalProcessed;
  }

  /**
   * Retourne les métriques de la file de priorité
   * @returns {Object} Métriques actuelles
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentSize: this.size,
      utilizationRate: this.metrics.totalDequeued / Math.max(this.metrics.totalEnqueued, 1),
      timestamp: Date.now()
    };
  }

  /**
   * Vide complètement la file de priorité
   */
  clear() {
    this.heap = [];
    this.size = 0;
    // Conserver les métriques historiques mais réinitialiser la taille
  }

  /**
   * Retourne tous les éléments triés par priorité (pour debug)
   * @returns {Array} Éléments triés par priorité
   */
  toArray() {
    return [...this.heap].sort((a, b) => a.compareTo(b));
  }

  /**
   * Retourne une représentation string de la file (pour debug)
   * @returns {string} Représentation textuelle
   */
  toString() {
    const items = this.toArray();
    return items.map(item => 
      `[P:${item.priority}, T:${item.timestamp}, ID:${item.id}]`
    ).join(', ');
  }

  /**
   * Valide l'intégrité du tas (pour tests)
   * @returns {boolean} True si le tas est valide
   */
  validateHeap() {
    for (let i = 0; i < this.size; i++) {
      const leftChild = 2 * i + 1;
      const rightChild = 2 * i + 2;

      if (leftChild < this.size && 
          this.heap[i].compareTo(this.heap[leftChild]) > 0) {
        return false;
      }

      if (rightChild < this.size && 
          this.heap[i].compareTo(this.heap[rightChild]) > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Retourne des statistiques détaillées sur la distribution des priorités
   * @returns {Object} Statistiques de distribution
   */
  getPriorityDistribution() {
    const distribution = {
      [Priority.CRITICAL]: 0,
      [Priority.HIGH]: 0,
      [Priority.NORMAL]: 0
    };

    for (const item of this.heap) {
      distribution[item.priority]++;
    }

    return {
      distribution,
      percentages: {
        critical: (distribution[Priority.CRITICAL] / this.size) * 100,
        high: (distribution[Priority.HIGH] / this.size) * 100,
        normal: (distribution[Priority.NORMAL] / this.size) * 100
      }
    };
  }
}

export default PriorityQueue; 