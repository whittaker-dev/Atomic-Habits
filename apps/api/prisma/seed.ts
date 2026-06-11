import { PrismaClient } from '@prisma/client';
import { defaultPlanTripSeed } from './plan-trip-seed.data.js';

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  {
    slug: 'english',
    nameKey: 'categories.english',
    icon: 'book-open',
    defaultXpReward: 20,
    sortOrder: 1,
  },
  {
    slug: 'fitness',
    nameKey: 'categories.fitness',
    icon: 'dumbbell',
    defaultXpReward: 15,
    sortOrder: 2,
  },
  {
    slug: 'reading',
    nameKey: 'categories.reading',
    icon: 'book',
    defaultXpReward: 15,
    sortOrder: 3,
  },
  { slug: 'coding', nameKey: 'categories.coding', icon: 'code', defaultXpReward: 25, sortOrder: 4 },
  {
    slug: 'work',
    nameKey: 'categories.work',
    icon: 'briefcase',
    defaultXpReward: 25,
    sortOrder: 5,
  },
  {
    slug: 'meditation',
    nameKey: 'categories.meditation',
    icon: 'sparkles',
    defaultXpReward: 15,
    sortOrder: 6,
  },
  {
    slug: 'wellness',
    nameKey: 'categories.wellness',
    icon: 'heart',
    defaultXpReward: 15,
    sortOrder: 7,
  },
] as const;

async function main() {
  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.missionCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: {
        nameKey: cat.nameKey,
        icon: cat.icon,
        defaultXpReward: cat.defaultXpReward,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${SYSTEM_CATEGORIES.length} mission categories`);

  const { slug, ...tripData } = defaultPlanTripSeed;
  const existingTrip = await prisma.planTrip.findUnique({ where: { slug } });

  if (!existingTrip) {
    await prisma.planTrip.create({
      data: {
        slug,
        ...tripData,
      },
    });
    console.log(`Seeded default plan trip (${slug})`);
  } else {
    console.log(`Plan trip (${slug}) already exists — skipped`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
