/**
 * Custom hook for LIFEOS state management.
 * Uses Observer pattern for state changes,
 * Singleton pattern for store access,
 * and Strategy pattern for different update strategies.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Subject, Observer, BaseObserver } from '../core/patterns';
import { deepClone, deepEqual, normalizeKeysToCamelCase, removeEmptyValues } from '../core/utils';
import { MobileAppError } from '../core/exceptions/base';
import type { Goal, CreateGoalRequest, UpdateGoalRequest } from '../goals';
import type { EngineId, EngineResult, EngineInput } from '../engines';
import type { AnyObject } from '../core/utils/types';

/**
 * LIFEOS state interface.
 */
export interface LifeOsState {
  /**
   * List of goals.
   */
  goals: Goal[];

  /**
   * Loading state for goals.
   */
  goalsLoading: boolean;

  /**
   * Error for goals.
   */
  goalsError: MobileAppError | null;

  /**
   * Currently selected goal ID.
   */
  selectedGoalId: string | null;

  /**
   * User profile.
   */
  user: {
    id: string;
    email?: string;
    name?: string;
    username?: string;
  } | null;

  /**
   * Engine results cache.
   */
  engineResults: Map<string, EngineResult>;

  /**
   * Loading state for engines.
   */
  enginesLoading: Map<EngineId, boolean>;

  /**
   * Error state for engines.
   */
  enginesError: Map<EngineId, MobileAppError | null>;

  /**
   * Last updated timestamp.
   */
  lastUpdated: number;

  /**
   * Authentication token.
   */
  authToken: string | null;

  /**
   * Initialization state.
   */
  initialized: boolean;
}

/**
 * LIFEOS action types.
 */
export type LifeOsAction =
  | { type: 'INIT' }
  | { type: 'SET_GOALS'; payload: Goal[] }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'SET_GOALS_LOADING'; payload: boolean }
  | { type: 'SET_GOALS_ERROR'; payload: MobileAppError | null }
  | { type: 'SELECT_GOAL'; payload: string | null }
  | { type: 'SET_USER'; payload: LifeOsState['user'] }
  | { type: 'SET_ENGINE_RESULT'; payload: { key: string; result: EngineResult } }
  | { type: 'SET_ENGINE_LOADING'; payload: { engineId: EngineId; loading: boolean } }
  | { type: 'SET_ENGINE_ERROR'; payload: { engineId: EngineId; error: MobileAppError | null } }
  | { type: 'SET_AUTH_TOKEN'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET' };

/**
 * Action creator functions.
 */
export const actions = {
  init: (): LifeOsAction => ({ type: 'INIT' }),
  setGoals: (goals: Goal[]): LifeOsAction => ({ type: 'SET_GOALS', payload: goals }),
  addGoal: (goal: Goal): LifeOsAction => ({ type: 'ADD_GOAL', payload: goal }),
  updateGoal: (goal: Goal): LifeOsAction => ({ type: 'UPDATE_GOAL', payload: goal }),
  deleteGoal: (id: string): LifeOsAction => ({ type: 'DELETE_GOAL', payload: id }),
  setGoalsLoading: (loading: boolean): LifeOsAction => ({ type: 'SET_GOALS_LOADING', payload: loading }),
  setGoalsError: (error: MobileAppError | null): LifeOsAction => ({ type: 'SET_GOALS_ERROR', payload: error }),
  selectGoal: (id: string | null): LifeOsAction => ({ type: 'SELECT_GOAL', payload: id }),
  setUser: (user: LifeOsState['user']): LifeOsAction => ({ type: 'SET_USER', payload: user }),
  setEngineResult: (key: string, result: EngineResult): LifeOsAction => ({
    type: 'SET_ENGINE_RESULT',
    payload: { key, result },
  }),
  setEngineLoading: (engineId: EngineId, loading: boolean): LifeOsAction => ({
    type: 'SET_ENGINE_LOADING',
    payload: { engineId, loading },
  }),
  setEngineError: (engineId: EngineId, error: MobileAppError | null): LifeOsAction => ({
    type: 'SET_ENGINE_ERROR',
    payload: { engineId, error },
  }),
  setAuthToken: (token: string | null): LifeOsAction => ({ type: 'SET_AUTH_TOKEN', payload: token }),
  setInitialized: (initialized: boolean): LifeOsAction => ({ type: 'SET_INITIALIZED', payload: initialized }),
  reset: (): LifeOsAction => ({ type: 'RESET' }),
};

/**
 * Initial state.
 */
const initialState: LifeOsState = {
  goals: [],
  goalsLoading: false,
  goalsError: null,
  selectedGoalId: null,
  user: null,
  engineResults: new Map(),
  enginesLoading: new Map(),
  enginesError: new Map(),
  lastUpdated: 0,
  authToken: null,
  initialized: false,
};

/**
 * Reducer function.
 */
function reducer(state: LifeOsState, action: LifeOsAction): LifeOsState {
  switch (action.type) {
    case 'INIT':
      return { ...state };

    case 'SET_GOALS':
      return {
        ...state,
        goals: action.payload,
        goalsLoading: false,
        goalsError: null,
        lastUpdated: Date.now(),
      };

    case 'ADD_GOAL':
      return {
        ...state,
        goals: [...state.goals, action.payload],
        lastUpdated: Date.now(),
      };

    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.payload.id ? action.payload : g)),
        lastUpdated: Date.now(),
      };

    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.payload),
        selectedGoalId: state.selectedGoalId === action.payload ? null : state.selectedGoalId,
        lastUpdated: Date.now(),
      };

    case 'SET_GOALS_LOADING':
      return {
        ...state,
        goalsLoading: action.payload,
        goalsError: null,
      };

    case 'SET_GOALS_ERROR':
      return {
        ...state,
        goalsLoading: false,
        goalsError: action.payload,
      };

    case 'SELECT_GOAL':
      return {
        ...state,
        selectedGoalId: action.payload,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };

    case 'SET_ENGINE_RESULT':
      return {
        ...state,
        engineResults: new Map(state.engineResults).set(
          action.payload.key,
          action.payload.result,
        ),
        lastUpdated: Date.now(),
      };

    case 'SET_ENGINE_LOADING':
      return {
        ...state,
        enginesLoading: new Map(state.enginesLoading).set(
          action.payload.engineId,
          action.payload.loading,
        ),
      };

    case 'SET_ENGINE_ERROR':
      return {
        ...state,
        enginesError: new Map(state.enginesError).set(
          action.payload.engineId,
          action.payload.error,
        ),
      };

    case 'SET_AUTH_TOKEN':
      return {
        ...state,
        authToken: action.payload,
      };

    case 'SET_INITIALIZED':
      return {
        ...state,
        initialized: action.payload,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

/**
 * State change observer.
 */
export interface StateObserver<T = LifeOsState> extends Observer<T> {
  (state: T, previousState: T): void;
}

/**
 * LIFEOS store class.
 * Uses Singleton pattern and Observer pattern.
 */
export class LifeOsStore {
  private state: LifeOsState;
  private stateSubject: Subject<LifeOsState>;
  private observers: Set<StateObserver>;

  constructor() {
    this.state = initialState;
    this.stateSubject = new Subject();
    this.observers = new Set();
  }

  /**
   * Get current state.
   */
  getState(): LifeOsState {
    return deepClone(this.state);
  }

  /**
   * Dispatch an action.
   */
  dispatch(action: LifeOsAction): LifeOsState {
    const previousState = this.state;
    this.state = reducer(this.state, action);

    // Notify observers
    this.stateSubject.notify(this.state);
    this.observers.forEach((observer) => {
      try {
        observer(this.state, previousState);
      } catch (error) {
        console.error('Error in state observer:', error);
      }
    });

    return this.state;
  }

  /**
   * Subscribe to state changes.
   */
  subscribe(observer: StateObserver): () => void {
    this.observers.add(observer);
    return () => this.unsubscribe(observer);
  }

  /**
   * Unsubscribe from state changes.
   */
  unsubscribe(observer: StateObserver): void {
    this.observers.delete(observer);
  }

  /**
   * Subscribe to state changes using Subject.
   */
  onStateChange(callback: (state: LifeOsState) => void): () => void {
    return this.stateSubject.subscribe({ update: callback });
  }

  /**
   * Select a specific part of the state.
   */
  select<T>(selector: (state: LifeOsState) => T): T {
    return selector(this.state);
  }

  /**
   * Select a specific part of the state with memoization.
   */
  selectMemoized<T>(selector: (state: LifeOsState) => T, equalityFn: (a: T, b: T) => boolean = deepEqual): T {
    let lastState: LifeOsState | null = null;
    let lastResult: T | null = null;

    return this.select((state) => {
      if (lastState === null || !equalityFn(lastResult as T, selector(state))) {
        lastState = state;
        lastResult = selector(state);
      }
      return lastResult as T;
    });
  }

  /**
   * Get a selector function that returns the current value.
   */
  createSelector<T>(selector: (state: LifeOsState) => T): () => T {
    return () => selector(this.state);
  }

  /**
   * Reset to initial state.
   */
  reset(): LifeOsState {
    return this.dispatch(actions.reset());
  }

  /**
   * Static instance for singleton access.
   */
  private static instance: LifeOsStore | null = null;

  static getInstance(): LifeOsStore {
    if (this.instance === null) {
      this.instance = new LifeOsStore();
    }
    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}

/**
 * Default store instance.
 */
export const store = LifeOsStore.getInstance();

/**
 * React hook for LIFEOS state.
 */
export function useLifeOs(): LifeOsState {
  const [state, setState] = useState<LifeOsState>(store.getState());

  useEffect(() => {
    const unsubscribe = store.onStateChange(setState);
    return () => unsubscribe();
  }, []);

  return state;
}

/**
 * React hook for selected LIFEOS state.
 */
export function useLifeOsSelector<T>(
  selector: (state: LifeOsState) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  const storeState = useLifeOs();
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);

  // Keep refs updated
  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;

  const [selectedState, setSelectedState] = useState<T>(() => selector(storeState));

  useEffect(() => {
    const newSelectedState = selectorRef.current(storeState);
    if (equalityFnRef.current) {
      if (!equalityFnRef.current(selectedState, newSelectedState)) {
        setSelectedState(newSelectedState);
      }
    } else {
      setSelectedState(newSelectedState);
    }
  }, [storeState]);

  return selectedState;
}

/**
 * React hook for LIFEOS actions.
 */
export function useLifeOsDispatch(): {
  dispatch: (action: LifeOsAction) => LifeOsState;
  actions: typeof actions;
} {
  const dispatch = useCallback((action: LifeOsAction) => store.dispatch(action), []);

  return useMemo(
    () => ({
      dispatch,
      actions: { ...actions },
    }),
    [dispatch],
  );
}

/**
 * React hook for goals.
 */
export function useGoals(): {
  goals: Goal[];
  loading: boolean;
  error: MobileAppError | null;
  selectedGoal: Goal | null;
  selectGoal: (id: string | null) => void;
  addGoal: (goal: CreateGoalRequest) => Promise<Goal | null>;
  updateGoal: (id: string, update: UpdateGoalRequest) => Promise<Goal | null>;
  deleteGoal: (id: string) => Promise<boolean>;
  refreshGoals: () => Promise<void>;
} {
  const state = useLifeOs();
  const { dispatch, actions } = useLifeOsDispatch();

  const goals = useLifeOsSelector((s) => s.goals);
  const loading = useLifeOsSelector((s) => s.goalsLoading);
  const error = useLifeOsSelector((s) => s.goalsError);
  const selectedGoalId = useLifeOsSelector((s) => s.selectedGoalId);

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId) || null,
    [goals, selectedGoalId],
  );

  const selectGoal = useCallback(
    (id: string | null) => {
      dispatch(actions.selectGoal(id));
    },
    [dispatch, actions],
  );

  const addGoal = useCallback(
    async (request: CreateGoalRequest): Promise<Goal | null> => {
      // This would be replaced with actual API call
      // For now, create a mock goal
      const newGoal: Goal = {
        id: Date.now().toString(),
        title: request.title,
        description: request.description || '',
        completed: false,
        completedAt: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionCount: 0,
        targetDate: request.targetDate,
        priority: request.priority || 'medium',
        tags: request.tags || [],
      };

      dispatch(actions.addGoal(newGoal));
      return newGoal;
    },
    [dispatch, actions],
  );

  const updateGoal = useCallback(
    async (id: string, update: UpdateGoalRequest): Promise<Goal | null> => {
      // This would be replaced with actual API call
      const existingGoal = goals.find((g) => g.id === id);
      if (!existingGoal) return null;

      const updatedGoal: Goal = {
        ...existingGoal,
        title: update.title ?? existingGoal.title,
        description: update.description ?? existingGoal.description,
        completed: update.completed ?? existingGoal.completed,
        completedAt: update.completed ? new Date().toISOString() : existingGoal.completedAt,
        updatedAt: new Date().toISOString(),
        targetDate: update.targetDate ?? existingGoal.targetDate,
        priority: update.priority ?? existingGoal.priority,
        tags: update.tags ?? existingGoal.tags,
      };

      dispatch(actions.updateGoal(updatedGoal));
      return updatedGoal;
    },
    [dispatch, actions, goals],
  );

  const deleteGoal = useCallback(
    async (id: string): Promise<boolean> => {
      // This would be replaced with actual API call
      dispatch(actions.deleteGoal(id));
      return true;
    },
    [dispatch, actions],
  );

  const refreshGoals = useCallback(async () => {
    // This would be replaced with actual API call
    // For now, simulate loading
    dispatch(actions.setGoalsLoading(true));
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      dispatch(actions.setGoals(goals));
    } catch (error) {
      dispatch(actions.setGoalsError(error as MobileAppError));
    }
  }, [dispatch, actions, goals]);

  return {
    goals,
    loading,
    error,
    selectedGoal,
    selectGoal,
    addGoal,
    updateGoal,
    deleteGoal,
    refreshGoals,
  };
}

/**
 * React hook for engines.
 */
export function useEngines(): {
  runEngine: (engineId: EngineId, input: EngineInput) => Promise<EngineResult | null>;
  getEngineResult: (key: string) => EngineResult | null;
  loading: (engineId: EngineId) => boolean;
  error: (engineId: EngineId) => MobileAppError | null;
  clearEngineResult: (key: string) => void;
  clearEngineError: (engineId: EngineId) => void;
} {
  const state = useLifeOs();
  const { dispatch, actions } = useLifeOsDispatch();

  const runEngine = useCallback(
    async (engineId: EngineId, input: EngineInput): Promise<EngineResult | null> => {
      const key = `${engineId}:${JSON.stringify(input)}`;
      const existingResult = state.engineResults.get(key);

      if (existingResult) {
        return existingResult;
      }

      dispatch(actions.setEngineLoading(engineId, true));
      dispatch(actions.setEngineError(engineId, null));

      try {
        // This would be replaced with actual engine execution
        // For now, create a mock result
        const result: EngineResult = {
          summary: `Engine ${engineId} processed ${input.goals.length} goals`,
          evidence: [`Input: ${input.goals.length} goals`],
          assumptions: [`Engine ${engineId} assumptions`],
          limitations: [`Engine ${engineId} limitations`],
          version: '1.0.0',
          metadata: {
            engineId,
            timestamp: new Date().toISOString(),
          },
        };

        dispatch(actions.setEngineResult(key, result));
        return result;
      } catch (error) {
        dispatch(actions.setEngineError(engineId, error as MobileAppError));
        return null;
      } finally {
        dispatch(actions.setEngineLoading(engineId, false));
      }
    },
    [dispatch, actions, state.engineResults],
  );

  const getEngineResult = useCallback(
    (key: string): EngineResult | null => {
      return state.engineResults.get(key) || null;
    },
    [state.engineResults],
  );

  const loading = useCallback(
    (engineId: EngineId): boolean => {
      return state.enginesLoading.get(engineId) || false;
    },
    [state.enginesLoading],
  );

  const error = useCallback(
    (engineId: EngineId): MobileAppError | null => {
      return state.enginesError.get(engineId) || null;
    },
    [state.enginesError],
  );

  const clearEngineResult = useCallback(
    (key: string): void => {
      dispatch(actions.setEngineResult(key, null as any));
    },
    [dispatch, actions],
  );

  const clearEngineError = useCallback(
    (engineId: EngineId): void => {
      dispatch(actions.setEngineError(engineId, null));
    },
    [dispatch, actions],
  );

  return {
    runEngine,
    getEngineResult,
    loading,
    error,
    clearEngineResult,
    clearEngineError,
  };
}

/**
 * React hook for user authentication.
 */
export function useAuth(): {
  user: LifeOsState['user'];
  authToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: LifeOsState['user']) => void;
  logout: () => void;
  setUser: (user: LifeOsState['user']) => void;
} {
  const state = useLifeOs();
  const { dispatch, actions } = useLifeOsDispatch();

  const isAuthenticated = useMemo(
    () => !!state.authToken && !!state.user,
    [state.authToken, state.user],
  );

  const login = useCallback(
    (token: string, user: LifeOsState['user']) => {
      dispatch(actions.setAuthToken(token));
      dispatch(actions.setUser(user));
      dispatch(actions.setInitialized(true));
    },
    [dispatch, actions],
  );

  const logout = useCallback(() => {
    dispatch(actions.setAuthToken(null));
    dispatch(actions.setUser(null));
    dispatch(actions.reset());
  }, [dispatch, actions]);

  const setUser = useCallback(
    (user: LifeOsState['user']) => {
      dispatch(actions.setUser(user));
    },
    [dispatch, actions],
  );

  return {
    user: state.user,
    authToken: state.authToken,
    isAuthenticated,
    login,
    logout,
    setUser,
  };
}

/**
 * React hook for initialization.
 */
export function useLifeOsInit(): {
  initialized: boolean;
  initializing: boolean;
  init: () => Promise<void>;
} {
  const state = useLifeOs();
  const { dispatch, actions } = useLifeOsDispatch();
  const { authToken, user } = useAuth();

  const initializing = useRef(false);

  const init = useCallback(async () => {
    if (initializing.current) return;
    initializing.current = true;

    try {
      // Simulate initialization
      dispatch(actions.setGoalsLoading(true));

      // Load user data if authenticated
      if (authToken && user) {
        // Load goals
        // This would be replaced with actual API call
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      dispatch(actions.setInitialized(true));
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      dispatch(actions.setGoalsLoading(false));
      initializing.current = false;
    }
  }, [dispatch, actions, authToken, user]);

  return {
    initialized: state.initialized,
    initializing: initializing.current,
    init,
  };
}
