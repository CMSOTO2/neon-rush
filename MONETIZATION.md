# Monetization plan

This is the reference for how Neon Rush could make money **after** launch. The first release stays free, offline and without ads or purchases (see SPEC.md §19). The goal of v1 is to learn whether people come back to play. Monetization only makes sense once they do.

## Principles

1. **Never pay-to-win.** Money buys looks and convenience, never stats. Upgrades are earned with coins from playing.
2. **Nothing random for real money.** No loot boxes and no paid mystery rewards. Some countries restrict paid loot boxes, and they're a poor fit for a young audience regardless.
3. **Every paid thing is optional and clearly priced.** No countdown pressure, no "last chance" popups, no fake discounts.
4. **Ads are opt-in.** The player chooses to watch in exchange for a reward. No interstitials between runs.
5. **Protect younger players.** Contextual (non-personalized) ads only, minimal data collection, and a parental gate before any purchase or external link.

## Who the game is for (decide before any SDK goes in)

The audience decision drives the rules we have to follow:

- **Apple Kids category / "designed for children":** the strictest rules. Third-party ads and analytics are heavily restricted, and commerce needs a parental gate.
- **General audience with a 9+ or 12+ rating:** more flexibility, but if children are clearly part of the audience, Google Play's Families policy still applies (certified ad SDKs only, no personalized ads to kids), and so does COPPA in the US.

**Recommendation:** position Neon Rush as a general-audience game rated 9+, not a Kids-category app. Treat every player as possibly under 13: contextual ads only, no third-party tracking, parental gate on purchases. This keeps the flexibility of a general listing while staying safe. Before launch, check the current Apple App Store Review Guidelines (kids and in-app purchase sections), the Google Play Families policy, COPPA and GDPR-K. They change, and this doc is not legal advice.

## What to build, in order

### Phase 0: launch (v1). No monetization.

Ship the game free, with no ads or purchases. Measure the metrics below for a few weeks. If Day-1 and Day-7 retention are weak, fix the game first; monetization won't rescue it.

Design hooks that go in now at no cost (status as of 2026-09-27):

- **Revive with coins.** _Built._ A crash offers "Continue?" for 150 coins, then 300, at most twice per run. It works offline and without ads, and it's the mechanic rewarded ads plug into later.
- **Cosmetic catalog.** _Built_ (`src/progression/cosmetics.ts`): characters, outfits, accessories, trails and hoverboards, each with an `unlock` rule (`coins`, `level` or `achievement`). A `purchase` unlock type gets added when Phase 2 starts.
- **Local, anonymous metrics.** _Not built yet_ (ROADMAP P1): runs, session length, revives used, so we have numbers before adding any analytics SDK.

### Phase 1: rewarded ads (first revenue)

Only where the player asks for a reward:

| Placement        | Reward                         | Limit        |
| ---------------- | ------------------------------ | ------------ |
| Crash screen     | Free revive                    | Once per run |
| Game-over screen | Double the coins from this run | Once per run |
| Main menu        | Small daily coin bonus         | Once per day |

- Contextual ads only, from an SDK certified for Google Play Families, with ad content capped at a general rating.
- No interstitials and no banners. For a young audience they hurt retention more than they earn.
- Offline or ad unavailable: hide the ad buttons. Never show a broken button.

### Phase 2: cosmetic purchases

- Direct purchases: a specific character, outfit or hoverboard, shown before buying. Several cosmetics stay earnable with coins or achievements, so free players still get new looks.
- A one-time **Supporter pack**: an exclusive character plus one free revive per run without watching an ad. This replaces a "Remove ads" purchase, which makes no sense when every ad is already optional.
- Parental gate (for example, a simple question adults can answer) before the store sheet opens.
- **No coin packs at first.** Selling the currency that buys upgrades makes the game pay-to-progress. Revisit only if players ask for it, and even then keep upgrade prices tuned for free play.

### Phase 3: seasons (only with a regular content cadence)

- A seasonal pass with a free track and an optional paid track. Paid rewards are cosmetic only.
- Themed to the environments on the roadmap (beach summer, snowy winter, Halloween amusement park).
- Only worth doing if new content can ship every season. An empty pass is worse than none.

## Metrics to watch

| Metric                                   | Why it matters                                     |
| ---------------------------------------- | -------------------------------------------------- |
| Day-1 / Day-7 / Day-30 retention         | Whether the game is worth monetizing at all        |
| Average session length, runs per session | Engagement and ad-opportunity count                |
| Revive usage rate (coins, later ads)     | Demand for rewarded placements                     |
| Rewarded-ad opt-in rate                  | How much players value the rewards                 |
| Store visit → purchase conversion        | Whether cosmetics are appealing and priced right   |
| Refund and complaint rate                | An early warning that something feels manipulative |

Revenue estimates depend on these numbers, so don't forecast until we have them. The shape of the model is:

```
monthly revenue ≈ monthly active players
                  × (rewarded ad views per player × revenue per 1,000 views ÷ 1,000
                     + purchase conversion × average purchase value)
                  − store fees (typically 15–30%) and ad network share
```

Ad rates for contextual and child-safe inventory are usually lower than for personalized ads, so plan conservatively.

## Technical notes (Expo)

- Ads and in-app purchases need native SDKs that **don't run in Expo Go**. We'll need a development build (`npx expo run:ios` / EAS Build) at that point. Everything before Phase 1 keeps working in Expo Go.
- Candidates to evaluate when the time comes: Google Mobile Ads for React Native (configured for child-directed, non-personalized requests), and RevenueCat or react-native-iap for purchases. Check their current Expo config-plugin support before choosing.
- Keep monetization behind one small interface (for example, `rewards.offerRevive()` and `store.purchase(itemId)`) with a "free" implementation in v1, so the game code never depends on an ad or store SDK directly.
- Store products are consumables (none planned) or non-consumables (cosmetics, Supporter pack). Non-consumables must be restorable ("Restore purchases" in Settings).
