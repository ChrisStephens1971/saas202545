/**
 * P17_seed.ts
 * Database Seed Script for Testing & Development
 *
 * Creates realistic test data:
 * - 50 people across 20 households
 * - 6 groups
 * - 12 events in next 30 days
 * - 12 announcements
 * - Service plan for next Sunday (5 items, 3 songs with CCLI)
 * - Brand pack
 *
 * Usage:
 *   npm run db:seed
 *   or
 *   tsx seed.ts --tenant-id=<uuid>
 */

import { addDays, nextSunday, format } from 'date-fns';

// ============================================================================
// Configuration
// ============================================================================

const TENANT_ID = process.env.SEED_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const CHURCH_NAME = 'First Community Church';

// ============================================================================
// Seed Data Generators
// ============================================================================

/**
 * Generate 50 people across 20 households
 */
function generatePeople() {
  const households = [];
  const people = [];

  const firstNames = [
    'John', 'Mary', 'James', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
    'Edward', 'Deborah'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
  ];

  const streets = [
    'Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Main', 'Church', 'Park', 'Washington', 'First'
  ];

  // Create 20 households
  for (let i = 0; i < 20; i++) {
    const lastName = lastNames[i];
    const street = streets[i % streets.length];
    const houseNumber = 100 + i * 10;

    const household = {
      id: `household-${i + 1}`,
      tenantId: TENANT_ID,
      name: `${lastName} Family`,
      address: `${houseNumber} ${street} Street`,
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      phone: `(555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i * 10).padStart(4, '0')}`,
      createdAt: new Date(),
    };

    households.push(household);

    // Each household has 2-3 people
    const peopleCount = i < 10 ? 3 : 2; // First 10 households have 3, rest have 2

    for (let j = 0; j < peopleCount; j++) {
      const isHead = j === 0;
      const personIndex = i * 3 + j;
      const firstName = firstNames[personIndex] || firstNames[personIndex % firstNames.length];

      const person = {
        id: `person-${personIndex + 1}`,
        tenantId: TENANT_ID,
        householdId: household.id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: isHead ? household.phone : null,
        birthDate: new Date(1960 + (personIndex % 40), personIndex % 12, (personIndex % 28) + 1),
        memberSince: new Date(2015 + (i % 10), 0, 1),
        role: isHead ? 'member' : 'member',
        createdAt: new Date(),
      };

      people.push(person);
    }
  }

  return { households, people };
}

/**
 * Generate 6 groups
 */
function generateGroups() {
  return [
    {
      id: 'group-1',
      tenantId: TENANT_ID,
      name: 'Sunday School - Adults',
      description: 'Sunday morning Bible study for adults',
      category: 'education',
      meetingDay: 'Sunday',
      meetingTime: '9:00 AM',
      location: 'Fellowship Hall',
      leaderId: 'person-1',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'group-2',
      tenantId: TENANT_ID,
      name: 'Small Group - North Side',
      description: 'Weekly small group meeting for fellowship and prayer',
      category: 'small_group',
      meetingDay: 'Wednesday',
      meetingTime: '7:00 PM',
      location: 'Smith Home',
      leaderId: 'person-2',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'group-3',
      tenantId: TENANT_ID,
      name: 'Youth Group',
      description: 'Middle and high school students',
      category: 'youth',
      meetingDay: 'Friday',
      meetingTime: '6:30 PM',
      location: 'Youth Room',
      leaderId: 'person-5',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'group-4',
      tenantId: TENANT_ID,
      name: 'Prayer Team',
      description: 'Intercessory prayer ministry',
      category: 'ministry',
      meetingDay: 'Monday',
      meetingTime: '6:00 AM',
      location: 'Prayer Chapel',
      leaderId: 'person-3',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'group-5',
      tenantId: TENANT_ID,
      name: 'Women\'s Bible Study',
      description: 'Women\'s weekly Bible study and fellowship',
      category: 'education',
      meetingDay: 'Tuesday',
      meetingTime: '10:00 AM',
      location: 'Fellowship Hall',
      leaderId: 'person-10',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'group-6',
      tenantId: TENANT_ID,
      name: 'Men\'s Breakfast',
      description: 'Monthly men\'s fellowship breakfast',
      category: 'fellowship',
      meetingDay: 'First Saturday',
      meetingTime: '8:00 AM',
      location: 'Fellowship Hall',
      leaderId: 'person-15',
      isActive: true,
      createdAt: new Date(),
    },
  ];
}

/**
 * Generate 12 events in next 30 days
 */
