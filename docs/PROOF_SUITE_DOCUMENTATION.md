# 🔬 Proof Suite - Documentation (Property-Based Testing + Fuzzing)

**Date**: 2025-12-12  
**Module**: `__tests__/properties/` + `__tests__/fuzz/`  
**Objectif**: Prouver des lois (invariants), pas tester des exemples

---

## 📋 Vue d'Ensemble

La Proof Suite utilise **Property-Based Testing** (fast-check) pour prouver que les modules critiques respectent des invariants mathématiques et de sécurité, plutôt que de tester des cas spécifiques.

**Principe**: Générer des milliers d'entrées aléatoires et vérifier qu'une propriété reste toujours vraie.

---

## 🎯 Invariants Prouvés

### ConsensusManager

#### A) Invariance à l'ordre
**Propriété**: `result(votes) == result(shuffle(votes))`

**Test**: `__tests__/properties/consensus.properties.test.ts` - "Invariance à l'ordre des votes"

**Preuve**: Pour un ensemble de votes identiques, permuter l'ordre ne change jamais le résultat final.

---

#### B) Quorum / votes valides
**Propriété**: Si `nb_votes_valides < quorum` => `NO_CONSENSUS`

**Test**: `__tests__/properties/consensus.properties.test.ts` - "Quorum / votes valides"

**Preuve**: 
- Les abstain/timeouts/unavailable sont exclus du calcul du quorum
- Consensus non atteint si approvals < 2 (quorum = 2/3 de 3 = 2)

---

#### C) Monotonicité
**Propriété**: Ajouter un vote "approve" ne fait pas passer `APPROVED → REJECTED`

**Test**: `__tests__/properties/consensus.properties.test.ts` - "Monotonicité"

**Preuve**: Le système ne "régresse" pas: une fois `APPROVED`, ajouter un `APPROVE` supplémentaire ne peut pas faire passer à `REJECTED`.

---

#### D) Déterminisme
**Propriété**: Même input => même output (verdict + status)

**Test**: `__tests__/properties/consensus.properties.test.ts` - "Déterminisme"

**Preuve**: Deux instances avec mêmes inputs produisent exactement les mêmes résultats (pas de random/time dependency).

---

#### E) Bornes de sécurité / Fail-Closed
**Propriété**: Tout vote hors schéma => rejet explicite

**Test**: `__tests__/properties/consensus.properties.test.ts` - "Bornes de sécurité / Fail-Closed"

**Preuve**: Validation fail-closed rejette systématiquement les entrées invalides.

---

### Journal / Audit Log

#### F) Append→Verify
**Propriété**: Après N appends valides, `verifyAuditLog()` retourne `OK`

**Test**: `__tests__/properties/journal.properties.test.ts` - "Append→Verify Invariant"

**Preuve**: Génération de N events aléatoires (1-50), append, puis verify toujours OK.

---

#### G) Tamper Detection
**Propriété**: Modification aléatoire d'un champ => verify FAIL toujours

**Test**: `__tests__/properties/journal.properties.test.ts` - "Tamper Detection (Property)"

**Preuve**: 
- Génération de N events
- Corruption aléatoire d'un record (modification champ)
- Verify échoue systématiquement (`HASH_MISMATCH` ou `SIG_INVALID`)

---

#### H) Rotation
**Propriété**: Rotation déclenchée, verify sur tous segments => OK

**Test**: `__tests__/properties/journal.properties.test.ts` - "Rotation"

**Preuve**: Génération de N events avec `maxFileSize` petit pour forcer rotation, verify sur tous segments passe.

---

### ProviderAdapters (VAGUE 1.4)

#### A) No False-Approve (Invariant Majeur)
**Propriété**: ProviderResult avec `status !== OK` ne peut jamais produire `verdict=approve`

**Test**: `__tests__/properties/providers.properties.test.ts` - "No False-Approve"

**Preuve**:
- ProviderResult avec `status ERROR` → `verdict` doit être `undefined` (pas `approve`)
- Validation Zod rejette `status ERROR + verdict present`
- ConsensusManager mappe `status !== OK` → `VoteType.UNAVAILABLE` (jamais `APPROVE`)

---

#### B) Déterminisme sous échec
**Propriété**: Même set d'événements d'échec (timeouts/rate-limit/etc) => même décision

**Test**: `__tests__/properties/providers.properties.test.ts` - "Déterminisme sous échec"

**Preuve**: Deux instances avec même séquence d'erreurs providers produisent même décision consensus.

---

#### C) Fail-Closed Strict (ProviderResult Validation)
**Propriété**: `verdict/confidence` présents uniquement si `status === OK`

**Test**: `__tests__/properties/providers.properties.test.ts` - "Fail-Closed Strict"

**Preuve**:
- Validation rejette `status ERROR + verdict present`
- Validation rejette `status OK + verdict absent`

---

### Providers Adversarial Tests

#### Parsing / Injection / Erreurs
**Test**: `__tests__/adversarial/providers.adversarial.test.ts`

