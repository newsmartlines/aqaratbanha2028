-- User preferred location (optional)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "region_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_region_id_regions_id_fk'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_region_id_regions_id_fk"
      FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_city_id_cities_id_fk'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk"
      FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL;
  END IF;
END $$;
