// Shared UI state. Components subscribe to it rather than calling each other.
//   filter:  the gallery filter chip that's selected
//   viewing: index of the frame open in the lightbox, or null when it's closed
import { createStore } from './core/store.js';

export const ui = createStore({ filter: 'All', viewing: null });
