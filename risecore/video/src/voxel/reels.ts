// Mỗi reel 3D = 1 file kịch bản public/lessons/<id>.json + giọng ở public/voice/<id>/ (scripts/make-voice.mjs).
// Thêm reel mới: thêm 1 dòng ở đây, composition tự đăng ký trong Root.tsx (folder Voxel3D).
export const REELS: {id: string; composition: string}[] = [
  {id: 'voxel-01-very-like', composition: 'Voxel-01-VeryLike'},
  {id: 'voxel-02-bored', composition: 'Voxel-02-Bored'},
  {id: 'voxel-03-agree', composition: 'Voxel-03-Agree'},
  {id: 'voxel-04-light', composition: 'Voxel-04-Light'},
  {id: 'voxel-05-photo', composition: 'Voxel-05-Photo'},
  {id: 'voxel-06-home', composition: 'Voxel-06-Home'},
  {id: 'voxel-07-again', composition: 'Voxel-07-Again'},
  {id: 'voxel-08-lend', composition: 'Voxel-08-Lend'},
  {id: 'voxel-09-discuss', composition: 'Voxel-09-Discuss'},
  {id: 'voxel-10-explain', composition: 'Voxel-10-Explain'},
  {id: 'voxel-11-hangout', composition: 'Voxel-11-HangOut'},
];
