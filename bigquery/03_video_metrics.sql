CREATE TABLE IF NOT EXISTS `kairos.video_metrics` (
  video_id STRING NOT NULL,
  product_id STRING NOT NULL,
  captured_date DATE NOT NULL,
  views INT64 NOT NULL,
  gmv_per_1k FLOAT64 NOT NULL
)
PARTITION BY captured_date
CLUSTER BY product_id;
