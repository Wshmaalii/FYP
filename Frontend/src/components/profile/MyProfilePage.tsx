import { useEffect, useState } from 'react';
import { ArrowLeft, Shield, Calendar, MessageSquare, TrendingUp, Star, X } from 'lucide-react';
import { getQuotes } from '../../api/market';
import { fetchMyProfile, fetchProfileActivity, fetchProfileStats, updateMyProfile, type ProfileActivity, type ProfileStats, type UserProfile } from '../../api/profile';
import { fetchWatchlist, type WatchlistItem } from '../../api/watchlist';

interface MyProfilePageProps {
  onBack: () => void;
  onViewWatchlist: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

interface WatchlistPreviewItem extends WatchlistItem {
  price?: number;
  changePercent?: number;
}

function formatJoinedDate(value: string | null) {
  if (!value) {
    return 'Joined recently';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Joined recently';
  }

  return `Joined ${date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return 'Just now';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function MyProfilePage({ onBack, onViewWatchlist, onProfileUpdated }: MyProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activity, setActivity] = useState<ProfileActivity[]>([]);
  const [watchlistPreview, setWatchlistPreview] = useState<WatchlistPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState({
    full_name: '',
    username: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfilePage = async () => {
      setLoading(true);
      setError(null);

      try {
        const [profileData, statsData, activityData, watchlistItems] = await Promise.all([
          fetchMyProfile(),
          fetchProfileStats(),
          fetchProfileActivity(6),
          fetchWatchlist(),
        ]);

        const previewItems = watchlistItems.slice(0, 3);
        let quoteMap: Record<string, { price: number; changePercent: number }> = {};

        if (previewItems.length > 0) {
          try {
            const quotes = await getQuotes(previewItems.map((item) => item.ticker));
            quoteMap = Object.fromEntries(
              Object.entries(quotes).map(([ticker, quote]) => [ticker, { price: quote.price, changePercent: quote.changePercent }]),
            );
          } catch {
            quoteMap = {};
          }
        }

        if (!isMounted) {
          return;
        }

        setProfile(profileData);
        setStats(statsData);
        setActivity(activityData);
        setWatchlistPreview(
          previewItems.map((item) => ({
            ...item,
            price: quoteMap[item.ticker]?.price,
            changePercent: quoteMap[item.ticker]?.changePercent,
          })),
        );
        setFormState({
          full_name: profileData.full_name,
          username: profileData.username,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url || '',
        });
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadProfilePage();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const updatedProfile = await updateMyProfile({
        full_name: formState.full_name,
        username: formState.username,
        bio: formState.bio,
        avatar_url: formState.avatar_url || null,
      });

      setProfile(updatedProfile);
      setFormState({
        full_name: updatedProfile.full_name,
        username: updatedProfile.username,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar_url || '',
      });
      onProfileUpdated?.(updatedProfile);
      setSaveSuccess('Profile updated');
      setShowEditModal(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile || !stats) {
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
          {error || 'Profile is unavailable'}
        </div>
      </div>
    );
  }

  const displayName = profile.full_name;
  const initials = profile.avatar_seed || displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const activityItems = activity.length > 0 ? activity : [];

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

        <div className="flex items-start gap-6">
          <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-4xl">{initials}</span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-white text-2xl">{displayName}</h1>
              <div className={`flex items-center gap-1 px-3 py-1 rounded border ${profile.verified_trader ? 'bg-cyan-950 border-cyan-800' : 'bg-zinc-950 border-zinc-800'}`}>
                <Shield className={`w-4 h-4 ${profile.verified_trader ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span className={`${profile.verified_trader ? 'text-cyan-400' : 'text-zinc-400'} text-sm`}>
                  {profile.verified_trader ? 'Verified Trader' : 'Member'}
                </span>
              </div>
            </div>
            <p className="text-zinc-400 mb-3">@{profile.username}</p>
            <p className="text-zinc-300 mb-4 max-w-xl">
              {profile.bio || 'No bio added yet.'}
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>{formatJoinedDate(profile.joined_at)}</span>
              </div>
            </div>
            {saveSuccess && <p className="text-emerald-400 text-sm mt-3">{saveSuccess}</p>}
          </div>

          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className="border-b border-zinc-800 p-6">
        <h2 className="text-zinc-100 mb-4">Activity Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-500 text-sm">Messages Sent</span>
            </div>
            <p className="text-white text-2xl">{stats.messages_sent_count.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-500 text-sm">Tickers Shared</span>
            </div>
            <p className="text-white text-2xl">{stats.tickers_shared_count.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-500 text-sm">Watchlist Items</span>
            </div>
            <p className="text-white text-2xl">{stats.watchlist_items_count.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-500 text-sm">Trust Score</span>
            </div>
            <p className="text-white text-2xl">{stats.trust_score}%</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-zinc-100">Watchlist Preview</h2>
          <button onClick={onViewWatchlist} className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
            View All
          </button>
        </div>
        {watchlistPreview.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">
            No watchlist items yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {watchlistPreview.map((stock) => {
              const isPositive = (stock.changePercent || 0) >= 0;
              return (
                <div
                  key={stock.ticker}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-100">{stock.ticker}</span>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <p className="text-zinc-500 text-sm mb-3 truncate">{stock.company_name || 'Saved watchlist item'}</p>
                  <p className="text-white text-xl mb-1">
                    {typeof stock.price === 'number' ? `${stock.price.toFixed(2)}p` : '--'}
                  </p>
                  <p className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {typeof stock.changePercent === 'number' ? `${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'Price unavailable'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-800">
        <h2 className="text-zinc-100 mb-4">Recent Activity</h2>
        {activityItems.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">
            No recent activity yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="text-zinc-300 text-sm">{item.description}</p>
                  <p className="text-zinc-600 text-xs mt-1">{formatRelativeTime(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-zinc-100">Edit Profile</h2>
                <p className="text-zinc-500 text-sm mt-1">Update your profile details.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-500 hover:text-zinc-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-zinc-300 text-sm mb-2">Full Name</label>
                <input
                  value={formState.full_name}
                  onChange={(e) => setFormState((current) => ({ ...current, full_name: e.target.value }))}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 text-sm mb-2">Username</label>
                <input
                  value={formState.username}
                  onChange={(e) => setFormState((current) => ({ ...current, username: e.target.value.toLowerCase() }))}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 text-sm mb-2">Bio</label>
                <textarea
                  value={formState.bio}
                  onChange={(e) => setFormState((current) => ({ ...current, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-zinc-300 text-sm mb-2">Avatar URL</label>
                <input
                  value={formState.avatar_url}
                  onChange={(e) => setFormState((current) => ({ ...current, avatar_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
            </div>
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveProfile()}
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 text-white rounded transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
