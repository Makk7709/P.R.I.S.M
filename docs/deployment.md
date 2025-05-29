# Guide de déploiement de P.R.I.S.M.

Ce guide vous aidera à déployer P.R.I.S.M. en production de manière sécurisée et efficace.

## Prérequis

### Environnement

- Node.js 16.x ou supérieur
- npm 8.x ou supérieur
- Un serveur web (Nginx, Apache, etc.)
- Un certificat SSL valide
- Un domaine configuré

### Configuration système

```bash
# Vérifier les versions
node -v
npm -v

# Mettre à jour npm
npm install -g npm@latest
```

## Processus de déploiement

### 1. Préparation

#### Configuration de l'environnement

1. Créez un fichier `.env.production`
   ```env
   NODE_ENV=production
   PRISM_API_KEY=votre_clé_api_production
   PRISM_DEBUG=false
   ```

2. Configurez les variables d'environnement
   ```bash
   export NODE_ENV=production
   export PRISM_API_KEY=votre_clé_api_production
   ```

#### Optimisation

1. Minifiez les assets
   ```bash
   npm run build
   ```

2. Vérifiez la taille du bundle
   ```bash
   npm run analyze
   ```

3. Optimisez les images
   ```bash
   npm run optimize-images
   ```

### 2. Construction

#### Build de production

```bash
# Nettoyage
npm run clean

# Installation des dépendances
npm ci

# Build
npm run build

# Tests de production
npm run test:prod
```

#### Vérification

1. Vérifiez les fichiers générés
   ```bash
   ls -la dist/
   ```

2. Testez localement
   ```bash
   npm run serve:prod
   ```

### 3. Déploiement

#### Configuration du serveur

1. **Nginx**
   ```nginx
   server {
       listen 443 ssl;
       server_name votre-domaine.com;

       ssl_certificate /chemin/vers/certificat.crt;
       ssl_certificate_key /chemin/vers/cle.privee;

       root /chemin/vers/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Cache
       location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
           expires 1y;
           add_header Cache-Control "public, no-transform";
       }

       # Sécurité
       add_header X-Frame-Options "SAMEORIGIN";
       add_header X-XSS-Protection "1; mode=block";
       add_header X-Content-Type-Options "nosniff";
   }
   ```

2. **Apache**
   ```apache
   <VirtualHost *:443>
       ServerName votre-domaine.com
       DocumentRoot /chemin/vers/dist

       SSLEngine on
       SSLCertificateFile /chemin/vers/certificat.crt
       SSLCertificateKeyFile /chemin/vers/cle.privee

       <Directory /chemin/vers/dist>
           Options -Indexes +FollowSymLinks
           AllowOverride All
           Require all granted
       </Directory>

       # Cache
       <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico)$">
           Header set Cache-Control "max-age=31536000, public"
       </FilesMatch>

       # Sécurité
       Header always set X-Frame-Options "SAMEORIGIN"
       Header always set X-XSS-Protection "1; mode=block"
       Header always set X-Content-Type-Options "nosniff"
   </VirtualHost>
   ```

#### Déploiement des fichiers

1. **SFTP/SCP**
   ```bash
   scp -r dist/* user@serveur:/chemin/vers/dist/
   ```

2. **Git**
   ```bash
   git push production main
   ```

3. **CI/CD**
   ```yaml
   # Exemple de configuration GitHub Actions
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Deploy
           uses: appleboy/ssh-action@master
           with:
             host: ${{ secrets.HOST }}
             username: ${{ secrets.USERNAME }}
             key: ${{ secrets.SSH_KEY }}
             script: |
               cd /chemin/vers/projet
               git pull
               npm ci
               npm run build
   ```

### 4. Vérification post-déploiement

#### Tests

1. Vérifiez l'accessibilité
   ```bash
   npm run test:a11y
   ```

2. Vérifiez les performances
   ```bash
   npm run test:perf
   ```

3. Vérifiez la sécurité
   ```bash
   npm run test:security
   ```

#### Monitoring

1. Configurez les outils de monitoring
   - Google Analytics
   - Sentry
   - New Relic
   - Datadog

2. Configurez les alertes
   - Erreurs
   - Performance
   - Disponibilité
   - Sécurité

### 5. Maintenance

#### Mises à jour

1. Mettez à jour les dépendances
   ```bash
   npm update
   npm audit fix
   ```

2. Vérifiez les vulnérabilités
   ```bash
   npm audit
   ```

3. Mettez à jour le certificat SSL
   ```bash
   certbot renew
   ```

#### Sauvegardes

1. Configurez les sauvegardes automatiques
   ```bash
   # Exemple de script de sauvegarde
   #!/bin/bash
   tar -czf backup-$(date +%Y%m%d).tar.gz /chemin/vers/dist
   ```

2. Testez la restauration
   ```bash
   # Restauration
   tar -xzf backup-YYYYMMDD.tar.gz -C /chemin/vers/restauration
   ```

## Sécurité

### Configuration SSL

1. Obtenez un certificat SSL
   ```bash
   certbot certonly --nginx -d votre-domaine.com
   ```

2. Configurez le renouvellement automatique
   ```bash
   certbot renew --dry-run
   ```

### Protection

1. Configurez un pare-feu
   ```bash
   # UFW
   ufw allow 443/tcp
   ufw allow 80/tcp
   ufw enable
   ```

2. Configurez la protection DDoS
   - Cloudflare
   - AWS Shield
   - Google Cloud Armor

## Performance

### Optimisation

1. Configurez le cache
   ```nginx
   # Nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
       expires 1y;
       add_header Cache-Control "public, no-transform";
   }
   ```

2. Activez la compression
   ```nginx
   # Nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   ```

### Monitoring

1. Configurez les métriques
   - Temps de réponse
   - Taux d'erreur
   - Utilisation des ressources
   - Disponibilité

2. Configurez les alertes
   - Seuils de performance
   - Erreurs critiques
   - Disponibilité

## Support

### Documentation

- [Nginx](https://nginx.org/en/docs/)
- [Apache](https://httpd.apache.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [Node.js](https://nodejs.org/en/docs/)

### Ressources

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/)
- [WebPageTest](https://www.webpagetest.org/) 