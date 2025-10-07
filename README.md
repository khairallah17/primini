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

## Frontend (React)

- Projet Vite dans `frontend` avec React 18 et React Router.
- Pages principales : accueil, bons plans, outil magique, catégories, produits, recherche, authentification et pages d’information.
- Gestion globale :
  - Contexte `FavoritesContext` pour « Ma sélection » (persistée dans le local storage).
  - Contexte `AuthContext` pour l’authentification (stockage token + rafraîchissement utilisateur).
- Composants UI : header, footer, carrousel, cartes produit, barre de sélection flottante, filtres, etc.
- Intégration avec l’API via `axios` dans `frontend/src/api/client.js`.

## Prise en main

```bash
# Backend
cd backend
python manage.py migrate
python manage.py loaddata primini_backend/fixtures.json
python manage.py runserver

# Frontend
cd ../frontend
npm install
npm run dev
```

Configurez la variable d’environnement `VITE_API_URL` côté front si l’API n’est pas servie sur `http://localhost:8000/api/`.
