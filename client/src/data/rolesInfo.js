export const ROLES_INFO = {
  villager:   { name: 'Dân Làng',        icon: '🧑‍🌾', team: 'village',  color: '#6bb3ff', desc: 'Không có khả năng đặc biệt. Dùng lý lẽ và quan sát để tìm ra Sói.' },
  werewolf:   { name: 'Sói',             icon: '🐺', team: 'wolf',     color: '#e05264', desc: 'Mỗi đêm cùng bầy đàn chọn 1 người để cắn chết.' },
  seer:       { name: 'Tiên Tri',        icon: '🔮', team: 'village',  color: '#7fe0c8', desc: 'Mỗi đêm soi 1 người để biết họ thuộc phe Sói hay Dân Làng.' },
  guard:      { name: 'Bảo Vệ',          icon: '🛡️', team: 'village',  color: '#f4b942', desc: 'Mỗi đêm bảo vệ 1 người khỏi Sói (không được chọn trùng người 2 đêm liên tiếp).' },
  witch:      { name: 'Phù Thủy',        icon: '🧪', team: 'village',  color: '#c58cff', desc: 'Có 1 bình thuốc cứu và 1 bình thuốc độc, mỗi loại dùng được 1 lần trong ván.' },
  hunter:     { name: 'Thợ Săn',         icon: '🏹', team: 'village',  color: '#ff9f5b', desc: 'Khi chết (đêm hoặc bị treo cổ), được bắn chết ngay 1 người bất kỳ.' },
  alphawolf:  { name: 'Sói Già',         icon: '🐺👑', team: 'wolf',   color: '#a3172c', desc: 'Đầu đàn Sói, cùng bỏ phiếu cắn người với bầy Sói.' },
  whitewolf:  { name: 'Sói Trắng',       icon: '🐺❄️', team: 'lonewolf', color: '#d8e8ff', desc: 'Chơi một mình. Cứ 2 đêm được giết thêm 1 con Sói khác. Chỉ thắng khi là người sống sót cuối cùng.' },
  cupid:      { name: 'Cupid',           icon: '💘', team: 'village',  color: '#ff6fa3', desc: 'Đêm đầu tiên ghép 2 người thành một cặp tình nhân. Nếu 1 người chết, người kia cũng chết theo vì đau khổ.' },
  littlegirl: { name: 'Cô Bé Ngây Thơ',  icon: '🎀', team: 'village',  color: '#ffd1e8', desc: 'Có thể lén nhìn trộm hoạt động của Sói ban đêm, nhưng rủi ro bị phát hiện.' },
  idiot:      { name: 'Thằng Ngốc Làng', icon: '🤡', team: 'village',  color: '#ffe27a', desc: 'Nếu bị dân làng treo cổ, được lật bài lộ thân phận và thoát chết — nhưng mất quyền bỏ phiếu từ đó.' },
  thief:      { name: 'Kẻ Trộm',         icon: '🗝️', team: 'village',  color: '#9ad1ff', desc: 'Đêm đầu tiên, được bí mật đổi vai với một người chơi khác.' },
  woodcutter: { name: 'Tiều Phu',        icon: '🪓', team: 'village',  color: '#c9a06a', desc: 'Nếu Sói ra tay nhưng bị Bảo Vệ/Phù Thủy chặn lại, bạn sẽ biết được điều đó vào sáng hôm sau.' },
  mute:       { name: 'Kẻ Câm',          icon: '🤐', team: 'village',  color: '#b5b5c9', desc: 'Không thể nhắn tin thảo luận ban ngày, nhưng vẫn bỏ phiếu bình thường.' },
  disguisedwolf: { name: 'Sói Bà Ba',    icon: '🐺🎭', team: 'wolf',   color: '#8a2f42', desc: 'Là Sói nhưng khi bị Tiên Tri soi sẽ hiện ra là phe Dân Làng.' },
};

export const EXTRA_ROLE_KEYS = ['alphawolf', 'whitewolf', 'cupid', 'littlegirl', 'idiot', 'thief', 'woodcutter', 'mute', 'disguisedwolf'];
export const BASIC_ROLE_KEYS = ['villager', 'werewolf', 'seer', 'guard', 'witch', 'hunter'];

export const TEAM_LABEL = { village: 'Dân Làng', wolf: 'Phe Sói', lonewolf: 'Sói Đơn Độc' };
