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
      await upsertPage(ad.page_id, ad.page_name);
      await upsertAd(ad);
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
      await upsertPage(ad.page_id, ad.page_name);
      await upsertAd(ad);
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