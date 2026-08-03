import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ take: 5 });
  const tenants = await db.tenant.findMany({ take: 5 });

  console.log("\n=== USERS ===");
  users.forEach((u) => console.log(u));

  console.log("\n=== TENANTS ===");
  tenants.forEach((t) => console.log(t));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
