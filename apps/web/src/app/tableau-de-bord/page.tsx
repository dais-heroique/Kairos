"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import {
  crowdingWording,
  entitlementsOf,
  type EstimatedRange,
  type WatchlistEntry,
} from "@kairos/shared";
import { BottomNav } from "@/components/BottomNav";
import { EstimatedValue } from "@/components/EstimatedValue";
import { RankingMeta } from "@/components/RankingMeta";
import { WatchlistDigest } from "@/components/WatchlistDigest";
import { RequireAuth } from "@/components/RequireAuth";
import { VerdictBadge } from "@/components/VerdictBadge";
import { useAuth } from "@/lib/firebase/auth-context";
import { addToWatchlist, getWatchlistEntries } from "@/lib/firestore/watchlist";
import { buildDashboard, windowRangeOf, type Dashboard } from "@/lib/dashboard/build-dashboard";
import { commissionLabel, commissionShort, shortTitle } from "@/lib/format/product";
import { getRankingPageData } from "@/server/firestore/rankings";
import { primaryMarketOf } from "@/lib/market";
import { productImageUrl } from "@/lib/product-image";
import type { ProductRankItem } from "@/types/product-rank-item";

// Le point d'arrivée après connexion. Il ne rejoue pas les classements :
// il répond à « qu'est-ce que je tourne cette semaine ? », ce qui est la
// seule question que se pose un créateur qui ouvre l'app le lundi matin.
//
// Coût : 4 lectures Firestore (2 documents de classement + noms de
// boutiques + watchlist), en deçà du budget de 5 par page.

const STATUS_SHORT: Record<string, string> = {
  watching: "En veille",
  sample_requested: "Échantillon",
  sample_received: "Reçu",
  filmed: "Tourné",
  posted: "Publié",
};

const eur = (v: number) =>
  v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "coral" | "success" | undefined;
}) {
  const color =
    tone === "coral" ? "var(--color-coral)" : tone === "success" ? "var(--color-success)" : undefined;
  return (
    <div className="kai-card flex flex-col gap-0.5 py-3">
      <span className="text-xs text-[color:var(--color-ink-muted)]">{label}</span>
      <span
        className="font-[family-name:var(--font-display)] text-xl font-extrabold"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {hint && <span className="text-[11px] text-[color:var(--color-ink-muted)]">{hint}</span>}
    </div>
  );
}

// Passe par windowRangeOf() : une fenêtre est une estimation, jamais deux
// nombres nus (règle produit n°1, vérifiée par kairos/no-raw-estimate-number).
function closingNote(item: ProductRankItem): string | undefined {
  const range = windowRangeOf(item);
  if (!range) return undefined;
  return `≈ ${range.low}–${range.high} jours restants (confiance ${Math.round(range.confidence * 100)}%)`;
}

