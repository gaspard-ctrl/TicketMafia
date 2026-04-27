# TicketMafia

Outil interne de ticketing pour Coachello, branché sur Slack. Chaque message dans `#00-bugs-and-changes`, `#01-features-and-ideation` ou `#super-admin-dashboards` devient un ticket avec statut, owner, deadline, photos et conversation.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Supabase** (Postgres + service role server-side, pas d'auth Supabase)
- **Netlify** (déploiement + Functions, plugin `@netlify/plugin-nextjs`)
- **Slack Events API** (one-way Slack → app via webhook)
- **Tailwind CSS** v3

## Architecture

- **Auth** : mot de passe partagé (`Coachello123` par défaut, surchargeable via `APP_PASSWORD`). Cookie de session HMAC-signé. Pas de comptes utilisateurs Supabase.
- **DB** : toutes les requêtes passent par le service role de Supabase depuis le serveur Next ; RLS désactivée.
- **Slack → app** : `POST /api/slack/events` valide la signature Slack puis :
  - Top-level message dans un channel suivi → ticket créé
  - Reply dans un thread → commentaire ajouté au ticket parent
  - `:white_check_mark:` → statut `Terminé`, `:eyes:` → `En cours`, retrait → recompute
- **Photos Slack** : proxy via `/api/files/[id]` (le serveur ajoute le bot token, le browser ne le voit jamais).

## Routes

| Route | Description |
|---|---|
| `/` | Kanban (4 colonnes, drag-and-drop pour changer le statut, filtre catégorie) |
| `/tickets/[id]` | Détail d'un ticket : body, photos (lightbox), conversation Slack, notes internes, édition statut/owner/deadline/titre |
| `/settings` | Gestion de la liste des owners assignables |
| `/admin` | Dashboard stats par owner |
| `/login` | Mot de passe |
| `/api/slack/events` | Webhook Slack (signature HMAC-SHA256) |
| `/api/files/[id]` | Proxy d'images Slack (auth requise) |

## Setup local

```bash
npm install
cp .env.example .env.local   # remplir les valeurs (voir plus bas)
npm run dev                  # http://localhost:3000
```

Pour tester le webhook Slack en local, exposer le port 3000 avec ngrok :

```bash
ngrok http 3000
# puis configurer la Request URL Slack avec https://<id>.ngrok-free.dev/api/slack/events
```

### Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

APP_PASSWORD=Coachello123

# Génération automatique des titres de tickets (Claude Haiku)
ANTHROPIC_API_KEY=

SLACK_SIGNING_SECRET=
SLACK_BOT_TOKEN=
SLACK_CHANNEL_BUGS_ID=
SLACK_CHANNEL_FEATURES_ID=
SLACK_CHANNEL_SUPER_ADMIN_ID=
```

### Migrations Supabase

Lancer dans l'ordre dans le SQL Editor Supabase :
1. [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql) — tables `tickets`, `ticket_attachments`, `ticket_comments`, `ticket_reactions`
2. [supabase/migrations/002_owners.sql](supabase/migrations/002_owners.sql) — table `owners` (devs assignables)
3. [supabase/migrations/003_super_admin_category.sql](supabase/migrations/003_super_admin_category.sql) — ajoute `super_admin` à l'enum `ticket_category`

### Slack App

Scopes requis (Bot Token Scopes) :
- `channels:history`, `channels:read`, `files:read`, `reactions:read`, `users:read`

Event Subscriptions :
- `message.channels`, `reaction_added`, `reaction_removed`

Le bot doit être membre des trois channels (`/invite @bot-name` dans chaque).

## Déploiement Netlify

1. Connecter le repo GitHub à Netlify (le build est configuré dans [netlify.toml](netlify.toml))
2. Renseigner les variables d'env (mêmes que `.env.local`) dans **Site configuration → Environment variables** (scope: All)
3. Mettre à jour la Request URL Slack vers `https://<site>.netlify.app/api/slack/events`

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve production build
npm run lint
npm run typecheck  # tsc --noEmit
```
