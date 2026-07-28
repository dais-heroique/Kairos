-- Garde-fou §6.4 n°1 : aucun appel IA (Gemini, Claude) sans une ligne ici.
-- Alimente aussi le dashboard /admin/couts (Phase 5).
CREATE TABLE IF NOT EXISTS `kairos.ai_spend` (
  date DATE NOT NULL,
  feature STRING NOT NULL,       -- ex. "brief_generation", "creative_dna", "compliance_guard"
  model STRING NOT NULL,         -- ex. "claude-sonnet-5", "gemini-2.5-flash"
  input_tokens INT64 NOT NULL,
  output_tokens INT64 NOT NULL,
  cost_cents INT64 NOT NULL,
  user_id STRING NOT NULL
)
PARTITION BY date
CLUSTER BY feature, user_id;
