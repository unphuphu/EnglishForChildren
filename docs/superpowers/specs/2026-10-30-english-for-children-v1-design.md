# English For Children – Bản 1 (Từ vựng + Game hóa): Thiết kế

Ngày: 2026-10-30 · Trạng thái: chờ duyệt

## 1. Mục tiêu và bối cảnh

**Người dùng:** một bé 9–12 tuổi, học ở nhà, đọc được tiếng Việt, trình độ tiếng Anh cơ bản (đã học ở trường, biết câu đơn giản).
**Người dùng thứ hai:** chính phụ huynh dùng cùng app với nội dung tương tự (cùng bộ từ vựng, cùng chế độ chơi). Mỗi người có hồ sơ riêng (mục 6A).
**Người làm:** phụ huynh, dùng cho gia đình. Không bán, không cần tài khoản, thanh toán hay backend.
**Thiết bị:** máy tính Windows, trình duyệt Chrome hoặc Edge.
**Mục tiêu bản 1:** bé học và ôn khoảng 1000–2000 từ thông dụng theo chủ đề, mỗi ngày muốn quay lại nhờ XP, cấp độ, chuỗi ngày, huy hiệu và mục tiêu hằng ngày.

**Tiêu chí thành công**
- Bé tự mở app và hoàn thành một lượt "Học hôm nay" không cần người lớn hướng dẫn.
- Chạy hoàn toàn offline sau khi cài.
- Tiến độ không mất khi đóng trình duyệt.
- Phụ huynh thêm hoặc sửa từ vựng chỉ bằng cách sửa file JSON.

## 2. Phạm vi

**Trong bản 1**
- Bộ từ vựng 1000–2000 từ, chia chủ đề và 3 cấp độ.
- 5 chế độ: flashcard, trắc nghiệm, nghe rồi chọn, ghép chữ, ghép cặp.
- Lặp lại ngắt quãng, XP, cấp độ, chuỗi ngày, huy hiệu, mục tiêu hằng ngày.
- Đọc mẫu bằng giọng đọc của trình duyệt (Web Speech `speechSynthesis`).
- Xuất và nhập tiến độ ra file JSON.

**Ngoài bản 1 (các bản sau, mỗi bản có spec riêng)**
- Bản 2: bài học ngữ pháp, cấu trúc câu, thực hành đặt câu, bài kiểm tra tổng hợp, đọc mẫu cho câu.
- Chấm phát âm bằng micro (chỉ làm nếu phụ huynh yêu cầu; rủi ro kỹ thuật cao).
- Hội thoại với AI, tài khoản, đồng bộ giữa các máy.

## 3. Công nghệ

React + Vite, JavaScript thuần (không TypeScript), React Router, Vitest + React Testing Library. Tiến độ lưu trong `localStorage`. Không backend. Máy đã có Node v24 và npm 11.

## 4. Cấu trúc module

| Module | Việc của nó | Phụ thuộc |
|---|---|---|
| `data/vocab` | Các file JSON từ vựng, mỗi chủ đề một file | không |
| `core/vocabService` | Đọc từ, lọc theo chủ đề và cấp độ | `data/vocab` |
| `core/srs` | Chọn từ cần ôn, tính lịch ôn lặp lại ngắt quãng | không |
| `core/profiles` | Danh sách hồ sơ (ảnh, tên), hồ sơ đang dùng, thêm/sửa/xóa | `core/storage` |
| `core/progress` | XP, cấp độ, chuỗi ngày, huy hiệu, mục tiêu ngày, theo từng hồ sơ | `core/storage` |
| `core/storage` | Lưu, đọc, sao lưu, chuyển phiên bản dữ liệu | không |
| `core/speech` | Đọc mẫu bằng giọng trình duyệt | không |
| `games/*` | flashcard, quiz, listen, scramble, match | các module `core` |
| `ui/*` | Trang chủ, chủ đề, chế độ, hồ sơ, huy hiệu, cài đặt | các module `core` |

`core` không biết gì về giao diện nên kiểm thử độc lập được. Bản 2 thêm `data/grammar`, `core/grammarService`, `core/quiz` và các game đặt câu mà không sửa phần từ vựng.

