import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database Seeding Script
 * Creates default roles and permissions for the YL Portal RBAC system
 *
 * Run with: pnpm prisma db seed
 */

async function main() {
  console.log('🌱 Starting database seeding...');

  // ============================================
  // PERMISSIONS
  // ============================================

  console.log('📋 Creating permissions...');

  const permissions = [
    // Movement permissions
    { resource: 'movement', action: 'create', description: 'Create new financial movements' },
    { resource: 'movement', action: 'read', description: 'View financial movements' },
    { resource: 'movement', action: 'update', description: 'Edit financial movements' },
    { resource: 'movement', action: 'delete', description: 'Delete financial movements' },
    { resource: 'movement', action: 'approve', description: 'Approve financial movements' },
    { resource: 'movement', action: 'reject', description: 'Reject financial movements' },

    // Area permissions
    { resource: 'area', action: 'create', description: 'Create new areas' },
    { resource: 'area', action: 'read', description: 'View areas' },
    { resource: 'area', action: 'update', description: 'Edit area details' },
    { resource: 'area', action: 'delete', description: 'Delete areas' },
    { resource: 'area', action: 'manage_users', description: 'Assign/remove users from areas' },

    // Department permissions
    { resource: 'department', action: 'create', description: 'Create departments in areas' },
    { resource: 'department', action: 'read', description: 'View departments' },
    { resource: 'department', action: 'update', description: 'Edit department details' },
    { resource: 'department', action: 'delete', description: 'Delete departments' },

    // User permissions
    { resource: 'user', action: 'create', description: 'Create new users' },
    { resource: 'user', action: 'read', description: 'View user details' },
    { resource: 'user', action: 'update', description: 'Edit user details' },
    { resource: 'user', action: 'delete', description: 'Delete users' },
    { resource: 'user', action: 'manage_roles', description: 'Assign roles to users' },

    // Report permissions
    { resource: 'report', action: 'read', description: 'View financial reports' },
    { resource: 'report', action: 'export', description: 'Export financial reports' },

    // Audit log permissions
    { resource: 'audit', action: 'read', description: 'View audit logs' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // ============================================
  // ROLES
  // ============================================

  console.log('👥 Creating roles...');

  // 1. Area Viewer Role
  const viewerRole = await prisma.role.upsert({
    where: { name: 'Area Viewer' },
    update: {},
    create: {
      name: 'Area Viewer',
      description: 'Can view movements and reports in assigned areas',
    },
  });

  // Assign viewer permissions
  const viewerPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'movement', action: 'read' },
        { resource: 'area', action: 'read' },
        { resource: 'department', action: 'read' },
        { resource: 'report', action: 'read' },
      ],
    },
  });

  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: viewerRole.id,
        permissionId: permission.id,
        conditions: null,
      },
    });
  }

  console.log(`✅ Created role: ${viewerRole.name}`);

  // 2. Area Manager Role
  const managerRole = await prisma.role.upsert({
    where: { name: 'Area Manager' },
    update: {},
    create: {
      name: 'Area Manager',
      description: 'Can manage movements, approve/reject, and view reports in assigned areas',
    },
  });

  // Assign manager permissions
  const managerPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'movement' }, // All movement actions
        { resource: 'area', action: 'read' },
        { resource: 'department', action: 'read' },
        { resource: 'department', action: 'create' },
        { resource: 'department', action: 'update' },
        { resource: 'report', action: 'read' },
        { resource: 'report', action: 'export' },
      ],
    },
  });

  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: managerRole.id,
        permissionId: permission.id,
        conditions: null,
      },
    });
  }

  console.log(`✅ Created role: ${managerRole.name}`);

  // 3. Area Administrator Role
  const areaAdminRole = await prisma.role.upsert({
    where: { name: 'Area Administrator' },
    update: {},
    create: {
      name: 'Area Administrator',
      description: 'Full control over assigned areas including user management',
    },
  });

  // Assign area admin permissions (everything except global admin actions)
  const areaAdminPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'movement' },
        { resource: 'area' },
        { resource: 'department' },
        { resource: 'report' },
        { resource: 'audit', action: 'read' },
      ],
    },
  });

  for (const permission of areaAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: areaAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: areaAdminRole.id,
        permissionId: permission.id,
        conditions: null,
      },
    });
  }

  console.log(`✅ Created role: ${areaAdminRole.name}`);

  // 4. Default Role (for backward compatibility)
  const defaultRole = await prisma.role.upsert({
    where: { name: 'Default' },
    update: {},
    create: {
      name: 'Default',
      description: 'Default role for area access (same as Area Manager)',
    },
  });

  // Default role gets same permissions as Manager
  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: defaultRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: defaultRole.id,
        permissionId: permission.id,
        conditions: null,
      },
    });
  }

  console.log(`✅ Created role: ${defaultRole.name}`);

  // ============================================
  // SUMMARY
  // ============================================

  const roleCount = await prisma.role.count();
  const permissionCount = await prisma.permission.count();
  const rolePermissionCount = await prisma.rolePermission.count();

  console.log('\n📊 Seeding Summary:');
  console.log(`   Roles: ${roleCount}`);
  console.log(`   Permissions: ${permissionCount}`);
  console.log(`   Role-Permission Mappings: ${rolePermissionCount}`);
  console.log('\n✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
