# Phase 4 — Ligue Démo : Guide de configuration et script de test

## A. Créer la Ligue Démo (via l'app en prod)

### 1. Comptes Firebase Auth à créer toi-même
Dans **Firebase Console → Authentication → Add user** :

| Rôle | Email suggéré | Notes |
|------|--------------|-------|
| Superadmin | déjà existant | Ton compte actuel |
| Owner | `owner-demo@websitex.app` | Tu ajoutes aussi le doc Firestore ci-dessous |
| Coordinateur | `coord-demo@websitex.app` | Créé via l'app (Paramètres → Coordonnateurs) |

### 2. Doc Firestore pour l'owner (à créer manuellement dans la console)
Collection `users`, doc ID = UID de l'owner créé ci-dessus :
```json
{
  "role": "owner",
  "leagueId": "ligue-demo",
  "displayName": "Admin Démo",
  "active": true
}
```

### 3. Créer la ligue dans l'app (connecté en superadmin)
- Onglet **Ligues** → Nouvelle ligue
- Nom : `Ligue Démo`
- Sport : `Basketball`
- ID : `ligue-demo` (ou l'ID généré automatiquement — note-le)

### 4. Se connecter comme owner-demo et configurer la ligue

**Gymnases** (dans Paramètres → Gymnases ou directement dans le doc league) :
- `Gymnase A`
- `Gymnase B`

**Équipes** (onglet Équipes → Ajouter) :
| Équipe | Gymnase par défaut |
|--------|--------------------|
| Eagles | Gymnase A |
| Wolves | Gymnase A |
| Raptors | Gymnase B |
| Panthers | Gymnase B |

**Joueurs** — 6 par équipe (onglet Joueurs → Ajouter) :
- Eagles : Eagle-1 à Eagle-6
- Wolves : Wolf-1 à Wolf-6
- Raptors : Raptor-1 à Raptor-6
- Panthers : Panther-1 à Panther-6

**Créer le coordinateur** (Paramètres → Coordonnateurs) :
- Nom d'affichage : `Coord Démo`
- Gymnase assigné : `Gymnase A`
→ Note le username/mot de passe généré

### 5. Ajouter les 3 matchs d'aujourd'hui
Depuis l'onglet Calendrier → Ajouter un match.
**Important** : utiliser la date d'aujourd'hui et ces heures (à recalculer le jour du test) :

| Jeu | Équipes | Gymnase | Heure | Statut attendu |
|-----|---------|---------|-------|----------------|
| A | Eagles vs Wolves | Gymnase A | Heure actuelle + 2h | À VENIR |
| B | Raptors vs Panthers | Gymnase B | Heure actuelle − 30 min | EN DIRECT |
| C | Eagles vs Raptors | Gymnase A | Heure actuelle − 70 min | SCORE À ENTRER 🟠 |

---

## B. Script de test pas-à-pas

### ÉTAPE 1 — Superadmin : créer le owner

1. Connecte-toi avec ton compte superadmin.
2. Onglet **Ligues** → vérifie que `Ligue Démo` est visible.
3. Onglet **Utilisateurs** → vérifie que `owner-demo` a bien `role: owner, leagueId: ligue-demo`.
4. ✅ Superadmin voit toutes les ligues, peut tout modifier.

---

### ÉTAPE 2 — Owner : configure la ligue et crée le coordinateur

1. Connecte-toi avec `owner-demo@websitex.app`.
2. Vérifie : seule la **Ligue Démo** est visible.
3. Onglet **Aujourd'hui** → tu dois voir les 3 matchs :
   - Match A avec badge `À VENIR`
   - Match B avec badge `EN DIRECT`
   - Match C avec badge `SCORE À ENTRER` (bordure orange)
4. Badge orange sur l'onglet Aujourd'hui dans la sidebar = **1** (Match C seulement).
5. Onglet **Paramètres → Coordonnateurs** → clique **Nouveau coordinateur** :
   - Nom : `Coord Démo`
   - Gymnase : `Gymnase A`
   - Note le username et le mot de passe temporaire affiché.
6. ✅ Le coordinateur apparaît dans la liste avec statut `actif`.

---

### ÉTAPE 3 — Coordinateur : draft, autosave, verrouillage

**Connexion initiale**
1. Connecte-toi avec le username/mot de passe du coordinateur.
2. → Écran de changement de mot de passe obligatoire. Change-le.
3. → Redirigé vers l'onglet **Aujourd'hui**.

**Vérifier la vue Aujourd'hui**
4. Sélecteur de gymnase → choisir `Gymnase A`.
5. Tu dois voir Match A (`À VENIR`) et Match C (`SCORE À ENTRER`).
6. Badge orange sur l'onglet Aujourd'hui = **1**.

**Entrer un score brouillon (Match C)**
7. Clique sur Match C (SCORE À ENTRER).
8. Écran de saisie → entre `Eagles : 72 / Raptors : 68`.
9. Entre des stats pour 2–3 joueurs (ex : Eagle-1 : 20 pts, 5 reb).
10. Clique **Sauvegarder brouillon** → message `Brouillon enregistré · HH:MM`.
11. ✅ Le score **NE s'affiche pas** sur le site public (played = false).

**Tester l'autosave**
12. Change un score → attends 30 secondes → `Brouillon enregistré · HH:MM` se met à jour automatiquement.

**Fermer et rouvrir le match**
13. Clique **Annuler** pour fermer. Reviens sur Match C → clique dessus.
14. ✅ Le score brouillon (72–68) et les stats sont rechargés.

**Bouton "Activer les rappels"**
15. Sur la page Aujourd'hui, le bouton `Activer les rappels` est visible (si permission pas encore accordée).
16. Clique → le navigateur demande la permission.

**Verrouiller le score**
17. Entre des stats pour tous les joueurs, en t'assurant que la somme des PTS = score d'équipe.
18. Clique **Verrouiller le score** → confirmation → clique `Confirmer 🔒`.
19. ✅ Match C passe à badge `VERROUILLÉ`. Badge orange sidebar = 0.

**Test : coordinateur ne peut pas modifier un match verrouillé**
20. Clique sur Match C (verrouillé) → aucun bouton de modification disponible.

**Test : coordinateur ne peut pas accéder à Équipes**
21. Dans la barre de navigation, l'onglet `Équipes` n'est pas visible.
22. Essaie de naviguer manuellement (ex. en modifiant l'URL ou en changeant l'onglet via console) → redirigé vers Aujourd'hui.

---

### ÉTAPE 4 — Owner : déverrouiller un match

1. Reconnecte-toi comme `owner-demo`.
2. Onglet **Aujourd'hui** → Match C affiche `VERROUILLÉ`.
3. Clique **Déverrouiller** (bouton amber).
4. → Confirmation modale : `Déverrouiller ce match ?` — clique **Confirmer le déverrouillage**.
5. ✅ Match C repasse à `SCORE À ENTRER` (played = false, locked = false).
6. Dans Firestore, le doc `games/{id}` doit avoir `unlockedBy: uid_owner, unlockedAt: timestamp`.
7. Le coordinateur peut maintenant modifier le score à nouveau.

---

## C. Résultat attendu

| Action | Résultat attendu |
|--------|-----------------|
| Draft sauvegardé | Site public = score original (non modifié) |
| Autosave 30s | Message `Brouillon enregistré · HH:MM` se rafraîchit |
| Verrou | `played: true`, `locked: true`, score visible sur le site public |
| Déverrouillage owner | `locked: false`, score effacé du site public, coordinateur peut modifier |
| Coordinateur sur match verrouillé | Aucun bouton, lecture seule |
| Coordinateur → onglet Équipes | Tab invisible + accès URL bloqué |
