# 🧪 Guide d'Exécution des Tests - PRISM

## Problème Connu: Espaces dans le Chemin

Vitest/Vite a des difficultés à résoudre les imports lorsque le chemin du projet contient des espaces (ex: `PRISM INCUBATEUR`).

## Solution: Lien Symbolique

Un script automatise la création d'un lien symbolique sans espaces:

```bash
./scripts/fix-vitest-paths.sh
```

Cela crée: `/Users/aminemohamed/Desktop/APP/PRISM-INCUBATEUR` → `PRISM INCUBATEUR`

## Exécution des Tests

### Option 1: Via le lien symbolique (RECOMMANDÉ)

```bash
cd /Users/aminemohamed/Desktop/APP/PRISM-INCUBATEUR/P.R.I.S.M
npm test
```

### Option 2: Depuis le répertoire original

```bash
cd /Users/aminemohamed/Desktop/APP/PRISM\ INCUBATEUR/P.R.I.S.M
npm test
```

**Note**: L'option 2 peut échouer sur certains systèmes à cause des espaces.

## Tests Spécifiques

### Tests d'intégration TrustContext

```bash
npm test -- __tests__/integration/trustContext-hybridOrchestrator.spec.ts
npm test -- __tests__/integration/trustContext-excelAnalyzer.spec.ts
npm test -- __tests__/integration/trustContext-server.spec.ts
```

### Tests en mode CI (pas de watch)

```bash
npm test -- --run
```

### Tests avec coverage

```bash
npm run coverage
```

## Validation Post-Fix

Après résolution du problème Vitest, vérifier:

```bash
# 1. Tous les tests passent
npm test

# 2. Tests d'intégration TrustContext
npm test -- __tests__/integration/

# 3. Mode CI
npm test -- --run --reporter=verbose
```

## Troubleshooting

### Erreur: "Cannot find module"

1. Vérifier que le lien symbolique existe: `ls -la /Users/aminemohamed/Desktop/APP/PRISM-INCUBATEUR`
2. Relancer `./scripts/fix-vitest-paths.sh`
3. S'assurer d'être dans le bon répertoire

### Erreur: "Module resolution failed"

1. Vérifier `vitest.config.js` ou `.vitestrc.js`
2. Nettoyer le cache: `rm -rf node_modules/.vite`
3. Réinstaller: `npm install`

## Support

Pour problèmes persistants, voir `docs/SECURITY_PROOF_MVP.md`.
