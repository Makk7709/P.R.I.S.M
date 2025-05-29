class PrismWitness {
  constructor() {
    this.isWitnessing = false;
    this.eventHandlers = new Map();
    this.timestampStyle = 'color: #9CA3AF';
    this.eventStyles = {
      prismHeartbeatEvent: 'color: #60A5FA',
      prismAwakeningComplete: 'color: #34D399',
      prismMetaEvent: 'color: #FBBF24',
      prismPriorityEvent: 'color: #F87171',
      prismReflexEvent: 'color: #A78BFA'
    };
  }

  formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  }

  createEventHandler(eventType) {
    return (event) => {
      const timestamp = this.formatTimestamp();
      const style = this.eventStyles[eventType] || 'color: #9CA3AF';
      
      console.log(
        `%c[${timestamp}] %c${eventType}`,
        this.timestampStyle,
        style,
        event.detail || {}
      );
    };
  }

  startWitnessing() {
    if (this.isWitnessing) return;

    const events = [
      'prismHeartbeatEvent',
      'prismAwakeningComplete',
      'prismMetaEvent',
      'prismPriorityEvent',
      'prismReflexEvent'
    ];

    events.forEach(eventType => {
      const handler = this.createEventHandler(eventType);
      this.eventHandlers.set(eventType, handler);
      window.addEventListener(eventType, handler);
    });

    this.isWitnessing = true;
    console.log(
      '%c[PRISM Witness] %cWitness system activated',
      this.timestampStyle,
      'color: #34D399'
    );
  }

  stopWitnessing() {
    if (!this.isWitnessing) return;

    this.eventHandlers.forEach((handler, eventType) => {
      window.removeEventListener(eventType, handler);
    });

    this.eventHandlers.clear();
    this.isWitnessing = false;
    
    console.log(
      '%c[PRISM Witness] %cWitness system deactivated',
      this.timestampStyle,
      'color: #F87171'
    );
  }
}

export default PrismWitness; 