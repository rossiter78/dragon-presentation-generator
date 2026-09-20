/* The BroadcastChannel namespace that keeps the deck and the presenter
   window in lockstep.

   Re-exported from the talk config rather than declared here, so the stage
   layer keeps one stable import path while the actual name is a per-talk
   setting. Change it in src/deck/talk.config.ts, not here. */
export { CHANNEL } from '../deck/talk.config'
