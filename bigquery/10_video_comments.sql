-- Texte des commentaires vidéo — capture best-effort (apps/collector, non
-- validée contre le site réel), nécessaire pour extraire de vraies
-- objections dans le brief généré (Lot 6) plutôt que des objections
-- génériques. Additif : ne modifie aucune table existante.
CREATE TABLE IF NOT EXISTS `kairos.video_comments` (
  video_id STRING NOT NULL,
  comment_id STRING NOT NULL,
  text STRING NOT NULL,
  like_count INT64 NOT NULL,
  captured_date DATE NOT NULL
)
PARTITION BY captured_date
CLUSTER BY video_id;
