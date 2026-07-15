# 🐺 Ma Sói Online

Game Ma Sói (Werewolf) chơi theo phòng thời gian thực, xây bằng **React (Vite)** cho frontend và **Supabase**
(Postgres + Realtime + Edge Functions) cho backend — toàn bộ chạy serverless, frontend deploy trên **Vercel**.

## Vì sao dùng Supabase thay vì server Node/Socket.io riêng?

Vercel không giữ được kết nối WebSocket dài hạn trong serverless functions, nên phần "phòng chờ" và
đồng bộ trạng thái ván đấu (ai còn sống, ai bỏ phiếu gì, tới lượt vai nào...) được xử lý bởi:
- **Postgres** (Supabase): lưu phòng, người chơi, vai trò, phiếu bầu, lịch sử...
- **Supabase Realtime**: đẩy thay đổi tới mọi client ngay lập tức (thay cho Socket.io).
- **Supabase Edge Functions**: nơi duy nhất được phép ghi/thay đổi dữ liệu (dùng service-role key), đảm bảo
  người chơi không thể tự sửa vai trò/điểm số của mình từ trình duyệt.

Người chơi **không cần tài khoản** — ứng dụng tự đăng nhập ẩn danh (Supabase Anonymous Auth) khi mở trang.

---

## 1. Cấu trúc thư mục

```
ma-soi-game/
├── client/                  # React app (Vite) → deploy lên Vercel
└── supabase/
    ├── migrations/0001_init.sql   # Schema + RLS
    ├── config.toml
    └── functions/            # Edge Functions (Deno)
        ├── join-room
        ├── start-game
        ├── get-my-role
        ├── get-all-roles
        ├── submit-night-action
        ├── advance-phase
        ├── cast-vote
        ├── send-chat
        └── hunter-shoot
```

## 2. Tạo dự án Supabase

1. Vào https://supabase.com → **New project**.
2. Vào **Authentication → Providers**, bật **Anonymous Sign-ins**.
3. Vào **SQL Editor**, chạy lần lượt nội dung 2 file:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_spectator_and_rate_limit.sql`
4. Lấy `Project URL` và `anon public key` tại **Project Settings → API** — dùng cho bước 4 (client).

## 3. Deploy Edge Functions

Cài Supabase CLI: https://supabase.com/docs/guides/cli

```bash
cd ma-soi-game
supabase login
supabase link --project-ref <PROJECT_REF_CUA_BAN>

