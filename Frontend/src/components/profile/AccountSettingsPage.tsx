import { ArrowLeft, Bell, Database, Eye, Lock, Moon, Shield } from 'lucide-react';
import { type KeyboardEvent, useEffect, useState } from 'react';
import { fetchMyProfile, updateMyProfile, type UserProfile } from '../../api/profile';
import {
  deleteMyAccount,
  exportMyData,
  fetchSettings,
  updatePassword,
  updateSettings,
  type UserSettings,
} from '../../api/settings';
import { applyDarkModePreference } from '../../theme';

interface AccountSettingsPageProps {
  currentProfile: UserProfile | null;
  onBack: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
  onAccountDeleted: () => void;
}

interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const PRIVACY_POLICY_TEXT = [
  'TradeLink Privacy Policy',
  '',
  'We store your profile details, account settings, watchlist items, notifications, and conversation activity so the app can function correctly.',
  '',
  'Trading discussions may be visible to other members depending on the space or room you join. Avoid sharing personal, financial, or sensitive information in chats.',
  '',
  'You can export your data at any time from this page. Deleting your account permanently removes your profile, settings, watchlist items, memberships, messages, and notifications.',
].join('\n');

export function AccountSettingsPage({
  currentProfile,
  onBack,
  onProfileUpdated,
  onAccountDeleted,
}: AccountSettingsPageProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(currentProfile);
  const [displayName, setDisplayName] = useState(currentProfile?.full_name ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        const [loadedSettings, loadedProfile] = await Promise.all([
          fetchSettings(),
          currentProfile ? Promise.resolve(currentProfile) : fetchMyProfile(),
        ]);

        if (isMounted) {
          setSettings(loadedSettings);
          setProfileData(loadedProfile);
          setDisplayName(loadedProfile.full_name);
          applyDarkModePreference(loadedSettings.dark_mode);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load account settings');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [currentProfile]);

  const persistSettings = async (nextSettings: UserSettings) => {
    const previousSettings = settings;
    setSettings(nextSettings);
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsMessage(null);

    if (previousSettings && previousSettings.dark_mode !== nextSettings.dark_mode) {
      applyDarkModePreference(nextSettings.dark_mode);
    }

    try {
      const saved = await updateSettings({
        email_notifications: nextSettings.email_notifications,
        push_notifications: nextSettings.push_notifications,
        message_notifications: nextSettings.message_notifications,
        profile_visibility: nextSettings.profile_visibility,
        dark_mode: nextSettings.dark_mode,
      });
      setSettings(saved);
      applyDarkModePreference(saved.dark_mode);
      setSettingsMessage('Settings saved');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings');
      try {
        const restored = await fetchSettings();
        setSettings(restored);
        applyDarkModePreference(restored.dark_mode);
      } catch {
        if (previousSettings) {
          setSettings(previousSettings);
          applyDarkModePreference(previousSettings.dark_mode);
        }
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleSetting = (key: 'push_notifications' | 'message_notifications' | 'dark_mode') => {
    if (!settings) {
      return;
    }

    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    };

    void persistSettings(nextSettings);
  };

  const handleVisibilityChange = (profile_visibility: UserSettings['profile_visibility']) => {
    if (!settings) {
      return;
    }

    void persistSettings({
      ...settings,
      profile_visibility,
    });
  };

  const saveDisplayName = async () => {
    if (!settings) {
      return;
    }

    const trimmedName = displayName.trim();
    const currentName = profileData?.full_name ?? settings.full_name;

    setProfileError(null);
    setProfileMessage(null);

    if (!trimmedName) {
      setProfileError('Display name is required');
      setDisplayName(currentName);
      return;
    }

    if (trimmedName === currentName) {
      return;
    }

    setIsSavingProfile(true);

    try {
      const baseProfile = profileData ?? await fetchMyProfile();
      const updatedProfile = await updateMyProfile({
        full_name: trimmedName,
        username: baseProfile.username,
        bio: baseProfile.bio,
        avatar_url: baseProfile.avatar_url,
      });

      setProfileData(updatedProfile);
      setSettings((current) => (
        current
          ? {
              ...current,
              full_name: updatedProfile.full_name,
              username: updatedProfile.username,
            }
          : current
      ));
      setDisplayName(updatedProfile.full_name);
      setProfileMessage('Display name updated');
      onProfileUpdated(updatedProfile);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update display name');
      setDisplayName(currentName);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDisplayNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    void saveDisplayName();
  };

  const handlePasswordUpdate = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setPasswordError('All password fields are required');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password confirmation does not match');
      return;
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsSavingPassword(true);

    try {
      await updatePassword(passwordForm);
      setPasswordMessage('Password updated');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDownloadData = async () => {
    if (!settings) {
      return;
    }

    setIsDownloadingData(true);
    setDataError(null);
    setDataMessage(null);

    try {
      const payload = await exportMyData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `tradelink-data-${settings.username}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setDataMessage('Your data download has started');
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to download your data');
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleViewPrivacyPolicy = () => {
    window.alert(PRIVACY_POLICY_TEXT);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Delete your TradeLink account permanently? This is irreversible and will remove your profile, settings, watchlist items, messages, memberships, and notifications.',
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingAccount(true);
    setDataError(null);

    try {
      await deleteMyAccount();
      onAccountDeleted();
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading account settings...</div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to channels</span>
        </button>
        <div className="bg-zinc-900 border border-red-900 rounded-lg p-4 text-red-400 text-sm">
          {error || 'Account settings are unavailable'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to channels</span>
        </button>
        <h1 className="text-white text-2xl">Account Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account preferences and security</p>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-cyan-400" />
              <h2 className="text-zinc-100">Security</h2>
            </div>
            <p className="text-zinc-500 text-sm">Manage your password and security settings</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                <label className="block text-zinc-500 text-xs mb-1" htmlFor="display-name">
                  Display Name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onBlur={() => void saveDisplayName()}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setProfileError(null);
                    setProfileMessage(null);
                  }}
                  onKeyDown={handleDisplayNameKeyDown}
                  className="w-full bg-transparent text-zinc-100 focus:outline-none"
                  placeholder="Enter display name"
                />
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                <p className="text-zinc-500 text-xs mb-1">Username</p>
                <p className="text-zinc-100">@{settings.username}</p>
              </div>
            </div>
            {isSavingProfile && <p className="text-zinc-500 text-sm">Saving display name...</p>}
            {profileError && <p className="text-red-400 text-sm">{profileError}</p>}
            {profileMessage && <p className="text-emerald-400 text-sm">{profileMessage}</p>}
            <div>
              <label className="block text-zinc-300 text-sm mb-2">Current Password</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((current) => ({ ...current, current_password: e.target.value }))}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-2">New Password</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((current) => ({ ...current, new_password: e.target.value }))}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm((current) => ({ ...current, confirm_password: e.target.value }))}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Confirm new password"
              />
            </div>
            {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
            {passwordMessage && <p className="text-emerald-400 text-sm">{passwordMessage}</p>}
            <button
              onClick={() => void handlePasswordUpdate()}
              disabled={isSavingPassword}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 text-white rounded transition-colors"
            >
              {isSavingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-cyan-400" />
              <h2 className="text-zinc-100">Notification Preferences</h2>
            </div>
            <p className="text-zinc-500 text-sm">Choose how you want to be notified</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-zinc-300">Push Notifications</h3>
                <p className="text-zinc-500 text-sm">Receive push notifications on your device</p>
              </div>
              <button
                onClick={() => toggleSetting('push_notifications')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.push_notifications ? 'bg-cyan-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.push_notifications ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-zinc-300">Message Notifications</h3>
                <p className="text-zinc-500 text-sm">Get notified when someone mentions you</p>
              </div>
              <button
                onClick={() => toggleSetting('message_notifications')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.message_notifications ? 'bg-cyan-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.message_notifications ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
            {settingsError && <p className="text-red-400 text-sm">{settingsError}</p>}
            {settingsMessage && <p className="text-emerald-400 text-sm">{settingsMessage}</p>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-5 h-5 text-cyan-400" />
              <h2 className="text-zinc-100">Privacy Settings</h2>
            </div>
            <p className="text-zinc-500 text-sm">Control who can see your profile and activity</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-zinc-300 text-sm mb-2">Profile Visibility</label>
              <select
                value={settings.profile_visibility}
                onChange={(e) => handleVisibilityChange(e.target.value as UserSettings['profile_visibility'])}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="public">Public - Anyone can view your profile</option>
                <option value="members">Members Only - Only TradeLink members</option>
                <option value="private">Private - Only you can view your profile</option>
              </select>
            </div>
            <div className="p-4 bg-amber-950 border border-amber-900 rounded">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-amber-300 text-sm mb-1">Important Privacy Notice</h3>
                  <p className="text-amber-400 text-sm">
                    TradeLink is designed for trading discussion only. Do not share personal information,
                    financial details, or sensitive data in any channels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-cyan-400" />
              <h2 className="text-zinc-100">Data & Transparency</h2>
            </div>
            <p className="text-zinc-500 text-sm">Manage your data and account</p>
          </div>
          <div className="p-6 space-y-3">
            <div className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded text-left">
              <p className="text-zinc-500 text-xs mb-1">Account holder</p>
              <p>{settings.full_name}</p>
            </div>
            <button
              onClick={() => void handleDownloadData()}
              disabled={isDownloadingData}
              className="w-full px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition-colors text-left disabled:opacity-70"
            >
              {isDownloadingData ? 'Preparing your data...' : 'Download Your Data'}
            </button>
            <button
              onClick={handleViewPrivacyPolicy}
              className="w-full px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition-colors text-left"
            >
              View Privacy Policy
            </button>
            <button
              onClick={() => void handleDeleteAccount()}
              disabled={isDeletingAccount}
              className="w-full px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 rounded transition-colors text-left disabled:opacity-70"
            >
              {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
            </button>
            {dataError && <p className="text-red-400 text-sm">{dataError}</p>}
            {dataMessage && <p className="text-emerald-400 text-sm">{dataMessage}</p>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="w-5 h-5 text-cyan-400" />
              <h2 className="text-zinc-100">Appearance</h2>
            </div>
            <p className="text-zinc-500 text-sm">Customize how TradeLink looks</p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-zinc-300">Dark Mode</h3>
                <p className="text-zinc-500 text-sm">Use dark theme (Recommended for trading)</p>
              </div>
              <button
                onClick={() => toggleSetting('dark_mode')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.dark_mode ? 'bg-cyan-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.dark_mode ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
            {isSavingSettings && <p className="text-zinc-500 text-sm mt-3">Saving settings...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
