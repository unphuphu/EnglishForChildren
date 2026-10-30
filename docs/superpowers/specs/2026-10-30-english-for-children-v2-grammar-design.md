# English For Children – Bản 2 (Buổi học hằng ngày + Ngữ pháp): Thiết kế

Ngày: 2026-10-30 · Trạng thái: chờ duyệt · Dựa trên: `2026-10-30-english-for-children-v1-design.md` (bản 1 đã hoàn thành)

## 1. Mục tiêu và bối cảnh

Người dùng, thiết bị và công nghệ giữ nguyên như bản 1: bé 9–12 tuổi (và phụ huynh) học trên trình duyệt Windows, mỗi người một hồ sơ, tiến độ lưu trong `localStorage`, không backend, không tài khoản.

**Mục tiêu bản 2:** mỗi ngày bé có một **buổi học** ghép một chủ đề từ vựng với bài ngữ pháp kế tiếp. Bài tập đặt câu chỉ dùng từ bé đã học, nên làm ngữ pháp cũng là ôn từ vựng. Cuối mỗi nhóm bài và bất cứ lúc nào bé có thể làm bài kiểm tra.

**Tiêu chí thành công**
- Bé mở app, thấy ngay buổi học hôm nay, bấm một nút là học hết 4 bước không cần người lớn hướng dẫn.
- Mọi câu trong bài tập chỉ chứa từ vựng bé đã học (hoặc từ chức năng như *the, I, is*).
- Phụ huynh thêm bài ngữ pháp mới chỉ bằng cách thêm file nội dung.
- Dữ liệu bản 1 được bỏ theo yêu cầu của phụ huynh: lần đầu mở bản 2, hồ sơ và tiến độ cũ bị xóa một lần và bé tạo hồ sơ mới.

## 2. Phạm vi

**Trong bản 2**
- Buổi học hằng ngày gồm 4 bước (mục 4), lộ trình gợi ý chủ đề + bài ngữ pháp, nút đổi chủ đề.
- 8 bài ngữ pháp đầu (mục 3), 12 buổi, khoảng 180 câu mẫu.
- 4 dạng bài đặt câu (mục 5), đọc mẫu câu bằng giọng trình duyệt.
- Màn **Ngữ pháp** (xem lại, luyện thêm), kiểm tra cuối nhóm 5 bài, kiểm tra tổng hợp (mục 6).
- Huy hiệu mới, mở rộng lưu trữ tiến độ.

**Ngoài bản 2**
- Bài ngữ pháp từ số 9 trở đi (thêm sau bằng file nội dung).
- Tự gõ cả câu, chấm phát âm bằng micro, hội thoại AI, tài khoản.
- Tự ghép câu từ mẫu có chỗ trống (hướng 2/3 trong thảo luận); khung giữ chỗ để thêm sau.

## 3. Nội dung ngữ pháp

**8 bài đầu và số buổi** (thứ tự cố định, từ dễ đến khó):

| # | Bài | Số buổi |
|---|---|---|
| 1 | Động từ *to be* (I am / you are / he is…) | 2 |
| 2 | *This / that / these / those* | 1 |
| 3 | *There is / There are* | 2 |
| 4 | *Have / has* | 1 |
| 5 | *Can* (khả năng) | 1 |
| 6 | Hiện tại đơn | 2 |
| 7 | Hiện tại tiếp diễn | 2 |
| 8 | Câu hỏi *what / where / who* | 1 |

Tổng 12 buổi. Mỗi buổi trong một bài khó dùng một nhóm câu riêng; buổi sau ôn lại một ít câu của buổi trước.

**File bài học** `src/data/grammar/<id>.json` (mỗi bài một file):

```json
{ "id": "there-is-are", "title": "There is / There are", "order": 3, "sessions": 2,
  "explain": [ { "vi": "Dùng để nói có một hay nhiều thứ ở đâu đó…",
                 "examples": [ { "en": "There is a cat on the sofa.", "vi": "Có một con mèo trên ghế sofa." } ] } ],
  "sentences": [ { "id": "there-is-are-001", "en": "There is a dog in the garden.",
                   "vi": "Có một con chó trong vườn.", "uses": ["dog", "garden"],
                   "blank": { "answer": "is", "options": ["is", "are", "am"] },
                   "wrong": ["There are a dog in the garden.", "There am a dog in the garden."],
                   "extra": ["are", "has"], "session": 1 } ] }
```

