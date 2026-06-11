import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async redirects() {
    return [
      {
        source: '/vung-tau-trip',
        destination: '/plan-trip',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
