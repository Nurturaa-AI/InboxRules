import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const clerkId = process.argv[2];
  const email = process.argv[3];

  if (!clerkId || !email) {
    console.error("Usage: tsx /tmp/create-user.ts user_xxx email@example.com");
    process.exit(1);
  }

  const existing = await db.user.findFirst({ where: { clerkId } });
  if (existing) {
    console.log("User already exists:", existing);
    process.exit(0);
  }

  const tenant = await db.tenant.create({
    data: {
      name: email.split("@")[0] + "'s Workspace",
      plan: "free",
    },
  });
  console.log("Created tenant:", tenant.id);

  const user = await db.user.create({
    data: { clerkId, email, tenantId: tenant.id, role: "owner" },
  });
  console.log("Created user:", user.id);
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