function generateEvents() {
  const now = new Date();
  const events = [];

  // Sunday Services (next 4 Sundays)
  for (let i = 0; i < 4; i++) {
    const sunday = addDays(nextSunday(now), i * 7);
    events.push({
      id: `event-${i + 1}`,
      tenantId: TENANT_ID,
      title: 'Sunday Morning Worship',
      description: 'Weekly worship service',
      startTime: new Date(sunday.setHours(10, 0, 0)),
      endTime: new Date(sunday.setHours(11, 30, 0)),
      location: 'Main Sanctuary',
      category: 'worship',
      requiresRsvp: false,
      maxAttendees: null,
      createdAt: new Date(),
    });
  }

  // Wednesday Prayer Meetings (next 4 Wednesdays)
  for (let i = 0; i < 4; i++) {
    const date = addDays(now, i * 7 + (3 - now.getDay())); // Next Wednesday
    events.push({
      id: `event-${5 + i}`,
      tenantId: TENANT_ID,
      title: 'Wednesday Prayer Meeting',
      description: 'Midweek prayer and Bible study',
      startTime: new Date(date.setHours(19, 0, 0)),
      endTime: new Date(date.setHours(20, 30, 0)),
      location: 'Fellowship Hall',
      category: 'prayer',
      requiresRsvp: false,
      maxAttendees: null,
      createdAt: new Date(),
    });
  }

  // Special Events
  events.push(
    {
      id: 'event-9',
      tenantId: TENANT_ID,
      title: 'Church Potluck',
      description: 'Bring a dish to share! Sign up to let us know you\'re coming.',
      startTime: addDays(now, 14).setHours(18, 0, 0),
      endTime: addDays(now, 14).setHours(20, 0, 0),
      location: 'Fellowship Hall',
      category: 'fellowship',
      requiresRsvp: true,
      maxAttendees: 100,
      createdAt: new Date(),
    },
    {
      id: 'event-10',
      tenantId: TENANT_ID,
      title: 'Youth Game Night',
      description: 'Pizza and games for middle and high schoolers',
      startTime: addDays(now, 7).setHours(18, 30, 0),
      endTime: addDays(now, 7).setHours(21, 0, 0),
      location: 'Youth Room',
      category: 'youth',
      requiresRsvp: true,
      maxAttendees: 30,
      createdAt: new Date(),
    },
    {
      id: 'event-11',
      tenantId: TENANT_ID,
      title: 'Men\'s Breakfast',
      description: 'Monthly men\'s fellowship and discussion',
      startTime: addDays(now, 5).setHours(8, 0, 0),
      endTime: addDays(now, 5).setHours(10, 0, 0),
      location: 'Fellowship Hall',
      category: 'fellowship',
      requiresRsvp: true,
      maxAttendees: 40,
      createdAt: new Date(),
    },
    {
      id: 'event-12',
      tenantId: TENANT_ID,
      title: 'Community Service Day',
      description: 'Join us in serving our local community. Various service projects available.',
      startTime: addDays(now, 21).setHours(9, 0, 0),
      endTime: addDays(now, 21).setHours(15, 0, 0),
      location: 'Meet at Church',
      category: 'outreach',
      requiresRsvp: true,
      maxAttendees: 50,
      createdAt: new Date(),
    }
  );

  return events;
}

/**
 * Generate 12 announcements
 */
