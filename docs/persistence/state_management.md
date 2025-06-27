# Gestion de la Persistance de l'État de PRISM

Ce document décrit le fonctionnement du système de persistance de l'état de PRISM, basé sur une base de données locale SQLite.

## 1. Contexte et Objectif

La version initiale de PRISM sauvegardait l'état de ses modules dans un unique fichier JSON (`.prism-state.json`). Cette approche présentait plusieurs limitations :

- **Manque de fiabilité :** Risque de corruption du fichier en cas d'arrêt brutal de l'application.
- **Performances faibles :** Lecture et réécriture de l'intégralité du fichier à chaque modification.
- **Scalabilité limitée :** Le système devenait de plus en plus lent à mesure que le fichier grossissait.

Pour pallier ces problèmes, le système de persistance a été migré vers une base de données **SQLite**.

## 2. Architecture de la Solution

La nouvelle solution s'articule autour de deux composants principaux :

### `backend/database.js`

- **Rôle :** Gère la connexion à la base de données.
- **Fonctionnement :** Utilise la librairie `better-sqlite3` pour se connecter à un fichier de base de données situé à `data/prism.db`. Au premier lancement, il crée la base de données et la table `memories` si elles n'existent pas.
- **Structure de la table `memories` :**
  - `key` (TEXT, PRIMARY KEY) : L'identifiant unique de l'état à sauvegarder (ex: `'codex_main'`).
  - `data` (TEXT) : Les données de l'état, stockées sous forme de chaîne JSON.
  - `timestamp` (INTEGER) : La date de la dernière sauvegarde en millisecondes.

### `persistence/prismStateStore.js`

- **Rôle :** Agit comme une interface entre les modules de PRISM et la base de données. Il expose des méthodes simples (`saveState`, `loadState`) qui cachent la complexité des requêtes SQL.
- **Fonctionnement :**
  - `saveState(key, data)` : Insère ou met à jour une ligne dans la table `memories`.
  - `loadState(key)` : Récupère une ligne spécifique par sa clé.
  - **Gestion du TTL :** La logique de durée de vie de 24h (`DEFAULT_TTL`) est conservée. Si un état est chargé mais que sa date de sauvegarde est trop ancienne, il est supprimé de la base de données et la fonction retourne `null`.

## 3. Avantages de la nouvelle approche

- **Fiabilité :** SQLite est transactionnel (ACID), ce qui garantit l'intégrité des données.
- **Performance :** Les opérations sont atomiques et indexées, ce qui est bien plus rapide que de manipuler un gros fichier JSON.
- **Scalabilité :** La solution peut gérer un très grand nombre de souvenirs sans dégradation des performances.
- **Zéro Dépendance Externe :** La base de données est un simple fichier local, l'application reste entièrement autonome.

## 4. Tests

Le bon fonctionnement de ce module est validé par une suite de tests automatisés située dans :
`__tests__/persistence/prismStateStore.sqlite.test.js`

Ce test vérifie tous les cas d'usage : création, lecture, mise à jour, et expiration des données. Pour l'exécuter, lancez la commande de test globale du projet. 