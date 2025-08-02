import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('Test123!', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@securesnap.com' },
    update: {},
    create: {
      email: 'test@securesnap.com',
      name: 'Test User',
      password: hashedPassword,
      settings: {
        create: {
          theme: 'light',
          notificationsEnabled: true,
          faceDetectionEnabled: true,
        },
      },
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create demo user with 2FA enabled
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@securesnap.com' },
    update: {},
    create: {
      email: 'demo@securesnap.com',
      name: 'Demo User',
      password: hashedPassword,
      twoFactorEnabled: true,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP', // Demo secret for testing
      backupCodes: [
        'demo-backup-code-1',
        'demo-backup-code-2',
        'demo-backup-code-3',
        'demo-backup-code-4',
        'demo-backup-code-5',
      ],
      settings: {
        create: {
          theme: 'dark',
          notificationsEnabled: true,
          faceDetectionEnabled: true,
        },
      },
    },
  });

  console.log('✅ Created demo user with 2FA:', demoUser.email);

  // Create sample album
  const album = await prisma.album.create({
    data: {
      userId: testUser.id,
      name: 'Family Photos',
      description: 'Precious family memories',
    },
  });

  console.log('✅ Created sample album:', album.name);

  // Create sample notification
  await prisma.notification.create({
    data: {
      userId: testUser.id,
      type: 'SYSTEM_UPDATE',
      title: 'Welcome to SecureSnap!',
      message: 'Your secure photo sharing journey begins here.',
      data: {
        welcomeGuide: '/help/getting-started',
      },
    },
  });

  console.log('✅ Created welcome notification');

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      userId: testUser.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: testUser.id,
      metadata: {
        source: 'seed_script',
      },
    },
  });

  console.log('✅ Created audit log entry');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });