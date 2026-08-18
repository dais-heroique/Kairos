# Search Console — notes de configuration

Le compte Google connecté dans Search Console est `veltris.buisness@gmail.com`.

La propriété ajoutée est `https://kairos-on.web.app/` en mode **Préfixe de l’URL**, car le domaine `web.app` ne peut pas être validé par DNS depuis le projet Firebase.

Google propose la validation recommandée par fichier HTML : `googlec1db9f4523018ccf.html`, à importer à la racine de `kairos-on.web.app/`, puis à valider. Le fichier doit rester en ligne pour conserver la validation.

Après validation, il faudra envoyer le sitemap `https://kairos-on.web.app/sitemap.xml`, puis inspecter l’URL d’accueil et les pages publiques principales.
