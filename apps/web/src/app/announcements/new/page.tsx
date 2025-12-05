'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

export default function NewAnnouncementPage() {
  const router = useRouter();
  const utils = trpc.useContext();

  const createAnnouncement = trpc.announcements.create.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      router.push('/announcements');
    },
    onError: (error) => {
      alert(`Error creating announcement: ${error.message}`);
    },
  });

  const handleSubmit = async (data: any) => {
    await createAnnouncement.mutateAsync(data);
  };

  const handleCancel = () => {
    router.push('/announcements');
  };

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <AnnouncementForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      </div>
    </ProtectedPage>
  );
}
