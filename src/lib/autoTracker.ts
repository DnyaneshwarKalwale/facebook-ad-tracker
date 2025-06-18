import { fetchCompanyAds } from './api';
import prisma from './prisma';

let trackingInterval: NodeJS.Timeout | null = null;

// Simple configuration
const TRACKING_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
const INITIAL_FETCH_LIMIT = 20;

// Simple logging
const log = (message: string) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

interface AdResult {
  ad_archive_id: string;
  is_active: boolean;
  start_date_string?: string;
  snapshot?: {
    title?: string | null;
  };
}

/**
 * STEP 1: Initial setup - fetch first 20 ads and set oldest as last known ad
 */
async function initialSetup(pageId: string): Promise<boolean> {
  log(`🔄 Initial setup for page ${pageId}`);
  
  try {
    // Fetch first page of ads
    const response = await fetchCompanyAds(pageId);
    if (!response.results || response.results.length === 0) {
      log(`❌ No ads found for page ${pageId}`);
      return false;
    }

    // Take first 20 ads (most recent)
    const first20Ads = response.results.slice(0, INITIAL_FETCH_LIMIT);
    log(`📥 Found ${first20Ads.length} ads to save initially`);

    // Save all 20 ads to database
    for (const ad of first20Ads) {
      try {
        await prisma.ad.create({
          data: {
            adArchiveId: ad.ad_archive_id,
            pageId: pageId,
            isActive: true,
            firstSeen: new Date(),
            lastSeen: new Date(),
            startDate: ad.start_date_string ? new Date(ad.start_date_string) : new Date(),
            url: `https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`,
            title: ad.snapshot?.title || null
          }
        });
      } catch (error: any) {
        // Skip if already exists
        if (!error.message.includes('Unique constraint')) {
          log(`❌ Error saving ad ${ad.ad_archive_id}: ${error.message}`);
        }
      }
    }

    log(`✅ Initial setup complete - saved ${first20Ads.length} ads`);
    return true;
  } catch (error: any) {
    log(`❌ Initial setup failed: ${error.message}`);
    return false;
  }
}

/**
 * STEP 2: Main tracking - find new ads and check status
 */
