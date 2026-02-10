DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'workflow'
      AND table_name = 'OutboxEvent'
      AND column_name = 'lockedUntil'
  ) THEN
    ALTER TABLE "workflow"."OutboxEvent"
      ALTER COLUMN "lockedUntil" TYPE TIMESTAMP(3);
  END IF;
END $$;
