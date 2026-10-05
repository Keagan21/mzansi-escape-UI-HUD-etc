// levelBriefings.js — New-player briefing copy shown before each playable level.

import { LEVEL3_BUS_FARE } from './level3Coins.js'
import { getLevelConfig } from './levels.js'

/**
 * @typedef {{
 *   title: string
 *   setting: string
 *   goal: string
 *   avoid: string
 *   collect?: string
 *   controls: string
 * }} LevelBriefing
 */

/** @type {Record<number, LevelBriefing>} */
const BRIEFINGS = {
  1: {
    title: 'Street run',
    setting: 'Soweto streets',
    goal: 'Reach the far end of the road without getting hit. Every taxi that passes behind you scores a dodge.',
    avoid: 'Oncoming taxis end the run. Dark patches are potholes — walking through them slows you, so jump over them.',
    collect: 'Grab rand coins along the road. They go into your store wallet.',
    controls:
      'W / S or arrows: forward and back (or enable Auto-forward in Options) · A / D: change lanes · Space: jump · swipe down to roll · P or Esc: pause',
  },
  2: {
    title: 'City drive',
    setting: 'Industrial highway',
    goal: 'Drive to the end of the road. Survive the traffic and finish the route.',
    avoid: 'Do not crash into other cars or roadside obstacles. A crash costs 3 Coke bottles to continue.',
    collect: 'Collect Coke bottles on the road. You need a stash if you want a second chance after a crash.',
    controls:
      'W / S or arrows: speed (or enable Auto-forward in Options) · A / D: change lanes · P or Esc: pause · R: restart after a crash',
  },
  3: {
    title: 'Joburg CBD',
    setting: 'Open-world downtown',
    goal: `Collect ${LEVEL3_BUS_FARE} rand coins for bus fare, then reach Park Station and catch the bus.`,
    avoid: 'Amaphara chase and punch you. Keep your health up — if HP hits zero, you are done. Do not walk into Park Station without enough fare.',
    collect: `Coins are scattered on sidewalks. You need ${LEVEL3_BUS_FARE} before the bus will take you.`,
    controls:
      'Click to look around · W / S: walk (or Auto-forward in Options; S still reverses) · A / D: turn · Shift: sprint · Left click or Space: punch · P or Esc: pause',
  },
  4: {
    title: 'Cape Town Day Zero',
    setting: 'Heatwave, water crisis',
    goal: 'Restore the water chain: fix De Waal Drive pipes, copy the Newlands valve lights, time Steenbras while the lamp is green, then reach the Vodacom Building.',
    avoid: 'Thirst drains in the heat and on failed puzzles. If thirst hits zero, you collapse. Walk away from a puzzle with Q if you need a moment.',
    collect: 'Pick up water bottles to refill thirst. Optional rand coins go to your store wallet.',
    controls:
      'Click to look · W / S: walk (or Auto-forward in Options; S still reverses) · A / D: turn · Shift: sprint · Q: leave a puzzle · P or Esc: pause',
  },
  5: {
    title: 'Cape Town: Lights Out',
    setting: 'Stage 6 loadshedding',
    goal: 'Restore three substations (De Waal, Newlands, Steenbras), then reach Cape Town Stadium.',
    avoid: 'Looters chase you when the torch is on. The torch also drains battery — if battery dies you are stuck in the dark. Do not let HP hit zero.',
    collect: 'Pick up AA batteries to keep the torch alive. Use Q to toggle the torch only when you need to see or scare the dark off.',
    controls:
      'Click to look · W / S: walk (or Auto-forward in Options; S still reverses) · A / D: turn · Shift: sprint · Q: torch / leave a puzzle · Left click or Space: punch · P or Esc: pause',
  },
  6: {
    title: 'Cape Flats: Stay Hidden',
    setting: 'Cape Flats, late at night',
    goal: 'You cannot fight here. Navigate the Cape Flats without being spotted and reach safety at the Thuthuzela Care Centre.',
    avoid: 'Faceless patrollers walk the passages. You are spotted only while you stand inside a red vision cone. Walls block their view, and crouching behind a car hulk hides you. Three sightings and it is over — each one sends you back to your last checkpoint.',
    collect: 'Read community notes (E) for facts about gender-based violence — find all 8 to cut your time. Rand coins go to your store wallet. Green porch lights mark the safe route.',
    controls:
      'W A S D: move (camera follows behind you) · C: toggle crouch (or hold Ctrl) · Shift: sprint · E: read a note · P or Esc: pause',
  },
  8: {
    title: 'Soweto Homecoming',
    setting: 'Soweto, summer storm',
    goal: 'Check the clinic, school and spaza, then reach your family’s house on the hill.',
    avoid:
      'Deep water soaks you (three times and you fail). Taxis on Vilakazi Ridge hurt you — if HP hits zero the mission fails. You can continue from a checkpoint if you have a heart token; when hearts run out you start from scratch. Do not cut through the canal. Home sits west of the ridge, off the road.',
    collect:
      'Yellow street boards sit on the sidewalk and name the road for each stop. Follow Clinic Road east, School Road west, then Spaza Lane east. Pink heart tokens let you continue after a fail. Read flood-safety notes (E) — find all 8 to cut your time.',
    controls:
      'W A S D: move (camera follows behind you) · Shift: sprint · E: talk / pick up crate / read a note · P or Esc: pause',
  },
}

/** @param {number} levelNumber */
export function getLevelBriefing(levelNumber) {
  const briefing = BRIEFINGS[levelNumber]
  if (!briefing) return null
  const config = getLevelConfig(levelNumber)
  return {
    level: levelNumber,
    label: config.label,
    ...briefing,
  }
}
