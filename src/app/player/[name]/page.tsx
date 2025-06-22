'use client'
import * as React from 'react';
import List from '@/components/List';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Game {
  id: number;
  played_at: string;
  winner_name: string;
  loser_name: string;
  score: string;
  bonus: number;
  opponent_handicap: number;
}

async function fetchPlayerGames(name: string) {
  // 1. Fetch all games for the player
  const { data: games, error: gameError } = await supabase
    .from('game')
    .select('*')
    .or(`winner_name.eq.${name},loser_name.eq.${name}`);

  if (gameError || !games) {
    return [];
  }

  // 2. Get unique opponents
  const opponentNames = [
    ...new Set(
      games.map(g => (g.winner_name === name ? g.loser_name : g.winner_name))
    ),
  ];

  if (opponentNames.length === 0) {
    games.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
    return games.map(g => ({ ...g, opponent_handicap: 0 }));
  }

  // 3. Fetch handicaps for all opponents
  const { data: handicaps, error: handicapError } = await supabase
    .from('player_handicap')
    .select('player_name, handicap')
    .in('player_name', opponentNames);

  if (handicapError) {
  }

  const handicapMap = new Map(handicaps?.map(h => [h.player_name, h.handicap]) || []);

  // 4. Augment game data
  const augmentedGames = games.map(g => {
    const opponentName = g.winner_name === name ? g.loser_name : g.winner_name;
    return {
      ...g,
      opponent_handicap: handicapMap.get(opponentName) || 0,
    };
  });

  augmentedGames.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

  return augmentedGames;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [games, setGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetchPlayerGames(name).then(data => {
      setGames(data);
      setLoading(false);
    });
    // 세션 정보 콘솔 출력
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
  }, [name]);

  const handleDelete = async (gameId: number, playedAt: string, opponentName: string) => {
    const dateStr = playedAt?.slice(0, 16).replace('T', ' ');
    if (!window.confirm(`${dateStr}, ${opponentName}의 경기를 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('game').delete().eq('id', gameId);
    if (!error) {
      setGames(games => games.filter(g => g.id !== gameId));
    } else {
      alert('삭제 실패: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-4">경기 이력을 불러오는 중...</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">{name}의 경기 이력 ({games.length}경기)</h1>
      <div className="flex justify-between items-center font-bold border-b pb-2 mb-2 text-center">
        <span className="w-3/12">날짜시간</span>
        <span className="w-1/12">승/패</span>
        <span className="w-2/12">상대</span>
        <span className="w-1/12">핸디</span>
        <span className="w-2/12">점수</span>
        <span className="w-1/12">승점</span>
        <span className="w-2/12">보너스</span>
        {isAdmin && <span className="w-1/12">삭제</span>}
      </div>
      <List>
        {games.length > 0 ? (
          games.map((g, i) => (
            <div key={g.id || i} className="flex justify-between items-center text-center">
              <span className="w-3/12">{g.played_at?.slice(0, 16).replace('T', ' ')}</span>
              <span className="w-1/12">{g.winner_name === name ? '승' : '패'}</span>
              <span className="w-2/12">{g.winner_name === name ? g.loser_name : g.winner_name}</span>
              <span className="w-1/12">{g.opponent_handicap}</span>
              <span className="w-2/12">{g.score}</span>
              <span className="w-1/12">{g.winner_name === name ? 3 : 1}</span>
              <span className="w-2/12">+{g.bonus || 0}</span>
              {isAdmin && (
                <span className="w-1/12">
                  <button
                    className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50 dark:border-red-400 dark:hover:bg-red-900"
                    onClick={() => handleDelete(g.id, g.played_at, g.winner_name === name ? g.loser_name : g.winner_name)}
                  >
                    삭제
                  </button>
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-4">게임 이력이 없습니다.</div>
        )}
      </List>
      <div className="mt-4 flex gap-2">
      </div>
    </div>
  );
} 