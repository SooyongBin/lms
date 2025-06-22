'use client'
import * as React from 'react';
import Button from '@/components/Button';
import List from '@/components/List';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Player {
  name: string;
  point: number;
  handicap: number;
  rank: number;
  gameCount: number;
  progress: number;
  winCount: number;
  lossCount: number;
  bonus: number;
}

interface LeagueSummary {
  playerCount: number;
  gameCount: number;
  totalPossibleGames: number;
  progress: number;
}

async function fetchLeague(): Promise<{ players: Player[]; summary: LeagueSummary }> {
  // 1. Fetch all players and their handicaps
  const { data: playerHandicaps, error: playerError } = await supabase
    .from('player_handicap')
    .select('player_name, handicap');

  if (playerError || !playerHandicaps) return { players: [], summary: { playerCount: 0, gameCount: 0, totalPossibleGames: 0, progress: 0 } };

  // 2. Fetch all games
  const { data: games, error: gameError } = await supabase.from('game').select('*');
  if (gameError || !games) return { players: [], summary: { playerCount: 0, gameCount: 0, totalPossibleGames: 0, progress: 0 } };

  // 3. Process data
  const points: Record<string, number> = {};
  const gameCounts: Record<string, number> = {};
  const winCounts: Record<string, number> = {};
  const lossCounts: Record<string, number> = {};
  const bonuses: Record<string, number> = {};

  games.forEach((g: {
    winner_name: string;
    loser_name: string;
    score: string;
    bonus: number;
  }) => {
    points[g.winner_name] = (points[g.winner_name] || 0) + 3;
    points[g.loser_name] = (points[g.loser_name] || 0) + 1;
    gameCounts[g.winner_name] = (gameCounts[g.winner_name] || 0) + 1;
    gameCounts[g.loser_name] = (gameCounts[g.loser_name] || 0) + 1;
    winCounts[g.winner_name] = (winCounts[g.winner_name] || 0) + 1;
    lossCounts[g.loser_name] = (lossCounts[g.loser_name] || 0) + 1;
    bonuses[g.winner_name] = (bonuses[g.winner_name] || 0) + (g.bonus || 0);
  });

  const players: Player[] = playerHandicaps.map((p: { player_name: string; handicap: number }) => ({
    name: p.player_name,
    handicap: p.handicap,
    point: points[p.player_name] || 0,
    rank: 0,
    gameCount: gameCounts[p.player_name] || 0,
    progress: 0,
    winCount: winCounts[p.player_name] || 0,
    lossCount: lossCounts[p.player_name] || 0,
    bonus: bonuses[p.player_name] || 0,
  }));

  const playerCount = players.length;
  const totalPossibleGames = playerCount > 1 ? (playerCount * (playerCount - 1)) / 2 : 0;
  const progress = totalPossibleGames > 0 ? Math.min(100, Math.round((games.length / totalPossibleGames) * 100)) : 0;

  // 선수 리스트 생성 및 정렬
  const sortedPlayers = players.sort((a, b) => b.point - a.point);
  
  // 동점자 처리된 순위 부여
  let rank = 1;
  for (let i = 0; i < sortedPlayers.length; i++) {
    if (i > 0 && sortedPlayers[i].point < sortedPlayers[i - 1].point) {
      rank = i + 1;
    }
    sortedPlayers[i].rank = rank;
  }
  return { 
    players: sortedPlayers, 
    summary: { playerCount, gameCount: games.length, totalPossibleGames, progress } 
  };
}

export default function LeaguePage() {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [summary, setSummary] = React.useState<LeagueSummary>({ playerCount: 0, gameCount: 0, totalPossibleGames: 0, progress: 0 });
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    fetchLeague().then((result: { players: Player[]; summary: LeagueSummary }) => {
      setPlayers(result.players);
      setSummary(result.summary);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          리그전 현황
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/player/new')}>선수핸디등록</Button>
          <Button onClick={() => router.push('/game/new')}>게임결과등록</Button>
        </div>
      </div>

      {summary && !loading && (
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500">참가인원</div>
              <div className="text-lg font-bold" style={{ color: '#1f2937' }}>{summary.playerCount} 명</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">경기수</div>
              <div className="text-lg font-bold" style={{ color: '#1f2937' }}>{summary.gameCount} 게임</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">총경기수</div>
              <div className="text-lg font-bold" style={{ color: '#1f2937' }}>{summary.totalPossibleGames} 게임</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">진행율</div>
              <div className="text-lg font-bold" style={{ color: '#1f2937' }}>{summary.progress} %</div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center font-bold border-b pb-2 mb-2 text-center text-sm">
        <span className="w-1/12">순위</span>
        <span className="w-3/12 text-left pl-2">이름</span>
        <span className="w-1/12">핸디</span>
        <span className="w-1/12">게임수</span>
        <span className="w-1/12">진행율</span>
        <span className="w-1/12">승</span>
        <span className="w-1/12">패</span>
        <span className="w-1/12">보너스</span>
        <span className="w-1/12">승점</span>
      </div>
      <div className="border-b">
        <List>
          {loading ? (
            <div>조회 중...</div>
          ) : (
            players.map((p) => (
              <div key={p.name} className="flex justify-between items-center text-center py-1">
                <span className="w-1/12">{p.rank}위</span>
                <a href={`/player/${encodeURIComponent(p.name)}`} className="text-blue-600 underline w-3/12 text-left pl-2">{p.name}</a>
                <span className="w-1/12">{p.handicap}</span>
                <span className="w-1/12">{p.gameCount}</span>
                <span className={`w-1/12 ${p.progress <= 70 ? 'text-red-500' : ''}`}>{p.progress}%</span>
                <span className="w-1/12">{p.winCount}</span>
                <span className="w-1/12">{p.lossCount}</span>
                <span className="w-1/12">{p.bonus}</span>
                <span className="w-1/12">{p.point}</span>
              </div>
            ))
          )}
        </List>
      </div>
      {/* <div className="mt-4 flex gap-2">
        <Button onClick={() => router.push('/game/new')}>게임결과등록</Button>
      </div> */}
    </div>
  );
} 