# Primini.ma Clone

Ce dépôt contient une application full-stack qui reproduit l’expérience de Primini.ma. Elle est constituée d’une API Django Rest Framework et d’un front-end React propulsé par Vite.

## Backend (Django)

- Projet : `backend/primini_backend`
- Applications :
  - `products` : catégories, produits, marchands, offres, promotions et produits populaires.
  - `alerts` : alertes de prix liées aux utilisateurs.
  - `pages` : contenu éditorial (pages statiques et FAQ).
  - `users` : modèle utilisateur personnalisé avec authentification par e-mail.
- Authentification via `dj-rest-auth` et `django-allauth` (endpoints `api/auth/`).
- Filtrage et recherche disponibles pour les produits (prix, marque, tags, recherche textuelle).
- Fixtures d’exemple dans `backend/primini_backend/fixtures.json`.

## Frontend (Next.js)

- Application Next.js 14 + TypeScript dans `frontend` avec le routeur App.
- Pages principales : accueil, bons plans, outil magique, catégories, produits, recherche, authentification et pages d’information.
- Gestion globale :
  - Contexte `FavoritesContext` pour « Ma sélection » (persistée dans le local storage).
  - Contexte `AuthContext` pour l’authentification (stockage token + récupération du profil).
- Composants UI : header, footer, carrousel, cartes produit, barre de sélection flottante, filtres, etc.
- Intégration avec l’API via `axios` et un client centralisé (`frontend/lib/apiClient.ts`).

## Prise en main

```bash
# Backend
cd backend
python manage.py migrate
python manage.py loaddata primini_backend/fixtures.json
python manage.py runserver

# Frontend (Next.js)
cd ../frontend
npm install
npm run dev
```

Configurez la variable d’environnement `NEXT_PUBLIC_API_BASE_URL` côté front si l’API n’est pas servie sur `http://localhost:8000/api/`.
