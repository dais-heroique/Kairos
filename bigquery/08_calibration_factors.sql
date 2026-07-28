CREATE TABLE IF NOT EXISTS `kairos.calibration_factors` (
  market STRING NOT NULL,
  category STRING NOT NULL,
  price_bucket STRING NOT NULL,
  factor_mean FLOAT64 NOT NULL,
  factor_stddev FLOAT64 NOT NULL,
  sample_size INT64 NOT NULL
)
CLUSTER BY market, category;
