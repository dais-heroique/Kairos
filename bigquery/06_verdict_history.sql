-- Trace quotidienne des verdicts calculés par packages/core — permet
-- d'analyser la durée médiane des phases par catégorie (fenêtre, §4 M4).
CREATE TABLE IF NOT EXISTS `kairos.verdict_history` (
  product_id STRING NOT NULL,
  computed_date DATE NOT NULL,
  phase STRING NOT NULL,
  saturation FLOAT64 NOT NULL,
  window_days INT64 NOT NULL
)
PARTITION BY computed_date
CLUSTER BY product_id;
