const Dashboard = require('./dashboard/dashboard.js');
const express = require('express');
const path = require('path');

// Configuration du dashboard
const config = {
  providers: {
    openai: { enabled: true },
    claude: { enabled: true },
    perplexity: { enabled: true }
  }
};

// Créer une instance du dashboard
const dashboard = new Dashboard(config);

// Ajouter des routes statiques pour l'interface
dashboard.app.use('/ui', express.static(path.join(__dirname, 'ui')));
dashboard.app.use('/tests', express.static(path.join(__dirname, 'tests')));

// Route principale
dashboard.app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PRISM v2.1 Dashboard</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                color: #e0e0e0;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                text-align: center;
            }
            h1 {
                color: #4CAF50;
                font-size: 3em;
                margin-bottom: 20px;
                text-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
            }
            .status {
                background: rgba(76, 175, 80, 0.1);
                border: 1px solid #4CAF50;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                display: inline-block;
            }
            .nav {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 40px 0;
            }
            .card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 20px;
                transition: all 0.3s ease;
                text-decoration: none;
                color: inherit;
            }
            .card:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            .card h3 {
                color: #4CAF50;
                margin-top: 0;
            }
            .metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 30px 0;
            }
            .metric {
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #4CAF50;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 PRISM v2.1</h1>
            <div class="status">
                <h2>✅ Système Opérationnel</h2>
                <p>Mode: TEST | Status: ACTIF | Version: 2.1</p>
            </div>
            
            <div class="metrics">
                <div class="metric">
                    <h4>🔧 Core</h4>
                    <p>Initialisé</p>
                </div>
                <div class="metric">
                    <h4>🛡️ Sécurité</h4>
                    <p>Active</p>
                </div>
                <div class="metric">
                    <h4>📊 Monitoring</h4>
                    <p>En cours</p>
                </div>
                <div class="metric">
                    <h4>🚀 Performance</h4>
                    <p>Optimale</p>
                </div>
            </div>
            
            <div class="nav">
                <a href="/api/metrics" class="card">
                    <h3>📊 Métriques API</h3>
                    <p>Données de performance en temps réel</p>
                </a>
                <a href="/api/provider-metrics" class="card">
                    <h3>🔗 Métriques Providers</h3>
                    <p>Statistiques des fournisseurs IA</p>
                </a>
                <a href="/ui/prismManualTests.html" class="card">
                    <h3>🧪 Tests Manuels</h3>
                    <p>Interface de tests interactifs</p>
                </a>
                <a href="/tests/manual/prismVoiceTests.html" class="card">
                    <h3>🎤 Tests Vocaux</h3>
                    <p>Tests d'interaction vocale</p>
                </a>
            </div>
            
            <div style="margin-top: 40px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 10px;">
                <h3>🔄 Heartbeat en Temps Réel</h3>
                <p id="heartbeat">Connexion en cours...</p>
            </div>
        </div>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const heartbeatEl = document.getElementById('heartbeat');
            
            socket.on('connect', () => {
                heartbeatEl.textContent = '✅ Connecté au système PRISM';
                heartbeatEl.style.color = '#4CAF50';
            });
            
            socket.on('metricsUpdate', (metrics) => {
                console.log('Métriques mises à jour:', metrics);
            });
            
            socket.on('disconnect', () => {
                heartbeatEl.textContent = '❌ Connexion perdue';
                heartbeatEl.style.color = '#f44336';
            });
            
            // Heartbeat visuel
            setInterval(() => {
                if (socket.connected) {
                    heartbeatEl.textContent = '💓 PRISM Heartbeat - ' + new Date().toLocaleTimeString();
                }
            }, 5000);
        </script>
    </body>
    </html>
  `);
});

// Démarrer le dashboard
console.log('🚀 Lancement du Dashboard PRISM...');
dashboard.start(3000);

console.log('✨ Dashboard PRISM disponible sur: http://localhost:3000');
console.log('📊 API Métriques: http://localhost:3000/api/metrics');
console.log('🧪 Tests: http://localhost:3000/ui/prismManualTests.html'); 