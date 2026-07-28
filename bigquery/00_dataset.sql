-- Dataset unique du projet — voir §3. Région alignée sur Vertex AI
-- (europe-west1) pour éviter les frais de sortie inter-région sur les
-- pipelines Gemini/BigQuery.
CREATE SCHEMA IF NOT EXISTS `kairos`
OPTIONS (location = 'europe-west1');
