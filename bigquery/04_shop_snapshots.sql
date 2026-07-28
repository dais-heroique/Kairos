CREATE TABLE IF NOT EXISTS `kairos.shop_snapshots` (
  shop_id STRING NOT NULL,
  captured_date DATE NOT NULL,
  product_count INT64 NOT NULL,
  est_gmv FLOAT64 NOT NULL,
  ratings FLOAT64 NOT NULL
)
PARTITION BY captured_date
CLUSTER BY shop_id;
