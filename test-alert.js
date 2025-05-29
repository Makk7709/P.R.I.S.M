const { metrics, updateEfficiency } = require('./telemetry/prismMetrics');

// Simuler une efficacité basse
updateEfficiency(45);

console.log('Efficiency set to 45%');
console.log('Waiting for alert...');

// Vérifier la valeur actuelle
setTimeout(async () => {
  const currentEfficiency = await metrics.efficiency.get();
  console.log('Current efficiency:', currentEfficiency.values[0].value);
}, 1000); 