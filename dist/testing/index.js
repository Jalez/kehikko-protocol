/* 2.96.0. Test harnesses a module runs in its own suite. Node-only. */
export { agentConformance, expectAgentConformance, fakeHost, } from './agent.js';
/* 2.104.0. A test run starts without the running app's environment. */
export { APP_ENV_PREFIXES, clearAppEnvironment } from './env.js';
