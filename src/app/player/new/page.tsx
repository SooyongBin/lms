'use client'
import * as React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Button from '@/components/Button';

interface Player {
  player_name: string;
  handicap: number;
  has_game_history?: boolean;
}

export default function NewPlayerPage() {
  const [playerName, setPlayerName] = useState('');
  const [handicap, setHandicap] = useState<number | ''>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  const fetchPlayers = async () => {
    // 1. Fetch all players
    const { data: playersData, error: playersError } = await supabase
      .from('player_handicap')
      .select('player_name, handicap')
      .order('player_name', { ascending: true });

    if (playersError) {
      setMessage('선수 목록 조회 실패: ' + playersError.message);
      return;
    }

    // 2. Fetch all games to check for history
    const { data: games, error: gamesError } = await supabase
      .from('game')
      .select('winner_name, loser_name');
    
    if (gamesError) {
      setMessage('게임 기록 조회 실패: ' + gamesError.message);
      // Continue with just the player list if game history fails
      setPlayers(playersData || []);
      return;
    }

    const playedPlayers = new Set<string>();
    games.forEach(game => {
      playedPlayers.add(game.winner_name);
      playedPlayers.add(game.loser_name);
    });

    // 3. Combine player data with history flag
    const playersWithHistory = playersData.map(player => ({
      ...player,
      has_game_history: playedPlayers.has(player.player_name),
    }));

    setPlayers(playersWithHistory);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (!playerName.trim() || handicap === '') {
      setMessage('선수 이름과 핸디캡을 모두 입력해주세요.');
      return;
    }
    
    setLoading(true);

    const { error } = await supabase
      .from('player_handicap')
      .upsert({ player_name: playerName.trim(), handicap: Number(handicap) });

    setLoading(false);

    if (error) {
      setMessage(`저장 실패: ${error.message}`);
    } else {
      setMessage(`'${playerName.trim()}'님의 핸디캡(${handicap})이(가) 성공적으로 저장되었습니다.`);
      setPlayerName('');
      setHandicap('');
      fetchPlayers(); // Re-fetch the list after saving
    }
  };

  const handleDelete = async (playerName: string) => {
    if (window.confirm(`'${playerName}'을 삭제하시겠습니까?`)) {
      setMessage('');
      setLoading(true);

      const { error } = await supabase
        .from('player_handicap')
        .delete()
        .eq('player_name', playerName);
      
      setLoading(false);

      if (error) {
        setMessage(`삭제 실패: ${error.message}`);
      } else {
        setMessage(`'${playerName}' 님이 성공적으로 삭제되었습니다.`);
        fetchPlayers(); // Re-fetch the list
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">선수/핸디 등록</h1>
      </div>
      
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">선수 이름</label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="선수 이름을 입력하세요"
          />
        </div>
        
        <div>
          <label htmlFor="handicap" className="block text-sm font-medium text-gray-700 dark:text-gray-300">핸디캡</label>
          <input
            id="handicap"
            type="number"
            value={handicap}
            onChange={(e) => setHandicap(e.target.value === '' ? '' : Number(e.target.value))}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="핸디캡 점수를 입력하세요"
          />
        </div>
        
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '저장 중...' : '저장'}
        </Button>
      </form>

      {message && (
        <div className="alert-message">{message}</div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">
          등록된 선수 목록 ({players.length}명)
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {players.length > 0 ? (
              players.map((player) => (
                <li key={player.player_name} className="px-6 py-3 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{player.player_name}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-4">{player.handicap} 점</span>
                  </div>
                  <Button
                    onClick={() => handleDelete(player.player_name)}
                    disabled={loading || player.has_game_history}
                    className="bg-transparent hover:bg-red-50 text-red-600 dark:hover:bg-red-900 dark:text-red-400 text-xs font-semibold py-1 px-2 border border-red-300 dark:border-red-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title={player.has_game_history ? "경기 기록이 있는 선수는 삭제할 수 없습니다." : ""}
                  >
                    삭제
                  </Button>
                </li>
              ))
            ) : (
              <li className="px-6 py-4 text-center text-gray-500">등록된 선수가 없습니다.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
} 