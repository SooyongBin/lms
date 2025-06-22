'use client'
import * as React from 'react';
import Button from '@/components/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegisterMode = searchParams.get('mode') === 'register';
  const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null);
  const [msg, setMsg] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setMsg('');
    if (isRegisterMode) {
      localStorage.setItem('isRegisteringAdmin', 'true');
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      localStorage.removeItem('isRegisteringAdmin');
      setMsg('로그인 실패: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMsg('로그아웃 되었습니다.');
  };

  React.useEffect(() => {
    // If user is already logged in, redirect to home
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">
        {isRegisterMode ? '관리자 등록' : '관리자 로그인'}
      </h1>
      {user ? (
        <div className="space-y-2">
          <div>환영합니다! {user.email}</div>
          <Button onClick={handleLogout}>로그아웃</Button>
        </div>
      ) : (
        <Button onClick={handleLogin} className="w-full flex items-center justify-center gap-2">
          구글
        </Button>
      )}
      {msg && <div className="text-sm mt-2">{msg}</div>}
    </div>
  );
} 