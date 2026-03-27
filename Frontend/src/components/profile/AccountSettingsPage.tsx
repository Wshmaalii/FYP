import { ArrowLeft, Lock, Bell, Shield, Eye, Database, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchSettings, updatePassword, updateSettings, type UserSettings } from '../../api/settings';

interface AccountSettingsPageProps {
  onBack: () => void;
}

interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function AccountSettingsPage({ onBack }: AccountSettingsPageProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
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
        const data = await fetchSettings();
        if (isMounted) {
          setSettings(data);
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
  }, []);

  const persistSettings = async (nextSettings: UserSettings) => {
    setSettings(nextSettings);
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsMessage(null);

    try {
      const saved = await updateSettings({
        email_notifications: nextSettings.email_notifications,
        push_notifications: nextSettings.push_notifications,
        message_notifications: nextSettings.message_notifications,
        profile_visibility: nextSettings.profile_visibility,
        dark_mode: nextSettings.dark_mode,
      });
      setSettings(saved);
      setSettingsMessage('Settings saved');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings');
      try {
        const restored = await fetchSettings();
        setSettings(restored);
      } catch {
        // Keep the optimistic UI if reload also fails.
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

  const handlePasswordUpdate = async () => {
    setIsSavingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);

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
                <p className="text-zinc-500 text-xs mb-1">Display Name</p>
                <p className="text-zinc-100">{settings.full_name}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                <p className="text-zinc-500 text-xs mb-1">Username</p>
                <p className="text-zinc-100">@{settings.username}</p>
              </div>
            </div>
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
            <button className="w-full px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition-colors text-left">
              Download Your Data
            </button>
            <button className="w-full px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition-colors text-left">
              View Privacy Policy
            </button>
            <button className="w-full px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 rounded transition-colors text-left">
              Delete Account
            </button>
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
