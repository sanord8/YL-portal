/**
 * Generate Test Movements
 *
 * Creates ~500 random movements for testing:
 * - Mix of income and expenses
 * - Distributed across all areas and departments
 * - Spread over last 12 months
 * - All approved status
 * - Realistic amounts and categories
 *
 * Run with: pnpm tsx scripts/generate-test-movements.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Movement categories for different departments
const EXPENSE_CATEGORIES = [
  'Material de oficina',
  'Alquiler de espacio',
  'Transporte',
  'Alimentación',
  'Alojamiento',
  'Marketing y promoción',
  'Equipamiento',
  'Formación',
  'Seguros',
  'Mantenimiento',
  'Servicios profesionales',
  'Telecomunicaciones',
  'Suministros',
  'Reparaciones',
  'Merchandising',
  'Actividades',
  'Inscripciones',
  'Material deportivo',
];

const INCOME_CATEGORIES = [
  'Donaciones',
  'Inscripciones',
  'Venta merchandising',
  'Subvenciones',
  'Eventos',
  'Patrocinios',
  'Transferencias internas',
];

// Realistic descriptions for movements
const EXPENSE_DESCRIPTIONS = [
  'Compra material para actividad',
  'Alquiler sala para reunión',
  'Gasolina vehículo',
  'Comida evento',
  'Alojamiento retiro',
  'Impresión folletos',
  'Compra equipamiento',
  'Curso formación staff',
  'Seguro vehículo',
  'Reparación instalaciones',
  'Asesoría contable',
  'Internet y teléfono',
  'Material limpieza',
  'Arreglo climatización',
  'Camisetas equipo',
  'Salida grupal',
  'Inscripción participantes',
  'Balones y material deportivo',
];

const INCOME_DESCRIPTIONS = [
  'Donación particular',
  'Pago inscripción campamento',
  'Venta camisetas',
  'Subvención ayuntamiento',
  'Recaudación evento',
  'Patrocinio empresa local',
  'Transferencia de otra área',
];

// Random amount ranges (in cents)
const AMOUNT_RANGES = {
  small: { min: 500, max: 5000 }, // 5€ - 50€
  medium: { min: 5000, max: 20000 }, // 50€ - 200€
  large: { min: 20000, max: 100000 }, // 200€ - 1000€
  xlarge: { min: 100000, max: 500000 }, // 1000€ - 5000€
};

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomAmount(range: 'small' | 'medium' | 'large' | 'xlarge'): number {
  const { min, max } = AMOUNT_RANGES[range];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(monthsAgo: number): Date {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - monthsAgo);
  const timestamp = start.getTime() + Math.random() * (now.getTime() - start.getTime());
  return new Date(timestamp);
}

function getAmountRangeForDepartment(deptCode: string): 'small' | 'medium' | 'large' | 'xlarge' {
  // Larger amounts for camps, retiros, and administration
  if (['08', '23', '24', '26', '27', '29', '31'].includes(deptCode)) {
    return Math.random() > 0.3 ? 'xlarge' : 'large';
  }
  // Medium amounts for promotion, vehicles, office
  if (['03', '04', '06'].includes(deptCode)) {
    return Math.random() > 0.5 ? 'large' : 'medium';
  }
  // Everything else is mostly small to medium
  return Math.random() > 0.7 ? 'medium' : 'small';
}

async function main() {
  console.log('🚀 Starting Test Data Generation...\n');

  try {
    // Get admin user
    console.log('👤 Finding admin user...');
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (!adminUser) {
      throw new Error('No admin user found. Please create an admin user first.');
    }
    console.log(`   ✅ Found admin: ${adminUser.email}\n`);

    // Create or get bank accounts
    console.log('🏦 Setting up bank accounts...');
    let bankAccounts = await prisma.bankAccount.findMany();

    if (bankAccounts.length === 0) {
      console.log('   Creating test bank accounts...');
      const mainAccount = await prisma.bankAccount.create({
        data: {
          name: 'Cuenta Principal EUR',
          accountNumber: 'ES0000000000000000000000',
          bankName: 'Banco Test',
          currency: 'EUR',
          description: 'Cuenta bancaria principal para todas las áreas',
        },
      });
      const secondaryAccount = await prisma.bankAccount.create({
        data: {
          name: 'Cuenta Secundaria EUR',
          accountNumber: 'ES1111111111111111111111',
          bankName: 'Banco Test',
          currency: 'EUR',
          description: 'Cuenta bancaria secundaria',
        },
      });
      bankAccounts = [mainAccount, secondaryAccount];
      console.log(`   ✅ Created ${bankAccounts.length} test bank accounts\n`);
    } else {
      console.log(`   ✅ Found ${bankAccounts.length} existing bank accounts\n`);
    }

    // Get all areas and departments
    console.log('📍 Loading areas and departments...');
    const areas = await prisma.area.findMany({
      include: {
        departments: {
          where: { userId: null }, // Exclude special funds departments
        },
      },
    });

    if (areas.length === 0) {
      throw new Error('No areas found. Please run initialize-areas-departments.ts first.');
    }

    const totalDepartments = areas.reduce((sum, area) => sum + area.departments.length, 0);
    console.log(`   ✅ Loaded ${areas.length} areas with ${totalDepartments} departments\n`);

    // Generate movements
    console.log('💰 Generating movements...');
    const TARGET_MOVEMENTS = 500;
    let created = 0;

    // Distribution: 70% expenses, 30% income
    const expenseCount = Math.floor(TARGET_MOVEMENTS * 0.7);
    const incomeCount = TARGET_MOVEMENTS - expenseCount;

    // Create expenses
    console.log(`   📤 Creating ${expenseCount} expenses...`);
    for (let i = 0; i < expenseCount; i++) {
      const area = randomElement(areas);
      const department = randomElement(area.departments);
      const category = randomElement(EXPENSE_CATEGORIES);
      const description = randomElement(EXPENSE_DESCRIPTIONS);
      const amountRange = getAmountRangeForDepartment(department.code);
      const amount = randomAmount(amountRange);
      const transactionDate = randomDate(12);
      const sourceBankAccount = randomElement(bankAccounts);

      await prisma.movement.create({
        data: {
          areaId: area.id,
          departmentId: department.id,
          userId: adminUser.id,
          sourceBankAccountId: sourceBankAccount.id,
          type: 'EXPENSE',
          status: 'APPROVED',
          amount,
          currency: 'EUR',
          category,
          description,
          transactionDate,
          approvedBy: adminUser.id,
          approvedAt: transactionDate,
        },
      });

      created++;
      if (created % 50 === 0) {
        console.log(`      ✅ Created ${created}/${TARGET_MOVEMENTS} movements...`);
      }
    }

    // Create income
    console.log(`   📥 Creating ${incomeCount} income movements...`);
    for (let i = 0; i < incomeCount; i++) {
      const area = randomElement(areas);
      const department = randomElement(area.departments);
      const category = randomElement(INCOME_CATEGORIES);
      const description = randomElement(INCOME_DESCRIPTIONS);
      // Income amounts are typically larger
      const amount = randomAmount(Math.random() > 0.5 ? 'xlarge' : 'large');
      const transactionDate = randomDate(12);
      const sourceBankAccount = randomElement(bankAccounts);

      await prisma.movement.create({
        data: {
          areaId: area.id,
          departmentId: department.id,
          userId: adminUser.id,
          sourceBankAccountId: sourceBankAccount.id,
          type: 'INCOME',
          status: 'APPROVED',
          amount,
          currency: 'EUR',
          category,
          description,
          transactionDate,
          approvedBy: adminUser.id,
          approvedAt: transactionDate,
        },
      });

      created++;
      if (created % 50 === 0) {
        console.log(`      ✅ Created ${created}/${TARGET_MOVEMENTS} movements...`);
      }
    }

    console.log(`   ✅ Total movements created: ${created}\n`);

    // Calculate totals
    console.log('📊 Summary:');
    const totalIncome = await prisma.movement.aggregate({
      where: { type: 'INCOME', status: 'APPROVED' },
      _sum: { amount: true },
    });
    const totalExpenses = await prisma.movement.aggregate({
      where: { type: 'EXPENSE', status: 'APPROVED' },
      _sum: { amount: true },
    });

    const incomeEur = (totalIncome._sum.amount || 0) / 100;
    const expensesEur = (totalExpenses._sum.amount || 0) / 100;
    const balance = incomeEur - expensesEur;

    console.log(`   • Total Income: €${incomeEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`);
    console.log(`   • Total Expenses: €${expensesEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`);
    console.log(`   • Balance: €${balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`);
    console.log(`   • Date Range: Last 12 months`);
    console.log(`   • Status: All approved\n`);

    console.log('🎉 Test data generation completed successfully!');
    console.log('💡 You can now test:');
    console.log('   • Dashboard charts and metrics');
    console.log('   • Reports and exports');
    console.log('   • Filtering and search');
    console.log('   • Area/department balances\n');

  } catch (error) {
    console.error('❌ Error during test data generation:', error);
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
