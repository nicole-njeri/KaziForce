-- Client verification requests contain only non-sensitive statements; this
-- feature does not collect identity or business documents.
BEGIN;

CREATE TABLE client_verification_requests (
    verification_id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    verification_type VARCHAR(16) NOT NULL CHECK (verification_type IN ('identity', 'business')),
    status VARCHAR(16) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Verified', 'Rejected')),
    request_details VARCHAR(1000),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ,
    rejection_explanation VARCHAR(1000),
    internal_notes VARCHAR(2000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT client_verification_review_state_check CHECK (
      (status = 'Pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_explanation IS NULL)
      OR (status = 'Verified' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND rejection_explanation IS NULL)
      OR (status = 'Rejected' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
          AND rejection_explanation IS NOT NULL AND length(trim(rejection_explanation)) > 0)
    )
);

-- Keep at most one current request of each type. A rejected request remains
-- as history and can be corrected by creating a new request.
CREATE UNIQUE INDEX client_verification_one_active_type_idx
    ON client_verification_requests (client_id, verification_type)
    WHERE status IN ('Pending', 'Verified');
CREATE INDEX client_verification_pending_queue_idx
    ON client_verification_requests (submitted_at, verification_id)
    WHERE status = 'Pending';
CREATE INDEX client_verification_client_history_idx
    ON client_verification_requests (client_id, verification_type, submitted_at DESC, verification_id DESC);

COMMIT;
