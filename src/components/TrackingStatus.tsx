import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function TrackingStatus() {
  const [countdown, setCountdown] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tracking-status'],
    queryFn: async () => {
      const response = await fetch('/api/autotrack');
      if (!response.ok) {
        throw new Error('Failed to fetch tracking status');
      }
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds for more accurate countdown
  });

  // Update countdown timer
  useEffect(() => {
    if (!data?.stats?.nextTrackingTime) return;

    const updateCountdown = () => {
      const now = Date.now();
      const nextTracking = new Date(data.stats.nextTrackingTime).getTime();
      const timeLeft = nextTracking - now;

      if (timeLeft <= 0) {
        setCountdown('Tracking now...');
        return;
      }

      const minutes = Math.floor(timeLeft / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      setCountdown(`${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [data?.stats?.nextTrackingTime]);

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">Failed to load tracking status</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Auto-Tracking Status</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800">Active Ads</p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">{data.stats.activeAds}</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">Pages Tracked</p>
            <p className="mt-2 text-3xl font-semibold text-green-900">{data.stats.pages}</p>
          </div>
        </div>

        {/* Countdown Timer - More Prominent */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mr-3">
                <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Auto-tracking Active</p>
                <p className="text-xs text-gray-500">Checking every 12 hours</p>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center text-lg font-bold text-blue-600">
                <svg className="h-6 w-6 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-mono">{countdown}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Next check</p>
            </div>
          </div>
        </div>
      </div>

      {/* Last Known Ads - Enhanced Display */}
      {data.lastKnownAds && data.lastKnownAds.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-orange-400">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-orange-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">Pagination Reference Points</h3>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-800 font-medium">ℹ️ How it works:</p>
            <p className="text-sm text-orange-700 mt-1">
              These are the <strong>oldest ads</strong> from the initial 20 recent ads we fetched for each page. 
              When checking for new ads, pagination will stop when it reaches these dates - only ads newer than these will be processed.
            </p>
          </div>
          <div className="space-y-4">
            {data.lastKnownAds.map((pageInfo: any) => (
              <div key={pageInfo.pageId} className="border-2 border-orange-100 rounded-lg p-4 bg-orange-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 text-lg">{pageInfo.pageName}</h4>
                  <div className="bg-white rounded-full px-3 py-1 text-sm font-medium text-gray-600 border">
                    {pageInfo.activeAds}/{pageInfo.totalAds} active
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Last Known Ad ID:</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded border">
                      {pageInfo.lastKnownAdId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Created Date:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(pageInfo.lastKnownAdDate).toLocaleDateString()} at {new Date(pageInfo.lastKnownAdDate).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center text-xs text-orange-700 bg-orange-100 rounded px-3 py-2">
                  <svg className="h-4 w-4 text-orange-600 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <strong>Pagination reference point</strong> - Only ads newer than this date will be checked as potential new ads
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 