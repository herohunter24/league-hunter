# Activation des alertes courriel NLS

Suis ce guide dans l'ordre exact. Chaque étape doit être complétée avant de passer à la suivante.

---

## Étape 1 — Passer au plan Firebase Blaze (obligatoire pour les Cloud Functions)

1. Ouvre la [console Firebase](https://console.firebase.google.com/project/league-hunter)
2. Dans le menu de gauche, clique sur **Usage and billing**
3. Clique **Modify plan** → sélectionne **Blaze (pay as you go)**
4. Entre une carte de crédit

> **Coût estimé pour NLS :** la facturation ne commence qu'une fois le tier gratuit dépassé.
> - Cloud Functions : 2 millions d'appels/mois gratuits → ~0 $ pour une ligue
> - Firestore : 50 000 lectures/jour gratuites → ~0 $ pour une ligue
> - **Total habituel : 0 – 2 $/mois**

---

## Étape 2 — Créer un compte Resend et configurer le domaine

1. Crée un compte sur [resend.com](https://resend.com)
2. Dans **Domains**, clique **Add Domain** → entre `nlscreation.com`
3. Resend te donnera 3 enregistrements DNS à ajouter chez ton registraire (ex: Namecheap, GoDaddy) :

   | Type | Nom | Valeur |
   |------|-----|--------|
   | TXT  | `@` ou `nlscreation.com` | `v=spf1 include:spf.resend.com ~all` |
   | TXT  | `resend._domainkey` | Clé DKIM fournie par Resend |
   | TXT  | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:alertes@nlscreation.com` |

4. Attends que Resend confirme la vérification du domaine (peut prendre jusqu'à 48 h, souvent 5 min)
5. Dans **API Keys**, clique **Create API Key** → nomme-la `nls-prod`, scope: **Sending access** → copie la clé

---

## Étape 3 — Stocker la clé API Resend dans Firebase

Dans un terminal, depuis le dossier du projet :

```bash
firebase login
firebase functions:secrets:set RESEND_API_KEY
```

Colle la clé API Resend quand demandé. Elle sera stockée de façon sécurisée — jamais dans le code.

---

## Étape 4 — Déployer les Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Vérifie dans la console Firebase → **Functions** que les 8 fonctions sont déployées avec le statut vert :
- `nlsSubscribe`, `nlsConfirm`, `nlsPrefs`, `nlsUnsubscribe`
- `nlsAdminSubs`, `nlsAdminDelSub`, `nlsAdminSend`
- `nlsReminders` (planifiée), `nlsGameAlert` (déclencheur Firestore)

---

## Étape 5 — Déployer les règles Firestore

Révise d'abord le fichier `firestore.rules` pour t'assurer qu'il correspond à ce que tu veux, puis :

```bash
firebase deploy --only firestore:rules
```

> ⚠️ **Ne déploie pas les règles avant les fonctions.** Les règles bloquent l'écriture directe dans `subscribers` — les fonctions doivent déjà être en place pour que l'inscription fonctionne.

---

## Étape 6 — Tester avec TON adresse courriel seulement

Teste chaque flux dans l'ordre, avec uniquement ton adresse `mikenzessi@gmail.com` :

- [ ] **Inscription** : ouvre le site public `?league=1781288565754`, clique "Recevoir les alertes", entre ton courriel, soumets → reçois le courriel de confirmation
- [ ] **Confirmation** : clique le lien dans le courriel → page "Abonnement confirmé" s'affiche
- [ ] **Rappel 24 h** : dans l'admin Alertes → "Envoyer test" → reçois le courriel de rappel
- [ ] **Changement d'horaire** : modifie la date d'un match dans l'admin → reçois l'alerte de changement
- [ ] **Score** : entre un score dans l'admin → reçois l'alerte de résultat
- [ ] **Désabonnement** : clique "Me désabonner" dans le courriel → page de confirmation

---

## Étape 7 — Activer les alertes pour tous

Dans l'admin → onglet **Alertes** :
- Active le switch **Alertes actives**
- Le bouton "Recevoir les alertes" sur le site public affichera maintenant le vrai formulaire d'inscription

---

## Coûts mensuels réalistes

| Service | Tier gratuit | Coût au-delà |
|---------|-------------|--------------|
| Resend | 3 000 emails/mois, 100/jour | **20 $/mois** (Pro, emails illimités) |
| Firebase Functions | 2 M appels/mois | ~0,40 $/million d'appels |
| Firebase Firestore | 50 K lectures/jour | ~0,06 $/100 K lectures |
| **Total pour une ligue active** | | **0 – 22 $/mois** |

> La limite de 100 emails/jour sur le tier gratuit Resend peut être atteinte rapidement lors d'un match populaire. Passe au plan Pro (~20 $/mois) avant d'activer si tu as plus de 100 abonnés.
