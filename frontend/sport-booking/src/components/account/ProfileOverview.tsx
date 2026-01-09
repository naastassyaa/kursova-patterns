import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../context/AuthContext';
import { loadProfile, saveProfile, StoredProfile } from '../../utils/profileStorage';
import { fetchMyProfile, updateMyProfile } from '../../api/customer';
import { parseApiError } from '../../utils/apiErrors';
import DateField from '../common/DateField';

type ProfileData = {
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone: string;
};

type ProfileField = {
  key: keyof ProfileData;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
};

const defaultProfile: ProfileData = {
  firstName: '',
  lastName: '',
  dob: '',
  email: '',
  phone: '',
};

const profileFields: ProfileField[] = [
  { key: 'firstName', label: 'Імʼя', type: 'text', placeholder: 'Вкажіть імʼя' },
  { key: 'lastName', label: 'Прізвище', type: 'text', placeholder: 'Вкажіть прізвище' },
  { key: 'dob', label: 'Дата народження', type: 'date' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'name@example.com' },
  { key: 'phone', label: 'Телефон', type: 'tel', placeholder: '+380...' },
];

const ProfileOverview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [isEditing, setEditing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: fetchMyProfile,
    enabled: Boolean(user),
  });

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      // Update local profile storage
      const localProfile: StoredProfile = {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone || '',
        dob: data.date_of_birth || '',
      };
      saveProfile(localProfile);
      setProfile({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone || '',
        dob: data.date_of_birth || '',
      });
      setEditing(false);
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'profile'] });
    },
    onError: (error) => {
      setServerError(parseApiError(error, 'Не вдалося оновити профіль.'));
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      const serverProfile = profileQuery.data;
      setProfile({
        firstName: serverProfile.first_name,
        lastName: serverProfile.last_name,
        email: serverProfile.email,
        phone: serverProfile.phone || '',
        dob: serverProfile.date_of_birth || '',
      });
      // Also save to local storage for backward compatibility
      const localProfile: StoredProfile = {
        firstName: serverProfile.first_name,
        lastName: serverProfile.last_name,
        email: serverProfile.email,
        phone: serverProfile.phone || '',
        dob: serverProfile.date_of_birth || '',
      };
      saveProfile(localProfile);
    } else {
      // Fallback to local storage if API fails
      const saved = loadProfile();
      if (saved) {
        setProfile({ ...defaultProfile, ...saved });
      } else if (user?.username) {
        setProfile((prev) => ({ ...prev, email: user.username }));
      }
    }
  }, [profileQuery.data, user?.username]);

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setServerError(null);
    updateMutation.mutate({
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: profile.phone,
      date_of_birth: profile.dob || null,
      preferred_sports: '',
      training_level: '',
    });
  };

  const handleCancel = () => {
    const current = loadProfile();
    setProfile(current ?? defaultProfile);
    setEditing(false);
  };

  const fieldValues = useMemo(() => profile, [profile]);

  if (profileQuery.isLoading) {
    return <p>Завантаження профілю...</p>;
  }

  return (
    <section className="detail-card profile-card thin">
      {serverError && <div className="form-error" style={{ marginBottom: '1rem' }}>{serverError}</div>}
      <div className="profile-grid profile-grid--stacked">
        {profileFields.map((field) => (
          <label key={field.key} className="profile-field">
            {field.label}
            {field.type === 'date' ? (
              <DateField
                value={fieldValues[field.key]}
                onChange={(value) => handleChange(field.key, value)}
                disabled={!isEditing}
                allowClear
              />
            ) : (
              <input
                type={field.type}
                value={fieldValues[field.key]}
                onChange={(event) => handleChange(field.key, event.target.value)}
                disabled={!isEditing}
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))}
      </div>
      <div className="profile-actions profile-actions--footer">
        {isEditing ? (
          <>
            <button type="button" className="ghost-button" onClick={handleCancel}>
              Скасувати
            </button>
            <button 
              type="button" 
              className="primary-button primary-button--save" 
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Збереження...' : 'Зберегти'}
            </button>
          </>
        ) : (
          <button type="button" className="ghost-button" onClick={() => setEditing(true)}>
            Редагувати
          </button>
        )}
      </div>
    </section>
  );
};

export default ProfileOverview;