supabase functions deploy join-room
supabase functions deploy start-game
supabase functions deploy get-my-role
supabase functions deploy get-all-roles
supabase functions deploy submit-night-action
supabase functions deploy advance-phase
supabase functions deploy cast-vote
supabase functions deploy send-chat
supabase functions deploy hunter-shoot
```

Các function tự có `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` sẵn trong môi trường
Edge Function của Supabase — không cần khai báo tay.

## 4. Cấu hình & chạy client

```bash
cd client
cp .env.example .env
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY từ bước 2
npm install
npm run dev
```

## 5. Deploy lên Vercel

1. Push thư mục `client/` lên một Git repo (GitHub/GitLab).
2. Vào https://vercel.com/new → import repo, chọn **Root Directory = client**.
3. Thêm Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy — Vercel tự nhận `vercel.json` (build `npm run build`, output `dist`, rewrite SPA).

---

## 6. Cách chơi

1. Mọi người chỉ cần mở link, nhập **tên** + **mã phòng** bất kỳ (vd `CONGTY01`) rồi bấm **Vào Phòng**.
   Người đầu tiên vào một mã phòng mới sẽ tự động là **chủ phòng**.
2. Chủ phòng chọn các vai mở rộng muốn bật, cần tối thiểu **5 người**, bấm **Bắt Đầu Ván Đấu** — hệ thống tự
   random vai theo đúng tỉ lệ Sói/Dân dựa trên số người chơi.
3. Trong đêm, ai có vai đang được gọi sẽ thấy bảng hành động riêng (chỉ họ thấy); người khác thấy màn hình "đang ngủ".
   Chủ phòng bấm **Tiếp theo** trong "Bảng điều tiết" để dẫn dắt qua từng vai, rồi sang ban ngày.
4. Ban ngày: thảo luận qua khung chat, sau đó chủ phòng mở **Bỏ phiếu** — mọi người bỏ phiếu, kết quả cập nhật
   trực quan theo thời gian thực. Chủ phòng bấm chốt kết quả rồi bắt đầu đêm tiếp theo.
5. Trò chơi tự kết thúc và hiện màn hình chiến thắng khi một phe hội đủ điều kiện thắng, lật mở toàn bộ vai trò.

## 7. Bộ vai trò

**Cơ bản:** Dân Làng, Sói, Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn.
**Mở rộng (chủ phòng bật/tắt):** Sói Già, Sói Trắng, Cupid, Cô Bé Ngây Thơ, Thằng Ngốc Làng, Kẻ Trộm,
Tiều Phu, Kẻ Câm, Sói Bà Ba.

- **Tiều Phu**: nếu Sói ra tay đêm qua nhưng bị Bảo Vệ/Phù Thủy chặn lại, Tiều Phu sẽ nhận được thông báo riêng vào sáng hôm sau.
- **Kẻ Câm**: không thể gửi tin nhắn thảo luận ban ngày khi còn sống (server chặn ở tầng Edge Function), nhưng vẫn bỏ phiếu bình thường.
- **Sói Bà Ba**: thuộc phe Sói và cùng bỏ phiếu cắn người với bầy Sói, nhưng nếu bị Tiên Tri soi sẽ hiện ra là phe Dân Làng (đánh lừa).

Tỉ lệ Sói được tính tự động theo số người chơi (xem `supabase/functions/_shared/roles.js`, hàm `calcWolfQuota`),
và tự tăng nếu chủ phòng bật nhiều vai Sói mở rộng hơn tỉ lệ mặc định.

## 8. Những điểm đã đơn giản hoá (có thể mở rộng thêm)

- **Kẻ Trộm**: đơn giản hoá thành "đổi vai bí mật với 1 người chơi khác" thay vì rút từ 2 lá bài dư của bộ luật gốc.
- **Cô Bé Ngây Thơ**: mang tính hiệu ứng/flavor, chưa có cơ chế "bị Sói phát hiện" ảnh hưởng luật chơi.
- Timer đếm ngược cho thảo luận hiện do chủ phòng tự quản lý bằng mắt/lời nói (đúng như vai trò "điều tiết" được yêu cầu) thay vì đồng hồ ép buộc cứng.

## 8b. Đồng hồ đếm giờ thảo luận + bầu lại khi hòa phiếu (mới)

- Khi mở pha thảo luận, chủ phòng chọn thời lượng (1/2/3/5 phút) — mốc kết thúc được lưu trên server (`phase_data.discussion_ends_at`)
  nên **mọi người xem đúng cùng một đồng hồ**, không lệch do độ trễ mạng.
- Chủ phòng có nút **+30s** để gia hạn bất cứ lúc nào nếu cuộc thảo luận đang sôi nổi.
- Khi bỏ phiếu **hòa** (nhiều người cùng số phiếu cao nhất), hệ thống tự động:
  1. Xoá phiếu cũ, mở lại vòng bỏ phiếu **chỉ giữa những người bị hòa** (banner cam hiển thị rõ cho mọi người).
  2. Nếu vòng 2 vẫn hòa → coi là bế tắc, không ai bị treo cổ hôm đó (tránh vòng lặp vô hạn).

## 9. Ý tưởng nâng cấp thêm

- Lịch sử ván đấu, bảng xếp hạng người thắng nhiều nhất (lưu vào Postgres).
- Tuỳ biến thương hiệu công ty (logo, màu sắc, danh sách phòng đang hoạt động).
- Tự động chuyển pha khi hết giờ thảo luận (hiện chủ phòng vẫn cần bấm nút, đồng hồ chỉ mang tính nhắc nhở trực quan).

## 10. Các tính năng đã bổ sung thêm (đợt cập nhật này)

### 🕵️ Chế độ khán giả cho người đã mất
Người chơi đã bị loại **không thể nhắn tin với người còn sống** trong khung chat chính (chặn ở Edge Function
`send-chat`), nhưng có thể trò chuyện riêng trong **kênh chat hồn ma** với những người đã mất khác — kênh này hiển thị
bằng chữ nghiêng, mờ. Người sống hoàn toàn không thấy được kênh này. Cột `channel` (`living`/`dead`) nằm trong bảng
`chat_messages` (migration `0002`).

### 🔊 Âm thanh & 📳 Haptic
`client/src/lib/sound.js` tổng hợp âm thanh trực tiếp bằng Web Audio API (không cần file mp3 ngoài, không lệ thuộc
mạng của người chơi): tiếng sói tru khi vào đêm, chuông khi mở bỏ phiếu, giai điệu chiến thắng, tiếng súng cho Thợ
Săn... Có nút 🔊/🔇 ở góc phải màn hình chơi để tắt/bật (lưu trong `localStorage`). Khi tới lượt hành động của vai
mình, điện thoại sẽ rung nhẹ (`navigator.vibrate`, chỉ hoạt động trên Android Chrome — iOS Safari không hỗ trợ).

### ✨ Hiệu ứng đặc biệt theo khoảnh khắc
`components/EffectOverlay.jsx` lắng nghe các dòng nhật ký có gắn `meta.type` (`lovers_linked`, `hunter_shot`,
`whitewolf_betray`, `night_death`, `execution`, `idiot_saved`, `vote_tie`, `game_over`) do Edge Functions gắn kèm, rồi
bật hiệu ứng icon bùng lên toàn màn hình tương ứng (Cupid ghép đôi 💘, Thợ Săn bắn 💥, Sói Trắng phản bội ❄️🐺...).

### 🔌 Xử lý mất kết nối / tự động kết nối lại
- `useRoom` giờ có polling dự phòng mỗi 8 giây (khi tab đang hiển thị) để đảm bảo trạng thái luôn hội tụ ngay cả khi
  lỡ mất sự kiện Realtime, cộng với việc tự refetch khi tab quay lại foreground.
- Có badge "🔄 Đang kết nối lại..." khi kênh Realtime chưa ở trạng thái `SUBSCRIBED`.
- Nếu phòng từng tải thành công rồi bỗng biến mất (bị dọn dẹp, gõ nhầm mã sau khi load lại trang...), app tự động
  xoá `localStorage` và đưa người chơi về sảnh chính thay vì treo ở màn hình "Đang tải phòng...".
- `player_id`/`room_code` vẫn lưu trong `localStorage` như trước nên rớt mạng/tải lại trang sẽ tự vào lại đúng phòng.

### 🚦 Giới hạn tốc độ (rate limit)
Edge Function `send-chat` chặn gửi tin nhắn nhanh hơn 1.2 giây/tin (kiểm tra `created_at` của tin gần nhất từ chính
người đó). Các hành động ban đêm/bỏ phiếu vốn đã an toàn trước spam nhờ ràng buộc `unique` trong DB (gửi lại chỉ ghi
đè, không tạo dòng mới).

### 📱 PWA — cài như app
`client/public/manifest.webmanifest` + `sw.js` (service worker cache runtime, network-first) + icon 192/512px đã có
sẵn. Sau khi deploy lên Vercel (HTTPS bắt buộc để Service Worker hoạt động), trình duyệt Chrome/Safari trên điện
thoại sẽ cho phép "Thêm vào màn hình chính" và chạy như app độc lập.

### ✅ Test tự động cho luật chơi
Logic thắng/thua, tỉ lệ vai, tính phiếu bầu, và hiệu ứng Cupid được tách thành các hàm thuần trong
`supabase/functions/_shared/gameLogic.js` (dùng chung với Edge Function `advance-phase`, đảm bảo test phản ánh đúng
code chạy thật). Chạy:

```bash
node tests/gameLogic.test.js
```

Bộ test hiện có 17 case, bao phủ: tỉ lệ Sói theo số người, tổng bài luôn khớp số người chơi, các kịch bản thắng của
từng phe (kể cả Sói Trắng phải là người sống sót cuối), kiểm phiếu (đa số / hòa), và lan truyền chết theo của Cupid.

> **Chưa làm** (do giới hạn thời gian): "vote lại" đã có, còn "đồng hồ tự động chuyển pha khi hết giờ" thì vẫn cần
> chủ phòng bấm tay để giữ đúng vai trò "điều tiết viên" của họ.
