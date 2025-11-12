import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql, eq, and, isNull } from 'drizzle-orm';
import { users, members, tiers, roles, userMemberships } from '../shared/schema';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sqlClient = neon(dbUrl);
  const db = drizzle(sqlClient);

  console.log('👥 Migrating existing users to new membership system...');

  try {
    // Get all users
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    }).from(users);

    console.log(`📊 Found ${allUsers.length} users`);

    // Get all members
    const allMembers = await db.select({
      userId: members.userId,
      membershipLevel: members.membershipLevel,
    }).from(members);

    const memberMap = new Map(allMembers.map(m => [m.userId, m.membershipLevel]));

    // Get tier and role mappings
    const tierRecords = await db.select().from(tiers);
    const roleRecords = await db.select().from(roles);

    const tierMap = new Map(tierRecords.map(t => [t.code, t.id]));
    const roleMap = new Map(roleRecords.map(r => [r.code, r.id]));

    let migrated = 0;
    let skipped = 0;

    for (const user of allUsers) {
      // Check if user already has a membership
      const existing = await db.select()
        .from(userMemberships)
        .where(and(
          eq(userMemberships.userId, user.id),
          eq(userMemberships.isActive, true)
        ))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  Skipping ${user.email} (already has membership)`);
        skipped++;
        continue;
      }

      // Determine tier based on membershipLevel
      const membershipLevel = memberMap.get(user.id);
      let tierCode = 'MEMBER'; // default
      
      if (user.role === 'admin') {
        tierCode = 'ADMIN';
      } else if (membershipLevel === 'sponsor') {
        tierCode = 'CORP';
      } else if (membershipLevel === 'premium') {
        tierCode = 'PRO';
      } else if (membershipLevel === 'regular' || !membershipLevel) {
        tierCode = 'MEMBER';
      }

      // Determine role
      const roleCode = user.role === 'admin' ? 'admin' : 'member';

      const tierId = tierMap.get(tierCode);
      const roleId = roleMap.get(roleCode);

      if (!tierId || !roleId) {
        console.error(`  ❌ Missing tier or role for ${user.email}`);
        continue;
      }

      // Create membership
      await db.insert(userMemberships).values({
        userId: user.id,
        tierId,
        roleId,
        isActive: true,
        startedAt: new Date(),
        expiresAt: null, // No expiration by default
        notes: 'Migrated from legacy system',
      });

      console.log(`  ✓ ${user.email}: ${tierCode} / ${roleCode}`);
      migrated++;
    }

    console.log(`\n✅ Migration completed:`);
    console.log(`   - Migrated: ${migrated} users`);
    console.log(`   - Skipped: ${skipped} users`);
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
