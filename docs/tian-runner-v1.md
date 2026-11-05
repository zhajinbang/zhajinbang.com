# 田先生，快跑！

Local preview: http://localhost:3004/members/beta

The first playable version reverses the original chase: the player controls Tian, with the pursuer behind the camera. A distance indicator communicates danger. The pursuer briefly appears at the bottom only when the gap is small. The road ahead stays clear of a second runner.

## Controls and rules

- Left/right or A/D switch between three lanes.
- Up, W or Space jumps over a construction barrier.
- Down or S slides beneath an overhead bar.
- Food carts and oncoming box trucks require changing lanes. Oncoming sedans can be jumped, but not slid under.
- Touchscreens support swipes and four on-screen buttons, immediately below the game.
- P or Escape pauses/resumes. Switching tabs or losing window focus pauses automatically and requires an explicit resume.
- Endless mode has no finish distance or victory cutoff. The first collision immediately brings the pursuer to 6 meters, where he remains. The second distinct collision ends the run. A short grace period prevents duplicate hits from the same encounter.
- Running starts at 32 world units/second (previously 19), reaches about 59.6 at 1,000 meters and approaches 86 over longer runs. Rows tighten from 2.1 seconds toward 1.2 seconds apart, preserving a full action recovery window. Look-ahead is reduced from 140 to 120 units. The HUD shows elapsed time, endless mode and the current pace multiplier.
- Rows alternate between elevated jump coins over low barriers, ground coin routes, low coins beneath bars and oncoming-car jump coins. High/low coins enforce the corresponding posture, so changing lanes alone cannot collect them. Clusters fit within one jump or slide even at opening speed.
- Every row leaves one unobstructed lane. Coins can deliberately reward a more difficult lane; taking the safe lane can mean giving up those coins. Vehicles close faster than static props; initial spacing is normalized so they do not overtake another row and create impossible encounters.
- Obstacles have no floating operation prompts. Controls remain available in the sidebar.
- Score is 2 per meter, 25 per coin, and 35 per obstacle avoided. Personal best is stored locally in this browser when storage is available.

## Expression feedback

The five user-supplied photographs are copied unchanged into `public/tian-runner/memes`. Captions and trigger descriptions are centralized in `app/members/tian-reactions.ts`. The initial/default expression is the smirk. Three consecutive successful car jumps trigger the tongue face; nine consecutive collected coins trigger the grin; each safe 1,000-meter milestone triggers the shush face. Temporary reactions last three seconds of active game time. The first stumble permanently overrides all taunts with the fearful face for the rest of that run; retry resets it. A newly beaten existing personal best celebrates with the smirk. The fearful face and the user's exact caught caption appear in the result card. The small text beside each in-game expression explains its trigger condition.

The in-run portrait and caption appear as a large, pointer-transparent card at the top center of the game, within the sky above the road horizon. Opening/default and event taunts show for three seconds. After the first stumble the larger fear card remains visible. Mobile layout places it below the location/pause controls. The sidebar retains pursuit metrics without a duplicate portrait. No manual taunt/risk-reward mechanic is added in this step.

## Rendering and assets

This is a 2.5D Canvas prototype with a stylized Yulong Street backdrop, perspective-rendered moving road markings and obstacles, and transparent character sprites. The background buildings are scenic artwork rather than a traversable 3D reconstruction. Jumping and sliding currently transform the running sprite; dedicated animation frames can follow after gameplay review.

Approved character assets and full built-in image-generation prompts are in `public/tian-runner/v2`. Map artwork and prompts are in `public/tian-runner/maps/v1`. The consumed map plate has no painted lane markings, so the game can draw them dynamically without duplicate static lines.

## Verification

- `node --test tests/tian-game.test.mjs` covers collision/action timing, invulnerability, pauses, lane bounds, action-dependent coins, catch/retry, clear routes across multiple seeds, traffic timing, long-run speed, crossing the old finish distance, entity cleanup and late frames.
- `npm run build -- --webpack` validates production compilation and static member routes.
- Browser QA covers asset loading, countdown/retry, keyboard input, pause/resume, touch buttons, desktop and 390-pixel layouts.

Changes are developed and previewed locally before merging to the repository's main branch.
