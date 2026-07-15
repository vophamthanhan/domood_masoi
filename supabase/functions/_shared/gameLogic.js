// Các hàm logic thuần (pure functions) - không gọi DB, không phụ thuộc Deno.
// Nhờ vậy có thể unit-test trực tiếp bằng Node (xem /tests).

export function checkWin(alivePlayers) {
  const n = alivePlayers.length;
  const wolfCount = alivePlayers.filter((p) => p.team === 'wolf').length;
  const whitewolf = alivePlayers.find((p) => p.role === 'whitewolf');
  const villageCount = n - wolfCount - (whitewolf ? 1 : 0);
  if (n === 0) return null;
  if (whitewolf && n === 1) return 'whitewolf';
  if (wolfCount === 0 && !whitewolf) return 'village';
  if (wolfCount === 0 && whitewolf) return null; // sói trắng phải là người sống sót cuối cùng
  if (wolfCount >= villageCount) return 'wolf';
  return null;
}

export function winnerLabel(w) {
  if (w === 'village') return 'Dân Làng';
  if (w === 'wolf') return 'Sói';
  if (w === 'whitewolf') return 'Sói Trắng';
  return w;
}

// votes: [{ target_player_id }] (bỏ phiếu trắng có target_player_id = null, bị loại khỏi tally)
export function tallyVotes(votes) {
  const tally = {};
  (votes || []).forEach((v) => {
    if (v.target_player_id) tally[v.target_player_id] = (tally[v.target_player_id] || 0) + 1;
  });
  const entries = Object.entries(tally);
  if (!entries.length) return { executedId: null, isTie: false, tiedIds: [], tally };
  const max = Math.max(...entries.map(([, c]) => c));
  const top = entries.filter(([, c]) => c === max);
  if (top.length === 1) return { executedId: top[0][0], isTie: false, tiedIds: [], tally };
  return { executedId: null, isTie: true, tiedIds: top.map(([id]) => id), tally };
}

// Lan truyền hiệu ứng "chết theo người yêu" của Cupid.
// deaths: Set các id đã chết ban đầu; players: mảng người chơi đầy đủ (có lover_id, is_alive).
// Trả về Set mới đã bao gồm các trường hợp chết theo (không mutate input).
export function applyCupidCascade(deaths, players) {
  const result = new Set(deaths);
  const initial = Array.from(deaths);
  for (const deadId of initial) {
    const deadPlayer = players.find((p) => p.id === deadId);
    if (deadPlayer?.lover_id && !result.has(deadPlayer.lover_id)) {
      const lover = players.find((p) => p.id === deadPlayer.lover_id);
      if (lover?.is_alive) result.add(deadPlayer.lover_id);
    }
  }
  return result;
}
