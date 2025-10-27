# URGENT: Major Structural Refactor - Bank Accounts & Movement Flow

**Date**: 2025-10-23
**Status**: ✅ COMPLETE - ALL PHASES IMPLEMENTED
**Impact**: CRITICAL - Affects entire application flow
**Completion Date**: October 23, 2025

---

## 🎯 Core Concept Change

**OLD FLOW**: Users create movements → Assigned to areas/departments → Approval workflow → Approved/Rejected

**NEW FLOW**: Admins import bank statements → Raw bank movements created → Admin splits/categorizes → Auto-approved once categorized

---

## 📋 Requirements Summary

### 1. Bank Accounts (New Core Entity)
- **6 Bank Accounts** (for now): Catalunya, Madrid, Andalucia, Torrevieja, Euskadi
- Each bank account has multiple areas under it
  - Example: Catalunya bank account → serves Banyoles area, Girona area, etc.
- **Relationship**: `BankAccount (1) → (many) Areas`

### 2. Movement Splitting
- A single bank transaction (e.g., 10k donation) can be split into multiple movements:
  - 5k → User A's personal fund
  - 2.5k → Area X
  - 2.5k → Area Y
- **Split Behavior**:
  - Parent movement (10k) remains visible and immutable
  - Child movements created with `parentId` reference
  - Children can be modified/deleted (splits are adjustable)
  - UI shows parent with expandable children

