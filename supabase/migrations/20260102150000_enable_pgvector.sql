-- Migration: Enable pgvector extension for vector similarity search
-- Run this in Supabase SQL Editor or via CLI

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
