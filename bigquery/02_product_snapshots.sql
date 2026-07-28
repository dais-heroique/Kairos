-- Une ligne par produit par jour. Entrée unique du moteur packages/core/verdict
-- (voir packages/shared/src/snapshot.ts pour le type miroir côté TS).
CREATE TABLE IF NOT EXISTS `kairos.product_snapshots` (
  product_id STRING NOT NULL,
  captured_date DATE NOT NULL,
  price_cents INT64 NOT NULL,
  review_count INT64 NOT NULL,
  rating_avg FLOAT64 NOT NULL,
  active_creator_count INT64 NOT NULL,
  video_count INT64 NOT NULL,
  competing_shop_count INT64 NOT NULL,
  est_sales_low FLOAT64 NOT NULL,
  est_sales_high FLOAT64 NOT NULL,
  confidence FLOAT64 NOT NULL
)
PARTITION BY captured_date
CLUSTER BY product_id;