- Một câu dùng cho cả 4 dạng bài: sắp xếp dùng `en`; điền chỗ trống dùng `blank`; chọn câu đúng dùng `en` cộng `wrong`; dịch dùng `vi` làm đề, thẻ từ gồm `en` cộng `extra`.
- `uses` liệt kê từ vựng (dạng gốc, có thể là cụm như "ice cream") mà câu dùng. Câu chỉ được chọn khi bé đã học đủ các từ này.
- **Từ chức năng luôn được coi là đã biết** và nằm trong `src/data/grammar/freeWords.json` (mạo từ, đại từ, các dạng *be/have/do*, giới từ và liên từ cơ bản, *not*, từ để hỏi…).
- Mỗi bài khoảng 22 câu, phần giải thích viết bằng tiếng Việt, mỗi ý có ví dụ tiếng Anh kèm dịch.

**Lộ trình** `src/data/roadmap.json`: danh sách 12 bước `{ "topic": "...", "lesson": "...", "part": n }`. Các chủ đề đầu là chủ đề dễ (*family, school, animals, food, body…*), để câu của các bài đầu viết được bằng từ bé vừa học. Sau 12 bước, các ngày tiếp theo chỉ có chủ đề từ vựng (theo thứ tự chủ đề còn từ chưa học) và ôn lại ngữ pháp.

**Kiểm tra dữ liệu khi build** (`npm run validate:grammar`, chạy cùng `npm run build`) báo lỗi nếu:
- một `uses` không có trong kho từ vựng;
- một từ trong `en` không thuộc `freeWords`, không khớp một từ trong `uses` (kể cả dạng chia đơn giản -s, -es, -ing, -ed);
- thiếu `vi`; đáp án `blank` không nằm trong câu hoặc không nằm trong `options`; câu `wrong` trùng câu đúng; `id` trùng;
- `session` vượt quá `sessions` của bài;
- một bước lộ trình tham chiếu chủ đề hoặc bài không tồn tại, hoặc bước đó có ít hơn 8 câu hợp lệ khi bé đã học các chủ đề của các bước trước và bước đó.

## 4. Buổi học hằng ngày

**Bốn bước, đi lần lượt:**
1. **Từ mới:** số từ mới bằng mục tiêu bé đã đặt (5/10/15/20), lấy từ chủ đề của ngày bằng flashcard (tự đọc từng từ như bản 1). Hết từ mới thì lấy từ cần ôn của chủ đề đó.
2. **Giải thích ngữ pháp:** một màn hình tiếng Việt kèm ví dụ có nút nghe, ví dụ đầu tự đọc một lần. Ở các buổi sau của cùng bài, màn này chỉ nhắc lại ngắn.
3. **Luyện đặt câu:** 8 câu, trộn 4 dạng (mục 5).
4. **Ôn từ:** trắc nghiệm **10 đến 20 câu**; số câu bằng số từ đến hạn ôn, tối thiểu 10, tối đa 20, thiếu thì bổ sung bằng các từ đã học còn yếu nhất.

**Trang chủ:** thẻ "Hôm nay: chủ đề *X* + bài *Y* (buổi k/n)" với nút **Bắt đầu** và **Đổi chủ đề**. Đổi chủ đề chỉ thay chủ đề từ vựng của hôm nay, bài ngữ pháp vẫn đúng thứ tự. Thẻ cũng hiện trạng thái hôm nay (chưa làm / đã xong).

**Lộ trình và tiến độ**
- Mỗi hồ sơ lưu `plan.step`: chỉ số bước kế tiếp trong lộ trình. Bước chỉ được tính xong và `plan.step` chỉ tăng khi bé làm hết cả 4 bước; bỏ giữa chừng thì lần sau gợi ý lại bước đó, nhưng từ vựng đã trả lời đúng vẫn được ghi.
- Nếu chủ đề gợi ý đã học hết từ (ví dụ bé từng chọn trước), dùng chủ đề kế tiếp còn từ chưa học.
- Làm thêm buổi thứ hai trong ngày vẫn được (tiến sang bước sau); thưởng đạt mục tiêu và chuỗi ngày chỉ tính một lần mỗi ngày.

