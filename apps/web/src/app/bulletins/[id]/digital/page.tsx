'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { BulletinCanvasDigitalView } from '@/components/bulletins/canvas/BulletinCanvasDigitalView';
import Link from 'next/link';

export default function BulletinDigitalViewPage() {
  const params = useParams();
  const bulletinId = params.id as string;

  const { data: bulletin, isLoading, error } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  const { data: org } = trpc.org.getBranding.useQuery();

  const { data: serviceItemsData } = trpc.serviceItems.list.useQuery(
    {
      bulletinIssueId: bulletinId,
    },
    {
      enabled: !!bulletinId,
    }
  );

  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading bulletin...</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  if (error || !bulletin) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-lg text-red-600 mb-4">Error loading bulletin: {error?.message || 'Not found'}</p>
            <Link href="/bulletins" className="text-primary-600 hover:underline">
              Back to Bulletins
            </Link>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  const items = serviceItemsData?.items || [];
  const churchName = org?.churchName || org?.displayName || org?.legalName || 'Our Church';
  const serviceDate = new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter', 'viewer']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{churchName}</h1>
                <p className="text-base md:text-lg text-gray-600">{serviceDate}</p>
              </div>
              <Link
                href={`/bulletins/${bulletinId}`}
                className="text-sm text-primary-600 hover:underline hidden md:block"
              >
                Edit Bulletin
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {bulletin.useCanvasLayout ? (
            <BulletinCanvasDigitalView
              layout={bulletin.canvasLayoutJson as any}
              bulletinId={bulletinId}
            />
          ) : (
            <TemplateDigitalView
              bulletin={bulletin}
              items={items}
              churchName={churchName}
              serviceDate={serviceDate}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12 py-6">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-600">
            <p>{churchName}</p>
            {org?.website && (
              <p className="mt-1">
                <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  {org.website}
                </a>
              </p>
            )}
          </div>
        </footer>
      </div>
    </ProtectedPage>
  );
}

// Template Digital View Component
function TemplateDigitalView({
  bulletin,
  items,
  churchName,
  serviceDate,
}: {
  bulletin: any;
  items: any[];
  churchName: string;
  serviceDate: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Cover Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-8 md:p-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{churchName}</h1>
        <p className="text-lg md:text-xl mb-2">Sunday Worship Service</p>
        <p className="text-base md:text-lg opacity-90">{serviceDate}</p>
      </div>

      {/* Order of Service */}
      {items.length > 0 && (
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-primary-600">
            Order of Service
          </h2>
          <div className="space-y-6">
            {items.map((item: any) => (
              <div key={item.id} className="border-l-4 border-primary-600 pl-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.title}
                    </h3>
                    {item.speaker && (
                      <p className="text-sm text-gray-600 mt-1">
                        {item.type === 'sermon' ? 'Preacher' : 'Leader'}: {item.speaker}
                      </p>
                    )}
                    {item.scriptureRef && (
                      <p className="text-sm text-primary-700 mt-1 font-medium">
                        {item.scriptureRef}
                      </p>
                    )}
                    {item.content && (
                      <div className="mt-2 text-gray-700 whitespace-pre-wrap">
                        {item.content}
                      </div>
                    )}
                  </div>
                  {item.duration && (
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {item.duration} min
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section (if enabled in design options) */}
      {bulletin.designOptions?.includeNotesSection && (
        <div className="p-6 md:p-8 bg-gray-50 border-t">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sermon Notes</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border-b border-gray-300 pb-2">
                <div className="h-4"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prayer Requests (if enabled) */}
      {bulletin.designOptions?.includePrayerSection && (
        <div className="p-6 md:p-8 border-t">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Prayer Requests</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-gray-300 pb-2">
                <div className="h-4"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
