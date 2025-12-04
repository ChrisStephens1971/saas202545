'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-primary-50 to-white">
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">
          Elder-First Church Platform
        </h1>
        <p className="text-2xl text-gray-600 mb-12">
          Church management made simple and accessible for everyone
        </p>
        <div className="flex gap-6 justify-center">
          <Button
            size="lg"
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/dashboard')}
          >
            View Demo
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-xl font-bold mb-2">Easy Bulletins</h3>
            <p className="text-base text-gray-600">
              Create beautiful bulletins with our simple intake form. Lock by Thursday, print on Sunday.
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold mb-2">People First</h3>
            <p className="text-base text-gray-600">
              Manage your church members, track attendance, and build community.
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">♿</div>
            <h3 className="text-xl font-bold mb-2">Accessible Design</h3>
            <p className="text-base text-gray-600">
              Large text, high contrast, and simple navigation designed for seniors.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
