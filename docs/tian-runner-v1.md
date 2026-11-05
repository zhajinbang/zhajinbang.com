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
- Endless mode has no finish distance or victory cutoff. The first collision immediately brings the pursuer to 6 meters, where he remains. The second distinct collision starts a struggle if an opportunity remains, otherwise it ends the run. A short grace period prevents duplicate hits from the same encounter.
- Running starts at 32 world units/second (previously 19), reaches about 59.6 at 1,000 meters and approaches 86 over longer runs. Rows tighten from 2.1 seconds toward 1.2 seconds apart, preserving a full action recovery window. Look-ahead is reduced from 140 to 120 units. The HUD shows elapsed time, endless mode and the current pace multiplier.
- Rows alternate between elevated jump coins over low barriers, ground coin routes, low coins beneath bars and oncoming-car jump coins. High/low coins enforce the corresponding posture, so changing lanes alone cannot collect them. Clusters fit within one jump or slide even at opening speed.
- Every row leaves one unobstructed lane. Coins can deliberately reward a more difficult lane; taking the safe lane can mean giving up those coins. Vehicles close faster than static props; initial spacing is normalized so they do not overtake another row and create impossible encounters.
- Obstacles have no floating operation prompts. Controls remain available in the sidebar.
- Score is 2 per meter, 25 per coin, and 35 per obstacle avoided, plus bait bonuses. Personal best is stored locally in this browser when storage is available.

## Expression feedback

The nine user-supplied meme photographs are copied unchanged into `public/tian-runner/memes`. Captions and trigger descriptions are centralized in `app/members/tian-reactions.ts`. The initial/default expression is the smirk. Three consecutive successful car jumps trigger the tongue face; every 18 collected coins in the current run triggers the grin (18, 36, 54, etc.), without resetting on missed coins; each safe 1,000-meter milestone triggers the shush face. Temporary reactions last three seconds of active game time. The first stumble overrides taunts with the fearful face until a successful rescue or a new run. A newly beaten existing personal best celebrates with the smirk. The result card uses a separate caught photograph as a large hero image (180px on desktop, responsive on mobile) beside the user's exact caught caption. The small text beside each in-game expression explains its trigger condition.

The in-run portrait and caption appear as a large, pointer-transparent card at the top center of the game, within the sky above the road horizon. Opening/default and event taunts show for three seconds. After the first stumble the larger fear card remains visible. Mobile layout places it below the location/pause controls. The sidebar retains pursuit metrics without a duplicate portrait. No manual taunt/risk-reward mechanic is added in this step.

## Struggle and rescue

- A capture offers a five-second struggle with the first new photograph. The first attempt requires 20 taps; the second requires 28. Entering consumes an opportunity immediately, with a maximum of two per run.
- Mouse/touch clicks or separate Space/Enter presses add one tap. Keyboard auto-repeat is ignored; holding the key does not fill the meter.
- The running simulation, scoring and elapsed running time freeze during a struggle. Losing focus or switching tabs pauses the struggle timer, and explicit resume restores that exact phase.
- Insufficient taps at expiry lead to the normal failure result. A third capture also ends the run without another struggle. Records save only at the final failure.
- Success displays the second new photograph with a three-second countdown, then resumes the same distance, coins, score and speed. Stumbles reset to zero, the gap returns to 32m, and two seconds of collision protection start only after running resumes. Near obstacles are cleared and the next row is delayed to prevent an immediate recapture.
- The pursuit panel displays remaining opportunities. Retrying starts a new run with two opportunities.
- Both phase photographs are preloaded with the main assets, so loading does not consume struggle time.

## Bait (勾引)

- The button or E key activates a 10-second effect while running without prior stumbles, collision protection, an active effect or cooldown. The supplied ninth meme photograph is copied unchanged as `memes/bait.jpg` and preloaded.
- Newly collected coins award 75 points instead of 25, without changing coin counts or the 18-coin reaction. Surviving the effect awards a further 200 points once. Earned bonuses are retained if captured.
- Speed smoothly rises by up to 12% and smoothly returns to normal after success. One collision during the effect captures immediately; existing struggle opportunities still apply. Bait captures show the requested failure caption.
- A full 20-second cooldown begins on completion or capture. It freezes outside active running, survives rescue, and cannot be bypassed by the post-rescue protection window.
- The active/success portrait appears above the road. Success copy reads “勾引完就跑，只留下一根腋毛！”. Normal event captions resume afterward.

## Rendering and assets

This is a 2.5D Canvas prototype with a stylized Yulong Street backdrop, perspective-rendered moving road markings and obstacles, and transparent character sprites. The background buildings are scenic artwork rather than a traversable 3D reconstruction. Jumping and sliding currently transform the running sprite; dedicated animation frames can follow after gameplay review.

Approved character assets and full built-in image-generation prompts are in `public/tian-runner/v2`. Map artwork and prompts are in `public/tian-runner/maps/v1`. The consumed map plate has no painted lane markings, so the game can draw them dynamically without duplicate static lines.

## Verification

- `node --test tests/tian-game.test.mjs` covers collision/action timing, invulnerability, pauses, lane bounds, action-dependent coins, catch/retry, clear routes across multiple seeds, traffic timing, long-run speed, crossing the old finish distance, entity cleanup, late frames, struggle budgets, timeout, success continuity, safe restart and phase pauses.
- `npm run build -- --webpack` validates production compilation and static member routes.
- Browser QA covers asset loading, countdown/retry, keyboard input, pause/resume, touch buttons, desktop and 390-pixel layouts.

Changes are developed and previewed locally before merging to the repository's main branch.
