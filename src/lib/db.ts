import type { AdResponse } from './api';
import { prisma } from './prisma';

export async function upsertPage(pageId: string, pageName: string) {
  return prisma.page.upsert({
    where: { id: pageId },
    update: { name: pageName },
    create: {
      id: pageId,
      name: pageName,
    },
  });
}

export async function upsertAd(ad: AdResponse) {
  return prisma.ad.upsert({
    where: { adArchiveId: ad.ad_archive_id },
    update: {
      isActive: ad.is_active,
      lastSeen: new Date(),
      endDate: !ad.is_active ? new Date(ad.end_date) : null,
    },
    create: {
      adArchiveId: ad.ad_archive_id,
      pageId: ad.page_id,
      isActive: ad.is_active,
      startDate: new Date(ad.start_date),
      endDate: !ad.is_active ? new Date(ad.end_date) : null,
    },
  });
}

export async function getAds() {
  return prisma.ad.findMany({
    include: {
      page: true,
    },
    orderBy: {
      lastSeen: 'desc',
    },
  });
} 