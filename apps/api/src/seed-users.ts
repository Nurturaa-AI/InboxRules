import "dotenv/config";
import db from "./db";

async function main() {
  const USERS = [
    {
      clerkId: "user_3EPeDVJjBNG1lRV7zWnawjBZ4vi",
      email: "princewill9711@gmail.com",
    },
    {
      clerkId: "user_3EEvKhX3ouQS0SkcGE9MIq8r1af",
      email: "bobken4ril@gmail.com",
    },
    {
      clerkId: "user_3DzFjifdsNLNC8U1rSbuVgZxEue",
      email: "prince54ril@gmail.com",
    },
  ];

  for (const u of USERS) {
    // Check if user already exists
    const existing = await db.user.findFirst({ where: { clerkId: u.clerkId } });

    if (existing) {
      console.log(
        `✓ User already exists: ${u.email} (tenant: ${existing.tenantId})`,
      );
      continue;
    }

    // Create tenant
    const tenant = await db.tenant.create({
      data: {
        name: u.email.split("@")[0] + "'s Workspace",
        plan: "free",
      },
    });

    // Create user
    const user = await db.user.create({
      data: {
        clerkId: u.clerkId,
        email: u.email,
        tenantId: tenant.id,
        role: "owner",
      },
    });

    console.log(`✅ Created: ${u.email}`);
    console.log(`   User ID:   ${user.id}`);
    console.log(`   Tenant ID: ${tenant.id}`);
  }

  console.log("\nDone! All users are ready.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