function generateAnnouncements() {
  const now = new Date();

  return [
    {
      id: 'announcement-1',
      tenantId: TENANT_ID,
      title: 'Service Time Change This Sunday',
      body: 'Due to building maintenance, service will start at 11 AM this week. Regular 10 AM time resumes next Sunday.',
      priority: 'urgent',
      category: 'general',
      expiresAt: addDays(now, 2),
      targetAudience: 'all',
      createdAt: new Date(),
    },
    {
      id: 'announcement-2',
      tenantId: TENANT_ID,
      title: 'Church Potluck Next Week',
      body: 'Join us for a potluck dinner on November 24th at 6 PM. Bring a dish to share! Sign up online to help us plan.',
      priority: 'high',
      category: 'events',
      expiresAt: addDays(now, 14),
      targetAudience: 'all',
      createdAt: new Date(),
    },
    {
      id: 'announcement-3',
      tenantId: TENANT_ID,
      title: 'New Small Group Starting',
      body: 'A new small group is forming on the north side. Meeting Wednesdays at 7 PM. Contact John Smith for details.',
      priority: 'normal',
      category: 'groups',
      expiresAt: addDays(now, 30),
      targetAudience: 'members',
      createdAt: new Date(),
    },
    {
      id: 'announcement-4',
      tenantId: TENANT_ID,
      title: 'Youth Ministry Volunteers Needed',
      body: 'We\'re looking for volunteers to help with our Friday night youth group. No experience necessary!',
      priority: 'normal',
      category: 'volunteers',
      expiresAt: addDays(now, 45),
      targetAudience: 'members',
      createdAt: new Date(),
    },
    {
      id: 'announcement-5',
      tenantId: TENANT_ID,
      title: 'Building Fund Update',
      body: 'Thanks to your generosity, we\'ve raised $45,000 toward our $100,000 goal for the new fellowship hall addition!',
      priority: 'normal',
      category: 'giving',
      expiresAt: addDays(now, 60),
      targetAudience: 'all',
      createdAt: new Date(),
    },
    {
      id: 'announcement-6',
      tenantId: TENANT_ID,
      title: 'Sunday School Teachers Needed',
      body: 'Can you spare one Sunday a month to teach our adult Sunday school class? Training provided.',
      priority: 'normal',
      category: 'volunteers',
      expiresAt: addDays(now, 30),
      targetAudience: 'members',
      createdAt: new Date(),
    },
    {
      id: 'announcement-7',
      tenantId: TENANT_ID,
      title: 'Community Service Day - Sign Up',
      body: 'Join us December 2nd for our quarterly community service day. We\'ll be serving at the local food bank and doing yard work for seniors.',
      priority: 'high',
      category: 'outreach',
      expiresAt: addDays(now, 21),
      targetAudience: 'all',
      createdAt: new Date(),
    },
    {
      id: 'announcement-8',
      tenantId: TENANT_ID,
      title: 'Prayer Request Submission',
      body: 'Have a prayer request? Submit it through our app or website, and our prayer team will lift you up.',
      priority: 'low',
      category: 'prayer',
      expiresAt: addDays(now, 90),
      targetAudience: 'all',
      createdAt: new Date(),
    },
    {
      id: 'announcement-9',
      tenantId: TENANT_ID,
      title: 'Women\'s Retreat Registration Open',
      body: 'Join us March 15-17 for our annual women\'s retreat. Early bird pricing until January 15th. Register online!',
      priority: 'normal',
      category: 'events',
      expiresAt: addDays(now, 120),
      targetAudience: 'all',
      createdAt: new Date(),
    },
    {
      id: 'announcement-10',
      tenantId: TENANT_ID,
      title: 'Nursery Volunteers Needed',
      body: 'Our nursery is looking for volunteers to serve once a month during Sunday service. Background check required.',
      priority: 'normal',
      category: 'volunteers',
      expiresAt: addDays(now, 45),
      targetAudience: 'members',
      createdAt: new Date(),
    },
    {
      id: 'announcement-11',
      tenantId: TENANT_ID,
      title: 'Thanksgiving Food Drive',
      body: 'Help us bless local families! Bring non-perishable food items to the church office by November 20th.',
      priority: 'high',
      category: 'outreach',
      expiresAt: addDays(now, 10),
      targetAudience: 'all',
      createdAt: new Date(),
    },
    {
      id: 'announcement-12',
      tenantId: TENANT_ID,
      title: 'New Sermon Series Starting',
      body: 'This Sunday we begin a new series: "Living with Purpose". Join us as we explore God\'s calling for our lives.',
      priority: 'normal',
      category: 'general',
      expiresAt: addDays(now, 7),
      targetAudience: 'all',
      createdAt: new Date(),
    },
  ];
}

/**
 * Generate service plan for next Sunday
 */
function generateServicePlan() {
  const sunday = nextSunday(new Date());

  const servicePlan = {
    id: 'service-plan-1',
    tenantId: TENANT_ID,
    serviceDate: sunday,
    serviceTime: '10:00 AM',
    title: 'Sunday Morning Worship',
    status: 'draft',
    createdAt: new Date(),
  };

  const serviceItems = [
    {
      id: 'item-1',
      servicePlanId: servicePlan.id,
      type: 'song',
      title: 'Amazing Grace',
      position: 1,
      durationMinutes: 5,
      ccliNumber: '22025',
      notes: 'Key of G, verses 1-4',
      createdAt: new Date(),
    },
    {
      id: 'item-2',
      servicePlanId: servicePlan.id,
      type: 'song',
      title: 'How Great Thou Art',
      position: 2,
      durationMinutes: 5,
      ccliNumber: '14181',
      notes: 'Key of C, all verses',
      createdAt: new Date(),
    },
    {
      id: 'item-3',
      servicePlanId: servicePlan.id,
      type: 'reading',
      title: 'Psalm 23',
      position: 3,
      durationMinutes: 3,
      notes: 'Read by Elder Smith',
      createdAt: new Date(),
    },
    {
      id: 'item-4',
      servicePlanId: servicePlan.id,
      type: 'sermon',
      title: 'Living with Purpose',
      position: 4,
      durationMinutes: 30,
      speaker: 'Pastor Johnson',
      notes: 'Part 1 of new series',
      createdAt: new Date(),
    },
    {
      id: 'item-5',
      servicePlanId: servicePlan.id,
      type: 'song',
      title: 'Blessed Assurance',
      position: 5,
      durationMinutes: 4,
      ccliNumber: '22324',
      notes: 'Key of D, verses 1 & 3',
      createdAt: new Date(),
    },
  ];

  return { servicePlan, serviceItems };
}

