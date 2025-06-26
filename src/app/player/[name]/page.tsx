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

interface PlayerInfo {
  handicap: number;
  point: number;
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

async function fetchPlayerInfo(name: string): Promise<PlayerInfo> {
  // handicap
  const { data: player } = await supabase
    .from('player_handicap')
    .select('handicap')
    .eq('player_name', name)
    .single();
  const handicap = player?.handicap || 0;

  // 승점 계산 (fetchLeague 참고)
  const { data: games } = await supabase
    .from('game')
    .select('winner_name, loser_name, bonus')
    .or(`winner_name.eq.${name},loser_name.eq.${name}`);
  let point = 0;
  if (games) {
    for (const g of games) {
      if (g.winner_name === name) {
        point += 3 + (g.bonus || 0);
      } else if (g.loser_name === name) {
        point += 1;
      }
    }
  }
  return { handicap, point };
}

export default function PlayerDetailPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [games, setGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [playerInfo, setPlayerInfo] = React.useState<PlayerInfo>({ handicap: 0, point: 0 });

  React.useEffect(() => {
    setLoading(true);
    fetchPlayerGames(name).then(data => {
      setGames(data);
      setLoading(false);
    });
    fetchPlayerInfo(name).then(setPlayerInfo);
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
      <h1 className="text-2xl font-bold mb-4">
        {name}
        {playerInfo.handicap ? `(${playerInfo.handicap})` : ''}
        의 경기 이력
        {playerInfo.point ? `(승점 ${playerInfo.point}점)` : ''}
      </h1>
      {loading ? (
        <div className="p-4">경기 이력을 불러오는 중...</div>
      ) : (
        <>
          <div className="flex font-bold border-b pb-2 mb-2 text-sm text-gray-700 dark:text-gray-200">
            <div className="w-2/12">날짜시간</div>
            <div className="w-2/12">상대선수</div>
            <div className="w-1/12">핸디</div>
            <div className="w-1/12">승패</div>
            <div className="w-2/12">내역</div>
            <div className="w-1/12">보너스</div>
            <div className="w-1/12">승점</div>
            <div className="w-1/12">삭제</div>
          </div>
          <List>
            {games.map((g) => {
              const isWin = g.winner_name === name;
              const opponentName = isWin ? g.loser_name : g.winner_name;
              const opponentHandicap = g.opponent_handicap || 0;
              // 보너스 계산: 승리한 경우에만, 핸디차 3점 이상이면 1점, 아니면 0점. 패배는 무조건 0점
              let bonus = 0;
              if (isWin) {
                const myHandicap = playerInfo.handicap || 0;
                if (myHandicap + 3 <= opponentHandicap) bonus = 1;
              }
              const score = g.score;
              const winLose = isWin ? '승' : '패';
              const point = isWin ? 3 + bonus : 1;
              return (
                <div key={g.id} className="flex items-center py-2 text-sm">
                  <div className="w-2/12">{g.played_at.slice(0, 10)} {g.played_at.slice(11, 16)}</div>
                  <div className="w-2/12">{opponentName}</div>
                  <div className="w-1/12">{opponentHandicap}</div>
                  <div className="w-1/12 font-semibold">{winLose}</div>
                  <div className="w-2/12">{score}</div>
                  <div className="w-1/12">{bonus}</div>
                  <div className="w-1/12">{point}</div>
                  <div className="w-1/12">
                    <button
                      className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50 dark:border-red-400 dark:hover:bg-red-900"
                      onClick={() => handleDelete(g.id, g.played_at, opponentName)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </List>
        </>
      )}
    </div>
  );
} 