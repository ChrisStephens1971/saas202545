'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function BulletinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bulletinId = params.id as string;

  const { data: bulletin, isLoading, error } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  const { data: serviceItems } = trpc.serviceItems.list.useQuery({
    bulletinIssueId: bulletinId,
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

  const items = serviceItems?.items || [];

  // Type assertion for bulletin since it's a placeholder response
  const bulletinData = bulletin as any;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {new Date(bulletinData.serviceDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h1>
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-2 rounded-full text-base font-medium ${
                  bulletinData.status === 'locked'
                    ? 'bg-green-100 text-green-800'
                    : bulletinData.status === 'built'
                    ? 'bg-blue-100 text-blue-800'
                    : bulletinData.status === 'approved'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {bulletinData.status.charAt(0).toUpperCase() + bulletinData.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/bulletins')}>
              Back to List
            </Button>
            {bulletinData.status === 'draft' && (
              <Button variant="primary" size="lg">
                Preview
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Service Items */}
      <Card variant="elevated" className="mb-6">
        <CardHeader>
          <CardTitle>Order of Service</CardTitle>
          <CardDescription>
            Add and arrange service items for this bulletin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 mb-6">
                No service items yet. Add your first item to get started.
              </p>
              <Button size="lg">Add Service Item</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item: any, index: number) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg"
                >
                  <div className="text-2xl font-bold text-gray-400 w-12 text-center">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {item.type}
                      </span>
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                    </div>
                    {item.description && (
                      <p className="text-base text-gray-600">{item.description}</p>
                    )}
                    {item.ccliNumber && (
                      <p className="text-sm text-gray-500 mt-1">
                        CCLI #{item.ccliNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="danger" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="lg" className="w-full">
                Add Another Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {bulletinData.status === 'draft' && (
        <Card variant="outlined">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-1">Ready to lock this bulletin?</h3>
                <p className="text-base text-gray-600">
                  Lock by Thursday 2pm for Sunday printing. This action requires admin access.
                </p>
              </div>
              <Button variant="primary" size="lg">
                Lock Bulletin
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bulletinData.status === 'locked' && bulletinData.pdfUrl && (
        <Card variant="outlined">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-1">Bulletin Locked</h3>
                <p className="text-base text-gray-600">
                  This bulletin is locked and ready for printing.
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
