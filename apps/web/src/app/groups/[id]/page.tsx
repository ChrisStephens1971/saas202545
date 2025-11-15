'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const { data: group, isLoading, error, refetch } = trpc.groups.get.useQuery({ id: groupId });
  const { data: members, refetch: refetchMembers } = trpc.groups.listMembers.useQuery({ groupId });
  const { data: peopleData } = trpc.people.list.useQuery({ limit: 100, offset: 0 });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => {
      router.push('/groups');
    },
  });

  const addMember = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      setShowAddMember(false);
      setSelectedPersonId('');
      refetchMembers();
    },
  });

  const removeMember = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      refetchMembers();
    },
  });

  const handleAddMember = () => {
    if (!selectedPersonId) return;
    addMember.mutate({
      groupId,
      personId: selectedPersonId,
      role: 'member',
    });
  };

  const handleRemoveMember = (personId: string) => {
    if (confirm('Are you sure you want to remove this member from the group?')) {
      removeMember.mutate({ groupId, personId });
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      deleteGroup.mutate({ id: groupId });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading group...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading group: {error?.message || 'Group not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
          <div className="flex gap-2">
            {group.category && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {group.category}
              </span>
            )}
            {!group.is_public && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                Private
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/groups')}>
            Back to Groups
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Group
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Group Info */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Group Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {group.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                  <p className="text-base">{group.description}</p>
                </div>
              )}
              {group.leader_first_name && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Leader</h3>
                  <p className="text-base">
                    {group.leader_first_name} {group.leader_last_name}
                  </p>
                </div>
              )}
              {group.max_members && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Maximum Members</h3>
                  <p className="text-base">{group.max_members}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Visibility</h3>
                <p className="text-base">{group.is_public ? 'Public' : 'Private'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Members ({members?.length || 0})</CardTitle>
              <Button size="sm" onClick={() => setShowAddMember(!showAddMember)}>
                {showAddMember ? 'Cancel' : 'Add Member'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddMember && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-3">
                  <select
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                  >
                    <option value="">Select a person...</option>
                    {peopleData?.people
                      .filter((p: any) => !members?.some((m: any) => m.person_id === p.id))
                      .map((person: any) => (
                        <option key={person.id} value={person.id}>
                          {person.firstName} {person.lastName}
                        </option>
                      ))}
                  </select>
                  <Button onClick={handleAddMember} disabled={!selectedPersonId || addMember.isLoading}>
                    {addMember.isLoading ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            )}

            {!members || members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No members yet.</p>
            ) : (
              <div className="space-y-3">
                {members.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-600">
                          {member.first_name?.[0] || '?'}
                          {member.last_name?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {member.role === 'leader' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Leader
                        </span>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveMember(member.person_id)}
                        disabled={removeMember.isLoading}
                      >
                        Remove
                      </Button>
                    </div>
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
