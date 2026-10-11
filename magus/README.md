# MAGUS — The Quiet Correspondence

A peaceful natural philosopher’s first chapter, built in TypeScript with Phaser 3 and Vite. MAGUS lives alongside the existing dailyslop applications at **/magus**. Nothing else in the repository is replaced.

You start on a forest trail northbound toward your cabin. Collect and label specimens, compare experimental results, collaborate with Alderwick’s artisans, measure the night sky, and reproduce a phenomenon that ordinary chemistry cannot explain. No combat, survival meters, gift grind, or experience bar.

## Run

From the repository root, with Node 22.12+ (tested with Node 24):

```sh
npm ci
npm run dev:magus
```

Open http://localhost:5173/magus/. Desktop and keyboard are recommended.

```sh
npm run build:magus       # TypeScript check and Vite production build
npm run build             # Build MAGUS and existing applications
npm run test:magus        # Research, economy, ecology, schedules, saves and route tests
npx playwright install chromium
npm run test:magus:browser # Development server must already be running
```

The production output is `public/magus/`. All graphics are original, reusable pixel textures generated locally; all ambience is synthesized locally. Nothing is fetched from an external art, font, or audio host at runtime. Phaser is bundled. The production build exposes no development jump/time controls.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Eight-direction hiking |
| E | Examine the nearest specimen, sign, door, workbench, bed, or observing stand |
| J | Research journal |
| I | Satchel and equipment |
| M | Regional trail map |
| O | Settings and save backups |
| Escape | Close a panel |

Reading and complex panels pause the game clock. One day is 22 real minutes by default, adjustable to 20, 25, or 30. Sleeping chooses a wake-up hour. There is no forced bedtime. The first key or click enables ambient audio; it can be muted in Settings.

## The first chapter

* Ten substantial destinations connected by twelve winding routes with branching loops: cabin, West Trail, Moss Hollow, Creek Bend, Spring Pool, South Meadow, Alderwick, North Ridge, Old Survey Marker, and the observatory approach.
* Streamed 256-pixel terrain chunks with habitat palettes, dense layered trees, ferns, rocks, windthrows, a creek bridge, a spring pool, and 20 authored intermediate field-study sites. A fixed seed controls decoration; landmarks and research plots are authored.
* A functional cabin interior with a workbench, bookshelf/journal, specimen storage, cistern, bed, and outdoor sky stand. The artisan workshops have distinct signage and tools.
* 32 specimen types, each with habitats, descriptions, illustrations, properties, observations, and multiple applicable procedures. Study patches provide several samples and renew on a new day. Moonwort appears only at night; raincaps appear in rain.
* Eight procedures: Examine, Magnify, Cut, Crush, Dry, Soak, Heat, Mix. Transformations produce usable powders, extracts, dry wood, clarified resin, residues, and mixtures. Timed drying/soaking continues when the clock advances. Non-destructive procedures preserve samples; destructive ones consume them. Insufficient or unsuitable materials produce clear messages.
* A persistent notebook with a specimen catalog, timestamped experiment logs, research evidence ledgers, confirmed discoveries, related investigations, field observations, and astronomical measurements. Hidden properties become known through experimental history.
* Six linked findings with actual evidence gates, independent repeat trials, and negative controls. The last establishes a reproducible anomaly rather than awarding a spell.
* Five collaborators with daily opening hours, travel/home schedules, individual dialogue, trust, paid research reports, and timed equipment orders. Elin’s soil commission pays 24 crowns; other reports fund optional equipment. Ash, oak, and spiral-rowan staff orders use chosen dry wood. Fitted staffs improve hiking speed.
* An interactive deterministic sky chart with the Swan, lunar phases, a moving planet, daylight/weather restrictions, measurement precision, and a prediction tested on a later night. Ivo’s lens and Beren’s engraved arc improve accuracy.
* Versioned local saves, a backup slot, import/export, and autosaving every fifteen seconds and when leaving the page. Saves belong to this browser and origin; a preview URL has separate storage from production.

### A useful opening investigation

1. Collect violet bellflower samples and refill water at the cabin cistern.
2. Inside, soak bellflower and tend the preparation for 30 in-game minutes.
3. Mix separate extracts with sorrel root, limestone, and plain water. The three comparisons establish the pigment indicator.
4. Visit Elin during her opening hours and accept the pale-field investigation. Compare both supplied soils with the indicator; report the result for payment.
5. Cut and dry ash, then commission and collect a fitted staff from Mara. Investigate quartz, gently warmed resin, and pyrite for Ivo.
6. Commission a measuring lens and graduated arc. Observe the wanderer at 22:00 on clear nights, develop a prediction after two independent observations, then confirm on a later clear night with the instrument.
7. Read Seda’s manuscript and the old marker. Collect moonwort at night and veined crystal on the ridge. Compare cool nocturnal mixtures of moonwort extract and crystal powder against a warm/daylight control, and repeat the positive result with fresh samples.

