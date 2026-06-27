-- Phase 3 Migration: Add is_ai_excluded to documents
-- Timestamp: 20260614184851

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_ai_excluded BOOLEAN DEFAULT FALSE NOT NULL;
