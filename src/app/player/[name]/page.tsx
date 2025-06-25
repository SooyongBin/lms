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

  
  // console.log("[PlayerDetailPage] 1. Fetch all games for the player...");
  // 1. Fetch all games for the player
  const { data: games, error: gameError } = await supabase
    .from('game')
    .select('*')
    .or(`winner_name.eq.${name},loser_name.eq.${name}`);

  if (gameError || !games) {
    return [];
  }

  // console.log("[PlayerDetailPage] 2. Get unique opponents...");
  
  // 2. Get unique opponents
  const opponentNames = [
    ...new Set(
      games.map(g => (g.winner_name === name ? g.loser_name : g.winner_name))
    ),
  ];

  // console.log("[PlayerDetailPage] games.sort...");
  
  if (opponentNames.length === 0) {
    games.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
    return games.map(g => ({ ...g, opponent_handicap: 0 }));
  }

  // console.log("[PlayerDetailPage] Fetch handicaps for all opponents...");
  
  // 3. Fetch handicaps for all opponents
  const { data: handicaps, error: handicapError } = await supabase
    .from('player_handicap')
    .select('player_name, handicap')
    .in('player_name', opponentNames);

  if (handicapError) {
  }

  // console.log("[PlayerDetailPage] map start ...");
  const handicapMap = new Map(handicaps?.map(h => [h.player_name, h.handicap]) || []);

  // console.log("[PlayerDetailPage] Augment game data...");
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

  React.useEffect(() => {
    setLoading(true);
    fetchPlayerGames(name).then(data => {
      setGames(data);
      setLoading(false);
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
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{name}의 경기 이력</h1>
      {loading ? (
        <div className="p-4">경기 이력을 불러오는 중...</div>
      ) : (
        <>
          <div className="flex font-bold border-b pb-2 mb-2 text-sm text-gray-700 dark:text-gray-200">
            <div className="w-2/12">날짜시간</div>
            <div className="w-3/12">상대선수</div>
            <div className="w-1/12">승패</div>
            <div className="w-2/12">점수</div>
            <div className="w-1/12">삭제</div>
          </div>
          <List>
            {games.map((g) => (
              <div key={g.id} className="flex items-center py-2 text-sm">
                <div className="w-2/12">{g.played_at.slice(0, 10)} {g.played_at.slice(11, 16)}</div>
                <div className="w-3/12">{g.winner_name === name ? g.loser_name : g.winner_name}</div>
                <div className="w-1/12 font-semibold">{g.winner_name === name ? '승' : '패'}</div>
                <div className="w-2/12">{g.score} {g.bonus ? `(+${g.bonus})` : ''}</div>
                <div className="w-1/12">
                  <button
                    className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50 dark:border-red-400 dark:hover:bg-red-900"
                    onClick={() => handleDelete(g.id, g.played_at, g.winner_name === name ? g.loser_name : g.winner_name)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </List>
        </>
      )}
    </div>
  );
} 