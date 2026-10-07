import { BNIcon } from '@/components/base/BuildNerveLogo';

/**
 * Full-page BuildNerve loading screen.
 * Shared by auth pages and route guards so the app never flashes a blank page
 * while authentication state is being resolved or a redirect is in flight.
 */
export default function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#1B2A3E] flex items-center justify-center">
          <BNIcon height={28} />
        </div>
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}