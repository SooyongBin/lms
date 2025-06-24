import './globals.css'
import { ReactNode } from 'react'
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import ThemeManager from '@/components/ThemeManager';
import HeaderClient from '@/components/HeaderClient';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  let adminLinkText = '관리자';
  let loginHref = '/login';

  if (session?.user) {
    // Check if user is admin (no longer used, just check session)
    await supabase.from('admin').select('id').eq('id', session.user.id).single();
  } else {
    // Check if any admin exists
    const { count } = await supabase.from('admin').select('id', { count: 'exact', head: true });
    adminLinkText = count && count > 0 ? '관리자' : '관리자 등록';
    loginHref = count && count > 0 ? '/login' : '/login?mode=register';
  }

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ThemeManager />
        {/* Header */}
        <HeaderClient session={session} adminLinkText={adminLinkText} loginHref={loginHref} />
        {/* Main */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
          {children}
        </main>
        {/* Footer */}
        <footer className="w-full py-3 bg-white dark:bg-gray-800 border-t text-center text-xs text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} 이글비니. All rights reserved.
        </footer>
      </body>
    </html>
  );
} 