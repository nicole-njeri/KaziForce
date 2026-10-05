# KaziForce

KaziForce is a role-based marketplace prototype for matching workers with client gigs. It uses React, Node/Express, PostgreSQL, and a Python/Flask tag-based matching service.

## Implemented flows

- Worker/client registration and worker/client/admin login with JWT-backed protected dashboards. Administrator accounts are provisioned by the project owner; public registration cannot create administrator accounts.
- Workers maintain skills and profile details, receive ranked open-gig recommendations, view gig details, apply, and see application status.
- Clients post and manage gigs, review applications, compare applicant recommendations from the matching engine, accept/reject applicants, and rate/review accepted workers.
- Administrators monitor platform counts, suspend/restore accounts, and close/reopen gigs for moderation.
- The matching engine supports live PostgreSQL records and retains its original CSV fixtures and 18 predefined validation cases.

## Local setup

1. Create a PostgreSQL database and apply `database/schema.sql` for a fresh database. Existing installations should apply `database/migrations/001_prototype_workflow.sql`.
2. Configure the backend environment using `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and optionally `MATCHING_SERVICE_URL` (defaults to `http://127.0.0.1:5001`). Keep credentials local; never commit `.env`.
3. Install and start the API:

   ```powershell
   cd backend
   npm ci
   npm run dev
   ```

4. Install the matching service dependencies and run Flask from the project root:

   ```powershell
   python -m pip install -r matching-service/requirements.txt
   python matching-service/app.py
   ```

   The service listens on port 5001 by default. Set `MATCHING_SERVICE_URL` in the backend only if it runs elsewhere.

5. Start the frontend in another terminal:

   ```powershell
   cd Frontend
   npm ci
   npm run dev
   ```

   Vite serves the UI on port 5173. The API defaults to port 5000.

## Validation

Run the preserved matching cases from the repository root:

```powershell
python matching-service/tests/test_matching_engine.py
```

Run frontend checks from `Frontend`:

```powershell
npm run lint
npm run build
```

The matching cases validate the fixed CSV examples. Live matching uses the same tag generation, scoring, and ranking code with records loaded from PostgreSQL.

## Notes

- The schema includes user roles, worker/client profile storage, gigs, applications, and worker reviews. Worker profiles can be edited in the UI; client profile storage does not yet have a client-facing API or UI. Account and gig moderation use the `is_active` user field and gig status.
- `database/schema.sql` describes a fresh database. The migration is safe to re-run and brings a database initialized with the earlier user/worker schema up to the current prototype schema.
- `REQUIREMENTS_AUDIT.md` records requirement coverage and the matching/database compatibility limits found during final review.
- The API currently uses localhost URLs in the frontend for development. Production deployment needs an API base URL configuration and deployment-specific CORS settings.
