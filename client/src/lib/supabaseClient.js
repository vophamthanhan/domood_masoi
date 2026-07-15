import { createClient } from '@supabase/supabase-js';

// Chỉ lấy origin, phòng trường hợp biến môi trường bị dán nhầm kèm path (vd: "...supabase.co/rest/v1")
// gây ra URL sai dạng "/rest/v1/auth/v1/signup" khi gọi Auth API.
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = rawSupabaseUrl ? new URL(rawSupabaseUrl).origin : rawSupabaseUrl;

export const supabase = createClient(
  supabaseUrl,
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
