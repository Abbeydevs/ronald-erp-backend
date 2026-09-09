import {
  PrismaClient,
  Role,
  WorkMode,
  LeadSource,
  LeadStatus,
  LeadPriority,
  ApplicationStage,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const hq = await prisma.branch.upsert({
    where: { id: 'hq-test-branch' },
    update: {},
    create: {
      id: 'hq-test-branch',
      name: 'Lagos HQ (Test)',
      latitude: 6.5244,
      longitude: 3.3792,
    },
  });

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
      branchId: hq.id,
      workMode: WorkMode.ONSITE,
    },
  });

  console.log('✅ Super Admin seeded successfully:');
  console.log(`ID: ${superAdmin.id}`);
  console.log(`Email: ${superAdmin.email}`);

  const testStudentId = 'test-student-id-1234';

  const student = await prisma.lead.upsert({
    where: { id: testStudentId },
    update: {},
    create: {
      firstName: 'Test',
      lastName: 'Student',
      email: 'student@test.com',
      phone: '+2348000000000',
      courseOfStudy: 'MSc Computer Science',
      countryChoice: 'UK',
      source: LeadSource.WEBSITE,
      status: LeadStatus.CONVERTED,
      priority: LeadPriority.HOT,
      assignedToId: superAdmin.id,
    },
  });

  await prisma.application.create({
    data: {
      leadId: student.id,
      stage: ApplicationStage.CONSULTATION_AND_DOCUMENTS,
      counsellorId: superAdmin.id,
    },
  });

  console.log('✅ Test student and application seeded successfully.');
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
