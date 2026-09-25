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