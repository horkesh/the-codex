-- Backfill city/country/country_code on entries that have a location matching a saved place
UPDATE entries e
SET
  city = l.city,
  country = l.country,
  country_code = l.country_code
FROM locations l
WHERE e.location IS NOT NULL
  AND e.city IS NULL
  AND LOWER(TRIM(e.location)) = LOWER(TRIM(l.name));