function ProductLine({
  item,
  note,
}: {
  item: ProductRankItem;
  note?: string | undefined;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = productImageUrl(item.imageUrl ?? null, 200);

  return (
    <Link
      href={`/produit?id=${encodeURIComponent(item.id)}`}
      className="group flex items-center gap-3 rounded-2xl border-b px-2.5 py-3 transition-colors last:border-b-0 hover:bg-[color:var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]"
      style={{ borderColor: "var(--color-border)" }}
      aria-label={`Ouvrir la fiche de ${item.title}`}
    >
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl shadow-sm"
        style={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
      >
        {image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            width={56}
            height={56}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          item.emoji ?? "📦"
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold group-hover:underline">{item.title}</span>
        <span className="block truncate text-xs text-[color:var(--color-ink-muted)]">
          {note ?? `${item.shopName} · ${commissionShort(item.commissionRatePct, item.commissionIsEstimated)}`}
        </span>
      </span>
      <span className="shrink-0"><VerdictBadge verdict={item.verdict} /></span>
    </Link>
  );
}

function DashboardContent() {
  const { firebaseUser, userDoc } = useAuth();
  const [opportunities, setOpportunities] = useState<ProductRankItem[] | null>(null);
  const [products, setProducts] = useState<ProductRankItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [marketVerified, setMarketVerified] = useState(true);
  const [sourceMarket, setSourceMarket] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const market = primaryMarketOf(userDoc);

  useEffect(() => {
    getRankingPageData("opportunities", market, "7d").then((d) => {
      setOpportunities(d.items);
      setGeneratedAt(d.generatedAt);
      setIsDemo(d.isDemo);
      setMarketVerified(d.marketVerified ?? true);
      setSourceMarket(d.sourceMarket ?? null);
    });
    getRankingPageData("products", market, "7d").then((d) => setProducts(d.items));
  }, [market]);

  useEffect(() => {
    if (!firebaseUser) return;
    getWatchlistEntries(firebaseUser.uid).then(setWatchlist);
  }, [firebaseUser]);

  const entitlements = entitlementsOf(userDoc);
  const profileIncomplete = !!userDoc && userDoc.profile.onboardingCompletedAt === null;

  const dashboard: Dashboard | null = useMemo(() => {
    if (!opportunities) return null;
    const estimateFor = (item: ProductRankItem): EstimatedRange | null => {
      if (!userDoc) return null;
      return computeEarnings({
        expectedViews: 1000,
        followerRange: userDoc.profile.followerRange,
        niche: userDoc.profile.niches[0] ?? "",
        medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
        priceCents: item.priceCents,
        commissionRatePct: item.commissionRatePct,
        commissionIsEstimated: item.commissionIsEstimated ?? false,
        estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
      });
    };
    return buildDashboard({
      opportunities,
      products,
      watchlist,
      niches: userDoc?.profile.niches ?? [],
      estimateFor,
    });
  }, [opportunities, products, watchlist, userDoc]);

  async function handleAdd(productId: string) {
    if (!firebaseUser) return;
    await addToWatchlist(firebaseUser.uid, productId, entitlements.watchlistLimit);
    setAdded((prev) => new Set(prev).add(productId));
    setWatchlist((prev) => [
      ...prev,
      { productId, addedAt: new Date().toISOString(), alertsEnabled: true, status: "watching" } as WatchlistEntry,
    ]);
  }

  const firstName = userDoc?.displayName?.split(" ")[0] ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <BottomNav />

      <header className="kai-shell pt-5 pb-2">
        <div
          className="relative overflow-hidden rounded-[28px] p-5 shadow-sm sm:p-7"
          style={{ background: "linear-gradient(135deg, var(--color-ink) 0%, #2f3441 58%, var(--color-coral) 150%)", color: "white" }}
        >
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">KAIROS / PILOTAGE</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
                {firstName ? `Salut ${firstName}` : "Ton espace de pilotage"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
                Repère les produits à tourner, suis ceux qui montent et décide avec des données réelles.
              </p>
            </div>
            <Link
              href="/tarifs"
              className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition-transform hover:scale-105"
            >
              {entitlements.label}
            </Link>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-[color:var(--color-coral)]/30 blur-3xl" />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 kai-shell py-3">
        <RankingMeta
          generatedAt={generatedAt}
          isDemo={isDemo}
          marketVerified={marketVerified}
          sourceMarket={sourceMarket}
        />

        {/* Ce qui a bougé sur les produits suivis, en tête de page : c'est
            l'information qu'une notification aurait portée, au moment où
            l'utilisateur peut en faire quelque chose. Capacité `alerts`. */}
        <WatchlistDigest />

        {profileIncomplete && (
          <div className="kai-card text-sm">
            <p className="font-[family-name:var(--font-display)] font-bold">
              Tes gains ne sont pas encore calculables
            </p>
            <p className="text-[color:var(--color-ink-muted)]">
              Il manque encore ton profil créateur.{" "}
              <Link href="/onboarding/profil" className="underline">
                Compléter mon profil
              </Link>
            </p>
          </div>
        )}

        {dashboard === null && (
          <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
        )}

        {dashboard && dashboard.totalAnalysed === 0 && (
          <div className="kai-card text-sm text-[color:var(--color-ink-muted)]">
            Aucun produit n&apos;est encore classable de façon fiable. Les
            produits en observation restent affichés plus bas avec leur suivi
            réel ; le verdict apparaîtra dès que l&apos;historique sera suffisant.
          </div>
        )}

        {dashboard && (
          <>
            {/* ---------- Le potentiel, en euros ---------- */}
            {/* Le tableau de bord n'affichait aucun montant avant le
                troisième écran : quatre compteurs, puis le pick. Or la
                question qui fait ouvrir l'app le lundi est « combien ».
                Le chiffre existait déjà (focusEarnings), il était
                simplement enterré. */}
            {dashboard.focusEarnings && (
              <section
                className="kai-card flex flex-col gap-1"
                style={{ backgroundColor: "var(--color-success-soft)", borderColor: "transparent" }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-success)" }}>
                  Ta semaine, si tu tournes ces {dashboard.focus.length} produits
                </span>
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
                  <EstimatedValue
                    range={dashboard.focusEarnings}
                    format={(v) => eur(v)}
                  />
                </p>
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  Une vidéo par produit, comparaison faite pour 1 000 vues.
                </p>
              </section>
            )}

            {/* ---------- Chiffres clés ---------- */}
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Encore jouables"
                value={String(dashboard.openWindowCount)}
                hint={`sur ${dashboard.totalAnalysed} produits suivis`}
                tone="success"
              />
              <Stat
                label="Bientôt trop tard"
                value={String(dashboard.closingSoon.length)}
                hint="moins de 3 semaines devant"
                tone={dashboard.closingSoon.length > 0 ? "coral" : undefined}
              />
              <Stat
                label="Tu les suis"
                value={String(watchlist.length)}
                hint={
                  dashboard.awaitingSample > 0
                    ? `${dashboard.awaitingSample} échantillon(s) en attente`
                    : "produits suivis"
                }
              />
              <Stat
                label="À éviter"
                value={String(dashboard.avoid.length)}
                hint="trop de monde, ou ça retombe"
              />
            </div>

            {/* ---------- Le pick ---------- */}
            {dashboard.topPick && (
              <section
                className="kai-card flex flex-col gap-3 border-l-4"
                style={{ borderColor: "var(--color-coral)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: "var(--color-coral)" }}
                  >
                    À tourner en priorité
                    {dashboard.topPick.matchesNiche && " · dans ta niche"}
                  </span>
                  <VerdictBadge verdict={dashboard.topPick.item.verdict} />
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-3xl">{dashboard.topPick.item.emoji ?? "📦"}</span>
                  <div className="min-w-0">
                    <p
                      className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight"
                      title={dashboard.topPick.item.title}
                    >
                      {shortTitle(dashboard.topPick.item.title, 60)}
                    </p>
                    <p className="text-sm text-[color:var(--color-ink-muted)]">
                      {dashboard.topPick.item.shopName} ·{" "}
                      {commissionLabel(
                        dashboard.topPick.item.commissionRatePct,
                        dashboard.topPick.item.commissionIsEstimated,
                      )}{" · "}
                      {eur(dashboard.topPick.item.priceCents / 100)}
                    </p>
                  </div>
                </div>

                {dashboard.topPick.earnings && (
                  <p className="text-sm">
                    <span className="text-[color:var(--color-ink-muted)]">
                      Pour 1 000 vues :{" "}
                    </span>
                    <EstimatedValue
                      range={dashboard.topPick.earnings}
                      format={(v) => eur(v)}
                      className="font-semibold"
                    />
                  </p>
                )}

                {/* Le raisonnement était calculé à chaque passage du pipeline
                    puis jeté. C'est pourtant lui qui distingue un verdict
                    d'une simple étiquette. */}
                {dashboard.topPick.item.reasoning && (
                  <ul className="flex flex-col gap-1">
                    {dashboard.topPick.item.reasoning.map((line) => (
                      <li
                        key={line}
                        className="text-xs leading-relaxed text-[color:var(--color-ink-muted)]"
                      >
                        • {line}
                      </li>
                    ))}
                  </ul>
                )}

                {windowRangeOf(dashboard.topPick.item) && (
                  <p className="text-xs text-[color:var(--color-ink-muted)]">
                    Il te reste environ :{" "}
                    <EstimatedValue
                      range={windowRangeOf(dashboard.topPick.item)!}
                      format={(v) => `${v} j`}
                    />
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdd(dashboard.topPick!.item.id)}
                    disabled={added.has(dashboard.topPick.item.id)}
                    className="kai-btn-primary flex-1 disabled:opacity-50"
                  >
                    {added.has(dashboard.topPick.item.id) ? "Ajouté ✓" : "Suivre ce produit"}
                  </button>
                  <Link
                    href={`/simulateur?id=${encodeURIComponent(dashboard.topPick.item.id)}`}
                    className="kai-btn-outline flex-1 text-center"
                  >
                    Simuler
                  </Link>
                </div>
              </section>
            )}

            {/* ---------- Le focus de la semaine ---------- */}
            {dashboard.focus.length > 1 && (
              <section className="kai-card flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-[family-name:var(--font-display)] font-bold">
                    Le reste de ton top {dashboard.focus.length}
                  </h2>
                  <Link href="/classements/opportunites" className="text-xs underline">
                    Tout voir
                  </Link>
                </div>
                <div>
                  {dashboard.focus.slice(1).map((pick) => (
                    <ProductLine
                      key={pick.item.id}
                      item={pick.item}
                      note={
                        pick.matchesNiche
                          ? `${pick.item.shopName} · ${commissionShort(pick.item.commissionRatePct, pick.item.commissionIsEstimated)} · ta niche`
                          : undefined
                      }
                    />
                  ))}
                </div>
                {dashboard.focusEarnings && (
                  <p className="pt-1 text-sm">
                    <span className="text-[color:var(--color-ink-muted)]">
                      Une vidéo sur chacun rapporterait{" "}
                    </span>
                    <EstimatedValue
                      range={dashboard.focusEarnings}
                      format={(v) => eur(v)}
                      className="font-semibold"
                    />
                  </p>
                )}
              </section>
            )}

            {/* ---------- Les terrains ---------- */}
            {/* Un créateur choisit d'abord une famille, ensuite un produit.
                Savoir que « beauté » a 12 fenêtres ouvertes et « tech » 2
                oriente une semaine de tournage mieux qu'un classement de
                90 lignes. */}
            {dashboard.categories.length > 0 && (
              <section className="kai-card flex flex-col gap-2">
                <h2 className="font-[family-name:var(--font-display)] font-bold">
                  Où le marché est ouvert
                </h2>
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  Par famille de produits, sur ce qui a assez de recul pour
                  qu&apos;on se prononce.
                </p>
                <div className="flex flex-col gap-2">
                  {dashboard.categories.map((cat) => {
                    const share = cat.total > 0 ? cat.open / cat.total : 0;
                    return (
                      <div key={cat.label} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold capitalize">
                            {cat.label}
                          </span>
                          <span className="shrink-0 text-xs text-[color:var(--color-ink-muted)]">
                            {cat.open}/{cat.total} jouables
                            {cat.avoid > 0 && ` · ${cat.avoid} à éviter`}
                          </span>
                        </div>
                        {/* La barre est la part réellement jouable, pas un
                            score composite : ce qu'elle montre se recompte
                            à la main sur les deux nombres à côté. */}
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full"
                          style={{ backgroundColor: "var(--color-border)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(share * 100)}%`,
                              backgroundColor:
                                share >= 0.4 ? "var(--color-success)" : "var(--color-warning)",
                            }}
                          />
                        </div>
                        {cat.best && (
                          <Link
                            href={`/produit?id=${encodeURIComponent(cat.best.id)}`}
                            className="truncate text-xs underline text-[color:var(--color-ink-muted)]"
                          >
                            Le meilleur : {shortTitle(cat.best.title, 42)}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ---------- La niche déclarée ne trouve rien ---------- */}
            {/* Silence = le créateur croit que l'outil n'a rien pour lui,
                alors que ce sont ses niches qui ne recoupent pas la
                collecte. C'est réparable en un clic, encore faut-il le
                savoir. */}
            {dashboard.nicheMatches === 0 && (userDoc?.profile.niches.length ?? 0) > 0 && (
              <section className="kai-card flex flex-col gap-1">
                <p className="font-[family-name:var(--font-display)] font-bold">
                  Rien dans tes niches cette semaine
                </p>
                <p className="text-sm text-[color:var(--color-ink-muted)]">
                  Aucun produit jouable ne correspond à{" "}
                  {userDoc?.profile.niches.join(", ")}. Les recommandations
                  ci-dessus viennent donc des autres familles — elles restent
                  valables, elles sont juste hors de ton terrain habituel.
                </p>
                <Link href="/onboarding/niches" className="mt-1 text-sm underline">
                  Ajuster mes niches
                </Link>
              </section>
            )}

            {/* ---------- Urgence ---------- */}
            {dashboard.closingSoon.length > 0 && (
              <section className="kai-card flex flex-col gap-2">
                <h2 className="font-[family-name:var(--font-display)] font-bold">
                  Bientôt trop tard
                </h2>
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  Encore jouables, mais plus pour longtemps.
                </p>
                <div>
                  {dashboard.closingSoon.map((i) => (
                    <ProductLine key={i.id} item={i} note={closingNote(i)} />
                  ))}
                </div>
              </section>
            )}

            {/* ---------- Pipeline ---------- */}
            <section className="kai-card flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-[family-name:var(--font-display)] font-bold">
                  Où en sont tes produits
                </h2>
                <Link href="/watchlist" className="text-xs underline">
                  Gérer
                </Link>
              </div>
              <div className="flex items-end justify-between gap-1">
                {dashboard.pipeline.map((stage) => (
                  <div key={stage.status} className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        backgroundColor:
                          stage.count > 0 ? "var(--color-coral-soft)" : "var(--color-surface-raised)",
                        color: stage.count > 0 ? "var(--color-coral)" : "var(--color-ink-muted)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {stage.count}
                    </span>
                    <span className="text-center text-[10px] leading-tight text-[color:var(--color-ink-muted)]">
                      {STATUS_SHORT[stage.status]}
                    </span>
                  </div>
                ))}
              </div>
              {dashboard.awaitingSample > 0 && (
                <p className="text-xs" style={{ color: "var(--color-coral)" }}>
                  {dashboard.awaitingSample} échantillon(s) demandé(s) sans réponse — à
                  relancer depuis la watchlist.
                </p>
              )}
            </section>

            {/* ---------- Ne pas perdre son temps ---------- */}
            {dashboard.avoid.length > 0 && (
              <section className="kai-card flex flex-col gap-2">
                <h2 className="font-[family-name:var(--font-display)] font-bold">
                  À laisser passer
                </h2>
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  Autant le savoir avant d&apos;avoir tourné.
                </p>
                <div>
                  {dashboard.avoid.map((i) => (
                    <ProductLine
                      key={i.id}
                      item={i}
                      note={crowdingWording(i.saturationScore ?? 0)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ---------- Ce que tu as déjà fait ---------- */}
            {/* `userDoc.stats` était écrit et jamais relu. Affiché en
                permanence il donnerait « 0 · 0 » à tout nouveau compte,
                c'est-à-dire un bilan d'échec dès la première visite : on ne
                le montre qu'une fois qu'il y a quelque chose à montrer, et
                on propose l'étape suivante sinon. */}
            {userDoc && (userDoc.stats.briefsGenerated > 0 || userDoc.stats.videosPosted > 0) ? (
              <section className="kai-card flex flex-col gap-2">
                <h2 className="font-[family-name:var(--font-display)] font-bold">
                  Ton activité
                </h2>
                <div className="flex gap-4">
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-xl font-extrabold">
                      {userDoc.stats.briefsGenerated}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-muted)]">
                      brief{userDoc.stats.briefsGenerated > 1 ? "s" : ""} généré
                      {userDoc.stats.briefsGenerated > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-xl font-extrabold">
                      {userDoc.stats.videosPosted}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-muted)]">
                      vidéo{userDoc.stats.videosPosted > 1 ? "s" : ""} publiée
                      {userDoc.stats.videosPosted > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {/* Aucun montant gagné n'est affiché : `estimatedEarningsCents`
                    est une somme d'estimations, pas un revenu constaté. Le
                    présenter comme « ce que tu as gagné » serait le mensonge
                    le plus coûteux du produit. */}
              </section>
            ) : (
              dashboard.topPick && (
                <section className="kai-card flex flex-col gap-1">
                  <p className="font-[family-name:var(--font-display)] font-bold">
                    Ta prochaine étape
                  </p>
                  <p className="text-sm text-[color:var(--color-ink-muted)]">
                    Tu n&apos;as pas encore généré de texte de tournage. C&apos;est
                    ce qui transforme une recommandation en vidéo — et le
                    premier est offert.
                  </p>
                  <Link
                    href={`/brief?id=${encodeURIComponent(dashboard.topPick.item.id)}`}
                    className="kai-btn-primary mt-1 text-center"
                  >
                    Obtenir le texte à dire
                  </Link>
                </section>
              )
            )}

            {/* ---------- Trop récents ---------- */}
            {dashboard.needsHistory.length > 0 && (
              <section className="kai-card flex flex-col gap-2">
                <h2 className="font-[family-name:var(--font-display)] font-bold">
                  Produits en observation
                </h2>
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  Les cinq produits les plus récents restent visibles pendant
                  la collecte. Aucun verdict ni gain n&apos;est inventé avant d&apos;avoir
                  assez de relevés.
                </p>
                <div>
                  {dashboard.needsHistory.map((i) => (
                    <ProductLine
                      key={i.id}
                      item={i}
                      note={
                        typeof i.snapshotCount === "number"
                          ? `${i.snapshotCount} relevé${i.snapshotCount > 1 ? "s" : ""} — suivi en cours`
                          : "Suivi en cours — verdict à venir"
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TableauDeBordPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
