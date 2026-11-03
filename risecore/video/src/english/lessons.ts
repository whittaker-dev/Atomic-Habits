// Mỗi bài = 1 file kịch bản public/lessons/<id>.json + giọng ở public/voice/<id>/ (scripts/make-voice.mjs).
// Thêm bài mới: thêm 1 dòng ở đây, composition tự đăng ký trong Root.tsx (folder TiengAnh).
export const LESSONS: {id: string; composition: string}[] = [
  {id: '2026-11-04-how-are-you', composition: 'TiengAnh-01-HowAreYou'},
  {id: 'bai-02-thank-you', composition: 'TiengAnh-02-ThankYou'},
  {id: 'bai-03-youre-welcome', composition: 'TiengAnh-03-YoureWelcome'},
  {id: 'bai-04-sorry', composition: 'TiengAnh-04-Sorry'},
  {id: 'bai-05-order-coffee', composition: 'TiengAnh-05-OrderCoffee'},
  {id: 'bai-06-compliments', composition: 'TiengAnh-06-Compliments'},
  {id: 'bai-07-say-no', composition: 'TiengAnh-07-SayNo'},
  {id: 'bai-08-what', composition: 'TiengAnh-08-What'},
  {id: 'bai-09-yes', composition: 'TiengAnh-09-Yes'},
  {id: 'bai-10-really', composition: 'TiengAnh-10-Really'},
  {id: 'bai-11-goodbye', composition: 'TiengAnh-11-Goodbye'},
];
