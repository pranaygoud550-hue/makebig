'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Profile } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const auth = useAuth();
  const [formData, setFormData] = useState<Partial<Profile>>({
    role: 'member',
    tagline: '',
    categoryIds: [],
    skills: [],
    rateMin: null,
    rateMax: null,
    currency: 'USD',
    availableForInvites: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!auth.user) return;

    setIsSaving(true);
    try {
      const profile: Profile = {
        contact: auth.user.contact,
        role: (formData.role || 'member') as any,
        tagline: formData.tagline || '',
        categoryIds: formData.categoryIds || [],
        skills: formData.skills || [],
        rateMin: formData.rateMin || null,
        rateMax: formData.rateMax || null,
        currency: formData.currency || 'USD',
        availableForInvites: formData.availableForInvites || false,
      };

      const success = await auth.updateProfile(profile);
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!auth.user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      subtitle="Update your profile (powers matching & invites)"
      size="lg"
    >
      <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        <Input
          label="Role"
          as="select"
          value={formData.role || 'member'}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as any })
          }
        />

        <Input
          label="Tagline"
          placeholder="Short one-liner about you"
          value={formData.tagline || ''}
          onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
        />

        <Input
          label="Categories (comma separated)"
          placeholder="web, mobile, ai"
          value={(formData.categoryIds || []).join(', ')}
          onChange={(e) =>
            setFormData({
              ...formData,
              categoryIds: e.target.value.split(',').map((s) => s.trim()),
            })
          }
        />

        <Input
          label="Skills (comma separated)"
          placeholder="Frontend Developer, UI Designer"
          value={(formData.skills || []).join(', ')}
          onChange={(e) =>
            setFormData({
              ...formData,
              skills: e.target.value.split(',').map((s) => s.trim()),
            })
          }
        />

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.availableForInvites || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  availableForInvites: e.target.checked,
                })
              }
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">
              Show me in Invite People (available for invites)
            </span>
          </label>
        </div>

        <Input
          label="Expected Monthly (min)"
          type="number"
          placeholder="5000"
          value={formData.rateMin || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              rateMin: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
        />

        <Input
          label="Expected Monthly (max)"
          type="number"
          placeholder="12000"
          value={formData.rateMax || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              rateMax: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
        />

        <Input
          label="Currency"
          as="select"
          value={formData.currency || 'USD'}
          onChange={(e) =>
            setFormData({ ...formData, currency: e.target.value })
          }
        />
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          fullWidth
          isLoading={isSaving}
          onClick={handleSave}
        >
          Save
        </Button>
        <Button
          fullWidth
          variant="secondary"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
