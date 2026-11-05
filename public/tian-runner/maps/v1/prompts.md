# Yulong Street map concept v1

## Gameplay background plate

`yulong-street-background.png` is the road-marking-free variant consumed by the game renderer. Generated with the built-in image_gen tool using the approved concept as the edit target. Game code draws all moving lane markings.

Use case: precise-object-edit. Edit the provided game environment image for use as a background plate. Remove ONLY all painted road markings, especially both white dashed lane-divider lines, from the asphalt. Replace the removed markings with continuous matching plain gray asphalt texture with consistent lighting and perspective. Preserve the camera, composition, road boundaries, curbs, all buildings, sky, trees, street lamps, dragon sculpture, and every sign and its text EXACTLY as they are. Do not add anything. Keep the same landscape framing and polished 3D cartoon game style. Entire roadway must be free of painted stripes so moving lane markings can be drawn by game code. Opaque background, no transparency, no watermark.

Generated with the built-in image_gen tool. Original stylized concept for design review. This image is a single static scene, not yet a playable or scrolling map. Buildings, street furniture and sculpture are interpreted game art, not a surveyed recreation.

## Research references

- https://dp.pconline.com.cn/photo/4834396_3.html — locality and square/sculpture description.
- https://nmg.ifeng.com/c/8rgK5bCNHUE — street event imagery and locality context.

No source photograph is used as a game asset.

## Full prompt

Use case: stylized-concept.
Asset type: landscape environment concept/background for a browser 3-lane endless runner game.
Primary request: an original stylized interpretation of Yulong Dajie near Yulong Square in Chifeng, Inner Mongolia, China. This is a game adaptation inspired by the locality, not a geographically exact reconstruction.
Scene: broad northern Chinese city avenue in warm clear afternoon daylight. Street-level low chase camera facing straight down the avenue, very strong centered one-point perspective, horizon at upper third. Exactly THREE spacious equally sized playable asphalt lanes separated by two dashed white lines, widening to fill most of the lower half of frame, uninterrupted clear running space from foreground to vanishing point. Sidewalks with pale granite paving, low clipped hedges, deciduous street trees and orderly Chinese multi-arm ornamental street lamps. On one side a broad civic square opens out with a polished silver abstract ascending C-shaped jade-dragon sculpture with sweeping wing-like curved forms on a red granite plinth, off the road. Beige-gray civic buildings and modest mid-rise residential/commercial buildings at edges, simplified into attractive readable game geometry. A blue Chinese street sign near the sidewalk reads exactly "玉龙大街" with smaller "YULONG DAJIE" below, another discreet plaza sign reads "玉龙广场". Keep signs readable but small and integrated naturally. Warm golden sunlight on building edges, charcoal gray road, muted green trees, soft blue sky. Quiet playful holiday mood, polished stylized 3D arcade game art matching exaggerated cartoon runner characters, clean silhouettes and gently rounded geometry, crisp materials, not photographic.
Composition: widescreen 16:9. Ground is continuous through the bottom edge, plenty of clean space in the bottom center for a future player sprite and mid-distance for another runner. All street props placed outside playable lanes. Spacious, legible, uncluttered.
Constraints: environment ONLY, no people, no characters, no cars in the playable lanes, no coins, no user interface, no border, no HUD, no decorative title, no watermark, no railway tracks, no temple/pagoda/Great Wall, no fantasy palace. Full opaque background.
