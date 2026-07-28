-- Chiffres réels déclarés par des vendeurs connectés — sert à calibrer
-- calibration_factors. Volume faible, pas de partitioning nécessaire.
CREATE TABLE IF NOT EXISTS `kairos.ground_truth` (
  connected_shop_id STRING NOT NULL,
  product_external_id STRING NOT NULL,
  period STRING NOT NULL,       -- ex. "2026-06"
  units_sold INT64 NOT NULL,
  gross_cents INT64 NOT NULL,
  refunds_cents INT64 NOT NULL,
  net_cents INT64 NOT NULL
)
CLUSTER BY connected_shop_id;
