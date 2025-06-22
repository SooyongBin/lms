'use client'
import * as React from 'react';
import Button from '@/components/Button';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Game {
  id: number;
  played_at: string;
  winner_name: string;
  loser_name: string;
  score: string;
  bonus: number;
  winner_handicap?: number;
  loser_handicap?: number;
}

async function fetchGame(id: string) {
  const { data: game, error } = await supabase.from('game').select('*').eq('id', id).single();
  if (error || !game) return null;

  const { data: winnerHandicap, error: winnerError } = await supabase
    .from('player_handicap')
    .select('handicap')
    .eq('player_name', game.winner_name)
    .single();

  const { data: loserHandicap, error: loserError } = await supabase
    .from('player_handicap')
    .select('handicap')
    .eq('player_name', game.loser_name)
    .single();

  if (winnerError || loserError) {
    console.error({ winnerError, loserError });
  }

  return {
    ...game,
    winner_handicap: winnerHandicap?.handicap || 0,
    loser_handicap: loserHandicap?.handicap || 0,
  };
}

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [game, setGame] = React.useState<Game | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const checkAdminStatus = async (userId: string | undefined) => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from('admin')
        .select('id')
        .eq('id', userId)
        .single();
      
      setIsAdmin(!!data && !error);
    };

    fetchGame(id).then(setGame);
    
    supabase.auth.onAuthStateChange((_event, session) => {
      checkAdminStatus(session?.user?.id);
    });

    // Check on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdminStatus(session?.user?.id);
    });
  }, [id]);

  if (!game) return <div className="p-4">경기 정보를 불러오는 중...</div>;

  const handleEdit = () => {
    alert('수정 기능은 추후 구현 예정');
  };
  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('game').delete().eq('id', id);
    if (!error) router.push('/');
    else alert('삭제 실패: ' + error.message);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">게임 상세</h1>
      <div className="mb-4 space-y-2">
        <div>날짜: {game.played_at?.slice(0, 16).replace('T', ' ')}</div>
        <div>승리: {game.winner_name} (핸디:{game.winner_handicap})</div>
        <div>패배: {game.loser_name} (핸디:{game.loser_handicap})</div>
        <div>점수: {game.score}</div>
        <div>보너스: {game.bonus}</div>
      </div>
      <div className="flex gap-2">
        
        {isAdmin && <Button variant="secondary" onClick={handleEdit}>수정</Button>}
        {isAdmin && <Button variant="danger" onClick={handleDelete}>삭제</Button>}
      </div>
    </div>
  );
} 