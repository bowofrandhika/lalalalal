-- Add photo_url to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update role hierarchy function to include SUPER_USER
CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS boolean AS $$
DECLARE
    user_role_var user_role;
BEGIN
    SELECT role INTO user_role_var FROM app_users WHERE user_id = auth.uid();
    IF user_role_var IS NULL THEN RETURN false; END IF;
    
    CASE required_role
        WHEN 'SUPER_USER' THEN RETURN user_role_var = 'SUPER_USER';
        WHEN 'ADMIN' THEN RETURN user_role_var IN ('SUPER_USER', 'ADMIN');
        WHEN 'SPV' THEN RETURN user_role_var IN ('SUPER_USER', 'ADMIN', 'SPV');
        WHEN 'MANDOR' THEN RETURN user_role_var IN ('SUPER_USER', 'ADMIN', 'SPV', 'MANDOR');
        WHEN 'DRYER_OPERATOR' THEN RETURN true;
        WHEN 'PACKING_OPERATOR' THEN RETURN true;
        ELSE RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include SUPER_USER
DROP POLICY IF EXISTS "admins_read_all_users" ON app_users;
CREATE POLICY "admins_read_all_users" ON app_users FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM app_users au2 WHERE au2.user_id = auth.uid() AND au2.role IN ('SUPER_USER', 'ADMIN')
    )
);

DROP POLICY IF EXISTS "admins_insert_users" ON app_users;
CREATE POLICY "admins_insert_users" ON app_users FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users au2 WHERE au2.user_id = auth.uid() AND au2.role IN ('SUPER_USER', 'ADMIN')
    )
);

DROP POLICY IF EXISTS "admins_delete_users" ON app_users;
CREATE POLICY "admins_delete_users" ON app_users FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM app_users au2 WHERE au2.user_id = auth.uid() AND au2.role IN ('SUPER_USER', 'ADMIN')
    )
);

DROP POLICY IF EXISTS "users_update_own_profile" ON app_users;
CREATE POLICY "users_update_own_profile" ON app_users FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM app_users au2 WHERE au2.user_id = auth.uid() AND au2.role IN ('SUPER_USER', 'ADMIN')
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM app_users au2 WHERE au2.user_id = auth.uid() AND au2.role IN ('SUPER_USER', 'ADMIN')
    )
);

-- Storage bucket for user photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "user_photos_select" ON storage.objects;
CREATE POLICY "user_photos_select" ON storage.objects FOR SELECT
USING (bucket_id = 'user-photos');

DROP POLICY IF EXISTS "user_photos_insert" ON storage.objects;
CREATE POLICY "user_photos_insert" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'user-photos');

DROP POLICY IF EXISTS "user_photos_update" ON storage.objects;
CREATE POLICY "user_photos_update" ON storage.objects FOR UPDATE
TO authenticated USING (bucket_id = 'user-photos');

DROP POLICY IF EXISTS "user_photos_delete" ON storage.objects;
CREATE POLICY "user_photos_delete" ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'user-photos');
