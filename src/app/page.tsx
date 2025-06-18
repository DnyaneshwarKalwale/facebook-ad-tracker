'use client';

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow, formatDistance } from 'date-fns';
import AdScraper from '@/components/AdScraper';
import TrackingStatus from '@/components/TrackingStatus';

interface Ad {
  id: string;
  adArchiveId: string;
  pageId: string;
  isActive: boolean;
  firstSeen: string;
  lastSeen: string;
  startDate: string;
  endDate: string | null;
  adSnapshotUrl?: string;
  page: {
    pageId: string;
    pageName: string;
  };
}

interface AdStats {
  totalAds: number;
  activeAds: number;
  endedAds: number;
  lastUpdate: Date | null;
  lastAdTimestamp: Date | null;
  lastAdId: string | null;
}

function formatAdDuration(ad: Ad): string {
  const adStartDate = new Date(ad.startDate);
  
  if (ad.isActive) {
    return `Active since ${format(adStartDate, 'MMM d, yyyy')}`;
  } else if (ad.endDate) {
    const endDate = new Date(ad.endDate);
    return `Ran for ${formatDistance(adStartDate, endDate)}`;
  }
  
  return 'Duration unknown';
}

export default function Home() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdStats | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [activeTab, setActiveTab] = useState('track'); // 'scrape' or 'track'

  useEffect(() => {
    const startTracking = async () => {
      try {
        const response = await fetch('/api/autotrack', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to start tracking');
        setIsTracking(true);
      } catch (err) {
        console.error('Failed to start tracking:', err);
        setError('Failed to start tracking service');
      }
    };

    startTracking();
    return () => setIsTracking(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/autotrack');
        if (!response.ok) throw new Error('Failed to fetch tracking data');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch tracking data');

        setAds(data.ads);
        setStats({
          totalAds: data.stats.totalAds,
          activeAds: data.stats.activeAds,
          endedAds: data.stats.endedAds,
          lastUpdate: data.stats.lastUpdate ? new Date(data.stats.lastUpdate) : null,
          lastAdTimestamp: data.stats.lastAdTimestamp ? new Date(data.stats.lastAdTimestamp) : null,
          lastAdId: data.stats.lastAdId
        });
        setError(null);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tracking data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !ads.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Starting tracking service...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <div className="mb-8">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setActiveTab('scrape')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'scrape'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Add Page
          </button>
              <button
                onClick={() => setActiveTab('track')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'track'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
              >
                Track Ads
              </button>
        </div>

        {activeTab === 'scrape' ? (
          <AdScraper />
        ) : (
          <div className="space-y-6">
            <TrackingStatus />
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Facebook Ad Tracking</h2>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    isTracking ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isTracking ? '🔄 Tracking Active' : '⚠️ Tracking Inactive'}
                  </span>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-800">Total Ads</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalAds}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-green-800">Active Ads</h3>
                    <p className="text-3xl font-bold text-green-600">{stats.activeAds}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-yellow-800">Ended Ads</h3>
                    <p className="text-3xl font-bold text-yellow-600">{stats.endedAds}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-purple-800">Last Ad Found</h3>
                    <p className="text-sm font-medium text-purple-600">
                      {stats.lastAdTimestamp ? format(stats.lastAdTimestamp, 'MMM d, yyyy HH:mm:ss') : 'No ads yet'}
                    </p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ads.map((ad) => (
                      <tr key={ad.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{ad.page.pageName}</div>
                          <div className="text-sm text-gray-500">{ad.page.pageId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a 
                            href={ad.adSnapshotUrl || `https://www.facebook.com/ads/library/?id=${ad.adArchiveId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {ad.adArchiveId}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            ad.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {ad.isActive ? '🟢 Active' : '🔴 Ended'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(ad.startDate), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatAdDuration(ad)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDistanceToNow(new Date(ad.lastSeen), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ad.adSnapshotUrl ? (
                            <a
                              href={ad.adSnapshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              View Ad
                            </a>
                          ) : (
                            <a
                              href={`https://www.facebook.com/ads/library/?id=${ad.adArchiveId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              View Ad
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {stats?.lastUpdate && (
              <div className="text-sm text-gray-500 text-center space-y-1">
                <p>Last updated: {formatDistanceToNow(stats.lastUpdate, { addSuffix: true })}</p>
                {stats.lastAdId && (
                  <p>
                    Latest ad found: {stats.lastAdId} ({format(stats.lastAdTimestamp!, 'MMM d, yyyy HH:mm:ss')})
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </main>
  );
}
