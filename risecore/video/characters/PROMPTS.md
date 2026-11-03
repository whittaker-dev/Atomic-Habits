# Prompt vẽ nhân vật (series Tiếng Anh mỗi ngày)

Kiểu đã chốt: **hoạt hình 3D kiểu Pixar, nửa người (từ thắt lưng trở lên), mặt giống bộ sticker gốc**.
Vẽ bằng ChatGPT (hoặc Gemini) **trong cùng một cuộc trò chuyện** để 2 nhân vật cùng phong cách.
Ảnh gửi lại cho Claude Code: Claude cắt từng ô, xoá nền xanh, lưu thành
`public/characters/<nhân vật>/<biểu cảm>.png`, rồi đặt lên ảnh bối cảnh.

Vì sao nhân vật vẽ trên nền xanh lá thuần (#00FF00) thay vì vẽ luôn trong bối cảnh: để tách nhân vật ra,
dùng 1 bối cảnh chung cho mọi bài, và đổi biểu cảm mà nhân vật không nhảy chỗ.
Vì sao không có chữ trong ảnh: chữ do AI vẽ hay sai chính tả, video tự thêm chữ.
Thứ tự 12 ô phải giữ nguyên (khớp `scripts/cut-sheet.sh`): wave talk cheer embarrassed wow think thumbs
point laugh confused announce clap.

## 1. Cơm — nhân vật chính (đính kèm ảnh bộ sticker gốc của Cơm)

```
Create a 3D animated character in Pixar / Disney animation style, based on the person in the attached
sticker sheet: keep his face (face shape, eyes, smile), his short black hair, black rectangular
glasses, plain black T-shirt and wristwatch. Normal human proportions (not chibi), a friendly young
Vietnamese man. Soft cinematic studio lighting, high detail skin and hair. NO white outline, NO
sticker border.

Make a 3 columns x 4 rows grid of 12 images of this same character, waist-up, centered in each cell,
same size, same camera distance and same lighting in every cell, facing the viewer. Background of the
WHOLE image: flat solid pure green #00FF00, no gradient, no floor, no shadow on the background, no text,
no logos, no extra objects.

Row 1: (1) waving hello, friendly smile  (2) talking, mouth open mid-sentence, one hand open
       (3) cheering happily, laughing (waving or both fists up)
Row 2: (4) embarrassed, awkward smile, scratching the back of his head  (5) surprised "wow", both
       hands on cheeks, mouth open  (6) thinking, finger on chin, looking up
Row 3: (7) proud thumbs up  (8) pointing at the viewer, smiling  (9) laughing happily, eyes closed
Row 4: (10) confused, head tilted  (11) cupping one hand near his mouth as if announcing something
       (12) clapping, celebrating

Square image, highest resolution.
```

## 2. Mia (gửi tiếp trong cùng cuộc trò chuyện, đính kèm ảnh bảng sticker cũ của Mia)

Bản đang dùng (`characters/source/mia-sheet.webp`) là cô gái tóc búi, áo thun trắng — khác thiết kế
khăn/kính râm ban đầu. Vẽ thêm thì đính kèm chính bảng đó và dùng mô tả dưới đây cho khớp.

```
Now do the same for the girl in the attached image: same 3D Pixar / Disney style, same grid layout,
same 12 poses in the same order, same green #00FF00 background, no outline, no text.
Keep her look: dark brown hair in a messy high bun with loose strands framing the face, big brown
eyes, rosy cheeks, small silver hoop earrings, plain off-white T-shirt, no logos. Cheerful and warm.
```

## 3. Bối cảnh (gửi tiếp trong cùng cuộc trò chuyện)

```
Now create an empty background in the same 3D Pixar / Disney style: a bright, cozy coffee shop
interior with plants and warm lights, slightly blurred (shallow depth of field), no people, no text,
no logos. Vertical 9:16 image, highest resolution.
```
