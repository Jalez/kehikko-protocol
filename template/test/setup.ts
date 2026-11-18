/* First: the run starts without the running app's environment, so no test reaches the person's app. */
import 'kehikot-module-protocol/testing/setup'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

/* A document for the tests that render one; the pure tests do not care. */
GlobalRegistrator.register()
