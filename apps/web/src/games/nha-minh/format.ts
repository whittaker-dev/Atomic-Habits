/** Số tiền trong game, định dạng kiểu Việt Nam: 120.000 ₫. */
export const money = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;

/** Số mét/kích thước có dấu phẩy thập phân: 1,2. */
export const metres = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
