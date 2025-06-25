import { NextRequest, NextResponse } from 'next/server';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  const res = NextResponse.next();

  // setAll 구현: cookies 배열을 받아 하나씩 set 호출
  function setAll(cookies: { name: string, value: string, options?: Partial<ResponseCookie> }[]) {
    for (const { name, value, options } of cookies) {
      res.cookies.set(name, value, options);
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: req.cookies.getAll.bind(req.cookies),
        setAll,
      },
    }
  );
  await supabase.auth.signOut();
  return res;
} 