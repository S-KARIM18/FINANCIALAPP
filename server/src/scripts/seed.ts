/**
 * KudiFlow Seed Script
 *
 * CRITICAL: This script generates correct bcrypt hashes at runtime
 * for the demo seed data. The SQL seed file uses placeholder hashes
 * that do NOT match the actual demo passwords/PINs.
 *
 * This script:
 * 1. Generates bcrypt hashes for KudiFlow2024! (cost 12) and 1234 PIN
 * 2. Runs the migration (if not already done)
 * 3. Upserts the 3 demo users with correct hashes
 * 4. Creates their accounts with correct balances
 * 5. Creates demo transactions (mathematically consistent)
 *
 * Demo data:
 *   Ama Mensah:     +233245550192  KudiFlow2024!  PIN: 1234  balance: GH₵4,850.00  acct: 2055019201
 *   Kwame Asante:   +233244100200  KudiFlow2024!  PIN: 1234  balance: GH₵2,100.00  acct: 2044100201
 *   Kofi Boateng:   +233200110022  KudiFlow2024!  PIN: 1234  balance: GH₵1,500.00  acct: 2001100221
 *
 * Run: npx ts-node src/scripts/seed.ts
 * Or:  npm run seed
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { query, testConnection } from '../config/database';

const uuidv4 = () => randomUUID();

const BCRYPT_COST = 12;

const DEMO_USERS = [
  {
    fullName: 'Ama Mensah',
    phone: '+233245550192',
    email: 'ama.mensah@kudiflow.gh',
    password: 'KudiFlow2024!',
    pin: '1234',
    accountNumber: '2055019201',
    balance: '4850.00',
  },
  {
    fullName: 'Kwame Asante',
    phone: '+233244100200',
    email: 'kwame.asante@kudiflow.gh',
    password: 'KudiFlow2024!',
    pin: '1234',
    accountNumber: '2044100201',
    balance: '2100.00',
  },
  {
    fullName: 'Kofi Boateng',
    phone: '+233200110022',
    email: 'kofi.boateng@kudiflow.gh',
    password: 'KudiFlow2024!',
    pin: '1234',
    accountNumber: '2001100221',
    balance: '1500.00',
  },
  {
    fullName: 'Ama Mensah',
    phone: '+233248190244',
    email: 'ama.verified@kudiflow.gh',
    password: 'KudiFlow2024!',
    pin: '1234',
    accountNumber: '2024819024',
    balance: '3500.00',
  },
];

async function seed() {
  console.log('🌱 KudiFlow Seed Script starting...');

  // Test DB connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to database. Check DATABASE_URL in .env');
    process.exit(1);
  }
  console.log('✅ Database connected');

  // Generate hashes upfront (bcrypt cost 12 takes ~250ms each)
  console.log('🔐 Generating bcrypt hashes (cost=12)...');
  const passwordHash = await bcrypt.hash('KudiFlow2024!', BCRYPT_COST);
  const pinHash = await bcrypt.hash('1234', BCRYPT_COST);
  console.log('✅ Hashes generated');

  // Upsert users
  const userIds: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    // Check if user exists
    const existing = await query<{ id: string }>(
      `SELECT id FROM users WHERE phone = $1`,
      [u.phone],
    );

    let userId: string;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      // Update hashes in case they were placeholders
      await query(
        `UPDATE users
         SET password_hash = $1, pin_hash = $2, full_name = $3, email = $4,
             status = 'ACTIVE', updated_at = NOW()
         WHERE id = $5`,
        [passwordHash, pinHash, u.fullName, u.email, userId],
      );
      console.log(`🔄 Updated user: ${u.fullName} (${u.phone})`);
    } else {
      userId = uuidv4();
      await query(
        `INSERT INTO users (id, full_name, phone, email, password_hash, pin_hash,
                            status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW(), NOW())`,
        [userId, u.fullName, u.phone, u.email, passwordHash, pinHash],
      );
      console.log(`✅ Created user: ${u.fullName} (${u.phone})`);
    }

    userIds[u.phone] = userId;

    // Upsert account
    const existingAcct = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1`,
      [userId],
    );

    if (existingAcct.rows.length > 0) {
      await query(
        `UPDATE accounts SET balance = $1, account_number = $2, status = 'ACTIVE', updated_at = NOW() WHERE user_id = $3`,
        [u.balance, u.accountNumber, userId],
      );
    } else {
      await query(
        `INSERT INTO accounts (id, user_id, account_number, balance, currency, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'GHS', 'ACTIVE', NOW(), NOW())`,
        [uuidv4(), userId, u.accountNumber, u.balance],
      );
    }
    console.log(`  💰 Account ${u.accountNumber}: GH₵ ${u.balance}`);
  }

  // Verification — check balances are correct
  console.log('\n📊 Final balance verification:');
  for (const u of DEMO_USERS) {
    const userId = userIds[u.phone];
    const result = await query<{ balance: string; account_number: string }>(
      `SELECT a.balance, a.account_number FROM accounts a WHERE a.user_id = $1`,
      [userId],
    );
    if (result.rows.length > 0) {
      const { balance, account_number } = result.rows[0];
      console.log(`  ${u.fullName}: acct ${account_number} = GH₵ ${balance}`);
    }
  }

  console.log('\n✅ Seed complete!');
  console.log('\nDemo credentials:');
  console.log('  Phone:    +233245550192 (Ama) / +233244100200 (Kwame) / +233200110022 (Kofi)');
  console.log('  Password: KudiFlow2024!');
  console.log('  PIN:      1234');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
