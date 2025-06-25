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

  // 관리자 등록/로그인 후 추가 처리
  React.useEffect(() => {
    async function handleAdminLogic() {
      if (!user) return;
      // admin row 조회
      const { data: admins, error } = await supabase
        .from('admin')
        .select('id', { count: 'exact' });
      if (error) {
        setMsg('관리자 정보 조회 실패: ' + error.message);
        return;
      }
      if (!admins || admins.length === 0) {
        // 관리자 등록 모드: 현재 user의 uuid를 admin 테이블에 insert
        const { error: insertError } = await supabase
          .from('admin')
          .insert([{ id: user.id, email: user.email }]);
        if (insertError) {
          setMsg('관리자 등록 실패: ' + insertError.message);
          await supabase.auth.signOut();
          setUser(null);
          return;
        }
        setMsg('관리자 등록 완료!');
        // 등록 후 홈으로 이동
        router.push('/');
      } else {
        // 관리자 로그인 모드: uuid 비교
        const admin = admins[0];
        if (user.id !== admin.id) {
          setMsg('이 계정은 관리자가 아닙니다.');
          await supabase.auth.signOut();
          setUser(null);
        } else {
          // 정상 관리자 로그인
          router.push('/');
        }
      }
    }
    if (user) {
      handleAdminLogic();
    }
  }, [user, router]);

  const signInWithKakao = async () => {
    setMsg('');
    if (isRegisterMode) {
      localStorage.setItem('isRegisteringAdmin', 'true');
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'kakao' });
    if (error) {
      setMsg('카카오 로그인 실패: ' + error.message);
    }
  };

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
        <div className="space-y-2">
          <Button onClick={signInWithKakao} className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-black hover:bg-yellow-500">
            카카오
          </Button>
          <Button onClick={handleLogin} className="w-full flex items-center justify-center gap-2">
            구글
          </Button>
        </div>
      )}
      {msg && <div className="text-sm mt-2">{msg}</div>}
    </div>
  );
} 