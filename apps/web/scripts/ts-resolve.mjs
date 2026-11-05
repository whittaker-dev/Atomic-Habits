// Cho `node --test` chạy thẳng file .ts (Node 24 tự bỏ phần kiểu) dù code import không ghi đuôi
// theo kiểu bundler của Next (`./map` thay vì `./map.ts`). Không cần thêm thư viện test.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.'))
        return nextResolve(`${specifier}.ts`, context);
      throw err;
    }
  },
});
