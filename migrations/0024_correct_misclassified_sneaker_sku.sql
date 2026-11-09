-- Correct the verified SKU on sneaker sample #113. The title/category guard
-- prevents touching any unrelated legacy product; the uniqueness guard keeps
-- an existing SD-SN113 record intact if the catalog has already been repaired.
UPDATE products
SET sku = 'SD-SN113', sku_verified = 1
WHERE upper(sku) = 'SD-GL062'
  AND lower(category) IN ('sneakers', 'sneaker')
  AND title LIKE '%#113%'
  AND NOT EXISTS (
    SELECT 1 FROM products WHERE upper(sku) = 'SD-SN113'
  );