**Mục tiêu hằng ngày và chuỗi ngày (thay đổi so với bản 1)**
- **Hoàn thành buổi học = đạt mục tiêu hôm nay**: +30 XP một lần mỗi ngày và nối chuỗi ngày.
- Con số 5/10/15/20 của hồ sơ nay là **số từ mới mỗi buổi**.
- Nút **Học hôm nay** của bản 1 đổi tên thành **Ôn nhanh**: vẫn cho XP cho câu đúng nhưng không còn tính mục tiêu hay chuỗi ngày. Các game lẻ ở mục Chơi game giữ nguyên, cũng không tính mục tiêu.
- Vòng tiến độ "x/10" trên trang chủ được thay bằng trạng thái buổi học hôm nay.

## 5. Bài tập đặt câu

**Chọn 8 câu cho bước 3:** câu hợp lệ khi mọi từ trong `uses` đã có thẻ ôn hoặc là từ mới của hôm nay. 6 câu từ nhóm của buổi hiện tại và 2 câu ôn từ buổi trước (bài 1 buổi 1 thì lấy cả 8 từ nhóm hiện tại). Ưu tiên câu chứa từ đến hạn ôn hoặc từ bé hay sai; câu đã gặp nhiều lần xếp sau; không lặp câu trong một buổi. Nếu có ít hơn 8 câu thì dùng số câu có được (tối thiểu 4); ít hơn 4 thì báo "học thêm từ nhé" và cho bé sang bước tiếp.

**Bốn dạng** (xoay vòng, mỗi dạng 2 câu; một câu thiếu dữ liệu cho dạng nào thì chuyển sang dạng khác):
- **Sắp xếp thành câu:** các từ xáo trộn, bé chạm lần lượt rồi bấm **Kiểm tra**; kết quả sau khi xáo không được trùng thứ tự đúng.
- **Điền từ vào chỗ trống:** các lựa chọn từ `blank.options`.
- **Chọn câu đúng:** `en` cộng 2–3 câu `wrong`, xáo vị trí.
- **Dịch sang tiếng Anh:** đề là câu `vi`, thẻ từ gồm các từ của `en` cộng `extra`; bấm **Kiểm tra**.

**Chấm điểm:** mỗi câu chỉ một lần kiểm tra; đúng +10 XP, lượt hoàn hảo +20 như bản 1. Khi sai, hiện câu đúng và bản dịch. Câu làm đúng được ghi là bé ôn đúng các từ trong `uses` (tuân theo quy tắc lịch ôn: chỉ nhích hộp khi từ đến hạn). Câu làm sai không trừ vào từ vựng.

**Đọc mẫu:** sau khi bé trả lời, app đọc câu tiếng Anh đúng một lần (không đọc trước để khỏi lộ đáp án) và có nút nghe lại; dùng giọng và tốc độ trong Cài đặt.

## 6. Màn Ngữ pháp và các bài kiểm tra

**Màn Ngữ pháp** (lối vào ở trang chủ): danh sách bài với trạng thái *chưa học / đang học / đã học*; bé xem lại phần giải thích, luyện thêm 8 câu cho bài đã học, và vào hai loại kiểm tra.

**Kiểm tra cuối nhóm:** nhóm gồm 5 bài liên tiếp (bài 1–5, 6–10…). Nút hiện khi bé đã học xong cả nhóm. 15 câu từ các bài trong nhóm (chỉ câu hợp lệ; tối thiểu 10). Đạt từ 70% (11/15 với 15 câu) thì nhận huy hiệu nhóm; chưa đạt thì làm lại lúc nào cũng được, không khóa. Lúc này chỉ có nhóm 1 (bài 1–5); nhóm 2 xuất hiện khi bài 9 và 10 được thêm.

