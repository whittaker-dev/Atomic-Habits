import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlanTripContent } from './plan-trip-content';

export const metadata: Metadata = {
  title: 'Kế hoạch chuyến đi',
  description: 'Thành viên, di chuyển, chỗ ở và lịch trình cho chuyến đi.',
};

export default function PlanTripPage() {
  return (
    <Suspense fallback={null}>
      <PlanTripContent />
    </Suspense>
  );
}
