# Frontend Backoffice

Backoffice React minimaliste pour configurer :

- les lieux connus
- les objets associes a chaque lieu
- les points actuellement accessibles par le robot
- les informations generales du magasin

## Demarrage

```bash
cd /Users/dwainyumco/Desktop/SDP/nono-le-robot/frontend-backoffice
cp .env.example .env
npm install
npm run dev
```

Dans `.env`, mets l'URL publique Railway du backend :

```env
VITE_API_BASE_URL=https://your-railway-backend.up.railway.app
```

Par defaut, Vite sert l'interface sur `http://localhost:5173`.

Si `VITE_API_BASE_URL` est defini, le backoffice envoie directement les requetes vers Railway pour :

- `GET /api/locations`
- `POST /api/robot/locations/sync`
- `POST /api/admin/locations/upsert`
- `POST /api/admin/location-items/replace`
- `GET /api/store-info`
- `POST /api/admin/store-info/upsert`

Le champ `URL backend` dans l'interface reste disponible pour surcharger temporairement cette URL sans modifier le code.
