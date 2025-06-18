import { NextResponse } from 'next/server';
import { startAutoTracking } from '@/lib/autoTracker';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get all pages with their ads
    const pages = await prisma.page.findMany({
      include: {
        ads: {
          orderBy: [
            { startDate: 'asc' }, // Primary: Oldest first by start date  
            { adArchiveId: 'asc' } // Secondary: Lowest ID first (for same dates)
          ]
        }
      }
    });

    // Get all ads with their pages
    const ads = await prisma.ad.findMany({
      include: { page: true },
      orderBy: [
        { startDate: 'desc' }, // Primary: Newest first by start date
        { adArchiveId: 'desc' } // Secondary: Highest ID first (for same dates)
      ]
    });

    // Calculate stats
    const activeAds = ads.filter(ad => ad.isActive);
    const endedAds = ads.filter(ad => !ad.isActive);

    // Find last known ad for each page (oldest ad = pagination boundary)
    const lastKnownAds = pages.map(page => {
      const pageAds = page.ads;
      if (pageAds.length === 0) return null;
      
      // The first ad in the array is the oldest (due to orderBy startDate asc, adArchiveId asc)
      const oldestAd = pageAds[0];
      
      return {
        pageId: page.pageId,
        pageName: page.pageName,
        lastKnownAdId: oldestAd.adArchiveId,
        lastKnownAdDate: oldestAd.startDate.toISOString(),
        totalAds: pageAds.length,
        activeAds: pageAds.filter(ad => ad.isActive).length
      };
    }).filter(Boolean);

    // Calculate next tracking time (every 12 hours)
    const TRACKING_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    const now = Date.now();
    const nextTrackingTime = Math.ceil(now / TRACKING_INTERVAL) * TRACKING_INTERVAL;

    return NextResponse.json({
      success: true,
      ads: ads.map(ad => ({
        id: ad.id,
        adArchiveId: ad.adArchiveId,
        pageId: ad.pageId,
        isActive: ad.isActive,
        firstSeen: ad.firstSeen.toISOString(),
        lastSeen: ad.lastSeen.toISOString(),
        startDate: ad.startDate.toISOString(),
        endDate: ad.endDate?.toISOString() || null,
        url: ad.url,
        adSnapshotUrl: ad.url,
        page: {
          pageId: ad.page.pageId,
          pageName: ad.page.pageName
        }
      })),
      stats: {
        totalAds: ads.length,
        activeAds: activeAds.length,
        endedAds: endedAds.length,
        pages: pages.length,
        lastUpdate: new Date().toISOString(),
        nextTrackingTime: new Date(nextTrackingTime).toISOString(),
        trackingInterval: TRACKING_INTERVAL
      },
      lastKnownAds
    });
  } catch (error) {
    console.error('Auto-tracking API error:', error);
    return NextResponse.json({ error: 'Failed to get tracking stats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Start auto-tracking without requiring a pageId
    await startAutoTracking();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auto-tracking API error:', error);
    return NextResponse.json({ error: 'Failed to start auto-tracking' }, { status: 500 });
  }
} 