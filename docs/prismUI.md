# PrismUI - Système de Gestion de l'Interface

## Vue d'ensemble

PrismUI est le système central de gestion de l'interface utilisateur de PRISM. Il gère tous les aspects visuels et interactifs de l'application, des états de l'interface aux animations en passant par l'accessibilité.

## Fonctionnalités principales

### 1. Gestion des états
- **États supportés** : idle, loading, success, error
- **Transitions fluides** entre les états
- **Système de heartbeat visuel** en état idle
- **Gestion des erreurs** avec système de retry

### 2. Thèmes et couleurs
- **Thèmes dynamiques** adaptés à chaque état
- **Support du mode sombre** automatique
- **Système de couleurs** cohérent et accessible
- **Transitions de couleurs** fluides

### 3. Animations
- **Heartbeat visuel** (opacity 0.8 → 1 → 0.8 sur 5s)
- **Transitions d'état** personnalisées
- **Animations de feedback** pour les interactions
- **Optimisations de performance**

### 4. Accessibilité
- **Support ARIA** complet
- **Navigation au clavier**
- **Messages d'état** vocaux
- **Contraste et lisibilité** optimisés

### 5. Console de diagnostic
- **Métriques en temps réel**
- **Suivi des erreurs**
- **Statistiques de performance**
- **Interface de débogage**

## API

### Initialisation
```javascript
const prismUI = new PrismUI();
```

### Méthodes principales

#### setUIState(state)
```javascript
prismUI.setUIState('idle'); // 'idle' | 'loading' | 'success' | 'error'
```

#### updateStatusMessage(message, type)
```javascript
prismUI.updateStatusMessage('Message de statut', 'info'); // 'info' | 'warning' | 'error'
```

#### updateTranscript(text)
```javascript
prismUI.updateTranscript('Texte de transcription');
```

#### showError(message)
```javascript
prismUI.showError('Message d\'erreur');
```

#### setTheme(theme)
```javascript
prismUI.setTheme('dark'); // 'light' | 'dark' | 'custom'
```

#### setAnimationSpeed(speed)
```javascript
prismUI.setAnimationSpeed(1.0); // 0.5 - 2.0
```

## Configuration

### Thèmes
```javascript
const themeColors = {
  idle: {
    primary: '#3B82F6',
    accent: '#60A5FA',
    bg: '#F3F4F6',
    text: '#1F2937'
  },
  loading: {
    primary: '#10B981',
    accent: '#34D399',
    bg: '#F3F4F6',
    text: '#1F2937'
  },
  success: {
    primary: '#059669',
    accent: '#10B981',
    bg: '#F3F4F6',
    text: '#1F2937'
  },
  error: {
    primary: '#DC2626',
    accent: '#EF4444',
    bg: '#F3F4F6',
    text: '#1F2937'
  }
};
```

### Animations
```javascript
const animations = {
  heartbeat: {
    duration: 5000,
    opacity: [0.8, 1]
  },
  transitions: {
    duration: 300,
    easing: 'ease-in-out'
  },
  feedback: {
    duration: 200,
    scale: [1, 1.1, 1]
  }
};
```

## Bonnes pratiques

1. **Gestion des états**
   - Toujours utiliser `setUIState()` pour les changements d'état
   - Éviter les transitions d'état trop rapides
   - Maintenir la cohérence visuelle

2. **Accessibilité**
   - Toujours fournir des alternatives textuelles
   - Maintenir un contraste suffisant
   - Utiliser les attributs ARIA appropriés

3. **Performance**
   - Optimiser les animations pour les appareils mobiles
   - Éviter les animations simultanées excessives
   - Utiliser les transitions CSS natives

## Dépannage

### Problèmes courants

1. **Heartbeat non visible**
   - Vérifier que l'état est bien 'idle'
   - Vérifier les styles CSS
   - Vérifier la console pour les erreurs

2. **Transitions saccadées**
   - Réduire le nombre d'animations simultanées
   - Vérifier les performances du navigateur
   - Optimiser les transitions CSS

3. **Problèmes d'accessibilité**
   - Vérifier les attributs ARIA
   - Tester avec un lecteur d'écran
   - Vérifier le contraste des couleurs 