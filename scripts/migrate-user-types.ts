import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function migrateUserTypes() {
  console.log("Starting user type migration...");
  
  try {
    // Get all users without userType set
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users`);
    
    let updated = 0;
    for (const user of allUsers) {
      if (!user.userType || user.userType === null) {
        await db.update(users)
          .set({ userType: 'staff' })
          .where(eq(users.id, user.id));
        updated++;
      }
    }
    
    console.log(`✅ Migration complete! Updated ${updated} users to 'staff' type.`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrateUserTypes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
