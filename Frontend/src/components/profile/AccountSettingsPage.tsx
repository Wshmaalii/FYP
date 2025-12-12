import { ArrowLeft, Lock, Bell, Shield, Eye, Database, Moon } from 'lucide-react';
import { useState } from 'react';

interface AccountSettingsPageProps {
  onBack: () => void;
}

export function AccountSettingsPage({ onBack }: AccountSettingsPageProps) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Header */}
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
        {/* Security Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-cyan-400" />
              <h2 className="text-zinc-100">Security</h2>
            </div>
            <p className="text-zinc-500 text-sm">Manage your password and security settings</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-zinc-300 text-sm mb-2">Current Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-2">New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-2">Confirm New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Confirm new password"
              />
            </div>
            <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors">
              Update Password
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
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
                <h3 className="text-zinc-300">Email Notifications</h3>
                <p className="text-zinc-500 text-sm">Receive email updates about your activity</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  emailNotifications ? 'bg-cyan-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    emailNotifications ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-zinc-300">Push Notifications</h3>
                <p className="text-zinc-500 text-sm">Receive push notifications on your device</p>
              </div>
              <button
                onClick={() => setPushNotifications(!pushNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  pushNotifications ? 'bg-cyan-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    pushNotifications ? 'translate-x-6' : ''
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
                onClick={() => setMessageNotifications(!messageNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  messageNotifications ? 'bg-cyan-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    messageNotifications ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
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
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value)}
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

        {/* Data & Transparency */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-cyan-400" />
              <h2 className="text-zinc-100">Data & Transparency</h2>
            </div>
            <p className="text-zinc-500 text-sm">Manage your data and account</p>
          </div>
          <div className="p-6 space-y-3">
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

        {/* Appearance */}
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
                onClick={() => setDarkMode(!darkMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  darkMode ? 'bg-cyan-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    darkMode ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
