import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Đảm bảo mỗi trình duyệt có 1 phiên đăng nhập ẩn danh ổn định (không cần tài khoản)
export async function ensureAnonSession() {
  const { data } = await supabase.auth.getSession();
  if (data?.session) return data.session;
  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signInData.session;
}
