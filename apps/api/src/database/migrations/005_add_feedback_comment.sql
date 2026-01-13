-- ============================================================
-- Migration: Add comment to incident_feedback
-- ============================================================

ALTER TABLE incident_feedback
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Drop unique constraint if we want to allow multiple feedbacks (or comments) from same user?
-- For now, keeping the unique constraint means a user can only have one feedback (confirm/reject) per incident.
-- If they want to comment again, they might need to update.
-- But usually comments are separate.
-- However, the code uses the same table for both "type" (vote) and "comment".
-- Let's assume the user updates their feedback to include a comment.

-- If we want to allow multiple comments, we would need to redesign. 
-- But based on my frontend change: 
-- incident.incident_feedback.map((fb: any) => ...
-- It iterates. So it implies multiple rows.
-- But the constraint UNIQUE (incident_id, user_id) prevents multiple rows per user.
-- So a user can only have ONE comment/vote pair.
-- That is acceptable for a simple "Vote + Comment" system.

-- No other changes needed.
