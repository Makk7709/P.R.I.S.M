import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Servir les fichiers statiques
app.use('/ui', express.static(path.join(__dirname, 'ui')));
app.use('/tests', express.static(path.join(__dirname, 'tests')));
app.use(express.static(__dirname));

// Route principale avec interface PRISM
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PRISM v2.1 - Interface Web</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
                color: #e0e0e0;
                min-height: 100vh;
                overflow-x: hidden;
            }
            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                position: relative;
            }
            .title {
                font-size: 4rem;
                font-weight: 700;
                background: linear-gradient(45deg, #00ff88, #00ccff, #ff00ff);
                background-size: 200% 200%;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gradient 3s ease infinite;
                margin-bottom: 10px;
            }
            @keyframes gradient {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            .subtitle {
                font-size: 1.2rem;
                color: #888;
                margin-bottom: 20px;
            }
            .status-bar {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin: 30px 0;
                flex-wrap: wrap;
            }
            .status-item {
                background: rgba(0, 255, 136, 0.1);
                border: 1px solid rgba(0, 255, 136, 0.3);
                border-radius: 25px;
                padding: 10px 20px;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #00ff88;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 25px;
                margin: 40px 0;
            }
            .card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 25px;
                transition: all 0.3s ease;
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }
            .card::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transition: left 0.5s;
            }
            .card:hover::before {
                left: 100%;
            }
            .card:hover {
                transform: translateY(-5px);
                border-color: rgba(0, 255, 136, 0.5);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            .card-icon {
                font-size: 2.5rem;
                margin-bottom: 15px;
                display: block;
            }
            .card-title {
                font-size: 1.3rem;
                font-weight: 600;
                color: #00ff88;
                margin-bottom: 10px;
            }
            .card-desc {
                color: #ccc;
                line-height: 1.5;
            }
            .metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 40px 0;
            }
            .metric {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                border-left: 4px solid #00ff88;
            }
            .metric-value {
                font-size: 2rem;
                font-weight: bold;
                color: #00ff88;
                margin-bottom: 5px;
            }
            .metric-label {
                color: #888;
                font-size: 0.9rem;
            }
            .footer {
                text-align: center;
                margin-top: 60px;
                padding: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title">🎯 PRISM v2.1</h1>
                <p class="subtitle">Intelligence Artificielle Orchestratrice Avancée</p>
                
                <div class="status-bar">
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span>Système Actif</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span>Mode TEST</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span>Auto-Évolution Active</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span>Sécurité Renforcée</span>
                    </div>
                </div>
            </div>

            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">100%</div>
                    <div class="metric-label">Disponibilité</div>
                </div>
                <div class="metric">
                    <div class="metric-value">&lt;1ms</div>
                    <div class="metric-label">Latence</div>
                </div>
                <div class="metric">
                    <div class="metric-value">15+</div>
                    <div class="metric-label">Modules Actifs</div>
                </div>
                <div class="metric">
                    <div class="metric-value">0</div>
                    <div class="metric-label">Erreurs</div>
                </div>
            </div>

            <div class="grid">
                <div class="card" onclick="window.open('/ui/prismVoiceChat.html', '_blank')">
                    <span class="card-icon">💬</span>
                    <h3 class="card-title">Chat Vocal PRISM</h3>
                    <p class="card-desc">Interface de conversation vocale interactive avec PRISM - Parlez directement à l'IA</p>
                </div>

                <div class="card" onclick="window.open('/ui/prismManualTests.html', '_blank')">
                    <span class="card-icon">🧪</span>
                    <h3 class="card-title">Tests Manuels</h3>
                    <p class="card-desc">Interface de tests interactifs pour valider les fonctionnalités PRISM</p>
                </div>

                <div class="card" onclick="window.open('/ui/InsightCenter.js', '_blank')">
                    <span class="card-icon">📊</span>
                    <h3 class="card-title">Centre d'Analyse</h3>
                    <p class="card-desc">Tableau de bord avancé avec métriques et insights en temps réel</p>
                </div>

                <div class="card" onclick="window.open('/tests/manual/prismVoiceTests-simple.html', '_blank')">
                    <span class="card-icon">🎙️</span>
                    <h3 class="card-title">Tests Vocaux Simples</h3>
                    <p class="card-desc">Interface de tests vocaux simplifiée et fonctionnelle</p>
                </div>

                <div class="card" onclick="window.open('/tests/manual/prismVoiceTests-fixed.html', '_blank')">
                    <span class="card-icon">🔧</span>
                    <h3 class="card-title">Tests Vocaux Corrigés</h3>
                    <p class="card-desc">Interface de tests vocaux avec gestion d'erreurs améliorée</p>
                </div>

                <div class="card" onclick="window.open('/diagnostic-tests.html', '_blank')">
                    <span class="card-icon">🔍</span>
                    <h3 class="card-title">Diagnostic Système</h3>
                    <p class="card-desc">Outils de diagnostic pour identifier les problèmes de test</p>
                </div>

                <div class="card" onclick="window.open('/index.html', '_blank')">
                    <span class="card-icon">🎤</span>
                    <h3 class="card-title">Tests Vocaux Avancés</h3>
                    <p class="card-desc">Interface de tests d'interaction vocale et reconnaissance avancée</p>
                </div>

                <div class="card" onclick="alert('API Endpoint: Consultez la console pour les métriques')">
                    <span class="card-icon">🔗</span>
                    <h3 class="card-title">API Métriques</h3>
                    <p class="card-desc">Accès programmatique aux données de performance</p>
                </div>

                <div class="card" onclick="window.open('/ui/AdaptiveCyclerWidget.js', '_blank')">
                    <span class="card-icon">🔄</span>
                    <h3 class="card-title">Widget Adaptatif</h3>
                    <p class="card-desc">Composant d'interface adaptatif et intelligent</p>
                </div>

                <div class="card" onclick="alert('Monitoring en cours - Consultez les logs système')">
                    <span class="card-icon">🛡️</span>
                    <h3 class="card-title">Sécurité</h3>
                    <p class="card-desc">Monitoring de sécurité et protection éthique</p>
                </div>
            </div>

            <div class="footer">
                <p>PRISM v2.1 - Intelligence Artificielle Orchestratrice Avancée</p>
                <p>Status: OPÉRATIONNEL | Mode: TEST | Heartbeat: Actif</p>
            </div>
        </div>

        <script>
            // Animation de heartbeat
            setInterval(() => {
                console.log('💓 PRISM Heartbeat -', new Date().toLocaleTimeString());
            }, 5000);

            // Simulation de métriques en temps réel
            setInterval(() => {
                const latencyEl = document.querySelector('.metric-value');
                if (latencyEl && latencyEl.textContent.includes('ms')) {
                    const randomLatency = Math.floor(Math.random() * 3) + 1;
                    latencyEl.textContent = '<' + randomLatency + 'ms';
                }
            }, 3000);

            console.log('%c🎯 PRISM v2.1 Interface Web Chargée', 'color: #00ff88; font-size: 1.2em; font-weight: bold;');
            console.log('%c📊 Système opérationnel et prêt', 'color: #00ccff;');
        </script>
    </body>
    </html>
  `);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('🚀 Serveur PRISM Interface démarré');
  console.log(`✨ Interface disponible sur: http://localhost:${PORT}`);
  console.log('🎯 PRISM v2.1 - Interface Web Active');
}); 