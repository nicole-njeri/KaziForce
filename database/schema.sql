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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_worker_profile_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);