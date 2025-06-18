import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const ads = await prisma.ad.findMany({
      include: {
        page: true
      },
      orderBy: {
        lastSeen: 'desc'
      }
    });

    return NextResponse.json({ 
      success: true, 
      ads 
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ads' },
      { status: 500 }
    );
  }
} 