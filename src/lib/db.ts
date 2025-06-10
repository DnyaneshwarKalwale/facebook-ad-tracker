import { PrismaClient } from '@prisma/client';
import { AdResponse } from './api';

const prisma = new PrismaClient();

export async function upsertPage(pageId: string, pageName: string) {
  return prisma.page.upsert({
    where: { id: pageId },
    create: { id: pageId, name: pageName },
    update: { name: pageName }
  });
}

export async function upsertAd(ad: AdResponse) {
  const startDate = new Date(ad.start_date_string);
  const endDate = ad.end_date_string ? new Date(ad.end_date_string) : null;

  return prisma.ad.upsert({
    where: { adArchiveId: ad.ad_archive_id },
    create: {
      adArchiveId: ad.ad_archive_id,
      pageId: ad.page_id,
      pageName: ad.page_name,
      title: ad.snapshot.title,
      isActive: ad.is_active,
      startDate,
      endDate,
      url: ad.url
    },
    update: {
      isActive: ad.is_active,
      lastSeen: new Date(),
      endDate: !ad.is_active ? endDate || new Date() : endDate
    }
  });
}

export async function getAdsByPage(pageId: string) {
  return prisma.ad.findMany({
    where: { pageId },
    orderBy: { lastSeen: 'desc' }
  });
}

export async function getActiveAds() {
  return prisma.ad.findMany({
    where: { isActive: true },
    orderBy: { lastSeen: 'desc' }
  });
}

export async function getInactiveAds() {
  return prisma.ad.findMany({
    where: { isActive: false },
    orderBy: { lastSeen: 'desc' }
  });
}

export async function getAllPages() {
  return prisma.page.findMany({
    orderBy: { name: 'asc' }
  });
} 