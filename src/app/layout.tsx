'use client'
import * as React from 'react'
import './globals.css'
import { ReactNode, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient';
import ThemeManager from '@/components/ThemeManager';
import Link from 'next/link';

async function checkAdminExists(): Promise<boolean> {
  const result = await supabase
    .from('admin')
    .select('id', { count: 'exact', head: true });
  if (result.error) {
    return true;
  }
  return (result.count ?? 0) > 0;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [adminLinkText, setAdminLinkText] = useState('관리자');
  const [loginHref, setLoginHref] = useState('/login');

  useEffect(() => {
    supabase.auth.getSession();
    const listener = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.hash = '';
        url.search = '';
        window.history.replaceState({}, document.title, url.pathname);
      }
      const isRegistering = localStorage.getItem('isRegisteringAdmin');
      if (session?.user && isRegistering === 'true') {
        try {
          const { error } = await supabase.from('admin').upsert({
            id: session.user.id,
          }).select();
          if (error) {
            alert('관리자 등록에 실패했습니다: ' + error.message);
          } else {
            alert('관리자로 정상 등록되었습니다.');
            localStorage.removeItem('isRegisteringAdmin');
          }
        } catch {
          alert('예상치 못한 오류가 발생하여 관리자 등록에 실패했습니다.');
        }
      }
      if (!session) {
        checkAdminExists().then(exists => {
          setAdminLinkText(exists ? '관리자' : '관리자 등록');
          setLoginHref(exists ? '/login' : '/login?mode=register');
        });
      }
    });
    if (!user) {
      checkAdminExists().then(exists => {
        setAdminLinkText(exists ? '관리자' : '관리자 등록');
        setLoginHref(exists ? '/login' : '/login?mode=register');
      });
    }
    return () => {
      listener.data?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  const handleReset = async () => {
    if (!window.confirm('관리자 정보를 삭제하시겠습니까? 삭제후 다시 관리자등록을 해야 합니다.')) {
      return;
    }
    if (!user) {
      alert('사용자 정보가 없습니다.');
      return;
    }
    try {
      const { error } = await supabase.from('admin').delete().eq('id', user.id);
      if (error) throw error;
      await handleLogout();
    } catch (error) {
      let msg = '관리자 정보 리셋 실패: ';
      if (error instanceof Error) {
        msg += error.message;
      } else {
        msg += String(error);
      }
      alert(msg);
    }
  };

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ThemeManager />
        {/* Header */}
        <header className="w-full shadow bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-bold text-blue-700 dark:text-blue-300 hover:underline">제1회 세븐당구장 리그전</Link>
            <nav className="flex gap-4 items-center">
              {user ? (
                <>
                  <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-300">로그아웃</button>
                  <button onClick={handleReset} className="text-sm text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50 dark:border-red-400 dark:hover:bg-red-900">관리자삭제</button>
                </>
              ) : (
                <Link href={loginHref} className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-300">{adminLinkText}</Link>
              )}
            </nav>
          </div>
        </header>
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