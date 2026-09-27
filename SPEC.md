# Project: Neon Rush — Mobile Endless Runner

## Role

You are a senior mobile game developer specializing in React Native, Expo, TypeScript, game architecture, animation, and mobile performance.

Your task is to design and develop a polished, highly engaging endless runner game for iOS and Android using Expo and React Native.

The game should take inspiration from popular endless runners such as Subway Surfers and Sonic Dash, but have its own original identity, characters, environments, mechanics, and visual style.

The target audience is primarily children and teenagers.

The finished game should feel like a professionally developed mobile game rather than a basic React Native demo.

## 1. Core game concept

Create a colorful, fast-paced endless runner in which the player controls a character running through an increasingly challenging environment.

The player must:

- Swipe left and right to change lanes.
- Swipe up to jump.
- Swipe down to slide.
- Collect coins.
- Avoid obstacles.
- Collect power-ups.
- Complete missions.
- Earn rewards.
- Unlock characters and cosmetics.
- Upgrade power-ups and abilities.
- Beat personal distance and score records.

The game should be easy to understand but difficult to master.

Each run should feel slightly different through randomized obstacle patterns, coin placements, and environmental variations.

The game should encourage replayability through progression, unlockables, achievements, and increasingly challenging gameplay.

Do not copy Subway Surfers' characters, artwork, environments, branding, or distinctive assets.

## 2. Technology and architecture

Use the following technologies where appropriate:

- Expo with TypeScript.
- React Native for application UI.
- React Native Skia for game rendering.
- React Native Gesture Handler for swipe controls.
- React Native Reanimated for smooth UI animations.
- Zustand for managing game state.
- Expo Audio for sound effects and music.
- AsyncStorage for local persistence.

Use Expo-compatible dependencies and ensure the project can run on both iOS and Android.

Keep the architecture modular, maintainable, and easy to extend.

Separate the game engine from the React Native UI.

Suggested structure:

```
src/
  game/
    engine/
    entities/
    systems/
    physics/
    rendering/
    input/
    levels/
  components/
  screens/
  store/
  hooks/
  assets/
  constants/
  types/
  utils/
```

Adapt the structure as necessary, but avoid putting the entire game into a single component.

## 3. Gameplay and controls

Implement a three-lane endless runner.

The player starts in the middle lane.

Controls:

- Swipe left: Move one lane left.
- Swipe right: Move one lane right.
- Swipe up: Jump.
- Swipe down: Slide.

The controls must be responsive and reliable.

Requirements:

- Detect deliberate swipes rather than small accidental movements.
- Prevent multiple unintended lane changes from a single swipe.
- Allow lane changes while jumping or sliding when appropriate.
- Support quick consecutive swipes.
- Ensure the player cannot move outside the three lanes.
- Keep the player visually aligned with the selected lane.
- Provide smooth transitions between lanes.
- Make jump and slide animations feel responsive.

Use gesture handling that works consistently on different screen sizes.

The game should support both portrait orientations and adapt its UI to different device dimensions.

## 4. Game engine

Build a game loop that manages:

- Player position.
- Player movement.
- Jumping and sliding.
- Forward movement.
- Obstacle spawning.
- Collision detection.
- Coin collection.
- Power-up effects.
- Score calculation.
- Distance tracking.
- Difficulty progression.
- Game-over conditions.

Keep game simulation updates separate from React component rendering wherever possible.

Avoid unnecessary React re-renders during gameplay.

Use delta time for movement and animation calculations so gameplay remains consistent across different frame rates.

Use object pooling or another appropriate optimization to avoid repeatedly creating and destroying large numbers of game objects.

The game should remain responsive during extended runs.

## 5. Player character

Create a colorful, appealing character with an original design.

The character should have the following states:

- Idle.
- Running.
- Jumping.
- Falling.
- Sliding.
- Collecting an item.
- Getting hit.
- Game over.

Animations should transition smoothly between states.

Use exaggerated, readable movements that make it easy for younger players to understand what the character is doing.

The character should remain visually centered and easy to follow during gameplay.

Initially, implement one playable character. Design the system so additional characters can be introduced later.

## 6. Obstacles and collision detection

Implement several types of obstacles:

- Ground barriers that require jumping.
- Overhead barriers that require sliding.
- Obstacles that require changing lanes.
- Moving obstacles.
- Gaps that require jumping.
- Large hazards that occupy an entire lane.

Obstacles should be introduced gradually.

Ensure collision detection accounts for the player's current lane, vertical position, and movement state.

Collisions should feel fair and predictable.

Avoid spawning impossible obstacle combinations.

The player should always have a reasonable opportunity to react to upcoming obstacles.

Introduce a short grace period after certain collisions only if it improves the gameplay experience.

## 7. Coins and collectibles

Add coins that the player can collect during a run.

Coins should:

- Appear in lanes.
- Form trails and patterns.
- Be placed along paths that encourage jumping and lane changes.
- Have satisfying collection animations.
- Trigger a sound effect when collected.
- Update the player's coin count immediately.

Create reusable coin patterns to make level generation manageable.

