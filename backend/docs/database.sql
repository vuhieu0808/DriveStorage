-- =====================================================
-- Extensions
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS public;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE public.users (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    "userName" varchar(50) NOT NULL UNIQUE,
    "email" varchar(255) NOT NULL UNIQUE,
    "hashedPassword" varchar(255) NOT NULL,

    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- FOLDERS
-- =====================================================

CREATE TABLE public.folders (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    "userId" uuid NOT NULL
        REFERENCES public.users("id")
        ON DELETE CASCADE,

    "folderName" varchar(255) NOT NULL,

    -- NULL = Root Folder
    "parentId" uuid
        REFERENCES public.folders("id")
        ON DELETE CASCADE,

    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT "chk_folder_not_self_parent"
        CHECK ("parentId" IS NULL OR "parentId" <> "id"),

    CONSTRAINT "uq_folder_name_per_parent"
        UNIQUE ("userId", "parentId", "folderName")
);

COMMENT ON COLUMN public.folders."parentId"
IS 'NULL = Root Folder';

-- =====================================================
-- DRIVE ACCOUNTS
-- =====================================================

CREATE TABLE public.drive_accounts (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    "userId" uuid NOT NULL
        REFERENCES public.users("id")
        ON DELETE CASCADE,

    "email" varchar(255) NOT NULL,

    "accessToken" text,
    "refreshToken" text NOT NULL,

    "totalSpace" bigint NOT NULL DEFAULT 16106127360,
    "usedSpace" bigint NOT NULL DEFAULT 0,

    -- online, offline, full, error
    "status" varchar(20) NOT NULL DEFAULT 'online',

    CONSTRAINT "uq_drive_account_email"
        UNIQUE ("userId", "email")
);

COMMENT ON COLUMN public.drive_accounts."status"
IS 'online, offline, full, error';

-- =====================================================
-- FILES
-- =====================================================

CREATE TABLE public.files (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    "userId" uuid NOT NULL
        REFERENCES public.users("id")
        ON DELETE CASCADE,

    "folderId" uuid
        REFERENCES public.folders("id")
        ON DELETE SET NULL,

    "fileName" varchar(255) NOT NULL,

    "fileSize" bigint NOT NULL,

    "mimeType" varchar(255),

    "isSplitted" boolean NOT NULL DEFAULT false,

    -- uploading, completed, failed
    "status" varchar(20) NOT NULL DEFAULT 'uploading',

    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.files."status"
IS 'uploading, completed, failed';

-- =====================================================
-- FILE CHUNKS
-- =====================================================

CREATE TABLE public.file_chunks (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    "fileId" uuid NOT NULL
        REFERENCES public.files("id")
        ON DELETE CASCADE,

    "chunkIndex" integer NOT NULL,

    "startIndex" bigint NOT NULL,
    "endIndex" bigint NOT NULL,

    "googleFileId" varchar(255) NOT NULL,

    "driveAccountId" uuid NOT NULL
        REFERENCES public.drive_accounts("id")
        ON DELETE CASCADE,

    CONSTRAINT "uq_file_chunk"
        UNIQUE ("fileId", "chunkIndex")
);

-- =====================================================
-- SESSIONS (Quản lý phiên đăng nhập / Refresh Token)
-- =====================================================

CREATE TABLE public.sessions (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    "userId" uuid NOT NULL
        REFERENCES public.users("id")
        ON DELETE CASCADE,

    "refreshToken" text NOT NULL UNIQUE,
    
    "expiredAt" timestamptz NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX "idx_folders_user"
    ON public.folders ("userId");

CREATE INDEX "idx_folders_parent"
    ON public.folders ("parentId");

CREATE INDEX "idx_files_user"
    ON public.files ("userId");

CREATE INDEX "idx_files_folder"
    ON public.files ("folderId");

CREATE INDEX "idx_chunks_file"
    ON public.file_chunks ("fileId");

CREATE INDEX "idx_chunks_drive_account"
    ON public.file_chunks ("driveAccountId");

CREATE INDEX "idx_drive_accounts_user"
    ON public.drive_accounts ("userId");

CREATE INDEX "idx_sessions_user"
    ON public.sessions ("userId");

CREATE INDEX "idx_sessions_refresh_token"
    ON public.sessions ("refreshToken");

-- =====================================================
-- OPTIONAL UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();