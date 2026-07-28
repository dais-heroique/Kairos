CREATE TABLE IF NOT EXISTS `kairos.creator_snapshots` (
  creator_id STRING NOT NULL,
  captured_date DATE NOT NULL,
  followers INT64 NOT NULL,
  avg_views INT64 NOT NULL,
  est_gmv FLOAT64 NOT NULL
)
PARTITION BY captured_date
CLUSTER BY creator_id;