Ensure that coin placement does not encourage unavoidable collisions.

## 8. Power-ups

Implement the following power-ups:

### Coin Magnet

Attracts nearby coins automatically for a limited duration.

### Shield

Protects the player from one collision.

### Jetpack

Allows the player to fly above obstacles while collecting coins.

### Score Multiplier

Temporarily multiplies the score earned.

### Speed Boost

Temporarily increases forward speed and protects the player from obstacles.

Each power-up should have:

- A distinct visual appearance.
- An activation animation.
- A clear duration indicator.
- A collection sound.
- A cooldown or expiration mechanism where appropriate.

Power-ups should be easy to understand and visually distinguishable.

Design the power-up system so additional abilities can be added without rewriting the game engine.

## 9. Progression and upgrades

Create a progression system that rewards players for continued play.

Players should earn coins and experience by:

- Collecting coins.
- Running longer distances.
- Completing missions.
- Achieving milestones.
- Unlocking achievements.

Implement an upgrade shop.

Initially, include these upgradeable abilities:

- Coin Magnet duration.
- Jetpack duration.
- Shield duration.
- Score Multiplier duration.
- Starting Boost duration.

Each ability should have five upgrade levels.

Upgrades should have increasing coin costs.

Display:

- Current upgrade level.
- Next upgrade level.
- Upgrade cost.
- Current ability duration.
- Improved duration after upgrading.

Upgrades should persist between sessions.

Make progression satisfying without requiring purchases or making the game unfair for players who do not spend money.

## 10. Characters and cosmetics

Create a character selection screen.

Players should be able to unlock and select additional characters.

Design a flexible cosmetic system supporting:

- Characters.
- Outfits.
- Accessories.
- Hoverboards.
- Trails.

For the initial version, implement the character selection interface and at least one additional unlockable cosmetic if feasible.

Cosmetics should be separate from gameplay statistics.

The game should not require real-money purchases to unlock its initial content.

## 11. Missions and achievements

Implement a mission system with objectives such as:

- Collect a certain number of coins.
- Run a specific distance.
- Jump over a certain number of obstacles.
- Use power-ups.
- Complete a run without colliding.

Missions should have clear progress indicators.

Completing a mission should reward the player with coins or experience.

Create an achievement system for milestones such as:

- First run.
- First 1,000 meters.
- First 100 coins.
- First power-up.
- Long-distance achievements.

Persist completed achievements locally.

## 12. Difficulty progression

The game should gradually become more challenging as the player travels farther.

Increase difficulty through:

- Forward speed.
- Obstacle frequency.
- More complex obstacle patterns.
- Shorter reaction windows.
- More frequent combinations of obstacles.

Difficulty must increase gradually and remain fair.

Create a difficulty curve that can be adjusted independently of the core game engine.

Avoid sudden, unpredictable difficulty spikes.

## 13. Visual design

The game should have a polished, colorful, stylized visual identity.

Design direction:

- Bright, saturated colors.
- Stylized 3D-inspired environments.
- Rounded, friendly characters.
- Smooth animations.
- Strong visual feedback.
- Distinctive obstacle designs.
- Attractive particle effects.
- Clear visual hierarchy.

The visual style should appeal to children and teenagers without looking overly childish.

Use a consistent art direction throughout the game.

The initial environment should be a vibrant futuristic city.

Design the environment so additional themes can be introduced later, including:

- Tropical beach.
- Amusement park.
- Snowy mountain.
- Space station.

Use parallax, perspective, lighting effects, and environmental animations where appropriate.

If true 3D rendering is not practical with the selected technology, implement a polished 2.5D experience.

Do not use excessive visual effects that obscure obstacles or interfere with gameplay.

Use original or properly licensed assets. Do not rely on copyrighted game assets.

## 14. User interface

Create the following screens:

### Main Menu

- Play button.
- Character selection.
- Upgrade shop.
- Missions.
- Achievements.
- Settings.
- Player level and currency.

### Gameplay HUD

- Current score.
- Distance traveled.
- Coin count.
- Active power-up indicators.
- Pause button.

The HUD should be easy to read without distracting from gameplay.

### Pause Menu

- Resume.
- Restart.
- Return to main menu.

### Game Over

- Final score.
- Distance.
- Coins collected.
- New personal record indicator.
- Mission progress.
- Restart button.
- Main menu button.

### Upgrade Shop

- Available upgrades.
- Upgrade levels.
- Upgrade costs.
- Upgrade buttons.
- Current coin balance.

### Character Selection

- Available characters.
- Locked characters.
- Unlock requirements.
- Selected character indicator.

Use attractive transitions between screens.

Buttons should have satisfying press animations and clear interaction states.

## 15. Audio and feedback

Add audio support for:

- Coin collection.
- Jumping.
- Sliding.
- Power-up collection.
- Power-up activation.
- Collisions.
- Mission completion.
- Button interactions.
- Game over.

Include background music with a way to mute it.

Use subtle haptic feedback for important events where supported.

Provide visual feedback for all important interactions so the game remains understandable without sound.

## 16. Save system

Persist the following locally:

