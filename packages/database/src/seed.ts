import { createPool } from './index';

async function seed() {
  const pool = createPool();

  try {
    console.log('Starting database seed...');

    // Insert test tenant
    const tenantResult = await pool.query(`
      INSERT INTO tenant (slug, name, status, primary_email, timezone, locale)
      VALUES ('gracechurch', 'Grace Community Church', 'active', 'admin@gracechurch.org', 'America/New_York', 'en-US')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);

    const tenantId = tenantResult.rows[0].id;
    console.log(`✓ Created tenant: ${tenantId}`);

    // Set tenant context for RLS
    // SECURITY FIX (LOW-001, 2025-12-06): Use parameterized set_config instead of string interpolation
    await pool.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);

    // Insert household
    const householdResult = await pool.query(`
      INSERT INTO household (tenant_id, name, address_line1, city, state, zip)
      VALUES ($1, 'Smith Family', '123 Main St', 'New York', 'NY', '10001')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [tenantId]);

    const householdId = householdResult.rows.length > 0 ? householdResult.rows[0].id : null;
    if (householdId) {
      console.log(`✓ Created household: ${householdId}`);
    }

    // Insert people
    const people = [
      { firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', membershipStatus: 'member' },
      { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', membershipStatus: 'member' },
      { firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@example.com', membershipStatus: 'attendee' },
      { firstName: 'Alice', lastName: 'Williams', email: 'alice.williams@example.com', membershipStatus: 'visitor' },
    ];

    for (const person of people) {
      const result = await pool.query(`
        INSERT INTO person (tenant_id, household_id, first_name, last_name, email, membership_status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [tenantId, householdId, person.firstName, person.lastName, person.email, person.membershipStatus]);

      if (result.rows.length > 0) {
        console.log(`✓ Created person: ${person.firstName} ${person.lastName}`);
      }
    }

    // Insert brand pack
    const brandResult = await pool.query(`
      INSERT INTO brand_pack (
        tenant_id,
        name,
        church_name,
        church_address,
        church_phone,
        church_email,
        church_website,
        primary_color,
        is_active
      )
      VALUES (
        $1,
        'Default',
        'Grace Community Church',
        '123 Main St, New York, NY 10001',
        '(555) 123-4567',
        'info@gracechurch.org',
        'www.gracechurch.org',
        '#3B82F6',
        true
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [tenantId]);

    if (brandResult.rows.length > 0) {
      console.log(`✓ Created brand pack`);
    }

    // Insert bulletin for next Sunday
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(10, 0, 0, 0); // 10 AM

    // First try to find existing bulletin for this date
    const existingBulletin = await pool.query(`
      SELECT id FROM bulletin_issue
      WHERE tenant_id = $1 AND issue_date = $2 AND deleted_at IS NULL
    `, [tenantId, nextSunday]);

    if (existingBulletin.rows.length === 0) {
      await pool.query(`
        INSERT INTO bulletin_issue (tenant_id, issue_date, status)
        VALUES ($1, $2, 'draft')
        RETURNING id
      `, [tenantId, nextSunday]);
    }

    console.log(`✓ Created bulletin for ${nextSunday.toDateString()}`);

    // Insert a soft-deleted bulletin for testing the "deleted" filter
    const deletedBulletinDate = new Date();
    deletedBulletinDate.setDate(deletedBulletinDate.getDate() - 14); // 2 weeks ago
    deletedBulletinDate.setHours(10, 0, 0, 0);

    // Note: CHECK constraint requires status='deleted' when deleted_at IS NOT NULL
    await pool.query(`
      INSERT INTO bulletin_issue (tenant_id, issue_date, status, deleted_at)
      VALUES ($1, $2, 'deleted', NOW())
      ON CONFLICT DO NOTHING
    `, [tenantId, deletedBulletinDate]);

    console.log(`✓ Created soft-deleted bulletin for ${deletedBulletinDate.toDateString()}`);

    // Insert service items
    const serviceItems = [
      { type: 'Welcome', title: 'Welcome & Announcements', sequence: 1 },
      { type: 'Song', title: 'Amazing Grace', ccliNumber: '4639462', sequence: 2 },
      { type: 'Prayer', title: 'Opening Prayer', sequence: 3 },
      { type: 'Song', title: 'How Great Is Our God', ccliNumber: '4348399', sequence: 4 },
      { type: 'Scripture', title: 'Psalm 23', scriptureRef: 'Psalm 23:1-6', sequence: 5 },
      { type: 'Sermon', title: 'The Good Shepherd', speaker: 'Pastor John', sequence: 6 },
      { type: 'Offering', title: 'Offering', sequence: 7 },
      { type: 'Song', title: 'Blessed Assurance', ccliNumber: '22324', sequence: 8 },
      { type: 'Benediction', title: 'Closing Blessing', sequence: 9 },
    ];

    for (const item of serviceItems) {
      await pool.query(`
        INSERT INTO service_item (
          tenant_id,
          service_date,
          type,
          sequence,
          title,
          ccli_number,
          scripture_ref,
          speaker
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        tenantId,
        nextSunday,
        item.type,
        item.sequence,
        item.title,
        (item as any).ccliNumber || null,
        (item as any).scriptureRef || null,
        (item as any).speaker || null,
      ]);
    }

    console.log(`✓ Created ${serviceItems.length} service items`);

    // Insert announcements
    const announcements = [
      {
        title: 'Potluck Dinner This Friday',
        body: 'Join us Friday at 6 PM for our monthly potluck. Bring a dish to share!',
        priority: 'Normal',
        category: 'Fellowship',
      },
      {
        title: 'Youth Group Meeting',
        body: 'Youth group meets Wednesday at 7 PM. Grades 6-12 welcome.',
        priority: 'Normal',
        category: 'Youth',
      },
      {
        title: 'Building Fund Update',
        body: 'We\'ve raised $45,000 toward our $100,000 goal. Thank you for your generosity!',
        priority: 'High',
        category: 'Giving',
      },
    ];

    for (const announcement of announcements) {
      await pool.query(`
        INSERT INTO announcement (
          tenant_id,
          title,
          body,
          priority,
          category,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT DO NOTHING
      `, [tenantId, announcement.title, announcement.body, announcement.priority, announcement.category]);
    }

    console.log(`✓ Created ${announcements.length} announcements`);

    // Insert fund
    await pool.query(`
      INSERT INTO fund (tenant_id, name, description, is_active, is_default)
      VALUES ($1, 'General Fund', 'General church operations', true, true)
      ON CONFLICT DO NOTHING
    `, [tenantId]);

    console.log(`✓ Created default fund`);

    console.log('\n✓ Database seeded successfully!');
    console.log(`\nTest Credentials:`);
    console.log(`  Tenant ID: ${tenantId}`);
    console.log(`  Tenant Slug: gracechurch`);
    console.log(`  Admin Email: admin@gracechurch.org`);

  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
