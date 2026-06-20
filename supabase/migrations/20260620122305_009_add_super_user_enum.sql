-- Add SUPER_USER role to the existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_USER' BEFORE 'ADMIN';
