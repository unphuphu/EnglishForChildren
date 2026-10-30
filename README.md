# English For Children

Ứng dụng học tiếng Anh cho bé 9–12 tuổi (và người lớn dùng chung), chạy hoàn toàn trên trình duyệt, không cần mạng sau khi cài.

- ~1350 từ vựng thông dụng, 27 chủ đề, 3 cấp độ
- 5 cách học: flashcard, trắc nghiệm, nghe rồi chọn, ghép chữ, ghép cặp
- Lặp lại ngắt quãng, XP, cấp độ, chuỗi ngày, huy hiệu, mục tiêu hằng ngày
- Mỗi người một hồ sơ (ảnh đại diện, tối đa 4 hồ sơ), tiến độ riêng
- Đọc mẫu bằng giọng đọc của trình duyệt (Chrome hoặc Edge)

## Chạy ứng dụng

Trên Windows, bấm đúp **`start.bat`**: file tự cài thư viện lần đầu, chạy ứng dụng và mở trình duyệt (giữ cửa sổ đen mở trong lúc học).

Hoặc chạy bằng lệnh:

```bash
npm install
npm run dev      # mở địa chỉ hiển thị trong terminal (thường là http://localhost:5173)
npm test         # chạy toàn bộ kiểm thử
npm run build    # kiểm tra từ vựng rồi build bản chạy thật vào thư mục dist
```

## Thêm hoặc sửa từ vựng

Từ vựng nằm trong `src/data/vocab/`, mỗi chủ đề một file JSON. Mỗi từ có dạng:

```json
{ "id": "animals-001", "word": "dog", "pos": "noun", "vi": "con chó", "ipa": "/dɒɡ/",
  "emoji": "🐶", "example": "The dog runs fast.", "exampleVi": "Con chó chạy nhanh.",
  "topic": "animals", "level": 1 }
```

- `id` có dạng `<chủ-đề>-<3 chữ số>` và không được trùng; `level` là 1, 2 hoặc 3.
- `emoji` có thể bỏ trống với từ trừu tượng (ví dụ "because").
- Thêm chủ đề mới chỉ cần thêm một file `.json` mới vào thư mục này.
- Sau khi sửa, chạy `npm run validate:vocab` để kiểm tra định dạng (lệnh này cũng chạy khi `npm run build`).

> **Lưu ý:** nghĩa tiếng Việt, phiên âm (`ipa`) và câu ví dụ do AI soạn, chưa được người kiểm tra.
> Phụ huynh nên đọc lướt qua một số từ trước khi cho bé dùng và sửa trực tiếp trong file JSON nếu thấy sai.

## Cách tính điểm

- Chỉ câu **trả lời** (trắc nghiệm, nghe chọn, ghép chữ, ghép cặp) mới được XP và tính vào mục tiêu ngày.
  Flashcard chỉ để học từ mới và lên lịch ôn, tự bấm "Đã nhớ" không cộng điểm.
- Lịch ôn (1, 3, 7, 14 ngày) chỉ nhích lên khi từ đã đến hạn ôn, nên chơi lặp lại trong cùng một ngày không làm từ "thuộc" nhanh hơn.
- Nếu dữ liệu của một hồ sơ bị hỏng, ứng dụng hiện màn hình khôi phục (dùng bản sao lưu gần nhất hoặc bắt đầu lại) thay vì tự xóa.

## Sao lưu tiến độ

Tiến độ lưu trong trình duyệt (`localStorage`), nên xóa dữ liệu duyệt web sẽ mất tiến độ, và hai trình duyệt khác nhau
có dữ liệu riêng. Vào **Cài đặt → Xuất tiến độ** để tải file JSON sao lưu của hồ sơ đang dùng,
và **Nhập tiến độ** để khôi phục (sẽ tạo thêm một hồ sơ mới).

## Cấu trúc mã nguồn

| Thư mục | Nội dung |
|---|---|
| `src/core` | Logic thuần, có kiểm thử: lưu trữ, hồ sơ, lặp lại ngắt quãng, XP/huy hiệu, chọn từ, giọng đọc |
| `src/games` | 5 chế độ chơi |
| `src/ui` | Các màn hình |
| `src/data/vocab` | Dữ liệu từ vựng |
| `docs/superpowers` | Thiết kế (spec) và kế hoạch triển khai |
