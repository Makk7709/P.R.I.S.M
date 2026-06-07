const os = require('node:os');

class SelfMonitor {
  constructor() {
    this.memoryThreshold = 90; // 90% memory usage threshold
    this.cpuThreshold = 95;    // 95% CPU usage threshold
  }

  checkMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percentage: (usedMemory / totalMemory) * 100
    };
  }

  checkCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return {
      percentage: 100 - (totalIdle / totalTick) * 100
    };
  }

  checkResourceThresholds(stats = null) {
    if (!stats) {
      const memStats = this.checkMemoryUsage();
      const cpuStats = this.checkCPUUsage();
      stats = {
        memory: memStats.percentage,
        cpu: cpuStats.percentage
      };
    }

    const isCritical = stats.memory >= this.memoryThreshold || stats.cpu >= this.cpuThreshold;

    return {
      isCritical,
      memoryStatus: stats.memory >= this.memoryThreshold ? 'critical' : 'normal',
      cpuStatus: stats.cpu >= this.cpuThreshold ? 'critical' : 'normal',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { SelfMonitor }; 