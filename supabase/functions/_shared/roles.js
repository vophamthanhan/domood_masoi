// Danh sách vai trò đầy đủ - dùng trong toàn bộ Edge Functions
// team: 'village' | 'wolf' | 'lonewolf'
export const ROLES = {
  villager:   { name: 'Dân Làng',        team: 'village',  core: true },
  werewolf:   { name: 'Sói',             team: 'wolf',     core: true },
  seer:       { name: 'Tiên Tri',        team: 'village',  core: true },
  guard:      { name: 'Bảo Vệ',          team: 'village',  core: true },
  witch:      { name: 'Phù Thủy',        team: 'village',  core: true },
  hunter:     { name: 'Thợ Săn',         team: 'village',  core: true },
  alphawolf:  { name: 'Sói Già',         team: 'wolf',     core: false },
  whitewolf:  { name: 'Sói Trắng',       team: 'lonewolf', core: false },
  cupid:      { name: 'Cupid',           team: 'village',  core: false },
  littlegirl: { name: 'Cô Bé Ngây Thơ',  team: 'village',  core: false },
  idiot:      { name: 'Thằng Ngốc Làng', team: 'village',  core: false },
  thief:      { name: 'Kẻ Trộm',         team: 'village',  core: false },
  woodcutter: { name: 'Tiều Phu',        team: 'village',  core: false },
  mute:       { name: 'Kẻ Câm',          team: 'village',  core: false },
  disguisedwolf: { name: 'Sói Bà Ba',    team: 'wolf',     core: false },
};

// Các vai được coi là "phe Sói" khi bỏ phiếu cắn người ban đêm (gộp chung 1 lượt bầu nạn nhân)
export const WOLF_KILL_ROLES = ['werewolf', 'alphawolf', 'disguisedwolf'];

// Thứ tự các vai được thức dậy trong đêm (subphase). Vai không có người chơi/đã chết sẽ tự bị bỏ qua.
export const NIGHT_ORDER = [
  { role: 'thief',      onlyNight1: true,  everyOtherNight: false },
  { role: 'cupid',      onlyNight1: true,  everyOtherNight: false },
  { role: 'guard',      onlyNight1: false, everyOtherNight: false },
  { role: 'werewolf',   onlyNight1: false, everyOtherNight: false }, // alphawolf gộp chung vote với werewolf
  { role: 'whitewolf',  onlyNight1: false, everyOtherNight: true  }, // chỉ thức đêm chẵn (2,4,6...)
  { role: 'witch',      onlyNight1: false, everyOtherNight: false },
  { role: 'seer',       onlyNight1: false, everyOtherNight: false },
];

// Tính số lượng Sói dựa trên tổng số người chơi (~ 1/4 - 1/3, tối thiểu 1)
export function calcWolfQuota(n) {
  if (n <= 6) return 1;
  if (n <= 8) return 2;
  if (n <= 11) return 3;
  if (n <= 14) return 4;
  if (n <= 17) return 5;
  return Math.max(1, Math.round(n / 3.2));
}

// selectedExtraRoles: mảng key role mở rộng host đã bật (vd ['cupid','idiot','alphawolf'])
export function buildRolePool(playerCount, selectedExtraRoles = []) {
  let wolfQuota = calcWolfQuota(playerCount);
  const extras = selectedExtraRoles.filter((r) => ROLES[r]);

  const wolfExtras = extras.filter((r) => ROLES[r].team === 'wolf' || ROLES[r].team === 'lonewolf');
  const villageExtras = extras.filter((r) => ROLES[r].team === 'village');

  // Nếu host chọn nhiều đặc vụ sói hơn cả quota -> tăng quota theo
  wolfQuota = Math.max(wolfQuota, wolfExtras.length);
  // whitewolf đứng độc lập nhưng vẫn tính vào "phe sói" cho việc chia bài (không tính vào tỉ lệ thắng)
  let remainingWolfSlots = wolfQuota - wolfExtras.length;

  // Giới hạn village extras để không vượt quá số ghế còn lại cho dân
  let villageSlotsLeft = playerCount - wolfQuota;
  const finalVillageExtras = [];
  for (const r of villageExtras) {
    if (villageSlotsLeft > 0) {
      finalVillageExtras.push(r);
      villageSlotsLeft -= 1;
    }
  }

  const pool = [];
  wolfExtras.forEach((r) => pool.push(r));
  for (let i = 0; i < remainingWolfSlots; i++) pool.push('werewolf');
  finalVillageExtras.forEach((r) => pool.push(r));
  const villagerCount = playerCount - pool.length;
  for (let i = 0; i < villagerCount; i++) pool.push('villager');

  // xáo bài (Fisher-Yates)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, playerCount);
}
