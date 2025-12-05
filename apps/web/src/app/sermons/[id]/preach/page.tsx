'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { PreachMode } from '@/components/sermons/PreachMode';
import { Loader2 } from 'lucide-react';

export default function PreachPage() {
    const params = useParams();
    const router = useRouter();
    const sermonId = params.id as string;

    const { data: sermon, isLoading, error } = trpc.sermons.get.useQuery(
        { id: sermonId },
        { enabled: !!sermonId }
    );

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error || !sermon) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <p className="text-red-500">Error loading sermon</p>
                <button onClick={() => router.back()} className="text-blue-500 hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <PreachMode
            sermon={sermon}
            onExit={() => router.push(`/sermons/${sermonId}`)}
        />
    );
}
