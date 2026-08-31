import { and, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { permissions, rolePermissions, roles } from "@shared/schema";

const SURVEY_PERMISSION = {
  key: "survey.manage",
  resource: "survey",
  action: "manage",
  description: "설문 설정 관리",
} as const;

async function main() {
  const [operatorRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.code, "operator"), eq(roles.isActive, true)))
    .limit(1);

  if (!operatorRole) {
    throw new Error("Active operator ACL role is not configured");
  }

  const [storedPermission] = await db
    .insert(permissions)
    .values(SURVEY_PERMISSION)
    .onConflictDoUpdate({
      target: permissions.key,
      set: {
        resource: SURVEY_PERMISSION.resource,
        action: SURVEY_PERMISSION.action,
        description: SURVEY_PERMISSION.description,
      },
    })
    .returning({ id: permissions.id });

  await db
    .insert(rolePermissions)
    .values({
      roleId: operatorRole.id,
      permissionId: storedPermission.id,
    })
    .onConflictDoNothing();

  console.log("Survey ACL permission is ready for the operator role.");
}

main()
  .catch((error) => {
    console.error("Failed to ensure survey ACL permission:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });