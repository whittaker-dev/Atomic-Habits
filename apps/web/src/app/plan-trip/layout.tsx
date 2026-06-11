import { TripLocaleProvider } from './trip-locale-provider';
import './trip-light.css';

export default function PlanTripLayout({ children }: { children: React.ReactNode }) {
  return (
    <TripLocaleProvider>
      <div className="trip-light min-h-screen bg-canvas text-ink antialiased">{children}</div>
    </TripLocaleProvider>
  );
}
