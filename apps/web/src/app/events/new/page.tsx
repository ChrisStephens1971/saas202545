'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { EventForm } from '@/components/events/EventForm';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function NewEventPage() {
  const router = useRouter();
  const utils = trpc.useContext();

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      router.push('/events');
    },
    onError: (error) => {
      alert(`Error creating event: ${error.message}`);
    },
  });

  const handleSubmit = async (data: any) => {
    await createEvent.mutateAsync(data);
  };

  const handleCancel = () => {
    router.push('/events');
  };

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <EventForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      </div>
    </ProtectedPage>
  );
}
