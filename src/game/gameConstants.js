// gameConstants.js — Global fallback defaults only; per-level overrides live in levels.js.

export const LANES = [-2.3, 0, 2.3]
export const ROAD_LEN = 2000
/** Extra asphalt past the main plane so the road reads into the horizon. */
export const ROAD_VISUAL_EXTENSION = 120
export const MOVE_SPEED = 22
export const LANE_SMOOTH = 14
export const JUMP_VELOCITY = 8.2
export const GRAVITY = 24
export const ROAD_W = 8.2
export const CAM_H = 2.2
/** Behind the player (+Z); slightly larger pulls the camera back so more road fills the bottom of the frame. */
export const CAM_Z_OFFSET = 5.1
/** Look-ahead for camera target (-Z along the road); a bit farther steadies the chase view. */
export const CAM_LOOK_AHEAD_Z = 15
/** Starting player Z — negative offsets place the runner slightly forward into the road. */
export const PLAYER_START_Z = -2.8
export const ROLL_DURATION = 0.45
export const TAXI_SPEED = 28
export const TAXI_SPAWN_MIN = 0.8
export const TAXI_SPAWN_MAX = 1.6
export const TAXI_HIT_RZ = 3.2
export const TAXI_HIT_RX = 1.3
/** Scale so the taxi’s largest axis is this long in world units. */
export const TAXI_MAX_AXIS = 3.0
/** Scale so a level 2 obstacle’s largest axis is this long in world units. */
export const OBSTACLE_MAX_AXIS = 3.0
/** Scale so the level 2 player car’s largest axis is this long in world units. */
export const PLAYER_CAR_MAX_AXIS = 2.6
/** Scale so the Coke collectible GLB’s largest axis is this long in world units. */
export const COKE_MAX_AXIS = 1.05
/** Level 2: spend this many Coke bottles to keep driving after a crash. */
export const LEVEL2_CRASH_CONTINUE_COST = 3
export const TAXI_SPAWN_AHEAD_MIN = 38
export const TAXI_SPAWN_AHEAD_MAX = 72
/** Yaw: taxis travel in +Z; use 0 or Math.PI so the hood points toward the player. */
export const TAXI_YAW_Y = 0
/** Potholes: 2D hit in XZ; slow W/S when feet are in the zone unless jumped over. */
export const POTHOLE_HALF_X = 0.52
export const POTHOLE_HALF_Z = 0.88
export const POTHOLE_SLOW_MULT = 0.38
/** Above this Y (feet), the player is treated as over the hole (jump / short hop). */
export const POTHOLE_CLEAR_Y = 0.2
/**
 * While jumping up, do not apply pothole slow (avoids a one-frame slow at jump start if desired).
 * Keep modest so roll/small hops still get slowed when overlapping.
 */
export const POTHOLE_IGNORE_SLOW_VY = 1.2
export const POTHOLE_COUNT = 100
/** Pothole world Z range (player moves from ~0 toward -ROAD_LEN). */
export const POTHOLE_Z_NEAR = -8
export const POTHOLE_Z_FAR = -ROAD_LEN + 25
export const POTHOLE_MAX_TRIES = 5000
/** Collectible rand coins along the road (separate from taxi dodge score). */
export const COIN_COUNT = 48
export const COIN_RADIUS = 0.34
export const COIN_HEIGHT = 0.07
export const COIN_PICKUP_RX = 0.85
export const COIN_PICKUP_RZ = 1.25
export const COIN_Z_NEAR = POTHOLE_Z_NEAR
export const COIN_Z_FAR = POTHOLE_Z_FAR
export const COIN_MAX_TRIES = 6000
export const COIN_MIN_GAP = 6.2
export const COIN_POTHOLE_CLEARANCE = 1.15
/** Extra Rand coins on Level 2 (Coke bottles stay on the main collectible stream). */
export const LEVEL2_WALLET_COIN_COUNT = 24
/** Player Z at or past this (after clamp) counts as “reached end of the road” (level win). */
export const LEVEL_END_Z = -ROAD_LEN + 1.55
export const CORRIDOR_SEGMENT_LEN = 15
export const CORRIDOR_SEGMENTS_PER_SIDE = 12
export const STATIC_SHADOW_ACTIVE_RANGE = 42
/** Toggle cheaper rendering (shadows, AA, pixel ratio, pothole instancing). */
export const LOW_SPEC_RENDERING = true
/** Ortho half-extent for Level 3/4 sun shadows (follows the player). */
export const OPEN_WORLD_SHADOW_EXTENT = 70
/**
 * World Y rotation for the player GLB so they face down the road (-Z), same side the
 * camera looks toward. Mixamo-style exports usually need Math.PI (180°) from their +Z facing.
 */
export const PLAYER_FACING_Y = Math.PI
/** Yaw baseline for the level 2 player car before road alignment. */
export const PLAYER_CAR_FACING_Y = Math.PI

/**
 * Relative spawn weight for Level 2 oncoming traffic.
 * Everyday cars make up most of the road; luxury cars are rare.
 */
export const HAZARD_CAR_SPAWN_WEIGHTS = {
  hilux: 35,
  mazda: 25,
  suzuki: 20,
  cherry: 15,
  gusheshe: 12,
  jmpd: 8,
  polo: 5,
  mercedes: 4,
  raptor: 2,
  urus: 1,
}

/** Avoid stacking the same hazard car more than this many times in a row. */
export const HAZARD_CAR_MAX_CONSECUTIVE = 2

/** Level 5 — Cape Town load shedding (battery / torch / looters). */
export const LEVEL5_BATTERY_MAX = 100
export const LEVEL5_BATTERY_DRAIN_ON = 0.4
export const LEVEL5_BATTERY_DRAIN_OFF = 0.0
export const LEVEL5_BATTERY_PER_PICKUP = 28
export const LEVEL5_BATTERY_COUNT = 36
export const LEVEL5_WALLET_COIN_COUNT = 24
export const LEVEL5_LOOTER_MAX = 10
export const LEVEL5_LOOTER_FIRST_SPAWN_DELAY = 8000

/** Level 6 — Cape Flats stealth maze (strikes / patrols / tip notes). */
export const LEVEL6_MAX_STRIKES = 3
export const LEVEL6_WALK_SPEED = 8
export const LEVEL6_CROUCH_SPEED = 4
export const LEVEL6_SPRINT_SPEED = 14
export const LEVEL6_VISION_RANGE = 22
export const LEVEL6_VISION_ANGLE = 0.72
export const LEVEL6_SOUND_RADIUS_SPRINT = 18
export const LEVEL6_THREAT_COUNT = 6
export const LEVEL6_WALLET_COIN_COUNT = 20
export const LEVEL6_COMMUNITY_TIPS = 8
export const LEVEL6_RESPAWN_DELAY = 1800