## 5. Dữ liệu từ vựng

Mỗi từ:

```json
{ "id": "animals-001", "word": "dog", "pos": "noun", "vi": "con chó",
  "ipa": "/dɒɡ/", "emoji": "🐶", "example": "The dog runs fast.",
  "exampleVi": "Con chó chạy nhanh.", "topic": "animals", "level": 1 }
```

- `emoji` có với từ cụ thể, bỏ qua với từ trừu tượng (câu ví dụ gánh vai trò ngữ cảnh). Mọi từ đều có câu ví dụ.
- `level`: 1 = dễ, 2 = trung bình, 3 = khó.
- `id` duy nhất, dạng `<chủ-đề>-<số>`.
- Mục tiêu khoảng 1500 từ (tối thiểu 1000, tối đa 2000), khoảng 25–30 chủ đề (ví dụ: gia đình, trường học, động vật, đồ ăn, cơ thể, quần áo, nhà cửa, thời tiết, giao thông, nghề nghiệp, thể thao, thiên nhiên, cảm xúc, thời gian, hành động hằng ngày, tính từ thông dụng, từ nối và giới từ).
- Nghĩa tiếng Việt, phiên âm và câu ví dụ do Claude tạo. Phụ huynh đọc kiểm tra trước khi bé dùng. Bước kiểm tra dữ liệu (mục 9) bắt lỗi định dạng, không bắt lỗi nghĩa.
- Tiến độ của bé lưu riêng theo `id` từ: số lần đúng, số lần sai, lần ôn kế tiếp, mức thuộc.

## 6. Màn hình và luồng học

**Màn hình:** Trang chủ (tên bé, chuỗi ngày, XP và cấp độ, vòng tiến độ mục tiêu hôm nay, nút "Học hôm nay"), Chọn chủ đề (kèm số từ đã thuộc), Chọn chế độ chơi, Màn chơi (khoảng 10 từ/lượt, phản hồi đúng sai ngay, kết quả cuối lượt), Hồ sơ và huy hiệu, Cài đặt (tên, mục tiêu ngày, tốc độ và giọng đọc, xuất/nhập/xóa tiến độ).

**"Học hôm nay":**
1. Chọn từ theo ưu tiên: từ đến hạn ôn, rồi từ bé hay sai, rồi từ mới thuộc cấp độ hiện tại.
2. Từ mới qua flashcard trước, sau đó kiểm tra bằng một chế độ xen kẽ.
3. Cập nhật lịch ôn: đúng thì giãn 1, 3, 7, 14 ngày; sai thì ôn lại sớm.
4. Cuối lượt: tính XP, cập nhật chuỗi ngày, kiểm tra huy hiệu.

**Mục tiêu hằng ngày**
- Lần đầu mở app, bé chọn 5, 10, 15 hoặc 20 từ/ngày.
- Bé bỏ qua thì mặc định **10 từ/ngày**.
- Đổi được trong cài đặt, **không dưới 5 từ**.
- Một từ tính vào mục tiêu khi bé trả lời đúng trong lượt học. Đạt mục tiêu thì giữ chuỗi ngày và nhận XP thưởng.

**XP và huy hiệu** (giá trị nằm trong file cấu hình, chỉnh được): đúng +10, lượt hoàn hảo +20, đạt mục tiêu ngày +30. Cấp độ tăng theo mốc XP. Huy hiệu: chuỗi 3/7/30 ngày, thuộc 50/100/500 từ, lượt hoàn hảo đầu tiên, hoàn thành một chủ đề.

## 6A. Hồ sơ người dùng (thay cho đăng nhập)

