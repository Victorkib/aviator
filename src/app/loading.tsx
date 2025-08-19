import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">✈️</div>
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          Preparing for takeoff...
        </p>
      </div>
    </div>
  );
}
