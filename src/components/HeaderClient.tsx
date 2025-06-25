'use client'
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import * as React from 'react';

interface SessionUser {
  id: string;
  email?: string;
}
interface Session {
  user?: SessionUser;
}

interface HeaderClientProps {
  session: Session | null;
  adminLinkText: string;
  loginHref: string;
}

export default function HeaderClient({ session, adminLinkText, loginHref }: HeaderClientProps) {
  const [user, setUser] = React.useState<SessionUser | null>(session?.user ? { id: session.user.id, email: session.user.email } : null);

  React.useEffect(() => {
    setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[HeaderClient] auth state changed:', session);
      
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [session]);

  const handleLogout = async () => {
    try {
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('로그아웃 시간 초과')), 5000))
      ]) as { error: Error | null };
      if (error) {
        alert('로그아웃 중 오류가 발생했습니다: ' + error.message);
        return;
      }
      setUser(null);
      window.location.href = '/';
    } catch (e) {
      alert('로그아웃 중 예외가 발생했습니다: ' + (e instanceof Error ? e.message : '알 수 없는 오류'));
    }
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
    <header className="w-full shadow bg-white dark:bg-gray-800 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/sevenball.jpeg" alt="세븐볼" width={40} height={40} className="object-contain" />
          <span className="text-xl font-bold text-gray-800 dark:text-white">세븐당구클럽</span>
        </Link>
        <nav className="flex gap-4 items-center">
          {user ? (
            <>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-300">로그아웃1</button>
              <button onClick={handleReset} className="text-sm text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50 dark:border-red-400 dark:hover:bg-red-900">관리자삭제</button>
            </>
          ) : (
            <Link href={loginHref} className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-300">{adminLinkText}</Link>
          )}
        </nav>
      </div>
    </header>
  );
} 