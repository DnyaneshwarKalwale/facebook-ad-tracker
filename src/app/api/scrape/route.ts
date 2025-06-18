import { NextResponse } from 'next/server';
import { fetchCompanyAds } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { pageId, autoTrack } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Fetch initial ads data
    const data = await fetchCompanyAds(pageId);
    
    // Get or create the page
    const page = await prisma.page.upsert({
      where: { pageId },
      update: {},
      create: {
        pageId,
        pageName: data.results[0]?.page_name || 'Unknown Page'
      }
    });

    // Process all ads - only create new ones, don't update existing
    const processedAds = [];
    for (const ad of data.results) {
      try {
        const adRecord = await prisma.ad.create({
          data: {
            adArchiveId: ad.ad_archive_id,
            pageId: page.pageId,
            isActive: true, // All scraped ads are active
            firstSeen: new Date(),
            lastSeen: new Date(), // Set same as firstSeen initially
            startDate: ad.start_date_string ? new Date(ad.start_date_string) : new Date(),
            endDate: null,
            url: `https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`,
            title: ad.snapshot?.title || null
          }
        });
        processedAds.push(adRecord);
      } catch (error: any) {
        // Skip if ad already exists
        if (error.code === 'P2002') {
          console.log(`Ad ${ad.ad_archive_id} already exists, skipping`);
        } else {
          console.error(`Error creating ad ${ad.ad_archive_id}:`, error);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      adsProcessed: processedAds.length,
      page: {
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName
      }
    });
  } catch (error) {
    console.error('Error scraping ads:', error);
    return NextResponse.json(
      { error: 'Failed to scrape ads' },
      { status: 500 }
    );
  }
} 