import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function crudTest() {
  // 1. 관리자(admin) 테이블 테스트
  // Insert
  await supabase
    .from('admin')
    .insert([{ login_id: 'test_admin' }])
    .select();

  // Select
  await supabase
    .from('admin')
    .select('*');

  // Update
  await supabase
    .from('admin')
    .update({ login_id: 'test_admin_updated' })
    .eq('login_id', 'test_admin');

  // Delete
  await supabase
    .from('admin')
    .delete()
    .eq('login_id', 'test_admin_updated');

  // 2. 게임(game) 테이블 테스트
  // Insert
  const { data: gameInsert } = await supabase
    .from('game')
    .insert([
      {
        winner_name: '홍길동',
        loser_name: '이몽룡',
        score: '10:8',
        bonus: 2,
      },
    ])
    .select();

  // Select
  await supabase
    .from('game')
    .select('*');

  // Update
  if (gameInsert && gameInsert.length > 0) {
    const gameId = gameInsert[0].id;
    await supabase
      .from('game')
      .update({ bonus: 3 })
      .eq('id', gameId);

    // Delete
    await supabase
      .from('game')
      .delete()
      .eq('id', gameId);
  }
}

crudTest(); 