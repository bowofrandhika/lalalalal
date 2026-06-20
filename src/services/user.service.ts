import supabase from '../lib/supabase';
import type { AppUser, UserRole } from '../types/database';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'SUPER_USER': 6,
  'ADMIN': 5,
  'SPV': 4,
  'MANDOR': 3,
  'DRYER_OPERATOR': 2,
  'PACKING_OPERATOR': 2
};

export const userService = {
  async getAll(): Promise<AppUser[]> {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<AppUser | null> {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getCurrentUserProfile(): Promise<AppUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(userData: Omit<AppUser, 'id' | 'created_at' | 'updated_at'>): Promise<AppUser> {
    const { data, error } = await supabase
      .from('app_users')
      .insert(userData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createWithAuth(email: string, password: string, userData: {
    username: string;
    full_name: string;
    role: UserRole;
    phone?: string;
    department?: string;
  }): Promise<AppUser> {
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: userData.username, full_name: userData.full_name }
    });
    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error('Failed to create auth user');

    const { data, error } = await supabase
      .from('app_users')
      .insert({
        user_id: signUpData.user.id,
        email,
        username: userData.username,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone,
        department: userData.department,
        is_active: true
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, userData: Partial<AppUser>): Promise<AppUser> {
    const { data, error } = await supabase
      .from('app_users')
      .update({ ...userData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    if (error) throw error;
  },

  async updateProfile(userData: Partial<AppUser>): Promise<AppUser> {
    const { data: profile } = await supabase
      .from('app_users')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    if (!profile) throw new Error('Profile not found');
    const { data, error } = await supabase
      .from('app_users')
      .update({ ...userData, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadPhoto(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${userId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('user-photos').getPublicUrl(path);
    return data.publicUrl;
  },

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;
  },

  async hasRole(requiredRole: UserRole): Promise<boolean> {
    const profile = await this.getCurrentUserProfile();
    if (!profile) return false;
    return (ROLE_HIERARCHY[profile.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  }
};
