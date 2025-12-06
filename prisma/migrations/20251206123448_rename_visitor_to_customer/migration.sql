-- Rename VISITOR to CUSTOMER in MemberRole enum
-- PostgreSQL requires a workaround to rename enum values

-- Step 1: Create new enum type with CUSTOMER instead of VISITOR
CREATE TYPE "MemberRole_new" AS ENUM ('ADMIN', 'MEMBER', 'CUSTOMER');

-- Step 2: Drop the default value on the column first
ALTER TABLE "members" ALTER COLUMN "role" DROP DEFAULT;

-- Step 3: Update the column to use the new enum type
ALTER TABLE "members"
  ALTER COLUMN "role" TYPE "MemberRole_new"
  USING (
    CASE
      WHEN "role"::text = 'VISITOR' THEN 'CUSTOMER'::"MemberRole_new"
      ELSE "role"::text::"MemberRole_new"
    END
  );

-- Step 4: Drop the old enum type
DROP TYPE "MemberRole";

-- Step 5: Rename the new enum type to the original name
ALTER TYPE "MemberRole_new" RENAME TO "MemberRole";

-- Step 6: Restore the default value
ALTER TABLE "members" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"MemberRole";
