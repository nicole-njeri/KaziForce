-- =========================================================
-- KaziForce Database Schema
-- =========================================================
-- Database: kaziforce
-- DBMS: PostgreSQL
-- Purpose: Defines the database structure for KaziForce
-- =========================================================


-- =========================================================
-- USERS
-- Stores authentication and basic user information.
-- =========================================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- WORKER PROFILES
-- Stores professional information for workers.
-- Each worker has one profile linked to their user account.
-- =========================================================

CREATE TABLE worker_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    bio TEXT,
    experience_years INTEGER,
    education VARCHAR(255),
    availability VARCHAR(100),
    skills TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_worker_profile_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Client profiles are separate from authentication records so organization
-- details can be added without changing login fields.
CREATE TABLE client_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_name VARCHAR(150),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gigs belong to one client. Status checks keep the marketplace workflow
-- values consistent across the API and database.
CREATE TABLE gigs (
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

CREATE INDEX gigs_client_created_idx ON gigs (client_id, created_at DESC);
CREATE INDEX gigs_status_created_idx ON gigs (status, created_at DESC);

-- Each worker may apply to a given gig once; cascading FKs keep application
-- records attached to existing users and gigs.
CREATE TABLE applications (
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

CREATE INDEX applications_gig_status_idx ON applications (gig_id, status);
CREATE INDEX applications_worker_applied_idx ON applications (worker_id, applied_at DESC);

-- One client review is stored per application, with a database-enforced
-- rating range and references to the client, worker, and application.
CREATE TABLE worker_reviews (
    review_id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE REFERENCES applications(application_id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS skills TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX worker_reviews_worker_created_idx ON worker_reviews (worker_id, created_at DESC);
