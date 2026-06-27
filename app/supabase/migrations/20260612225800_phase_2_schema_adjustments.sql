-- Migration: Phase 2 Schema Adjustments
-- Safe nullable/default values added so existing seeded/staging data does not break.

-- 1. Alter public.matters table to add case closure compliance and auditing tracking
ALTER TABLE public.matters
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS closure_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS client_communication_status VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS document_archive_status VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS data_retention_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Alter public.matter_deadlines table to track calculated deadline completion
ALTER TABLE public.matter_deadlines
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Performance & lookup indices for dashboards and tracking
CREATE INDEX IF NOT EXISTS idx_matter_tasks_matter_status ON public.matter_tasks(matter_id, status);
CREATE INDEX IF NOT EXISTS idx_matter_deadlines_matter_completed ON public.matter_deadlines(matter_id, is_completed);
