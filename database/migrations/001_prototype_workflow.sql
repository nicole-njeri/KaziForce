-- Upgrade an existing KaziForce user/worker database for gig workflows.
-- The migration uses conditional DDL so it can be safely rerun while keeping
-- legacy records whose text identifiers cannot yet map to numeric users.
BEGIN;

ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS skills TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS client_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_name VARCHAR(150),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gigs (
    gig_id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT '',
    required_skills TEXT NOT NULL DEFAULT '',
    location VARCHAR(150) NOT NULL DEFAULT '',
    budget NUMERIC(12, 2),
    duration VARCHAR(100) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Open'
        CHECK (status IN ('Open', 'In Progress', 'Completed', 'Closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS gigs_client_created_idx ON gigs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gigs_status_created_idx ON gigs (status, created_at DESC);

-- Some earlier local databases used text IDs such as G001 without a default.
-- Keep those IDs intact and give future records unique generated IDs.
DO $$
DECLARE
    gig_id_type TEXT;
    current_max BIGINT;
BEGIN
    SELECT data_type INTO gig_id_type
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'gigs' AND column_name = 'gig_id';

    IF gig_id_type IN ('character varying', 'text') THEN
        CREATE SEQUENCE IF NOT EXISTS gigs_gig_id_seq;
        SELECT COALESCE(MAX((substring(gig_id FROM '^G([0-9]+)$'))::BIGINT), 0)
        INTO current_max
        FROM gigs
        WHERE gig_id ~ '^G[0-9]+$';
        PERFORM setval('gigs_gig_id_seq', current_max + 1, false);
        ALTER TABLE gigs ALTER COLUMN gig_id
            SET DEFAULT ('G' || lpad(nextval('gigs_gig_id_seq')::TEXT, 6, '0'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS applications (
    application_id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    gig_id INTEGER NOT NULL REFERENCES gigs(gig_id) ON DELETE CASCADE,
    cover_message TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Completed', 'Withdrawn')),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT applications_worker_gig_unique UNIQUE (worker_id, gig_id)
);
CREATE INDEX IF NOT EXISTS applications_gig_status_idx ON applications (gig_id, status);
CREATE INDEX IF NOT EXISTS applications_worker_applied_idx ON applications (worker_id, applied_at DESC);

    -- Keep text-based legacy user IDs intact. Current API-created rows store the
    -- authenticated numeric user ID as text in those legacy columns.
DO $$
DECLARE
    users_id_type TEXT;
    gigs_client_type TEXT;
    applications_worker_type TEXT;
    gigs_id_type TEXT;
    applications_gig_type TEXT;
BEGIN
    SELECT data_type INTO users_id_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'user_id';
    SELECT data_type INTO gigs_client_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'gigs' AND column_name = 'client_id';
    SELECT data_type INTO applications_worker_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'applications' AND column_name = 'worker_id';
    SELECT data_type INTO gigs_id_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'gigs' AND column_name = 'gig_id';
    SELECT data_type INTO applications_gig_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'applications' AND column_name = 'gig_id';

    IF gigs_id_type = 'integer' AND applications_gig_type IN ('character varying', 'text') THEN
        ALTER TABLE applications ALTER COLUMN gig_id TYPE INTEGER USING gig_id::INTEGER;
    ELSIF gigs_id_type IN ('character varying', 'text') AND applications_gig_type = 'integer' THEN
        ALTER TABLE applications ALTER COLUMN gig_id TYPE VARCHAR USING gig_id::TEXT;
    END IF;

    -- Older local installs stored numeric user IDs as text in gigs.client_id.
    -- Convert only when every value maps exactly to an existing user, so adding
    -- the FK does not reinterpret or discard a legacy client identifier.
    IF users_id_type = 'integer'
       AND gigs_client_type IN ('character varying', 'text')
       AND NOT EXISTS (
           SELECT 1 FROM gigs g
           WHERE NOT EXISTS (
               SELECT 1 FROM users u WHERE u.user_id::text = g.client_id::text
           )
       ) THEN
        ALTER TABLE gigs ALTER COLUMN client_id TYPE INTEGER
            USING client_id::INTEGER;
        gigs_client_type := users_id_type;
    END IF;

    IF gigs_client_type = users_id_type AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigs_client_id_fkey') THEN
        ALTER TABLE gigs ADD CONSTRAINT gigs_client_id_fkey
          FOREIGN KEY (client_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF applications_worker_type = users_id_type AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_worker_id_fkey') THEN
        ALTER TABLE applications ADD CONSTRAINT applications_worker_id_fkey
          FOREIGN KEY (worker_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF applications_gig_type = gigs_id_type AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_gig_id_fkey') THEN
        ALTER TABLE applications ADD CONSTRAINT applications_gig_id_fkey
          FOREIGN KEY (gig_id) REFERENCES gigs(gig_id) ON DELETE CASCADE NOT VALID;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS worker_reviews (
    review_id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE REFERENCES applications(application_id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS worker_reviews_worker_created_idx ON worker_reviews (worker_id, created_at DESC);

COMMIT;
