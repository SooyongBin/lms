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
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );
  let { data: { session } } = await supabase.auth.getSession();
  let adminLinkText = '관리자';
  let loginHref = '/login';

  // 1. admin 테이블 row가 없다면, 세션 무조건 삭제, '관리자 등록'
  const { data: adminRows, count: adminCount } = await supabase.from('admin').select('id', { count: 'exact' });
  const admin = adminRows && adminRows.length > 0 ? adminRows[0] : null;

  if (!admin || (adminCount ?? 0) === 0) {
    // 세션이 있으면 로그아웃 처리
    // if (session) {
      await supabase.auth.signOut();
      session = null;
      // console.error('[01] 1. no admin data, session reset');
    // }
    adminLinkText = '관리자 등록1';
    loginHref = '/login?mode=register';
  } else if (!session) {
    // console.error('[01] 2. admin data, no session');
    // 2. admin row 있고, 세션 없으면 '관리자'
    // adminLinkText = '관리자';
    // loginHref = '/login';
  } else if (session.user.id !== admin.id) {
    // 3. admin row 있고, 세션 있고, uuid 다르면 세션 삭제 후 '관리자'
    await supabase.auth.signOut();
    session = null;
    // console.error('[01] 3. admin data, uuid mismatch, session reset');
    // adminLinkText = '관리자';
    // loginHref = '/login';
  } else {
    // console.error('[01] 4. admin data, uuid match');
    // 4. admin row 있고, 세션 있고, uuid 같으면 '로그아웃'과 '관리자삭제'
    // (HeaderClient가 user 있으면 자동으로 '로그아웃'/'관리자삭제' 보여줌)
  }

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ThemeManager />
        {/* Header */}
        <HeaderClient session={session} adminLinkText={adminLinkText} loginHref={loginHref} adminCount={adminCount ?? 0} />
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