// Chạy: node tests/gameLogic.test.js
// Test trực tiếp các hàm logic thuần dùng chung với Edge Functions (không cần Deno/DB).
import assert from 'node:assert/strict';
import { calcWolfQuota, buildRolePool, ROLES } from '../supabase/functions/_shared/roles.js';
import { checkWin, tallyVotes, applyCupidCascade } from '../supabase/functions/_shared/gameLogic.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

// ---------- calcWolfQuota ----------
test('calcWolfQuota: 5-6 người -> 1 sói', () => {
  assert.equal(calcWolfQuota(5), 1);
  assert.equal(calcWolfQuota(6), 1);
});
test('calcWolfQuota: 7-8 người -> 2 sói', () => {
  assert.equal(calcWolfQuota(7), 2);
  assert.equal(calcWolfQuota(8), 2);
});
test('calcWolfQuota: tăng dần theo số người lớn', () => {
  assert.ok(calcWolfQuota(20) >= calcWolfQuota(12));
});

// ---------- buildRolePool ----------
test('buildRolePool: tổng số lá bài luôn bằng số người chơi', () => {
  for (const n of [5, 6, 8, 10, 15]) {
    const pool = buildRolePool(n, []);
    assert.equal(pool.length, n);
  }
});
test('buildRolePool: số Sói đúng bằng calcWolfQuota khi không có vai mở rộng', () => {
  const n = 10;
  const pool = buildRolePool(n, []);
  const wolfCount = pool.filter((r) => ROLES[r].team === 'wolf').length;
  assert.equal(wolfCount, calcWolfQuota(n));
});
test('buildRolePool: tăng quota sói nếu bật nhiều vai sói mở rộng hơn quota mặc định', () => {
  const n = 6; // quota mặc định = 1
  const pool = buildRolePool(n, ['alphawolf', 'whitewolf']);
  const wolfLikeCount = pool.filter((r) => ROLES[r].team === 'wolf' || ROLES[r].team === 'lonewolf').length;
  assert.ok(wolfLikeCount >= 2, `expected >=2 wolf-like roles, got ${wolfLikeCount}`);
});
test('buildRolePool: không vượt quá số người chơi dù bật nhiều vai mở rộng', () => {
  const n = 5;
  const pool = buildRolePool(n, ['cupid', 'idiot', 'thief', 'woodcutter', 'mute', 'littlegirl']);
  assert.equal(pool.length, n);
});

// ---------- checkWin ----------
test('checkWin: hết sói -> Dân Làng thắng', () => {
  const players = [
    { team: 'village', role: 'villager', is_alive: true },
    { team: 'village', role: 'seer', is_alive: true },
  ];
  assert.equal(checkWin(players), 'village');
});
test('checkWin: sói >= dân -> Sói thắng', () => {
  const players = [
    { team: 'wolf', role: 'werewolf', is_alive: true },
    { team: 'village', role: 'villager', is_alive: true },
  ];
  assert.equal(checkWin(players), 'wolf');
});
test('checkWin: còn nhiều phe -> chưa kết thúc', () => {
  const players = [
    { team: 'wolf', role: 'werewolf', is_alive: true },
    { team: 'village', role: 'villager', is_alive: true },
    { team: 'village', role: 'seer', is_alive: true },
  ];
  assert.equal(checkWin(players), null);
});
test('checkWin: Sói Trắng chỉ thắng khi là người sống sót cuối cùng', () => {
  const twoLeft = [
    { team: 'lonewolf', role: 'whitewolf', is_alive: true },
    { team: 'village', role: 'villager', is_alive: true },
  ];
  assert.equal(checkWin(twoLeft), null);
  const oneLeft = [{ team: 'lonewolf', role: 'whitewolf', is_alive: true }];
  assert.equal(checkWin(oneLeft), 'whitewolf');
});

// ---------- tallyVotes ----------
test('tallyVotes: đa số rõ ràng -> có người bị chọn', () => {
  const votes = [{ target_player_id: 'a' }, { target_player_id: 'a' }, { target_player_id: 'b' }];
  const result = tallyVotes(votes);
  assert.equal(result.executedId, 'a');
  assert.equal(result.isTie, false);
});
test('tallyVotes: hòa phiếu -> báo tie kèm danh sách hòa', () => {
  const votes = [{ target_player_id: 'a' }, { target_player_id: 'b' }];
  const result = tallyVotes(votes);
  assert.equal(result.isTie, true);
  assert.deepEqual(result.tiedIds.sort(), ['a', 'b']);
});
test('tallyVotes: không ai bỏ phiếu -> không có ai bị chọn, không tie', () => {
  const result = tallyVotes([]);
  assert.equal(result.executedId, null);
  assert.equal(result.isTie, false);
});

// ---------- applyCupidCascade ----------
test('applyCupidCascade: người yêu chết theo khi 1 trong 2 chết', () => {
  const players = [
    { id: 'a', lover_id: 'b', is_alive: true },
    { id: 'b', lover_id: 'a', is_alive: true },
  ];
  const deaths = new Set(['a']);
  const result = applyCupidCascade(deaths, players);
  assert.ok(result.has('a'));
  assert.ok(result.has('b'));
});
test('applyCupidCascade: không có cặp đôi thì không lan truyền', () => {
  const players = [
    { id: 'a', lover_id: null, is_alive: true },
    { id: 'b', lover_id: null, is_alive: true },
  ];
  const deaths = new Set(['a']);
  const result = applyCupidCascade(deaths, players);
  assert.equal(result.size, 1);
});
test('applyCupidCascade: người yêu đã chết trước đó thì không lỗi trùng lặp', () => {
  const players = [
    { id: 'a', lover_id: 'b', is_alive: true },
    { id: 'b', lover_id: 'a', is_alive: false },
  ];
  const deaths = new Set(['a']);
  const result = applyCupidCascade(deaths, players);
  assert.equal(result.size, 1);
});

console.log(`\n${passed} bài test đã pass.`);
