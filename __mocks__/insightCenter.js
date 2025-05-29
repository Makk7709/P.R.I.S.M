class InsightCenter {
  constructor() {
    this.buildQualityElement = document.createElement('div');
    this.buildQualityElement.innerHTML = `
      <div class="build-score"></div>
      <div class="module-stats"></div>
    `;
  }

  updateBuildQuality(score) {
    const buildScore = this.buildQualityElement.querySelector('.build-score');
    buildScore.textContent = `(score: ${score})`;
    buildScore.className = `build-score ${score >= 0.8 ? 'text-green-500' : 'text-red-500'}`;
  }

  updateModuleStats(modules) {
    const moduleStats = this.buildQualityElement.querySelector('.module-stats');
    moduleStats.innerHTML = modules.map(module => `
      <div class="module-stat">
        <span class="module-name">${module.name}</span>
        <span class="module-coverage">${module.coverage}%</span>
      </div>
    `).join('');
  }

  handlePreProdReport(report) {
    this.updateBuildQuality(report.score);
  }

  handleMutationReport(report) {
    this.updateModuleStats(report.modules);
  }
}

module.exports = InsightCenter; 