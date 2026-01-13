CREATE TABLE IF NOT EXISTS product_images (
  domain TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'auto')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_domain
  ON product_images (domain);
