/**
 * Manual migration script to add userId column to departments table
 * Run with: tsx scripts/add-user-id-column.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Adding user_id column to departments table...');

  try {
    // Check if column already exists
    const columnCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'departments'
        AND column_name = 'user_id'
      ) as exists
    `;

    if (columnCheck[0].exists) {
      console.log('✅ Column user_id already exists in departments table');
      return;
    }

    // Add the column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE departments
      ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✅ Column user_id added to departments table');

    // Add index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX departments_user_id_idx ON departments(user_id)
    `);
    console.log('✅ Index created on user_id column');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
