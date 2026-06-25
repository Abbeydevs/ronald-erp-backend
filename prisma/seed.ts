import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const superAdminEmail = 'admin@ronaldpartners.com';
  const superAdminPassword = 'SuperAdminPassword123!';

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(superAdminPassword, saltRounds);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: 'System Super Admin',
      email: superAdminEmail,
      hash: hashedPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Super Admin seeded successfully:');
  console.log(`ID: ${superAdmin.id}`);
  console.log(`Email: ${superAdmin.email}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
