import prisma from '../src/lib/prisma';

async function clearAllData() {
  try {
    // First delete all ad status logs (they reference both ads and pages)
    const deletedLogs = await prisma.adStatusLog.deleteMany({});
    console.log(`Deleted ${deletedLogs.count} ad status logs`);

    // Then delete all ads (they reference pages)
    const deletedAds = await prisma.ad.deleteMany({});
    console.log(`Deleted ${deletedAds.count} ads`);

    // Finally delete all pages
    const deletedPages = await prisma.page.deleteMany({});
    console.log(`Deleted ${deletedPages.count} pages`);

    console.log('✅ Successfully cleared ALL data from database');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData(); 