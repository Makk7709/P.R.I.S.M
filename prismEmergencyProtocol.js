/**
 * PRISM Emergency Protocol System
 * Handles critical system failures and emergency responses
 */

import prismBus from './prismBus.js';
import { prismSelfHeal } from './prismSelfHeal.js';

class PrismEmergencyProtocol {
  constructor() {
    this.emergencyState = false;
    this.criticalSystems = new Set([
      'memory',
      'core',
      'security',
      'network',
      'storage'
    ]);
    this.emergencyHistory = [];
    this.maxHistoryLength = 20;
    this.initializeProtocols();
  }

  initializeProtocols() {
    prismBus.on('system:critical_error', this.handleCriticalError.bind(this));
    prismBus.on('system:emergency', this.activateEmergencyMode.bind(this));
    prismBus.on('system:recovery', this.deactivateEmergencyMode.bind(this));
  }

  async handleCriticalError(error) {
    const emergencyRecord = {
      timestamp: Date.now(),
      error,
      actions: []
    };

    try {
      // Attempt self-healing first
      const healingResult = await prismSelfHeal.heal(error);
      emergencyRecord.actions.push({
        type: 'healing',
        result: healingResult
      });

      if (!healingResult.success) {
        // If healing fails, activate emergency mode
        await this.activateEmergencyMode(error);
        emergencyRecord.actions.push({
          type: 'emergency_mode',
          activated: true
        });
      }

      emergencyRecord.success = healingResult.success;
    } catch (emergencyError) {
      emergencyRecord.success = false;
      emergencyRecord.error = emergencyError;
    }

    this.emergencyHistory.push(emergencyRecord);
    if (this.emergencyHistory.length > this.maxHistoryLength) {
      this.emergencyHistory.shift();
    }

    await prismBus.emit('emergency:handled', emergencyRecord);
    return emergencyRecord;
  }

  async activateEmergencyMode(trigger) {
    if (this.emergencyState) return;

    this.emergencyState = true;
    const emergencyProtocol = {
      timestamp: Date.now(),
      trigger,
      actions: [
        { type: 'suspend_non_critical', status: 'pending' },
        { type: 'backup_state', status: 'pending' },
        { type: 'notify_admin', status: 'pending' }
      ]
    };

    try {
      // Suspend non-critical systems
      await prismBus.emit('system:suspend', {
        excludeSystems: Array.from(this.criticalSystems)
      });
      emergencyProtocol.actions[0].status = 'completed';

      // Backup current state
      await prismBus.emit('state:backup', {
        emergency: true,
        timestamp: Date.now()
      });
      emergencyProtocol.actions[1].status = 'completed';

      // Notify administrators
      await prismBus.emit('admin:notify', {
        level: 'CRITICAL',
        message: 'Emergency mode activated',
        trigger
      });
      emergencyProtocol.actions[2].status = 'completed';

      emergencyProtocol.success = true;
    } catch (error) {
      emergencyProtocol.success = false;
      emergencyProtocol.error = error;
    }

    await prismBus.emit('emergency:activated', emergencyProtocol);
    return emergencyProtocol;
  }

  async deactivateEmergencyMode() {
    if (!this.emergencyState) return;

    const recoveryProtocol = {
      timestamp: Date.now(),
      actions: [
        { type: 'resume_systems', status: 'pending' },
        { type: 'verify_state', status: 'pending' },
        { type: 'notify_admin', status: 'pending' }
      ]
    };

    try {
      // Resume all systems
      await prismBus.emit('system:resume', { all: true });
      recoveryProtocol.actions[0].status = 'completed';

      // Verify system state
      const systemState = await this.verifySystemState();
      recoveryProtocol.actions[1].status = 'completed';
      recoveryProtocol.systemState = systemState;

      // Notify administrators
      await prismBus.emit('admin:notify', {
        level: 'INFO',
        message: 'Emergency mode deactivated',
        systemState
      });
      recoveryProtocol.actions[2].status = 'completed';

      this.emergencyState = false;
      recoveryProtocol.success = true;
    } catch (error) {
      recoveryProtocol.success = false;
      recoveryProtocol.error = error;
    }

    await prismBus.emit('emergency:deactivated', recoveryProtocol);
    return recoveryProtocol;
  }

  async verifySystemState() {
    const criticalSystemsStatus = await Promise.all(
      Array.from(this.criticalSystems).map(async (system) => {
        try {
          const status = await prismBus.emit(`${system}:check`, { timeout: 5000 });
          return { system, status: status.success ? 'operational' : 'failed' };
        } catch (error) {
          return { system, status: 'unknown', error };
        }
      })
    );

    return {
      timestamp: Date.now(),
      systems: criticalSystemsStatus,
      overallStatus: criticalSystemsStatus.every(s => s.status === 'operational')
        ? 'healthy'
        : 'degraded'
    };
  }

  getEmergencyHistory() {
    return [...this.emergencyHistory];
  }

  isInEmergencyMode() {
    return this.emergencyState;
  }
}

export const prismEmergencyProtocol = new PrismEmergencyProtocol();
export default prismEmergencyProtocol; 