Weather follows a deterministic seven-day sequence: clear, clear, rain, clear, cloudy, clear, rain. If a chosen observing night is obscured, sleep until the same hour on a later day. Repeated observations on the same night and hour do not count as independent evidence.

## Geography and walking measurements

World coordinates are genuine world pixels. Base movement is **64 pixels/second**, normalized diagonally. A browser check measured approximately **192 pixels in three seconds** at about 59 fps with the canvas renderer. Collision substeps prevent tunnelling during slow frames.

Route lengths are sums of traversable polyline segments; shortest paths use the trail graph, rather than straight-line map distances. The unit suite samples every route centreline at 501 positions. The browser suite checks actual keyboard movement and cabin collision.

| From the cabin | Trail distance | Base walking time |
| --- | ---: | ---: |
| Moss Hollow | 9,601 px | 2.50 min |
| North Ridge | 20,558 px | 5.35 min |
| Alderwick centre | 18,221 px | 4.75 min |
| Old Survey Marker | 31,832 px | 8.29 min |
| Observatory approach | 42,776 px | 11.14 min |

Exact generated values are in `route-measurements.json`. Paths permit modest off-centre wandering; corner cutting can make an actual trip slightly shorter. Fitted equipment intentionally improves these times by 12% or 18%.

The 30–60-minute chapter length is a **design estimate**, not a measured human playtest. Real hiking distances, laboratory comparisons, artisan visits, and repeated observations create that intended duration. Automated tests use position/time fixtures to check systems efficiently; they do not stand in for a full 30–60-minute player session. Long-distance travel and pacing still benefit from human feedback.

## Architecture

* `src/data/`: authored species, chemical/physical properties, research questions, collaborators.
* `src/world/geography.ts`: trail graph, paths, microhabitats and renewable study plots.
* `src/world/studies.ts`: authored intermediate landmarks and research clues.
* `src/world/chunks.ts`: streamed terrain, decorative objects and trunk collisions.
* `src/world/landmarks.ts`: buildings, interior furniture, workshop props and interactions.
* `src/world/scene.ts`: scene orchestration, normalized movement, camera, layering, input and lighting.
* `src/art/textures.ts`: consistent original pixel assets.
* `src/systems/`: experiments and transformations, research evidence, inventory state, ecology, economy/orders, celestial measurements, NPC schedules, time/weather, save migration, synthesized ambience.
* `src/ui/`: parchment HTML panels and HUD, separate from Phaser world rendering.

## Verification and known limits

The release checks cover the entire six-finding chain and serialization, a paid farmer commission, ordinary staff delivery, both observing instruments, controlled pigment/soil tests, repeated and negative-control anomaly trials, weather/time ecology, schedules, and measured route bounds. Playwright operates actual collection, lab, NPC, journal, save/reload, and astronomical controls. The browser screenshots are captured in `screenshots/` and reviewed for scale, layering, readable UI, and visual consistency; browser errors are checked. Production smoke checks additionally load the built static game.

This is an initial chapter, not a finished commercial RPG. Workshop interiors beyond the cabin are not enterable. Relationships use collaboration counts and authored dialogue, without a branching dialogue tree. Specimen storage is a shared persistent inventory, not a second container-management game. No touch movement controller is included. The quarry, upper forest, marsh, and observatory interior are future connections, marked by damaged routes. The simulation is deliberately approachable rather than a model of real laboratory safety or accurate celestial mechanics. A full-duration manual playtest and broad browser/device testing remain unverified.

## Vercel deployment in dailyslop

The root `vercel.json` retains existing apps and APIs, adds `/magus` routes following the established `/alchemy` deployment pattern, and explicitly builds with `npm run build`. Output remains `public`.

1. Open the existing Vercel project connected to `braddv/dailyslop`.
2. Keep **Root Directory** at repository root, **Build Command** `npm run build`, **Install Command** `npm ci`, and **Output Directory** `public`. No MAGUS environment variables are required.
3. Deploy the `feat/magus-chapter-one` branch for a preview. Open **`<preview-url>/magus`** and verify the game.
4. Merge the reviewed branch into the configured production branch (normally `main`) to publish **`https://dailyslop.ai/magus`**.

A branch push can trigger an existing Vercel Git integration; it does not itself guarantee a production deployment. An approved merge to main triggers the existing GitHub–Vercel production deployment. Direct Vercel management requires the Vercel connection to be enabled; deployment instructions remain usable without it.