**Cas hostiles testés**:
- JSON invalide → PARSE_ERROR ou SCHEMA_INVALID
- Champs manquants → SCHEMA_INVALID
- Verdict hors enum → SCHEMA_INVALID
- Confidence hors [0..1] → SCHEMA_INVALID
- Prompt injection → Rejet (pas d'influence sur verdict)
- Rate limit → RATE_LIMIT (status != OK)
- Timeout → TIMEOUT (status != OK)
- Provider error → PROVIDER_ERROR (status != OK)

**Preuve**: Tous les cas hostiles retournent `status != OK`, jamais acceptés silencieusement.

---

### Contracts (Fuzzing)

#### I) Fail-Closed sur Entrées Hostiles
**Propriété**: `validateStrict()` rejette systématiquement entrées hostiles

**Test**: `__tests__/fuzz/contracts.fuzz.test.ts`

**Entrées hostiles testées:**
- Clés manquantes
- Types faux
- Clés inconnues (strict mode)
- Valeurs extrêmes (Unicode, très longues)

**Preuve**: 0 acceptation inattendue (fail-closed garanti).

---

## 🚀 Exécution

### Property Tests

```bash
# Tous les property tests
npm run test:properties

# Consensus uniquement
npm run test:properties -- __tests__/properties/consensus.properties.test.ts

# Journal uniquement
npm run test:properties -- __tests__/properties/journal.properties.test.ts

# Providers uniquement
npm run test:properties -- __tests__/properties/providers.properties.test.ts
```

### Providers Tests

```bash
# Property + Adversarial (providers)
npm run test:providers
```

### Fuzz Tests

```bash
# Tous les fuzz tests
npm run test:fuzz
```

### Proof Suite Complète

```bash
# Property + Fuzz
npm run test:proof

# Proof Suite complète (incluant providers)
npm run test:proof:full

# Ou via les scripts de contrôle
node scripts/control_proof_suite_military.mjs
node scripts/control_providers_military.mjs
```

---

## ⚙️ Configuration

### fast-check

**NumRuns**: 30-500 (selon test)
- Consensus: 100-200 runs
- Journal: 30-100 runs (réduit car manipulation fichiers)
- Providers: 30-50 runs (réduit pour stabilité)
- Fuzz: 100-300 runs

**Timeout**: 10-60 secondes par test

**Génération**:
- Consensus: Votes aléatoires pour tous providers
- Journal: Events aléatoires (1-50)
- Providers: ProviderResult valides (OK/ERROR) via helpers (pas JSON arbitraire)
- Fuzz: Objets aléatoires proches des schémas

---

## 📊 Résultats Attendus

### Consensus Properties

```
✅ A) Invariance à l'ordre: PASS (200 runs)
✅ B) Quorum: PASS (100 runs)
✅ C) Monotonicité: PASS (100 runs)
✅ D) Déterminisme: PASS (200 runs)
✅ E) Fail-Closed: PASS (tests unitaires)
```

### Journal Properties

```
✅ F) Append→Verify: PASS (100 runs)
✅ G) Tamper Detection: PASS (50 runs)
✅ H) Rotation: PASS (30 runs)
```

### Providers Properties

```
✅ A) No False-Approve: PASS (50 runs)
✅ B) Déterminisme sous échec: PASS (50 runs)
✅ C) Fail-Closed Strict: PASS (30 runs)
```

### Providers Adversarial

```
✅ JSON Invalide: PASS
✅ Champs Manquants: PASS
✅ Verdict Hors Enum: PASS
✅ Confidence Hors [0..1]: PASS
✅ Prompt Injection: PASS
✅ Rate Limit: PASS
✅ Timeout: PASS
✅ Provider Error: PASS
✅ Validation ProviderResult: PASS
✅ Edge Cases: PASS
```

### Fuzz Tests

```
✅ DecisionProposalSchema: PASS (200-300 runs)
✅ VoteSchema: PASS (200 runs)
✅ CriticalDecisionRequestSchema: PASS (200 runs)
✅ JournalEntryInputSchema: PASS (200 runs)
```

---

## 🔍 Contre-Exemples

Si un invariant échoue, fast-check génère un **contre-exemple minimal** (shrinking).

**Exemple**:
```
Property failed after 42 tests
{ seed: 12345, path: "42:0:0:3:0", endOnFailure: true }
Counterexample: ["test-hash", {data: "x"}, "critical", [["gpt-4.1", "approve", "test"]]]
Shrunk 15 time(s)
```

**Action**: Analyser le contre-exemple et corriger le bug ou ajuster l'invariant.

---

## 🎯 Invariants Non Couverts (Futurs)

### Robustesse Edge Cases
- Consensus avec tous providers `UNAVAILABLE`
- Consensus avec timeout avant quorum
- Journal avec corruption inter-segments

### Performance
- Latence bornée (append < 10ms)
- Throughput minimum (100 events/sec)

### Concurrent Access
- Thread-safety (si multi-thread)
- Race conditions (append simultané)

### Recovery
- Crash recovery (reprise après crash)
- Corruption partielle (récupération)

---

## 📝 Maintenance

### Ajouter un Nouvel Invariant

1. Identifier la propriété mathématique
2. Écrire le test property-based:
   ```typescript
   it('DOIT respecter propriété X', async () => {
     await fc.assert(
       fc.asyncProperty(
         arbitrary1,
         arbitrary2,
         async (input1, input2) => {
           // Test propriété
           expect(propertyHolds(input1, input2)).toBe(true);
         }
       ),
       { numRuns: 200 }
     );
   });
   ```
3. Exécuter et valider
4. Documenter dans cette doc

### Ajuster NumRuns

- **Augmenter** si tests flaky (100 → 500)
- **Réduire** si trop lent (500 → 100)

---

## ✅ Validation CI

**Job**: `.github/workflows/property-tests.yml`

**Configuration**:
- Timeout: 5 minutes total (2 min consensus, 2 min journal, 1 min fuzz)
- Runs: 200 (consensus), 100 (journal), 200 (fuzz)
- Reporter: verbose
- Triggers: PR + push sur `main`/`develop` (si fichiers critiques modifiés)

**Gate**: Échec si un invariant échoue

**Exécution locale:**
```bash
# Simuler CI
npm ci --legacy-peer-deps
npm run test:proof
```

---

*Document créé: 2025-12-12*  
*Status: ✅ Proof Suite implémentée et validée*
