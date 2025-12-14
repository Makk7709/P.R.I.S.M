# PRISM — Proof-Driven Security MVP for Critical Decision Systems

## Problème

Les systèmes d’intelligence artificielle utilisés pour des décisions critiques échouent rarement par des « bugs visibles ». Les risques réels sont : acceptation silencieuse d’entrées hostiles, comportement non-déterministe sous panne, traçabilité des décisions non vérifiable, et production de faux positifs (approbations erronées). PRISM répond à ces risques en apportant des **preuves exécutables de comportement**, non des promesses.

## Ce qui est prouvé

**Fail-closed end-to-end** : Toutes les frontières critiques (entrées providers, consensus, journalisation) appliquent une validation stricte (Zod) avec rejet explicite. Aucune donnée non conforme n’est acceptée silencieusement.

**No False-Approve** : Un provider en erreur (timeout, rate-limit, parse error) ne peut jamais produire une décision « approve ». Les erreurs sont mappées vers un statut exclu du consensus (UNAVAILABLE), jamais vers APPROVE.

**Invariants de consensus prouvés** : Le système respecte l’invariance à l’ordre des votes, le respect du quorum, la monotonicité (ajouter un vote « approve » ne fait pas régresser un résultat), et le déterminisme (mêmes entrées → mêmes sorties).

**Audit log tamper-evident** : Le journal d’audit est append-only avec chaînage cryptographique (hash-chain) et signature Ed25519. Toute modification, suppression, insertion ou réordonnancement est détectée lors de la vérification.

**Comportement déterministe sous panne** : Le système produit les mêmes décisions pour les mêmes séquences d’événements d’échec (timeouts, rate limits, erreurs providers). Le non-déterminisme introduit par les pannes est éliminé par normalisation stricte.

## Comment c’est prouvé

**Property-based testing** : Les invariants sont démontrés via fast-check (200-500 runs par invariant) sur des générations aléatoires d’entrées. Les contre-exemples minimaux sont fournis en cas d’échec.

**Tests adversariaux** : Des entrées hostiles (JSON invalide, injection de prompts, erreurs réseau simulées) sont systématiquement rejetées avec statut explicite (PARSE_ERROR, SCHEMA_INVALID, PROVIDER_ERROR).

**Scripts de contrôle exécutables** : La suite de preuves est automatisée et reproductible. Commandes : `npm run test:proof` (property-based + fuzzing), `node scripts/control_proof_suite_military.mjs` (audit log), `npm run test:providers` (frontières providers). Résultats attendus : 100% tests passants, stabilité confirmée sur 5 runs consécutifs.

**Validation contractuelle stricte** : Tous les modules critiques (ConsensusManager, TrustContext, SecureJournalManager, ProviderAdapters) valident leurs entrées/sorties via schémas Zod stricts avant traitement. Les rejets sont loggés en JSON structuré avec correlationId.

## Hors périmètre (honnêteté technique)

**Certifications** : ANSSI (CC/EAL), FIPS, FedRAMP, ITAR ne sont pas engagées. PRISM est conçu pour être audit-ready, non certifié.

**Supply-chain** : Protection avancée de la chaîne d’approvisionnement (SBOM, signatures, provenance) est planifiée mais non encore incluse.

**Gestion de clés** : Interface KMS/HSM pour rotation et stockage sécurisé des clés Ed25519 est prévue, actuellement utilisation de clés locales (fichiers gitignored).

**Backups immuables** : L’ancrage périodique du hash racine du journal dans un registre externe (blockchain, ledger) est optionnel et non implémenté.

**On-premise / Air-gap** : Packaging Docker/K8s et installation offline sont planifiés (VAGUE 2), non encore livrés.

## Positionnement

PRISM n’est pas « certifié » au sens réglementaire. PRISM est **audit-ready** : toutes les preuves de sécurité sont exécutables et reproductibles. PRISM est **preuve-ready** : chaque comportement critique est démontré par tests automatisés, non par documentation.

Le système est pensé pour environnements critiques, potentiellement on-premise et air-gapped. Les frontières externes (providers IA) sont normalisées et validées strictement. Les décisions critiques passent par un consensus multi-providers avec quorum majoritaire (2/3). Toute tentative de compromission ou d’erreur est détectée et exclue du consensus, jamais acceptée silencieusement.

Les preuves sont disponibles dans le repository, exécutables via scripts automatisés, et documentées dans `docs/SECURITY_PROOF_MVP.md` et `docs/PROOF_SUITE_DOCUMENTATION.md`.