- Khi mở app, màn hình đầu tiên là **chọn ảnh đại diện**: mỗi hồ sơ là một ảnh (emoji lớn, ví dụ 🦊 🐼 🦁 🐙) kèm tên hiển thị. Chạm vào ảnh là vào phiên của người đó; không có mật khẩu.
- Tối đa **4 hồ sơ**. Có nút "Thêm hồ sơ": chọn ảnh từ bộ ảnh có sẵn (khoảng 24 ảnh, ảnh đã được hồ sơ khác chọn thì không chọn trùng), nhập tên, chọn mục tiêu ngày.
- Mỗi hồ sơ có **tiến độ, XP, chuỗi ngày, huy hiệu, mục tiêu ngày và cài đặt riêng**. Bộ từ vựng dùng chung.
- Trên mọi màn hình có ảnh đại diện nhỏ ở góc; chạm vào để **đổi người dùng** (quay về màn hình chọn ảnh).
- Sửa tên, đổi ảnh hoặc xóa hồ sơ nằm trong Cài đặt; xóa hồ sơ cần xác nhận hai bước để bé không xóa nhầm.
- Hồ sơ không phải bảo mật: đây chỉ là cách phân biệt phiên làm việc trên một máy dùng chung.

## 7. Lưu dữ liệu

Một khóa `localStorage` cho danh sách hồ sơ và một khóa riêng cho tiến độ của từng hồ sơ (`progress:<profileId>`), đều có trường `version`; khi cấu trúc đổi ở bản 2, dữ liệu cũ được chuyển tự động. Giữ một bản sao lưu gần nhất. Cài đặt có nút xuất/nhập tiến độ ra file JSON cho từng hồ sơ, vì xóa dữ liệu trình duyệt sẽ mất tiến độ.

## 8. Xử lý lỗi và tình huống đặc biệt

- Không có giọng đọc tiếng Anh: ẩn nút nghe, báo nhẹ, vẫn học bằng chữ và emoji.
- `localStorage` bị tắt hoặc đầy: chạy chế độ tạm và nhắc rằng tiến độ không được lưu.
- Dữ liệu tiến độ hỏng: giữ bản sao lưu, báo phụ huynh, cho phép khôi phục, không tự xóa.
- File từ vựng sai định dạng: bước kiểm tra lúc build báo đúng từ lỗi.
- Chuỗi ngày tính theo ngày của máy; bỏ lỡ một ngày thì về 0 và hiện thông điệp khích lệ bắt đầu lại.
- Chủ đề không đủ từ cho một lượt: bổ sung từ cùng cấp độ từ chủ đề khác.

## 9. Kiểm thử

- **Vitest (`core`):** hồ sơ (tối đa 4, không trùng ảnh, tiến độ các hồ sơ không lẫn nhau, xóa hồ sơ chỉ xóa dữ liệu của hồ sơ đó), lịch SRS, XP và cấp độ, chuỗi ngày (qua nửa đêm, bỏ ngày), mục tiêu tối thiểu 5 và mặc định 10, chuyển phiên bản dữ liệu.
- **Kiểm tra dữ liệu từ vựng:** đủ trường bắt buộc, `id` không trùng, chủ đề và cấp độ hợp lệ, `emoji` đúng định dạng.
- **React Testing Library (`games`):** chọn đúng, chọn sai, kết thúc lượt, cập nhật điểm.
- **Thử tay** trên Chrome và Edge các màn hình chính trước khi giao cho bé.

## 10. Giả định cần xác nhận

- Chấm phát âm bằng micro không nằm trong bản 1 hay bản 2 mặc định.
- Giọng đọc của trình duyệt đủ chất lượng cho bé (nếu không, cân nhắc dịch vụ giọng đọc ở bản sau).
- Nhiều người dùng chung một máy và một trình duyệt; hồ sơ chỉ để phân biệt phiên, không bảo mật. Nếu dùng hai trình duyệt khác nhau thì dữ liệu tách biệt.
- Người lớn dùng cùng nội dung và cùng cấp độ với bé; chưa có bộ từ riêng cho người lớn.

## 11. Quản lý mã nguồn

Mã nguồn quản lý bằng git, đẩy lên một repo **private** trên GitHub (dự án gia đình, có liên quan đến trẻ em). Nhánh chính `main`; mỗi nhóm công việc trong kế hoạch là một commit nhỏ, có thông điệp rõ. `.gitignore` loại `node_modules`, `dist` và file tạm.
