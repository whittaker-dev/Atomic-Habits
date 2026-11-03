# Prompt vẽ nhân vật (series Tiếng Anh mỗi ngày)

Vẽ bằng ChatGPT (hoặc Gemini) **trong cùng một cuộc trò chuyện** để 2 nhân vật cùng nét vẽ.
Ảnh gửi lại cho Claude Code: Claude cắt từng ô, xoá nền xanh, lưu thành
`public/characters/<nhân vật>/<biểu cảm>.png`.

Vì sao nền xanh lá thuần (#00FF00): nhân vật có viền trắng kiểu sticker, nền trắng sẽ dính vào viền
nên không tách được. Vì sao không có chữ trong ảnh: chữ do AI vẽ hay sai chính tả, video tự thêm chữ.

## 1. Cơm — nhân vật chính (đính kèm ảnh bộ sticker gốc khi gửi prompt)

```
Use the attached sticker sheet as the character reference. Draw the SAME person (same face, black
hair, black glasses, black T-shirt, wristwatch) in the SAME art style: semi-realistic painted chibi
sticker, soft shading, clean thick white sticker outline around the figure.

Make a 3 columns x 4 rows grid of 12 stickers, waist-up, character centered in each cell, all the same
size and the same camera distance, facing the viewer. Background of the WHOLE image: flat solid pure
green #00FF00, no gradient, no shadow on the background, no text, no symbols, no extra objects.

Row 1: (1) waving hello, friendly smile  (2) talking, mouth open mid-sentence, one hand open
       (3) cheering happily, laughing (waving or both fists up)
Row 2: (4) embarrassed, awkward smile, scratching the back of his head  (5) surprised "wow", both
       hands on cheeks, mouth open  (6) thinking, finger on chin, looking up
Row 3: (7) proud thumbs up  (8) pointing at the viewer, smiling  (9) laughing happily, eyes closed
Row 4: (10) confused, head tilted  (11) cupping one hand near his mouth as if announcing something
       (12) clapping, celebrating

Square image, highest resolution.
```

## 2. Mia (gửi tiếp trong cùng cuộc trò chuyện)

```
Now create a NEW character in exactly the same art style, same grid layout, same 12 poses in the same
order, same green #00FF00 background, no text:
Mia, a cheerful young American woman around 20, blonde hair in a high ponytail with a small pink bow,
blue eyes, light freckles, mint green T-shirt, small silver earrings. Friendly and energetic.
```
