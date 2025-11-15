'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ServiceItemForm } from '@/components/bulletins/ServiceItemForm';
import { ServiceItemsList } from '@/components/bulletins/ServiceItemsList';

export default function BulletinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bulletinId = params.id as string;
  const utils = trpc.useContext();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: bulletin, isLoading, error } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  const { data: serviceItemsData } = trpc.serviceItems.list.useQuery(
    {
      bulletinIssueId: bulletinId,
    },
    {
      enabled: !!bulletinId,
    }
  );

  const createItem = trpc.serviceItems.create.useMutation({
    onSuccess: () => {
      utils.serviceItems.list.invalidate();
      setShowForm(false);
    },
  });

  const updateItem = trpc.serviceItems.update.useMutation({
    onSuccess: () => {
      utils.serviceItems.list.invalidate();
      setEditingItem(null);
      setShowForm(false);
    },
  });

  const deleteItem = trpc.serviceItems.delete.useMutation({
    onSuccess: () => {
      utils.serviceItems.list.invalidate();
    },
  });

  const reorderItems = trpc.serviceItems.reorder.useMutation({
    onSuccess: () => {
      utils.serviceItems.list.invalidate();
    },
  });

  const lockBulletin = trpc.bulletins.lock.useMutation({
    onSuccess: () => {
      utils.bulletins.get.invalidate({ id: bulletinId });
      alert('Bulletin locked successfully!');
    },
    onError: (error) => {
      alert(`Error locking bulletin: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading bulletin...</p>
      </div>
    );
  }

  if (error || !bulletin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading bulletin: {error?.message || 'Not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = serviceItemsData?.items || [];
  const isLocked = bulletin.status === 'locked';

  const handleSubmitForm = async (data: any) => {
    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        ...data,
      });
    } else {
      // Get the next sequence number
      const nextSequence = items.length > 0
        ? Math.max(...items.map((item: any) => item.sequence)) + 1
        : 1;

      await createItem.mutateAsync({
        ...data,
        sequence: nextSequence,
      });
    }
  };

  const handleReorder = async (reorderedItems: { id: string; sequence: number }[]) => {
    await reorderItems.mutateAsync({
      bulletinIssueId: bulletinId,
      items: reorderedItems,
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteItem.mutateAsync({ id });
  };

  const handleLock = async () => {
    if (confirm('Lock this bulletin? This will validate all CCLI numbers and prevent further edits.')) {
      await lockBulletin.mutateAsync({ id: bulletinId });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h1>
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-2 rounded-full text-base font-medium ${
                  bulletin.status === 'locked'
                    ? 'bg-green-100 text-green-800'
                    : bulletin.status === 'built'
                    ? 'bg-blue-100 text-blue-800'
                    : bulletin.status === 'approved'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {bulletin.status.charAt(0).toUpperCase() + bulletin.status.slice(1)}
              </span>
              {isLocked && (
                <span className="text-sm text-gray-600">
                  Locked {new Date(bulletin.lockedAt!).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/bulletins')}>
              Back to List
            </Button>
            {!isLocked && (
              <Button variant="primary" size="lg">
                Preview
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Service Items Form (when adding/editing) */}
      {showForm && (
        <div className="mb-6">
          <ServiceItemForm
            serviceDate={new Date(bulletin.serviceDate)}
            initialData={editingItem}
            onSubmit={handleSubmitForm}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        </div>
      )}

      {/* Service Items List */}
      <Card variant="elevated" className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Order of Service</CardTitle>
              <CardDescription>
                {isLocked
                  ? 'Bulletin is locked - no changes allowed'
                  : 'Drag items to reorder, or add/edit/delete items'}
              </CardDescription>
            </div>
            {!isLocked && !showForm && (
              <Button
                size="lg"
                onClick={() => {
                  setEditingItem(null);
                  setShowForm(true);
                }}
              >
                Add Service Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg text-gray-600 mb-6">
                No service items yet. Add your first item to get started.
              </p>
              {!showForm && (
                <Button
                  size="lg"
                  onClick={() => {
                    setEditingItem(null);
                    setShowForm(true);
                  }}
                >
                  Add First Service Item
                </Button>
              )}
            </div>
          ) : (
            <ServiceItemsList
              items={items}
              onReorder={handleReorder}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLocked={isLocked}
            />
          )}
        </CardContent>
      </Card>

      {/* Lock Bulletin Action */}
      {!isLocked && bulletin.status === 'draft' && items.length > 0 && (
        <Card variant="outlined">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-1">Ready to lock this bulletin?</h3>
                <p className="text-base text-gray-600">
                  Lock by Thursday 2pm for Sunday printing. All songs must have CCLI numbers.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleLock}
                disabled={lockBulletin.isLoading}
              >
                {lockBulletin.isLoading ? 'Locking...' : 'Lock Bulletin'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Bulletin Actions */}
      {isLocked && (
        <Card variant="outlined">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-1">Bulletin Locked</h3>
                <p className="text-base text-gray-600">
                  This bulletin is locked and ready for printing.
                  {bulletin.lockedBy && ` Locked by user ${bulletin.lockedBy}.`}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="primary" size="lg">
                  Download PDF
                </Button>
                <Button variant="secondary" size="lg">
                  Download Slides
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