async function trackPage(pageId: string): Promise<void> {
  log(`🔄 Tracking page ${pageId}`);

  try {
    // Get all ads from database for this page
    const dbAds = await prisma.ad.findMany({
      where: { pageId },
      orderBy: [
        { startDate: 'desc' }, // Primary: Newest first by start date
        { adArchiveId: 'desc' } // Secondary: Highest ID first (for same dates)
      ]
    });

    // If no ads in database, do initial setup
    if (dbAds.length === 0) {
      await initialSetup(pageId);
      return;
    }

    // Check if this is the first tracking cycle after initial setup
    // If all ads have firstSeen = lastSeen, it means they haven't been tracked yet
    const untrackedAds = dbAds.filter(ad => 
      Math.abs(ad.firstSeen.getTime() - ad.lastSeen.getTime()) < 1000 // firstSeen ≈ lastSeen (within 1 second)
    );

    const isFirstTrackingCycle = untrackedAds.length === dbAds.length && dbAds.length > 0;

    if (isFirstTrackingCycle) {
      log(`🎯 First tracking cycle detected - ${dbAds.length} ads haven't been tracked yet`);
      log(`🎯 Skipping status checks this cycle - only updating lastSeen times`);
      
      // Just update lastSeen for all ads, don't mark any as inactive yet
      for (const ad of dbAds) {
        await prisma.ad.update({
          where: { id: ad.id },
          data: { lastSeen: new Date() }
        });
      }
      log(`✅ Updated lastSeen for ${dbAds.length} ads - future cycles will check status`);
      return;
    }

    // Find the oldest ad in database (this is our "last known ad" - pagination boundary)
    // This represents the oldest ad from our initial 20 recent ads fetch
    const lastKnownAd = dbAds[dbAds.length - 1]; // Last one is oldest due to orderBy startDate desc
    const lastKnownAdId = lastKnownAd.adArchiveId;
    const lastKnownDate = lastKnownAd.startDate;
    
    log(`📊 Database has ${dbAds.length} ads, pagination boundary: ${lastKnownAdId} from ${lastKnownDate.toLocaleDateString()}`);

    // STEP 2A: Use cursor-based pagination to find NEW ads
    let allActiveAds: AdResult[] = [];
    let cursor: string | undefined;
    let pageCount = 0;
    let foundBoundary = false;
    let lastKnownAdStillExists = false;

    log(`🔍 Using cursor-based pagination to find new ads`);
    log(`🎯 Boundary conditions: Ad ID ${lastKnownAdId} OR date ${lastKnownDate.toLocaleDateString()}`);

    while (!foundBoundary && pageCount < 10) {
      try {
        const response = await fetchCompanyAds(pageId, cursor);
        if (!response.results || response.results.length === 0) {
          log(`📄 No more ads on page ${pageCount + 1}`);
          break;
        }

        log(`📄 Page ${pageCount + 1}: ${response.results.length} ads`);

        let newAdsInThisPage = 0;
        
        // Check each ad in this page
        for (const ad of response.results) {
          const adDate = ad.start_date_string ? new Date(ad.start_date_string) : new Date();
          
          // Check if this is our specific last known ad (oldest from initial 20)
          if (ad.ad_archive_id === lastKnownAdId) {
            log(`🎯 Found our pagination boundary ad: ${lastKnownAdId}`);
            lastKnownAdStillExists = true;
            foundBoundary = true;
            break; // Stop here - this is our exact boundary
          }
          
          // Check if we've reached the date boundary (ad is older than or equal to our last known date)
          if (adDate <= lastKnownDate) {
            log(`📅 Reached date boundary: ad ${ad.ad_archive_id} date ${adDate.toLocaleDateString()} <= boundary date ${lastKnownDate.toLocaleDateString()}`);
            foundBoundary = true;
            break; // Stop here - we've gone too far back in time
          }
          
          // Check if we already have this ad in our database
          const existsInDb = dbAds.some(dbAd => dbAd.adArchiveId === ad.ad_archive_id);
          
          if (!existsInDb) {
            // This is a new ad we haven't seen before
            allActiveAds.push(ad);
            newAdsInThisPage++;
          } else {
            log(`✓ Found known ad ${ad.ad_archive_id} (but not our boundary)`);
          }
        }

        log(`📄 Page ${pageCount + 1}: ${newAdsInThisPage} new ads, ${response.results.length - newAdsInThisPage} known ads`);

        // Continue pagination if we have a cursor and haven't found boundary yet
        if (!foundBoundary && response.cursor) {
          cursor = response.cursor;
          pageCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          log(`🛑 Stopping pagination: ${foundBoundary ? 'reached boundary' : 'no more pages'}`);
          break;
        }
      } catch (error: any) {
        log(`❌ Error fetching page ${pageCount + 1}: ${error.message}`);
        break;
      }
    }

    log(`📊 Found ${allActiveAds.length} new ads from pagination`);

    log(`📊 Found ${allActiveAds.length} active ads from API`);

    // STEP 2B: Get a fresh API response to check ALL current active ads
    log(`🔍 Fetching current active ads for status checking`);
    const currentResponse = await fetchCompanyAds(pageId);
    const currentActiveAds = currentResponse.results || [];
    
    // Build set of all currently active ad IDs from Facebook
    const activeAdIds = new Set<string>();
    for (const ad of currentActiveAds) {
      activeAdIds.add(ad.ad_archive_id);
    }
    
    log(`📊 Facebook currently shows ${activeAdIds.size} active ads`);

    // Process NEW ads (ads from our pagination that are NOT in database)
    let newAdsCount = 0;
    for (const ad of allActiveAds) {
      // Check if this ad exists in database
      const existsInDb = dbAds.some(dbAd => dbAd.adArchiveId === ad.ad_archive_id);
      
      if (!existsInDb) {
        // This is a NEW ad - save it
        try {
          await prisma.ad.create({
            data: {
              adArchiveId: ad.ad_archive_id,
              pageId: pageId,
              isActive: true,
              firstSeen: new Date(),
              lastSeen: new Date(),
              startDate: ad.start_date_string ? new Date(ad.start_date_string) : new Date(),
              url: `https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`,
              title: ad.snapshot?.title || null
            }
          });
          newAdsCount++;
          log(`✅ NEW AD: ${ad.ad_archive_id}`);
        } catch (error: any) {
          if (!error.message.includes('Unique constraint')) {
            log(`❌ Error saving new ad: ${error.message}`);
          }
        }
      }
    }

    // STEP 2C: Check status of existing database ads
    let stillActiveCount = 0;
    let becameInactiveCount = 0;
    let lastKnownAdBecameInactive = false;

    for (const dbAd of dbAds) {
      const isStillActive = activeAdIds.has(dbAd.adArchiveId);
      
      if (isStillActive && dbAd.isActive) {
        // Ad is still active - update last seen
        await prisma.ad.update({
          where: { id: dbAd.id },
          data: { lastSeen: new Date() }
        });
        stillActiveCount++;
        
      } else if (isStillActive && !dbAd.isActive) {
        // Ad became active again
        await prisma.ad.update({
          where: { id: dbAd.id },
          data: {
            isActive: true,
            lastSeen: new Date(),
            endDate: null
          }
        });
        log(`🔄 REACTIVATED: ${dbAd.adArchiveId}`);
        stillActiveCount++;
        
      } else if (!isStillActive && dbAd.isActive) {
        // Ad became inactive
        await prisma.ad.update({
          where: { id: dbAd.id },
          data: {
            isActive: false,
            endDate: new Date(),
            lastSeen: new Date()
          }
        });
        log(`❌ INACTIVE: ${dbAd.adArchiveId}`);
        becameInactiveCount++;
        
        // Check if this was our last known ad (pagination boundary)
        if (dbAd.adArchiveId === lastKnownAdId) {
          lastKnownAdBecameInactive = true;
          log(`⚠️ Last known ad ${lastKnownAdId} became inactive - will need new boundary`);
        }
      }
    }

    // If our last known ad became inactive, find a new boundary
    if (lastKnownAdBecameInactive) {
      log(`🔄 Finding new pagination boundary since last known ad is inactive`);
      
      // Find the new oldest active ad in database to be our new boundary
      const activeDbAds = await prisma.ad.findMany({
        where: { 
          pageId: pageId, 
          isActive: true 
        },
        orderBy: [
          { startDate: 'asc' }, // Oldest first
          { adArchiveId: 'asc' }
        ]
      });
      
      if (activeDbAds.length > 0) {
        const newLastKnownAd = activeDbAds[0]; // Oldest active ad
        log(`✅ New boundary ad: ${newLastKnownAd.adArchiveId} from ${newLastKnownAd.startDate.toLocaleDateString()}`);
      } else {
        log(`⚠️ No active ads left - all ads are inactive`);
      }
    }

    // Update page timestamp
    await prisma.page.update({
      where: { pageId },
      data: { updatedAt: new Date() }
    });

    log(`📊 SUMMARY: ${newAdsCount} new ads, ${stillActiveCount} still active, ${becameInactiveCount} became inactive`);

  } catch (error: any) {
    log(`❌ Error tracking page ${pageId}: ${error.message}`);
  }
}

