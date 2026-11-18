/* 2.96.0. Test harnesses a module runs in its own suite. Node-only. */
export {
  agentConformance,
  expectAgentConformance,
  fakeHost,
  type AgentConformance,
  type AgentConformanceOptions,
  type AgentDoor,
  type AgentTasksConformance,
  type FakeHost,
  type StandInProgram,
} from './agent.js'
/* 2.104.0. A test run starts without the running app's environment. */
export { APP_ENV_PREFIXES, clearAppEnvironment } from './env.js'
/* 2.105.0. Following the place, and waiting for what a test does not control. */
export { expectFollowsPlace, followsPlace, type FollowsPlace, type FollowsPlaceResult } from './follows.js'
export { settled, trackBackground, until, waitForWrites, type Background, type WaitOptions } from './settle.js'