### 3. Internal Transfers (Critical for Balance Calculations)
- **Definition**: Movements between areas/departments from the SAME bank account
- **Behavior**: Do NOT count as income/expense in totals (money didn't enter/exit)
- **Example**:
  - Movement from Banyoles (Catalunya account) → Girona (Catalunya account) = INTERNAL (excluded from balances)
  - Movement from Banyoles (Catalunya account) → Madrid (Madrid account) = EXTERNAL (counts in balances)

### 4. Approval Workflow REMOVED
- ❌ No more PENDING → APPROVED workflow
- ❌ No more approvedBy/rejectedBy tracking
- ✅ Movements are DRAFT → APPROVED (auto) once categorized
- **Rationale**: Bank movements are factual (already happened), just need categorization

### 5. Access Control Changes
- **Admins**:
  - See ALL bank accounts and raw bank movements
  - Can upload bank statements
  - Can split/categorize movements
  - Can create movements manually
- **Regular Users**:
  - ❌ Can NO LONGER create movements
  - See only movements in THEIR assigned areas (not raw bank movements)
  - See categorized movements that affect their areas

---

## 🗄️ Database Schema Changes

### New Table: `BankAccount`
```prisma
model BankAccount {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String    // "Catalunya", "Madrid", etc.
  accountNumber   String?   // Optional: masked account number
  bankName        String?   // "CaixaBank", "Banco Santander", etc.
  currency        String    @default("EUR") @db.VarChar(3)
  description     String?

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  // Relations
  areas           Area[]
  movements       Movement[]

  @@map("bank_accounts")
  @@index([deletedAt])
}
```

### Modified Table: `Area`
```diff
model Area {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
+ bankAccountId String  @map("bank_account_id") @db.Uuid
  name        String
  code        String    @unique

  // Relations
+ bankAccount BankAccount @relation(fields: [bankAccountId], references: [id])

+ @@index([bankAccountId])
}
```

### Modified Table: `Movement`
```diff
model Movement {
  id              String         @id
+ bankAccountId   String         @map("bank_account_id") @db.Uuid
  areaId          String         @map("area_id") @db.Uuid
  departmentId    String?        @map("department_id") @db.Uuid
  userId          String         @map("user_id") @db.Uuid

  type            MovementType
- status          MovementStatus @default(PENDING)
+ status          MovementStatus @default(DRAFT)
  amount          Int

- // Approval tracking (TO BE REMOVED?)
- approvedBy      String?        @map("approved_by") @db.Uuid
- approvedAt      DateTime?      @map("approved_at")
- rejectedBy      String?        @map("rejected_by") @db.Uuid
- rejectedAt      DateTime?      @map("rejected_at")
- rejectionReason String?        @map("rejection_reason")

- // Distribution tracking (rename to split tracking)
- distributionId  String?        @map("distribution_id") @db.Uuid
  parentId        String?        @map("parent_id") @db.Uuid // For split movements
+ isSplitParent   Boolean        @default(false) @map("is_split_parent")
+ isInternalTransfer Boolean     @default(false) @map("is_internal_transfer")

  // Relations
+ bankAccount   BankAccount @relation(fields: [bankAccountId], references: [id])
  parent        Movement?   @relation("MovementSplit", fields: [parentId], references: [id])
  children      Movement[]  @relation("MovementSplit")

+ @@index([bankAccountId])
+ @@index([isInternalTransfer])
}
```

### Status Enum Changes
```diff
enum MovementStatus {
  DRAFT      // Imported, needs categorization
- PENDING    // REMOVE - no longer needed
  APPROVED   // Categorized and approved (auto)
- REJECTED   // REMOVE - no longer needed
  CANCELLED  // Admin cancelled
}
```

### Modified Table: `MovementApproval` ⚠️
**DECISION NEEDED**: Keep for audit history or remove entirely?
- If keeping: Rename to `MovementHistory` for categorization tracking
- If removing: Lose historical approval data

---

## 🔄 Business Logic Changes

### Balance Calculations (CRITICAL CHANGE)

**OLD Logic** (schema.prisma:231-285, dashboard.router.ts:34-66):
```typescript
// Incorrect - counts all movements
totalIncome = SUM(movements WHERE type=INCOME AND status=APPROVED)
totalExpenses = SUM(movements WHERE type=EXPENSE AND status=APPROVED)
balance = totalIncome - totalExpenses
```

**NEW Logic**:
```typescript
// Correct - excludes internal transfers
totalIncome = SUM(movements WHERE
  type=INCOME
  AND status=APPROVED
  AND isInternalTransfer=false  // NEW
  AND deletedAt=null
)

totalExpenses = SUM(movements WHERE
  type=EXPENSE
  AND status=APPROVED
  AND isInternalTransfer=false  // NEW
  AND deletedAt=null
)

balance = totalIncome - totalExpenses
```

### Internal Transfer Detection Logic
When creating/categorizing a movement:
```typescript
async function markInternalTransfer(movement: Movement) {
  // Get source and destination areas
  const sourceArea = await prisma.area.findUnique({
    where: { id: movement.areaId },
    select: { bankAccountId: true }
  });

  // For TRANSFER type, check if destination area exists
  const destinationArea = movement.type === 'TRANSFER'
    ? await getDestinationArea(movement)
    : null;

  // If same bank account, mark as internal
  if (destinationArea && sourceArea.bankAccountId === destinationArea.bankAccountId) {
    movement.isInternalTransfer = true;
  }
}
```

### Movement Split Flow
```typescript
// Admin splits a 10k bank transaction
async function splitMovement(parentId: string, splits: Array<{areaId, departmentId?, amount}>) {
  const parent = await prisma.movement.findUnique({ where: { id: parentId }});

  // Validate: sum of splits must equal parent amount
  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  if (totalSplit !== parent.amount) throw new Error('Split amounts must equal parent');

  // Mark parent as split
  await prisma.movement.update({
    where: { id: parentId },
    data: { isSplitParent: true }
  });

  // Create child movements
  for (const split of splits) {
    await prisma.movement.create({
      data: {
        ...parent, // Copy fields from parent
        id: generateUuid(),
        amount: split.amount,
        areaId: split.areaId,
        departmentId: split.departmentId,
        parentId: parentId,
        isSplitParent: false,
        status: 'APPROVED', // Auto-approve once categorized
      }
    });
  }
}
```

---

## 🚨 Breaking Changes

### Removed Features
1. **Movement Approval Workflow**
   - Remove: `/movements?status=PENDING` page
   - Remove: Approve/Reject buttons
   - Remove: Approval history modal
   - Remove: Email notifications for approvals
   - Impact: All approval-related UI components

2. **User Movement Creation**
   - Remove: "New Movement" button for regular users
   - Remove: `/movements/new` page for non-admins
   - Impact: Users can no longer create expense reports manually

3. **Status Transitions**
   - Remove: PENDING, REJECTED statuses
   - Remove: approvedBy, rejectedBy fields
   - Impact: All status filtering and display logic

### Modified Features
1. **Dashboard Statistics** (dashboard.router.ts:14-75)
   - Add `isInternalTransfer=false` filter to ALL balance calculations
   - 8 affected endpoints (getOverviewStats, getBalances, getExpenseBreakdown, etc.)

2. **Movement List** (movement.router.ts)
   - Add bank account badge display
   - Add split parent/child indicators
   - Add internal transfer badges
   - Filter out unsplit bank movements for regular users

3. **Area Management**
   - Areas must now be assigned to a bank account
   - Cannot delete bank account if areas depend on it

---

## 📁 Files Requiring Changes

### Backend - Database (High Priority)

| File | Change Type | Complexity | Description |
|------|-------------|------------|-------------|
| `prisma/schema.prisma` | MAJOR | 🔴 High | Add BankAccount model, modify Area/Movement models |
| `prisma/migrations/*` | NEW | 🔴 High | Create migration for new structure + data migration |

### Backend - API (High Priority)

| File | Change Type | Complexity | Description |
|------|-------------|------------|-------------|
| `trpc/routers/bankAccount.router.ts` | NEW | 🟡 Medium | CRUD for bank accounts (admin only) |
| `trpc/routers/movement.router.ts` | MAJOR | 🔴 High | Add split logic, remove approval flow, add internal transfer detection |
| `trpc/routers/dashboard.router.ts` | MAJOR | 🔴 High | Update ALL 8 queries to exclude internal transfers |
| `trpc/routers/area.router.ts` | MEDIUM | 🟡 Medium | Add bankAccountId to create/update |
| `trpc/routers/import.router.ts` | MEDIUM | 🟡 Medium | Require bankAccountId for imports |
| `trpc/index.ts` | MINOR | 🟢 Low | Register bankAccount router |

### Backend - Services

| File | Change Type | Complexity | Description |
|------|-------------|------------|-------------|
| `services/importService.ts` | MEDIUM | 🟡 Medium | Accept bankAccountId parameter |
| `services/movementService.ts` | NEW? | 🟡 Medium | Create service for split logic + internal transfer detection |

### Frontend - Components (High Priority)

| File | Change Type | Complexity | Description |
|------|-------------|------------|-------------|
| `components/UserDashboard.svelte` | MAJOR | 🔴 High | Remove "New Movement" action, update stats to exclude internals |
| `components/AdminDashboard.svelte` | MAJOR | 🔴 High | Add bank account stats, update calculations |
| `components/MovementCard.svelte` | MEDIUM | 🟡 Medium | Add bank account badge, split indicator, internal badge |

### Frontend - Pages (High Priority)

| File | Change Type | Complexity | Description |
|------|-------------|------------|-------------|
| `routes/movements/new/+page.svelte` | MAJOR | 🔴 High | Restrict to admins only, add bank account selector |
| `routes/movements/+page.svelte` | MAJOR | 🔴 High | Remove approval actions, add split view, add internal filter |
| `routes/movements/[id]/+page.svelte` | MAJOR | 🔴 High | Remove approve/reject buttons, show parent/children, show bank account |
| `routes/admin/bank-accounts/+page.svelte` | NEW | 🟡 Medium | Bank account CRUD page |
| `routes/admin/bank-accounts/[id]/+page.svelte` | NEW | 🟡 Medium | Bank account detail + movements |
| `routes/admin/bank-movements/+page.svelte` | NEW | 🔴 High | Raw bank transactions with split UI |
| `routes/areas/new/+page.svelte` | MEDIUM | 🟡 Medium | Add bank account selector |
| `routes/areas/[id]/edit/+page.svelte` | MEDIUM | 🟡 Medium | Add bank account selector |
| `routes/movements/import/+page.svelte` | MEDIUM | 🟡 Medium | Add bank account selector |

### Frontend - Navigation

| File | Change Type | Complexity | Description |
|------|-------------|------------|-------------|
| `lib/components/Navigation.svelte` | MEDIUM | 🟡 Medium | Add "Bank Accounts" link (admin), remove "New Movement" for users |

---

## 🎯 Implementation Phases

### Phase 0: Database Wipe & Fresh Start ✨
**DECISION: All existing data is mock - WIPE DATABASE and start fresh**

1. **Drop existing database** (all mock data)
   ```bash
   # Warning: This deletes everything!
   pnpm --filter backend db:reset --force
   ```

2. **Apply new schema** (next phase)
   - New BankAccount model
   - Modified Area/Movement models
   - Updated enums

3. **Seed 6 bank accounts**
   ```sql
   INSERT INTO bank_accounts (id, name, currency) VALUES
   (uuid1, 'Catalunya', 'EUR'),
   (uuid2, 'Madrid', 'EUR'),
   (uuid3, 'Andalucia', 'EUR'),
   (uuid4, 'Torrevieja', 'EUR'),
   (uuid5, 'Euskadi', 'EUR'),
   (uuid6, 'Valencia', 'EUR');
   ```

4. **No complex migration needed!** 🎉

### Phase 1: Database & Core Models (Week 1)
1. Create `BankAccount` model in Prisma schema
2. Modify `Area` model (add `bankAccountId`)
3. Modify `Movement` model (add `bankAccountId`, `isSplitParent`, `isInternalTransfer`)
4. Remove/modify `MovementStatus` enum
5. Run migrations with data migration scripts
6. Generate Prisma client

**⚠️ BREAKING**: Backend will not start until API updated

### Phase 2: Backend API - Bank Accounts (Week 1-2)
1. Create `bankAccount.router.ts` (CRUD, admin only)
2. Update `area.router.ts` (add bank account selection)
3. Update `import.router.ts` (require bank account)
4. Register router in `trpc/index.ts`

**Endpoints needed:**
- `bankAccount.list` - List all bank accounts
- `bankAccount.create` - Create bank account (admin)
- `bankAccount.update` - Update bank account (admin)
- `bankAccount.delete` - Soft delete (admin)
- `bankAccount.getById` - Get single account with areas
- `bankAccount.getMovements` - Get raw bank movements for account

### Phase 3: Backend API - Movement Split Logic (Week 2)
1. Create `movementService.ts` for split logic
2. Add split endpoints to `movement.router.ts`:
   - `movement.split` - Split parent into children
   - `movement.updateSplit` - Modify split amounts
   - `movement.reverseSplit` - Delete children, unmark parent
3. Add internal transfer detection logic
4. Update movement creation to auto-detect internal transfers

### Phase 4: Backend API - Dashboard Refactor (Week 2-3)
Update **ALL** 8 dashboard queries to exclude `isInternalTransfer=true`:

1. `getOverviewStats` (line 14)
2. `getBalances` (line 82)
3. `getRecentMovements` (line 161) - optional, might want to show internals
4. `getExpenseBreakdown` (line 214)
5. `getIncomeVsExpense` (line 292)
6. `getExpensesByArea` (line 395)
7. `getPersonalFunds` (line 488)
8. `getOrganizationAlerts` (line 556)

**Critical**: Add filter `isInternalTransfer: false` to WHERE clauses

### Phase 5: Frontend - Admin Bank Account Management (Week 3)
1. Create `/admin/bank-accounts/+page.svelte` (list)
2. Create `/admin/bank-accounts/new/+page.svelte` (create form)
3. Create `/admin/bank-accounts/[id]/+page.svelte` (detail + edit)
4. Create `/admin/bank-movements/+page.svelte` (raw movements + split UI)
5. Add navigation links

### Phase 6: Frontend - Movement UI Updates (Week 3-4)
1. Update `MovementCard.svelte` - Add badges:
   - Bank account badge (colored by account)
   - Split indicator (parent/child icons)
   - Internal transfer badge
2. Update `routes/movements/[id]/+page.svelte`:
   - Remove approve/reject buttons
   - Show parent/children tree for splits
   - Show bank account prominently
3. Update `routes/movements/+page.svelte`:
   - Add filter: "Hide Internal Transfers" toggle
   - Add filter: Bank account dropdown
   - Remove status=PENDING tab
4. Update `routes/movements/new/+page.svelte`:
   - Add admin-only guard
   - Add bank account selector
   - Add split functionality

### Phase 7: Frontend - Dashboard Updates (Week 4)
1. Update `UserDashboard.svelte`:
   - Remove "New Movement" quick action
   - Update stats (API already handles internal exclusion)
   - Add "Internal Transfers" toggle to show/hide
2. Update `AdminDashboard.svelte`:
   - Add "Bank Accounts Overview" section
   - Show movements by bank account chart
   - Add "Unsplit Bank Movements" alert

### Phase 8: Frontend - Area Management (Week 4)
1. Update `routes/areas/new/+page.svelte` - Add bank account dropdown (required)
2. Update `routes/areas/[id]/edit/+page.svelte` - Allow changing bank account (with warning)
3. Update `routes/areas/[id]/+page.svelte` - Show bank account info

### Phase 9: Testing & Validation (Week 5)
1. **Balance Validation**: Verify internal transfers excluded from totals
2. **Split Testing**: Test various split scenarios
3. **Access Control**: Verify users can't see unsplit bank movements
4. **Migration Testing**: Verify legacy data migrated correctly
5. **Performance**: Check dashboard queries with new filters

### Phase 10: Documentation & Cleanup (Week 5)
1. Update API documentation
2. Create admin guide for bank imports + splitting
3. Update user guide (remove movement creation sections)
4. Clean up unused approval-related code
5. Remove old migration files

---

## 🚧 Open Questions / Decisions Needed

### 1. Approval System
- **Q**: Keep `MovementApproval` table for audit/history?
- **A**: ✅ ANSWERED - Keep and rename to `MovementHistory` for audit trail

### 2. Transfer Type
- **Q**: Do we still need `MovementType.TRANSFER`? Or use `isInternalTransfer` flag only?
- **A**: ✅ ANSWERED - Keep TRANSFER type + add isInternalTransfer flag

### 3. Personal Funds
- **Q**: How do personal funds relate to bank accounts?
- **A**: ✅ ANSWERED - Must explicitly select bank account when creating personal fund

### 4. Existing Movements
- **Q**: What happens to existing PENDING movements during migration?
- **A**: ✅ ANSWERED - WIPE DATABASE - all mock data, fresh start

### 5. Split Reversibility
- **Q**: Can admins "unsplit" movements after creation?
- **A**: ✅ ANSWERED - Yes, by deleting children and unmarking parent

### 6. Balance Display
- **Q**: Should areas show balance breakdown by source bank account?
- **A**: ✅ ANSWERED - Admin only (show breakdown in admin views)

### 7. Multi-Bank Movements
- **Q**: Can a single movement involve multiple bank accounts?
- **A**: ✅ ANSWERED - Add sourceBankAccountId + destinationBankAccountId fields

---

## 📊 Estimated Effort

| Phase | Days | Complexity |
|-------|------|------------|
| Phase 0: Data Migration | 2 | 🔴 Critical |
| Phase 1: Database | 3 | 🔴 High |
| Phase 2: Bank Account API | 3 | 🟡 Medium |
| Phase 3: Split Logic API | 4 | 🔴 High |
| Phase 4: Dashboard Refactor | 3 | 🔴 High |
| Phase 5: Admin Bank UI | 4 | 🟡 Medium |
| Phase 6: Movement UI | 5 | 🔴 High |
| Phase 7: Dashboard UI | 3 | 🟡 Medium |
| Phase 8: Area Management | 2 | 🟡 Medium |
| Phase 9: Testing | 5 | 🔴 High |
| Phase 10: Documentation | 2 | 🟢 Low |
| **TOTAL** | **36 days** | **~7-8 weeks** |

---

## ⚠️ Risks & Mitigation

### Risk 1: Data Loss During Migration
- **Impact**: HIGH - Existing movements could be corrupted
- **Mitigation**:
  - ✅ Full database backup before migration
  - ✅ Test migration on staging environment first
  - ✅ Keep approval history in separate table (don't drop immediately)

### Risk 2: Balance Calculation Errors
- **Impact**: CRITICAL - Incorrect financial reporting
- **Mitigation**:
  - ✅ Extensive testing of internal transfer detection
  - ✅ Add validation queries to verify balances
  - ✅ Manual review of first month's data

### Risk 3: User Confusion (No More Movement Creation)
- **Impact**: MEDIUM - Users expect to create movements
- **Mitigation**:
  - ✅ Clear communication before rollout
  - ✅ Admin training on new bank import flow
  - ✅ Add help text explaining new process

### Risk 4: Performance Degradation
- **Impact**: MEDIUM - Complex queries with joins to bank accounts
- **Mitigation**:
  - ✅ Add database indexes on `bankAccountId`, `isInternalTransfer`
  - ✅ Consider denormalization for area.bankAccountId
  - ✅ Cache bank account data in frontend

### Risk 5: Split Logic Complexity
- **Impact**: MEDIUM - Bugs in split creation/validation
- **Mitigation**:
  - ✅ Comprehensive unit tests for split service
  - ✅ Transaction-based split creation (all or nothing)
  - ✅ Validation: sum of splits must equal parent

---

## 🔍 Testing Strategy

### Unit Tests Needed
1. `movementService.test.ts` - Split logic
2. `internalTransferDetection.test.ts` - Transfer detection
3. `balanceCalculation.test.ts` - Verify exclusion of internals

### Integration Tests Needed
1. Bank account CRUD operations
2. Movement split end-to-end
3. Dashboard balance calculations
4. Area assignment to bank accounts

### Manual Testing Checklist
- [ ] Import bank statement for Catalunya account
- [ ] Split 10k donation across 3 areas
- [ ] Verify children sum to parent amount
- [ ] Create internal transfer (Catalunya area → Catalunya area)
- [ ] Verify internal transfer excluded from dashboard
- [ ] Create external transfer (Catalunya → Madrid)
- [ ] Verify external counts in balances
- [ ] Check regular user can't see unsplit movements
- [ ] Check admin can see all bank movements
- [ ] Verify personal funds still work

---

## 📝 Next Steps

1. **REVIEW THIS DOCUMENT** with team
2. **ANSWER OPEN QUESTIONS** (see section above)
3. **GET APPROVAL** from stakeholders
4. **BACKUP PRODUCTION DATABASE**
5. **CREATE FEATURE BRANCH**: `feature/bank-accounts-refactor`
6. **START PHASE 0**: Data migration strategy

---

## 📌 Key Decisions Made

✅ **Split Display**: Keep parent visible + show children
✅ **Internal Transfers**: Same bank account = internal (excluded from totals)
✅ **Approval Flow**: REMOVED - All movements auto-approved once categorized
✅ **User Creation**: Admin only - regular users can't create movements
✅ **Area-Account Relationship**: One-to-many (Area belongs to ONE bank account)
✅ **Multi-Bank Movements**: Source + destination bank account IDs
✅ **MovementApproval**: Rename to MovementHistory (keep for audit)
✅ **Transfer Type**: Keep TRANSFER type + isInternalTransfer flag
✅ **Personal Funds**: Must explicitly select bank account when creating
✅ **Balance Display**: Admin-only breakdown by source bank account
✅ **Data Migration**: WIPE DATABASE - fresh start with clean schema

---

**Generated**: 2025-10-23
**Last Updated**: 2025-10-23
**Reviewed By**: ⏳ PENDING