/**
 * STEP 3: Auto-tracking service
 */
export async function startAutoTracking(): Promise<boolean> {
  log(`🚀 Starting auto-tracking service`);
  
  if (trackingInterval) {
    log(`⚠️ Auto-tracking already running`);
    return true;
  }

  async function runTrackingCycle() {
    const startTime = Date.now();
    log(`🔄 === TRACKING CYCLE START ===`);
    
    try {
      const pages = await prisma.page.findMany({
        select: { pageId: true, pageName: true }
      });
      
      if (pages.length === 0) {
        log(`⚠️ No pages to track`);
        return;
      }
      
      log(`📋 Processing ${pages.length} pages`);
      
      for (const page of pages) {
        log(`🏢 Processing: ${page.pageName}`);
        await trackPage(page.pageId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const duration = Date.now() - startTime;
      const nextRun = new Date(Date.now() + TRACKING_INTERVAL);
      log(`✅ === TRACKING CYCLE COMPLETE === (took ${duration}ms)`);
      log(`⏰ Next tracking cycle at: ${nextRun.toLocaleTimeString()}`);
    } catch (error: any) {
      log(`❌ Tracking cycle error: ${error.message}`);
    }
  }

  // Run immediately
  await runTrackingCycle();

  // Set up interval
  trackingInterval = setInterval(runTrackingCycle, TRACKING_INTERVAL);
  
  log(`✅ Auto-tracking started (12-hour intervals)`);
  log(`⏰ Interval ID: ${trackingInterval}`);
  return true;
}

export function stopAutoTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
    log(`🛑 Auto-tracking stopped`);
  }
}

export function getTrackingStatus() {
  return {
    isRunning: trackingInterval !== null,
    intervalId: trackingInterval,
    nextRun: trackingInterval ? new Date(Date.now() + TRACKING_INTERVAL) : null
  };
}

export async function trackNewAdsForPage(pageId: string): Promise<number> {
  await trackPage(pageId);
  return 0;
}