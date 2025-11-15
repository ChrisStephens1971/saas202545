'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function FormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const { data: form, isLoading, error } = trpc.forms.get.useQuery({ id: formId });
  const { data: submissionsData } = trpc.forms.listSubmissions.useQuery({
    formId,
    limit: 50,
    offset: 0,
  });

  const deleteForm = trpc.forms.delete.useMutation({
    onSuccess: () => {
      router.push('/forms');
    },
  });

  const updateForm = trpc.forms.update.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      deleteForm.mutate({ id: formId });
    }
  };

  const handleStatusChange = (newStatus: 'draft' | 'active' | 'closed' | 'archived') => {
    updateForm.mutate({ id: formId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading form...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading form: {error?.message || 'Form not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submissions = submissionsData?.submissions || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{form.title}</h1>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                form.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : form.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : form.status === 'closed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {form.status?.charAt(0).toUpperCase() + form.status?.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/forms')}>
            Back to Forms
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Form
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Form Info */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Form Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                  <p className="text-base">{form.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Login Required</h3>
                  <p className="text-base">{form.require_login ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Multiple Submissions</h3>
                  <p className="text-base">{form.allow_multiple_submissions ? 'Allowed' : 'Not Allowed'}</p>
                </div>
                {form.notification_email && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Notification Email</h3>
                    <p className="text-base">{form.notification_email}</p>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Change Status</h3>
                <div className="flex gap-2">
                  {['draft', 'active', 'closed', 'archived'].map((status) => (
                    <Button
                      key={status}
                      variant={form.status === status ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(status as any)}
                      disabled={form.status === status || updateForm.isLoading}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Form Fields ({form.fields?.length || 0})</CardTitle>
              <Button size="sm">Add Field</Button>
            </div>
          </CardHeader>
          <CardContent>
            {!form.fields || form.fields.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No fields yet. Add fields to customize your form.
              </p>
            ) : (
              <div className="space-y-3">
                {form.fields.map((field: any, index: number) => (
                  <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">
                            #{index + 1}
                          </span>
                          <h4 className="font-medium">{field.label}</h4>
                          {field.is_required && (
                            <span className="text-red-600 text-sm">*</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Type: {field.field_type}
                        </p>
                        {field.help_text && (
                          <p className="text-sm text-gray-500 mt-1">{field.help_text}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="danger" size="sm">Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submissions */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Submissions ({submissionsData?.total || 0})</CardTitle>
              <Button variant="outline" size="sm">Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission: any) => (
                  <div key={submission.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        {submission.first_name && (
                          <p className="font-medium">
                            {submission.first_name} {submission.last_name}
                          </p>
                        )}
                        {submission.email && (
                          <p className="text-sm text-gray-600">{submission.email}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary-600 hover:text-primary-700">
                        View Responses
                      </summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                        {JSON.stringify(submission.responses, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