- Total coins.
- Player experience and level.
- Purchased upgrades.
- Unlocked characters.
- Selected character.
- Unlocked cosmetics.
- Completed achievements.
- Mission progress.
- Personal high score.
- Settings.

Use a versioned save format that can be migrated as the game evolves.

Handle missing, corrupted, or outdated save data gracefully.

The game should not lose player progress when the app is closed or restarted.

## 17. Performance and quality

Performance is a priority.

Requirements:

- Target a consistent 60 FPS on supported devices.
- Minimize unnecessary React renders.
- Avoid excessive allocations during gameplay.
- Optimize rendering and collision detection.
- Avoid memory leaks.
- Clean up animation loops and event listeners.
- Support different screen sizes.
- Test on both iOS and Android.

Make sure the game can run smoothly on reasonably capable mid-range mobile devices.

## 18. Development approach

Do not attempt to implement every feature simultaneously.

First, inspect the existing project and identify its current structure and dependencies.

Then propose a development plan with clearly defined milestones.

Implement the game in the following order:

### Milestone 1: Playable prototype

- Game screen.
- Three-lane movement.
- Swipe controls.
- Jumping and sliding.
- Basic obstacles.
- Collision detection.
- Score and distance tracking.
- Game-over and restart.

### Milestone 2: Core gameplay

- Coin collection.
- Obstacle variety.
- Difficulty progression.
- Power-ups.
- Sound effects.
- Improved animations.

### Milestone 3: Progression

- Currency.
- Upgrade shop.
- Local save system.
- Missions.
- Achievements.
- Character selection.

### Milestone 4: Visual polish

- Improved character animations.
- Environment design.
- Particle effects.
- Screen transitions.
- UI polish.
- Audio polish.

### Milestone 5: Optimization and testing

- Performance profiling.
- Device testing.
- Bug fixes.
- Gameplay balancing.
- Accessibility and usability improvements.

At the end of each milestone:

- Verify the game builds.
- Test the implemented features.
- Fix any errors.
- Summarize what was implemented.
- Identify remaining work.
- Explain how to test the current build.

## 19. Important development principles

- Prioritize a fun, responsive core gameplay loop.
- Do not sacrifice performance for unnecessary visual effects.
- Keep gameplay mechanics modular.
- Avoid overengineering.
- Use TypeScript throughout.
- Avoid unnecessary dependencies.
- Do not implement placeholder functionality that appears complete but does not work.
- Do not introduce real-money purchases or advertising in the initial version.
- Ensure the game is playable without an internet connection.
- Keep the code maintainable and easy to extend.

## 20. Early decisions and priorities

Three decisions have a large effect on how development goes. Settle them early.

### Choose 2D, 2.5D, or 3D

| Approach | Advantages | Disadvantages |
| --- | --- | --- |
| 2D | Simple, performant, easier to build | Less depth and visual impact |
| 2.5D | Good visuals, manageable complexity | Requires careful perspective and animation |
| Full 3D | Immersive environments and characters | More complicated rendering and asset pipeline |

Start with 2.5D. Perspective, colorful environments, and animated characters are enough for a convincing endless runner without building a full 3D engine.

If fully animated 3D characters and environments become a requirement, flag it: Unity or another dedicated game engine would be a better fit than React Native.

### Make the first 30 seconds fun

How the game feels the first time someone plays matters more than anything else.

Prioritize:

- Immediate responsiveness to swipes.
- Satisfying jumps and slides.
- Smooth lane transitions.
- Clear obstacle visibility.
- Exciting coin collection.
- A quick restart after a collision.

Do not build the upgrade shop or other progression systems before the core run is fun to play.

### Make progression meaningful

Upgrades should not be the only reason to play. Give players several goals:

- Beat their high score.
- Unlock a new character.
- Complete a mission.
- Collect enough coins for an upgrade.
- Explore a new environment.
- Improve their skills.

Each of these is a separate reason to start another run.

Because the audience is children and teenagers, avoid manipulative monetization mechanics, especially paid randomized rewards. Build the game around skill, achievements, and unlockable content.

### Pacing

Treat the work as a series of small, testable features. Rough pacing for a solo developer working with an AI coding agent (estimates, not deadlines; the art assets and rendering approach can shift them a lot):

- **Week 1:** Playable prototype with one character, three lanes, swipe gestures, obstacles, and scoring.
- **Week 2:** Coins, power-ups, a game-over screen, and basic animations.
- **Week 3:** Upgrade shop, character selection, and local save system.
- **After that:** Visual identity, additional environments, sound, and gameplay balancing.

Get the playable prototype running on a real phone as early as possible so it can be tested by hand. The quality of the movement and gameplay matters far more than how many features the first version has.

## 21. First task

Start by inspecting the project and its current dependencies.

Before implementing the game, explain:

1. The recommended rendering approach for this game.
2. The proposed architecture.
3. Any technical limitations or risks with Expo and React Native.
4. The implementation plan for the first playable prototype.

Then implement Milestone 1.

Focus on making the core gameplay feel responsive and enjoyable before expanding into progression, cosmetics, and additional environments.
