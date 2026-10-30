# English For Children

Ứng dụng học tiếng Anh cho bé 9–12 tuổi (và người lớn dùng chung), chạy hoàn toàn trên trình duyệt, không cần mạng sau khi cài.

## Có gì trong ứng dụng

- **Buổi học hằng ngày**, gồm 4 bước: từ mới của một chủ đề, giải thích ngữ pháp, luyện đặt câu, ôn từ.
  Mở app là thấy sẵn "Hôm nay: chủ đề … + bài …" và có thể bấm **Đổi chủ đề**.
- **8 bài ngữ pháp** (to be, this/that, there is/are, have/has, can, hiện tại đơn, hiện tại tiếp diễn,
  câu hỏi what/where/who), bài khó chia thành vài buổi. Bài tập chỉ dùng từ bé đã học nên làm ngữ pháp cũng là ôn từ.
- **4 dạng bài đặt câu:** sắp xếp từ thành câu, điền từ vào chỗ trống, chọn câu đúng, dịch sang tiếng Anh.
- **Màn Ngữ pháp:** xem lại bài, luyện thêm, kiểm tra cuối mỗi nhóm 5 bài, kiểm tra tổng hợp (có điểm, nhận xét và phần còn yếu).
- ~1350 từ vựng thông dụng, 27 chủ đề, 5 chế độ chơi lẻ (flashcard, trắc nghiệm, nghe rồi chọn, ghép chữ, ghép cặp) và **Ôn nhanh**.
- Lặp lại ngắt quãng, XP, cấp độ, chuỗi ngày, huy hiệu.
- Mỗi người một hồ sơ (ảnh đại diện, tối đa 4 hồ sơ), tiến độ riêng.
- Tự đọc từ và câu bằng giọng đọc của trình duyệt (Chrome hoặc Edge), chọn được giọng và tốc độ trong Cài đặt.

> **Nâng lên bản 2 sẽ xóa dữ liệu bản 1.** Lần đầu mở bản 2, toàn bộ hồ sơ và tiến độ đã tạo ở bản 1 bị xóa một lần
> và không khôi phục được. Muốn giữ lại thì vào bản cũ, **Cài đặt → Xuất tiến độ** cho từng hồ sơ trước khi nâng cấp
> (tệp xuất của bản 1 không nhập được vào bản 2, chỉ để lưu giữ).

## Chạy ứng dụng

Trên Windows, bấm đúp **`start.bat`**: file tự cài thư viện lần đầu, chạy ứng dụng và mở trình duyệt (giữ cửa sổ đen mở trong lúc học).

Hoặc chạy bằng lệnh:

```bash
npm install
npm run dev      # mở địa chỉ hiển thị trong terminal (thường là http://localhost:5173)
npm test         # chạy toàn bộ kiểm thử
npm run build    # kiểm tra từ vựng và ngữ pháp rồi build bản chạy thật vào thư mục dist
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

## Thêm hoặc sửa bài ngữ pháp

Mỗi bài là một file JSON trong `src/data/grammar/lessons/` (có `id`, `title`, `order`, số buổi `sessions`,
phần giải thích `explain` và danh sách câu mẫu `sentences`). Mỗi câu mẫu có:

```json
{ "id": "there-is-are-001", "en": "There is a dog in the house.", "vi": "Có một con chó trong nhà.",
  "uses": ["dog", "house"],
  "blank": { "answer": "is", "options": ["is", "are", "be"] },
  "wrong": ["There are a dog in the house.", "There am a dog in the house."],
  "extra": ["are", "have"], "session": 1 }
```

- `uses` liệt kê từ vựng mà câu dùng; câu chỉ được chọn khi bé đã học đủ các từ này.
  Từ chức năng (a, the, I, is, are, do…) luôn được coi là đã biết, nằm trong `src/data/grammar/freeWords.json`.
- Một câu dùng cho cả 4 dạng bài (`blank` cho điền từ, `wrong` cho chọn câu đúng, `extra` là thẻ gây nhiễu cho bài dịch).
- **Lộ trình** `src/data/roadmap.json` ghép mỗi buổi học với một chủ đề từ vựng và một buổi của một bài ngữ pháp.
- Sau khi sửa, chạy `npm run validate:grammar`. Lệnh này báo lỗi nếu có từ không được phép, thiếu bản dịch,
  đáp án sai, hoặc một bước của lộ trình có ít hơn 8 câu hợp lệ (chạy cả khi `npm run build`).

> **Lưu ý:** nghĩa tiếng Việt, phiên âm, câu ví dụ và toàn bộ bài ngữ pháp do AI soạn, chưa được người kiểm tra.
> Phụ huynh nên đọc lướt qua một số từ và câu trước khi cho bé dùng và sửa trực tiếp trong file JSON nếu thấy sai.

## Cách tính điểm

- Chỉ câu **trả lời** (trắc nghiệm, nghe chọn, ghép chữ, ghép cặp, bài đặt câu) mới được XP. Flashcard chỉ để học từ mới
  và lên lịch ôn, tự bấm "Đã nhớ" không cộng điểm.
- **Hoàn thành một buổi học hằng ngày** là đạt mục tiêu hôm nay: +30 XP một lần mỗi ngày và nối chuỗi ngày.
  Con số 5/10/15/20 trong hồ sơ là số từ mới mỗi buổi. Ôn nhanh, game lẻ, luyện thêm và các bài kiểm tra có XP
  nhưng không tính chuỗi ngày.
- Lịch ôn (1, 3, 7, 14 ngày) chỉ nhích lên khi từ đã đến hạn ôn, nên chơi lặp lại trong cùng một ngày không làm từ "thuộc" nhanh hơn.
  Làm đúng một câu đặt câu cũng tính là ôn đúng các từ trong câu.
- Nếu dữ liệu của một hồ sơ bị hỏng, ứng dụng hiện màn hình khôi phục (dùng bản sao lưu gần nhất hoặc bắt đầu lại) thay vì tự xóa.

## Sao lưu tiến độ

Tiến độ lưu trong trình duyệt (`localStorage`), nên xóa dữ liệu duyệt web sẽ mất tiến độ, và hai trình duyệt khác nhau
có dữ liệu riêng. Vào **Cài đặt → Xuất tiến độ** để tải file JSON sao lưu của hồ sơ đang dùng,
và **Nhập tiến độ** để khôi phục (sẽ tạo thêm một hồ sơ mới).

## Cấu trúc mã nguồn

| Thư mục | Nội dung |
|---|---|
| `src/core` | Logic thuần, có kiểm thử: lưu trữ, hồ sơ, lặp lại ngắt quãng, XP/huy hiệu, chọn từ và câu, buổi học, kiểm tra, giọng đọc |
| `src/games` | Các chế độ chơi và bài tập đặt câu |
| `src/ui` | Các màn hình |
| `src/data/vocab` | Dữ liệu từ vựng |
| `src/data/grammar`, `src/data/roadmap.json` | Bài ngữ pháp, từ chức năng và lộ trình |
| `docs/superpowers` | Thiết kế (spec) và kế hoạch triển khai của từng bản |
