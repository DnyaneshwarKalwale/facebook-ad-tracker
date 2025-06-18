import prisma from '../src/lib/prisma';

async function clearAllData() {
  try {
    // First delete all ads since they reference pages
    console.log('Deleting all ads...');
    await prisma.ad.deleteMany({});
    console.log('All ads deleted successfully');

    // Then delete all pages
    console.log('Deleting all pages...');
    await prisma.page.deleteMany({});
    console.log('All pages deleted successfully');

    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData(); 