**Kiểm tra tổng hợp (tự chọn):** 20 câu gồm 10 câu từ vựng (từ đã học) và 10 câu ngữ pháp (từ các bài đã có ít nhất một buổi). Nếu chưa học bài nào thì cả 20 câu là từ vựng. Cần bé đã học ít nhất 10 từ. Kết quả: điểm x/20, nhận xét (Xuất sắc từ 90%, Tốt từ 70%, Khá từ 50%, còn lại "Cần cố gắng thêm"), và danh sách phần còn yếu: bài ngữ pháp và từ làm sai. Câu đúng cộng XP như thường.

**Huy hiệu mới:** `grammar-first-lesson` (hoàn thành buổi học đầu tiên), `grammar-group-<n>` (đạt kiểm tra nhóm n), `test-90` (từ 90% ở kiểm tra tổng hợp).

## 7. Lưu trữ tiến độ

Tiến độ chuyển sang `version: 2` và **không có bước chuyển đổi từ bản 1** (dữ liệu bản 1 bị bỏ, xem bên dưới). Hai phần mới là bắt buộc và có giá trị khởi tạo:
- `plan: { step }` (mặc định 0);
- `grammar: { lessons: { [id]: { partsDone, correct, wrong } }, sentences: { [id]: { seen, wrong } }, checkpoints: { [n]: { best, total } }, tests: [ { date, score, total } ] }` (giữ 10 kết quả kiểm tra gần nhất).

**Bỏ dữ liệu bản 1 (quyết định của phụ huynh):** app lưu một dấu `appDataVersion`. Khi mở app mà dấu này chưa phải 2, app xóa đúng một lần toàn bộ khóa của bản 1 (danh sách hồ sơ, hồ sơ đang chọn, tiến độ từng hồ sơ và các bản sao lưu của chúng), rồi ghi dấu 2 và hiện màn chọn hồ sơ trống. Việc này chỉ xảy ra một lần. Tệp xuất tiến độ của bản 1 (`version: 1`) bị từ chối khi nhập ("Tệp không hợp lệ"), vì tệp xuất của bản 2 mang `version: 2`.

Xuất/nhập tiến độ và màn khôi phục dữ liệu hỏng áp dụng cho các phần mới. Quy tắc `finishSession` thay đổi: đạt mục tiêu và nối chuỗi chỉ xảy ra khi kết thúc một buổi học hoàn chỉnh.

## 8. Xử lý lỗi và tình huống đặc biệt

- Thiếu câu hợp lệ: xem mục 5; không để bé kẹt.
- Bỏ giữa buổi: bắt đầu lại buổi đó lần sau, từ đã trả lời đúng vẫn ghi.
- Qua nửa đêm: ngày tính theo lúc bắt đầu buổi học, như bản 1.
- Dữ liệu bài học sai định dạng: chặn khi build; khi chạy, một bài hỏng bị bỏ qua và app vẫn học tiếp bằng các bài còn lại.
- Máy không có giọng tiếng Anh: app vẫn dùng được, chỉ không có tiếng.

## 9. Kiểm thử

- **Kiểm tra dữ liệu** `validate:grammar` (mục 3) chạy cả trong vitest.
- **Logic thuần (`core`):** chọn câu hợp lệ, không lặp, ưu tiên từ đến hạn, thiếu câu; gán 4 dạng bài; chấm điểm và cập nhật từ vựng; bước lộ trình tiến/không tiến; chọn chủ đề thay thế; đủ 10–20 câu ôn từ; tính điểm, nhận xét và phần còn yếu; điều kiện nhận huy hiệu; dọn dữ liệu bản 1 đúng một lần (kể cả sao lưu) và từ chối tệp xuất của bản 1.
- **Giao diện:** 4 dạng bài, buổi học đủ 4 bước và bỏ giữa chừng, thẻ hôm nay trên trang chủ và đổi chủ đề, màn Ngữ pháp, hai bài kiểm tra.
- **Thử tay** trên Chrome và Edge trước khi giao cho bé.

## 10. Giả định cần xác nhận

- Phần giải thích và câu ví dụ do AI soạn; phụ huynh đọc kiểm tra trước khi cho bé dùng.
- Từ chức năng (`freeWords`) luôn được coi là bé đã biết.
- Một câu được coi là "đã học đủ từ" khi từng từ có thẻ ôn (đã gặp ít nhất một lần).
- Nhóm kiểm tra 5 bài tạm thời chỉ có nhóm 1 cho đến khi thêm bài 9–10.
