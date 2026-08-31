import { and, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { permissions, rolePermissions, roles } from "@shared/schema";

const EXECUTIVE_PERMISSIONS = [
  {
    key: "organization.executives.read",
    resource: "organization.executives",
    action: "read",
    description: "임원진 정보 열람",
  },
  {
    key: "organization.executives.create",
    resource: "organization.executives",
    action: "create",
    description: "임원진 정보 추가",
  },
  {
    key: "organization.executives.update",
    resource: "organization.executives",
    action: "update",
    description: "임원진 정보 수정",
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

  for (const permission of EXECUTIVE_PERMISSIONS) {
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

  console.log("Executive ACL permissions are ready for the operator role.");
}

main()
  .catch((error) => {
    console.error("Failed to ensure executive ACL permissions:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });