import { and, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { permissions, rolePermissions, roles } from "@shared/schema";

const PAGE_PERMISSIONS = [
  {
    key: "page.read",
    resource: "page",
    action: "read",
    description: "정적 페이지 열람",
  },
  {
    key: "page.update",
    resource: "page",
    action: "update",
    description: "정적 페이지 수정",
  },
] as const;

async function main() {
  const [operatorRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.code, "operator"), eq(roles.isActive, true)))
    .limit(1);

  if (!operatorRole) {
    throw new Error("Active operator ACL role is not configured");
  }

  for (const permission of PAGE_PERMISSIONS) {
    const [storedPermission] = await db
      .insert(permissions)
      .values(permission)
      .onConflictDoUpdate({
        target: permissions.key,
        set: {
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
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
  }

  console.log("Page ACL permissions are ready for the operator role.");
}

main()
  .catch((error) => {
    console.error("Failed to ensure page ACL permissions:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });