import { store as zustandStore, initialState } from "./create";
import type { AppState } from "./types";
import type { Store as StoreInterface, Subscribe } from "./index";

/**
 * Retrieves the current state from the store.
 * @returns The current AppState.
 */
const getState = (): AppState => {
  return zustandStore.getState();
};

/**
 * Retrieves the initial state of the store.
 * @returns The initial AppState.
 */
const getInitialState = (): AppState => {
  return initialState;
};

/**
 * Sets the store's state.
 * @param partial A partial AppState object, or a function that takes the current AppState and returns a new or partial AppState.
 * @param replace Optional boolean. If true, the state is replaced; otherwise, it's merged.
 */
const setState = (
  partial:
    | AppState
    | Partial<AppState>
    | ((state: AppState) => AppState | Partial<AppState>),
  replace?: boolean,
): void => {
  if (replace === true) {
    zustandStore.setState(
      partial as AppState | ((s: AppState) => AppState),
      true,
    );
  } else {
    zustandStore.setState(partial, false); // Or simply pass `replace` which could be undefined
  }
};

/**
 * Subscribes to state changes in the store.
 * @param listener A function that will be called with the new state and previous state upon changes.
 * @returns An unsubscribe function.
 */
const subscribe: Subscribe = listener => {
  return zustandStore.subscribe(listener);
};

/**
 * An object that provides core store operations, conforming to the StoreInterface.
 */
export const mainStore: StoreInterface = {
  getState,
  getInitialState,
  setState,
  subscribe,
};
