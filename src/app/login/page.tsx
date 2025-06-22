import { Suspense } from 'react';
import LoginPage from './LoginPage';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <LoginPage />
    </Suspense>
  );
} 