/**
 * Generate brand pack
 */
function generateBrandPack() {
  return {
    id: 'brandpack-1',
    tenantId: TENANT_ID,
    name: 'Default Brand',
    isActive: true,
    logoUrl: 'https://via.placeholder.com/300x150/2563eb/ffffff?text=First+Community+Church',
    primaryColor: '#2563eb', // Blue
    secondaryColor: '#dc2626', // Red
    accentColor: '#059669', // Green
    textColor: '#1a1a1a',
    backgroundColor: '#ffffff',
    fontFamily: 'Georgia, serif',
    fontHeadline: 'Arial, sans-serif',
    createdAt: new Date(),
  };
}

// ============================================================================
// Database Seed Execution
// ============================================================================

export async function seedDatabase(db: any) {
  console.log('🌱 Seeding database...\n');

  try {
    // 1. Generate data
    console.log('📊 Generating test data...');
    const { households, people } = generatePeople();
    const groups = generateGroups();
    const events = generateEvents();
    const announcements = generateAnnouncements();
    const { servicePlan, serviceItems } = generateServicePlan();
    const brandPack = generateBrandPack();

    console.log(`✅ Generated:`);
    console.log(`   - ${households.length} households`);
    console.log(`   - ${people.length} people`);
    console.log(`   - ${groups.length} groups`);
    console.log(`   - ${events.length} events`);
    console.log(`   - ${announcements.length} announcements`);
    console.log(`   - 1 service plan with ${serviceItems.length} items`);
    console.log(`   - 1 brand pack\n`);

    // 2. Clear existing data (dev only!)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🗑️  Clearing existing test data...');
      await db.serviceItem.deleteMany({ where: { servicePlanId: { startsWith: 'service-plan-' } } });
      await db.servicePlan.deleteMany({ where: { id: { startsWith: 'service-plan-' } } });
      await db.announcement.deleteMany({ where: { id: { startsWith: 'announcement-' } } });
      await db.event.deleteMany({ where: { id: { startsWith: 'event-' } } });
      await db.group.deleteMany({ where: { id: { startsWith: 'group-' } } });
      await db.person.deleteMany({ where: { id: { startsWith: 'person-' } } });
      await db.household.deleteMany({ where: { id: { startsWith: 'household-' } } });
      await db.brandPack.deleteMany({ where: { id: 'brandpack-1' } });
      console.log('✅ Cleared\n');
    }

    // 3. Insert data
    console.log('📝 Inserting data...');

    await db.household.createMany({ data: households });
    console.log(`✅ Inserted ${households.length} households`);

    await db.person.createMany({ data: people });
    console.log(`✅ Inserted ${people.length} people`);

    await db.group.createMany({ data: groups });
    console.log(`✅ Inserted ${groups.length} groups`);

    await db.event.createMany({ data: events });
    console.log(`✅ Inserted ${events.length} events`);

    await db.announcement.createMany({ data: announcements });
    console.log(`✅ Inserted ${announcements.length} announcements`);

    await db.servicePlan.create({ data: servicePlan });
    await db.serviceItem.createMany({ data: serviceItems });
    console.log(`✅ Inserted service plan with ${serviceItems.length} items`);

    await db.brandPack.create({ data: brandPack });
    console.log(`✅ Inserted brand pack\n`);

    console.log('🎉 Database seeded successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Tenant ID: ${TENANT_ID}`);
    console.log(`   Login as: john.smith@example.com`);
    console.log(`   Total records: ${households.length + people.length + groups.length + events.length + announcements.length + serviceItems.length + 2}`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// ============================================================================
// CLI Runner
// ============================================================================

if (require.main === module) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  seedDatabase(prisma)
    .then(() => {
      prisma.$disconnect();
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      prisma.$disconnect();
      process.exit(1);
    });
}

export default seedDatabase;
