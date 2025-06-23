'use client'
import * as React from 'react';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  player_name: string;
  handicap: number;
}

async function checkExistingGame(winnerName: string, loserName: string): Promise<boolean> {
  if (!winnerName || !loserName) return false;

  // SQL 쿼리문을 콘솔에 출력
  // const sql = `
  //   SELECT winner_name, loser_name
  //   FROM game
  //   WHERE (winner_name = '${winnerName}' AND loser_name = '${loserName}')
  //      OR (winner_name = '${loserName}' AND loser_name = '${winnerName}')
  // `;
  // console.log('[checkExistingGame] Intended SQL:', sql);

  // 실제 Supabase 쿼리
  const { data } = await supabase
    .from('game')
    .select('winner_name,loser_name')
    .in('winner_name', [winnerName, loserName])
    .in('loser_name', [winnerName, loserName]);

  if (!data) {
    return false; // Fail safe, allow submission
  }
  return data.some(
    (game) =>
      (game.winner_name === winnerName && game.loser_name === loserName) ||
      (game.winner_name === loserName && game.loser_name === winnerName)
  );
}

export default function GameNewPage() {
  const router = useRouter();
  const [allPlayers, setAllPlayers] = React.useState<Player[]>([]);
  const [winner, setWinner] = React.useState<Player | null>(null);
  const [loser, setLoser] = React.useState<Player | null>(null);
  const [score, setScore] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('player_handicap')
        .select('player_name, handicap')
        .order('player_name');
      
      if (data) {
        setAllPlayers(data);
      }
    };
    fetchPlayers();
  }, []);

  const handleWinnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlayer = allPlayers.find(p => p.player_name === e.target.value);
    setWinner(selectedPlayer || null);
  };
  
  const handleLoserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlayer = allPlayers.find(p => p.player_name === e.target.value);
    setLoser(selectedPlayer || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    if (!winner || !loser || !score) {
      setMsg('승리선수, 패배선수, 점수를 모두 입력하세요.');
      setLoading(false);
      return;
    }
    if (winner.player_name === loser.player_name) {
      setMsg('승리 선수와 패배 선수는 같을 수 없습니다.');
      setLoading(false);
      return;
    }

    const gameExists = await checkExistingGame(winner.player_name, loser.player_name);
    if (gameExists) {
      setMsg('두 선수는 이전에 게임한 이력이 있습니다.');
      setLoading(false);
      return;
    }

    const bonus = winner.handicap + 3 <= loser.handicap ? 1 : 0;

    const { data: gameInsert, error } = await supabase
      .from('game')
      .insert([
        {
          winner_name: winner.player_name,
          loser_name: loser.player_name,
          score: score,
          bonus: bonus,
        },
      ])
      .select();

    if (error) {
      setMsg(`저장 실패: ${error.message}`);
    } else if (!gameInsert || !gameInsert.length) {
      setMsg('저장 실패: 데이터 삽입에 실패했지만, 서버에서 상세 에러 메시지를 제공하지 않았습니다. (RLS 정책 확인 필요)');
    } else {
      setMsg('저장 성공!');
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">게임 결과 등록</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="winner-select" className="block text-sm font-medium text-gray-700">승리 선수</label>
          <select
            id="winner-select"
            onChange={handleWinnerChange}
            value={winner?.player_name || ''}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="" disabled>-- 선수 선택 --</option>
            {allPlayers.map(p => (
              <option key={p.player_name} value={p.player_name}>{p.player_name} ({p.handicap})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="loser-select" className="block text-sm font-medium text-gray-700">패배 선수</label>
          <select
            id="loser-select"
            onChange={handleLoserChange}
            value={loser?.player_name || ''}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="" disabled>-- 선수 선택 --</option>
            {allPlayers.map(p => (
              <option key={p.player_name} value={p.player_name}>{p.player_name} ({p.handicap})</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="score" className="block text-sm font-medium text-gray-700">점수</label>
          <input
            id="score"
            type="text"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
            placeholder="예: 10:8"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>등록</Button>
        </div>
        {msg && <div className="alert-message">{msg}</div>}
      </form>
    </div>
  );
}