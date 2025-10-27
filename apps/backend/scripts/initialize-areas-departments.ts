/**
 * Initialize Areas and Departments
 *
 * This script:
 * 1. Clears all existing areas (CASCADE deletes departments, movements, etc.)
 * 2. Creates 12 standard areas for YoungLife Spain
 * 3. Creates 33 standard departments for each area (396 total)
 *
 * Run with: pnpm tsx scripts/initialize-areas-departments.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define all areas with their codes and names
const AREAS = [
  { code: '00', name: 'Nacional' },
  { code: '11', name: 'Catalunya' },
  { code: '12', name: 'Barcelona' },
  { code: '13', name: 'Banyoles' },
  { code: '14', name: 'Baix Llobregat' },
  { code: '20', name: 'Madrid' },
  { code: '21', name: 'Moral' },
  { code: '22', name: 'Guadarrama' },
  { code: '30', name: 'Euskadi' },
  { code: '40', name: 'Andalucía' },
  { code: '50', name: 'Camperplay' },
  { code: '60', name: 'Torrevieja' },
];

// Define all standard departments
const DEPARTMENTS = [
  { code: '01', name: 'Administración' },
  { code: '02', name: 'Programación' },
  { code: '03', name: 'Promocion' },
  { code: '04', name: 'Vehículos' },
  { code: '05', name: 'Gastos Director Nacional' },
  { code: '06', name: 'Oficina' },
  { code: '07', name: 'Centro Juvenil' },
  { code: '08', name: 'Retiro' },
  { code: '09', name: 'Retiro Staff' },
  { code: '10', name: 'Merchandising' },
  { code: '11', name: 'Patronato' },
  { code: '12', name: '2 % Obreros' },
  { code: '13', name: 'DGL' },
  { code: '14', name: 'Equipo de Acción' },
  { code: '20', name: 'Kedadas' },
  { code: '21', name: 'Becas' },
  { code: '22', name: 'Joventura' },
  { code: '23', name: 'YL USA CAMP' },
  { code: '24', name: 'Esquiada' },
  { code: '25', name: 'Wyldlife Camp' },
  { code: '26', name: 'Europe Camp' },
  { code: '27', name: 'Surf Camp' },
  { code: '28', name: 'Street Basket' },
  { code: '29', name: 'CamperCamp' },
  { code: '30', name: 'Factoría' },
  { code: '31', name: 'Spain Camp' },
  { code: '32', name: 'Capernaum' },
  { code: '33', name: 'University' },
];

async function main() {
  console.log('🚀 Starting Areas and Departments Initialization (Idempotent)...\n');

  try {
    // Step 1: Create/find all areas (idempotent)
    console.log('📍 Step 1: Creating/finding areas...');
    const processedAreas: { id: string; code: string; name: string; isNew: boolean }[] = [];

    for (const area of AREAS) {
      // Check if area already exists by code
      const existing = await prisma.area.findFirst({
        where: { code: area.code },
      });

      if (existing) {
        console.log(`   ⏭️  Skipped: ${area.code} - ${area.name} (already exists)`);
        processedAreas.push({ ...existing, isNew: false });
      } else {
        const created = await prisma.area.create({
          data: {
            code: area.code,
            name: area.name,
            description: `YoungLife ${area.name}`,
            currency: 'EUR',
          },
        });
        processedAreas.push({ ...created, isNew: true });
        console.log(`   ✅ Created area: ${area.code} - ${area.name}`);
      }
    }

    const newAreasCount = processedAreas.filter(a => a.isNew).length;
    const existingAreasCount = processedAreas.filter(a => !a.isNew).length;
    console.log(`   📊 Areas created: ${newAreasCount}, Already existed: ${existingAreasCount}\n`);

    // Step 2: Create departments for each area (idempotent)
    console.log('🏢 Step 2: Creating departments for each area...');
    let totalNewDepartments = 0;
    let totalSkippedDepartments = 0;

    for (const area of processedAreas) {
      console.log(`   📂 Processing departments for ${area.code} - ${area.name}...`);
      let areaNewDepts = 0;
      let areaSkippedDepts = 0;

      for (const dept of DEPARTMENTS) {
        // Check if department already exists (by area + code)
        const existing = await prisma.department.findFirst({
          where: {
            areaId: area.id,
            code: dept.code,
          },
        });

        if (existing) {
          areaSkippedDepts++;
          totalSkippedDepartments++;
        } else {
          await prisma.department.create({
            data: {
              areaId: area.id,
              code: dept.code,
              name: dept.name,
              description: null,
              userId: null, // Standard departments are not user-specific
            },
          });
          areaNewDepts++;
          totalNewDepartments++;
        }
      }

      if (areaNewDepts > 0) {
        console.log(`      ✅ Created ${areaNewDepts} new departments for ${area.name}`);
      }
      if (areaSkippedDepts > 0) {
        console.log(`      ⏭️  Skipped ${areaSkippedDepts} existing departments for ${area.name}`);
      }
    }

    console.log(`   📊 Departments created: ${totalNewDepartments}, Already existed: ${totalSkippedDepartments}\n`);

    // Step 3: Summary
    console.log('📊 Final Summary:');
    console.log(`   • Total areas in system: ${processedAreas.length}`);
    console.log(`   • New areas created: ${newAreasCount}`);
    console.log(`   • Existing areas found: ${existingAreasCount}`);
    console.log(`   • New departments created: ${totalNewDepartments}`);
    console.log(`   • Existing departments found: ${totalSkippedDepartments}`);
    console.log(`   • Currency: EUR (all areas)`);
    console.log(`   • Bank accounts: Link manually via admin panel\n`);

    console.log('🎉 Initialization completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Link areas to bank accounts via the admin panel');
    console.log('   2. Assign users to areas');
    console.log('   3. Create special funds departments for users if needed');
    console.log('   4. Start tracking movements!\n');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
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
