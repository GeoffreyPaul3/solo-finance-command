-- ============================================================================
-- SoloOS Phase 12: Creator Assets Storage Bucket
-- Migration: 20260922230000_phase12_creator_assets_storage.sql
-- ============================================================================

-- 1. Create the creator-assets storage bucket (public so download URLs work)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-assets',
  'creator-assets',
  true,
  52428800, -- 50 MB per file
  ARRAY[
    'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif',
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'text/plain', 'text/html',
    'video/mp4', 'video/quicktime',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: Public read (anyone can download brand assets)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Creator Assets Public Read'
  ) THEN
    CREATE POLICY "Creator Assets Public Read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'creator-assets');
  END IF;
END $$;

-- 3. RLS: Only platform admins can insert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Creator Assets Admin Insert'
  ) THEN
    CREATE POLICY "Creator Assets Admin Insert"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'creator-assets'
        AND public.is_platform_admin(auth.uid())
      );
  END IF;
END $$;

-- 4. RLS: Only platform admins can update
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Creator Assets Admin Update'
  ) THEN
    CREATE POLICY "Creator Assets Admin Update"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'creator-assets'
        AND public.is_platform_admin(auth.uid())
      );
  END IF;
END $$;

-- 5. RLS: Only platform admins can delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Creator Assets Admin Delete'
  ) THEN
    CREATE POLICY "Creator Assets Admin Delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'creator-assets'
        AND public.is_platform_admin(auth.uid())
      );
  END IF;
END $$;

-- 6. Remove placeholder/dummy seed data inserted by previous migration
DELETE FROM public.creator_assets
WHERE url LIKE 'https://solofinance.app/brand/%';
