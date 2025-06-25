'use client'
import * as React from 'react';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  // isRegisterMode는 쿼리스트링이 아니라 localStorage로 판별
  const [isRegisteringAdmin, setIsRegisteringAdmin] = React.useState(false);
  const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null);
  const [msg, setMsg] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [debugLog, setDebugLog] = React.useState<string[]>([]);

  function addDebugLog(msg: string) {
    setDebugLog(logs => [...logs, msg]);
  }

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    setIsRegisteringAdmin(localStorage.getItem('isRegisteringAdmin') === 'true');
  }, []);

  // 관리자 등록 버튼 클릭 시 실행
  const handleAdminRegister = async () => {
    if (!user) return;
    addDebugLog('[관리자등록] user: ' + JSON.stringify(user));
    // admin row 조회
    const { data: admins, error } = await supabase
      .from('admin')
      .select('id', { count: 'exact' });
    addDebugLog('[관리자등록] admins: ' + JSON.stringify(admins) + ' error: ' + JSON.stringify(error));
    // 무조건 removeItem 먼저 실행 (동기)
    localStorage.removeItem('isRegisteringAdmin');
    addDebugLog('[관리자등록] localStorage.isRegisteringAdmin after remove: ' + localStorage.getItem('isRegisteringAdmin'));
    if (error) {
      setMsg('관리자 정보 조회 실패: ' + error.message);
      return;
    }
    if (!admins || admins.length === 0) {
      // 관리자 등록 모드: 현재 user의 uuid를 admin 테이블에 insert
      const { error: insertError } = await supabase
        .from('admin')
        .insert([{ id: user.id }]);
      addDebugLog('[관리자등록] insert result error: ' + JSON.stringify(insertError));
      if (insertError) {
        alert('관리자 등록 실패: ' + insertError.message);
        setMsg('관리자 등록 실패: ' + insertError.message);
        await supabase.auth.signOut();
        setUser(null);
        return;
      }
      alert('관리자 등록 성공! user.id: ' + user.id);
      setMsg('관리자 등록 완료! 2초 후 홈으로 이동합니다.');
      setTimeout(() => router.push('/'), 2000);
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
  };

  const signInWithKakao = async () => {
    setMsg('');
    if (isRegisteringAdmin) {
      localStorage.setItem('isRegisteringAdmin', 'true');
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'kakao' });
    if (error) {
      setMsg('카카오 로그인 실패: ' + error.message);
    }
  };

  const handleLogin = async () => {
    setMsg('');
    // 쿼리스트링 대신 localStorage로 등록 모드 저장
    localStorage.setItem('isRegisteringAdmin', 'true');
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
    if (user && !isRegisteringAdmin) {
      router.push('/');
    }
  }, [user, router, isRegisteringAdmin]);

  // msg 변화 감지하여 등록 완료/실패/취소 시 localStorage 플래그 삭제
  React.useEffect(() => {
    if (
      msg.startsWith('관리자 등록 완료') ||
      msg.startsWith('관리자 등록 실패') ||
      msg.startsWith('관리자 정보 조회 실패') ||
      msg.startsWith('이 계정은 관리자가 아닙니다.')
    ) {
      localStorage.removeItem('isRegisteringAdmin');
      console.log('[useEffect] localStorage.isRegisteringAdmin after remove:', localStorage.getItem('isRegisteringAdmin'));
    }
  }, [msg]);

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">
        {isRegisteringAdmin ? '관리자 등록' : '관리자 로그인'}
      </h1>
      {user ? (
        <div className="space-y-2">
          <div>환영합니다! {user.email}</div>
          <Button onClick={handleLogout}>로그아웃</Button>
          {isRegisteringAdmin && (
            <Button onClick={handleAdminRegister} className="w-full mt-2">관리자 등록</Button>
          )}
          {/* 임시: 관리자 등록 모드 해제 버튼 */}
          <Button onClick={() => {
            localStorage.removeItem('isRegisteringAdmin');
            alert('관리자 등록 모드 플래그 삭제됨: ' + localStorage.getItem('isRegisteringAdmin'));
            console.log('[임시버튼] localStorage.isRegisteringAdmin after remove:', localStorage.getItem('isRegisteringAdmin'));
          }} className="w-full mt-2 bg-red-200">관리자 등록 모드 해제(임시)</Button>
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
      {debugLog.length > 0 && (
        <div className="bg-gray-100 text-xs p-2 mt-2 rounded">
          <div>디버그 로그:</div>
          {debugLog.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}
    </div>
  );
} 