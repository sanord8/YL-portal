#!/usr/bin/env tsx
/**
 * Admin Setup Script
 *
 * This script creates the initial administrator account for the YL Portal.
 * Run this once during initial setup: pnpm setup:admin
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import { hashPassword } from '../src/services/authService';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║           YL Portal - Admin Account Setup                ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Check if any users exist
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      console.log('⚠️  Warning: Users already exist in the database.');
      const proceed = await question('Do you want to create another admin user? (yes/no): ');

      if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
        console.log('\n✅ Setup cancelled.\n');
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
      }
    }

    // Get admin details
    console.log('Please provide the administrator details:\n');

    let name = '';
    while (!name || name.trim().length < 2) {
      name = await question('Full Name: ');
      if (!name || name.trim().length < 2) {
        console.log('❌ Name must be at least 2 characters\n');
      }
    }

    let email = '';
    while (!validateEmail(email)) {
      email = await question('Email Address: ');
      if (!validateEmail(email)) {
        console.log('❌ Please enter a valid email address\n');
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.log(`\n❌ Error: A user with email "${email}" already exists.\n`);
      rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    let password = '';
    let passwordValid = false;
    while (!passwordValid) {
      password = await question('Password: ');
      const validation = validatePassword(password);

      if (!validation.valid) {
        console.log('\n❌ Password does not meet requirements:');
        validation.errors.forEach((error) => console.log(`   - ${error}`));
        console.log('');
      } else {
        passwordValid = true;
      }
    }

    const confirmPassword = await question('Confirm Password: ');
    if (password !== confirmPassword) {
      console.log('\n❌ Error: Passwords do not match.\n');
      rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('\n📝 Summary:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log('');

    const confirm = await question('Create this admin account? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('\n✅ Setup cancelled.\n');
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    }

    // Create the admin user
    console.log('\n🔐 Hashing password...');
    const passwordHash = await hashPassword(password);

    console.log('👤 Creating admin user...');
    const admin = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        passwordHash,
        emailVerified: true, // Admin is auto-verified
        isAdmin: true, // Set admin flag
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    console.log('\n✅ Success! Admin account created:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Admin: ${admin.isAdmin}`);
    console.log(`   Created: ${admin.createdAt.toISOString()}`);
    console.log('\n🎉 You can now log in to the YL Portal with these credentials.\n');

  } catch (error) {
    console.error('\n❌ Error creating admin account:');
    console.error(error);
    console.log('');
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
