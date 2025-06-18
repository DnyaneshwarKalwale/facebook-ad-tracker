import { NextResponse } from 'next/server';
import { fetchCompanyAds } from '@/lib/api';
import { upsertAd, upsertPage } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    const data = await fetchCompanyAds(pageId);
    
    // Process all ads
    const processPromises = data.results.map(async (ad) => {
      if (ad.page_id && ad.page_name) {
        await upsertPage(ad.page_id, ad.page_name);
        const adResponse = {
          ad_archive_id: ad.ad_archive_id,
          page_id: ad.page_id,
          page_name: ad.page_name,
          is_active: ad.is_active,
          start_date: ad.start_date || new Date(ad.start_date_string).getTime(),
          end_date: ad.end_date || (ad.end_date_string ? new Date(ad.end_date_string).getTime() : 0),
          url: ad.url || '',
          start_date_string: ad.start_date_string,
          end_date_string: ad.end_date_string || '',
          snapshot: {
            title: ad.snapshot?.title || null,
            page_name: ad.page_name,
            body: ad.snapshot?.body,
            cards: ad.snapshot?.cards
          }
        };
        await upsertAd(adResponse);
      }
    });

    await Promise.all(processPromises);

    return NextResponse.json({ 
      success: true, 
      adsProcessed: data.results.length,
      cursor: data.cursor
    });
  } catch (error) {
    console.error('Error tracking ads:', error);
    return NextResponse.json(
      { error: 'Failed to track ads' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const cursor = searchParams.get('cursor');

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    const data = await fetchCompanyAds(pageId, cursor || undefined);
    
    // Process all ads
    const processPromises = data.results.map(async (ad) => {
      if (ad.page_id && ad.page_name) {
        await upsertPage(ad.page_id, ad.page_name);
        const adResponse = {
          ad_archive_id: ad.ad_archive_id,
          page_id: ad.page_id,
          page_name: ad.page_name,
          is_active: ad.is_active,
          start_date: ad.start_date || new Date(ad.start_date_string).getTime(),
          end_date: ad.end_date || (ad.end_date_string ? new Date(ad.end_date_string).getTime() : 0),
          url: ad.url || '',
          start_date_string: ad.start_date_string,
          end_date_string: ad.end_date_string || '',
          snapshot: {
            title: ad.snapshot?.title || null,
            page_name: ad.page_name,
            body: ad.snapshot?.body,
            cards: ad.snapshot?.cards
          }
        };
        await upsertAd(adResponse);
      }
    });

    await Promise.all(processPromises);

    return NextResponse.json({ 
      success: true, 
      adsProcessed: data.results.length,
      cursor: data.cursor
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ads' },
      { status: 500 }
    );
  }
} 