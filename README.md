# Check out the app!
[click here!](https://minecraft-horse-family-tree.vercel.app/horses)

## Sample `/sample` command
```
/summon minecraft:horse 353.04 65.00 20.45 {Brain: {memories: {}}, HurtByTimestamp: 0, Tame: 1b, Owner: [I; -2040289864, 893862429, -1177463808, -374089761], Invulnerable: 0b, FallFlying: 0b, ForcedAge: 0, PortalCooldown: 0, AbsorptionAmount: 0.0f, Bred: 0b, FallDistance: 0.0f, InLove: 0, EatingHaystack: 0b, DeathTime: 0s, HandDropChances: [0.085f, 0.085f], PersistenceRequired: 0b, Age: 0, Motion: [0.0d, -0.0784000015258789d, 0.0d], Health: 25.033106f, LeftHanded: 0b, Air: 300s, OnGround: 1b, Rotation: [265.66467f, 0.0f], HandItems: [{}, {}], Variant: 516, ArmorDropChances: [0.085f, 0.085f, 0.085f, 0.085f], Fire: -1s, ArmorItems: [{}, {}, {}, {}], Temper: 50, CanPickUpLoot: 0b, attributes: [{id: "minecraft:generic.jump_strength", base: 0.7d}, {id: "minecraft:generic.max_health", base: 25.03310503285247d}, {id: "minecraft:generic.movement_speed", base: 0.2966470171110437d}, {id: "minecraft:generic.oxygen_bonus", base: 0.0d}], HurtTime: 0s}.
```

## Data & math notes

**Bloodline ledger, not a genetics sim.** DNA maps are bookkeeping
fractions (foal = sire/2 + dam/2 per bloodline), not Mendelian or
vanilla-Minecraft inheritance — the game rolls random stats and coats.
Traces below `1e-6` are dropped on merge so old outcrosses can't
accumulate registry keys forever.

**Raw vs translated stats (the top footgun).** The DB stores RAW
attributes; the UI shows translated units (speed ×43.17, health /2,
jump via a `[0.4, 1.0]` quadratic fit). Two opposite rules apply:
breeding-roll math (`expectedFoalRange`) must eat RAW; anything
averaged, regressed, or correlated must eat TRANSLATED (averaging raw
jump is invalid — the curve is nonlinear). The types don't enforce
this yet; the call-site comments do.

**Displayed foal ranges are clamped, not reflected.** The game
mirror-reflects per roll (`2·MAX − value`); the app clamps bounds at
the caps, because reflection would show fast parents a max below
themselves. The cap itself is the honest bound to display.

**Tolerances used across the codebase:**

| Where | Tolerance | Role |
|---|---|---|
| `assertDnaSum` | ±0.01 on Σw | Corruption gate for hand-edited maps |
| `PUREBRED_EPSILON` / dust cutoff | 1e-6 | Display/merge dust threshold |
| `SURNAME_INCLUSION_THRESHOLD` | ≥0.15 | Surname qualification (exact) |
| Crosstab display rounding | 0.1 | ±0.05 error per cell |

**Descriptive statistics, not inference.** Heritability slopes,
correlations, Shannon diversity, and inbreeding ranks describe a
selected herd: slopes carry normal-approx 95% CIs but are not
narrow-sense h²; pooled correlations should be checked against the
per-generation means shown beside them; diversity shows a
Miller-Madow bias-corrected value; inbreeding `F` is a path-counted
approximation (ancestor inbreeding ignored).