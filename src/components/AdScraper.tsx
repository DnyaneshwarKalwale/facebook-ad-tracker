import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export default function AdScraper() {
  const [pageId, setPageId] = useState('');
  const [autoTrack, setAutoTrack] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const scrapeMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, autoTrack })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scrape ads');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['pages'] });
      await queryClient.invalidateQueries({ queryKey: ['ads'] });
      router.push('/?tab=track');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pageId) {
      scrapeMutation.mutate(pageId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Facebook Page</h2>
          <p className="text-gray-600">Start tracking ads from any Facebook page</p>
        </div>
      
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pageId" className="block text-sm font-medium text-gray-700 mb-2">
            Facebook Page ID
          </label>
            <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              id="pageId"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="e.g., 434174436675167"
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter the Facebook Page ID to start tracking its ads
            </p>
          </div>

          <div className="flex items-center">
            <input
              id="autoTrack"
              type="checkbox"
              checked={autoTrack}
              onChange={(e) => setAutoTrack(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoTrack" className="ml-2 block text-sm text-gray-900">
              Enable Auto-Tracking
            </label>
            <div className="ml-2">
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Info</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Auto-tracking will check for new ads and status changes every 15 minutes
                </div>
              </div>
            </div>
          </div>

            <button
              type="submit"
              disabled={!pageId || scrapeMutation.isPending}
            className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white ${
              !pageId || scrapeMutation.isPending
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            } transition-colors duration-200`}
            >
            {scrapeMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {autoTrack ? 'Adding & Starting Tracking...' : 'Adding Page...'}
              </>
            ) : (
              autoTrack ? 'Add Page & Start Tracking' : 'Add Page'
            )}
            </button>
      </form>

      {scrapeMutation.isError && (
          <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Failed to Add Page</h3>
                <p className="text-sm text-red-700 mt-1">{scrapeMutation.error.message}</p>
              </div>
            </div>
        </div>
      )}

        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to find a Facebook Page ID</h3>
          <ol className="space-y-4 text-gray-600">
            <li className="flex items-start">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">1</span>
              <span>Go to the Facebook page you want to track</span>
            </li>
            <li className="flex items-start">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">2</span>
              <span>Look at the page URL in your browser's address bar</span>
            </li>
            <li className="flex items-start">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">3</span>
              <span>The number after "facebook.com/" or in the URL is usually the page ID</span>
            </li>
            <li className="flex items-start">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">4</span>
              <span>Example: facebook.com/apple has ID 434174436675167</span>
            </li>
        </ol>
        </div>
      </div>
    </div>
  );
} 