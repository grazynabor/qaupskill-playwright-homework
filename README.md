# QA Upskill

Monorepo with:

- `apps/web`: Astro + React frontend
- `apps/api`: Express + SQLite REST API with Swagger docs

Functional documentation:

- [docs/requirements.md](/Users/mkp/Desktop/Workshop/docs/requirements.md)

## Run locally

```bash
npm install
npm run dev
```

Frontend:

- `http://localhost:4321`

API:

- `http://localhost:4000`

Swagger:

- `http://localhost:4000/docs`

## Reset database

Clears all users and sticky notes, then re-creates the bootstrap admin:

```bash
npm run reset-db
```

## Bootstrap admin

- Email: `admin@qaupskill.local`
- Password: `Admin123!`

Override with environment variables:

- `QA_UPSKILL_ADMIN_EMAIL`
- `QA_UPSKILL_ADMIN_PASSWORD`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `PUBLIC_API_URL`
