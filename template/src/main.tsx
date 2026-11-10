import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'

/* For its side effect: installs the mailbox before React mounts, so a host's
   greeting that arrives early is held rather than lost — and the error
   reporter, so a page that fails tells the host why. */
import 'kehikot-module-protocol/client'
import { ReportErrors } from 'kehikot-module-protocol/client/react'
import { App } from './app.tsx'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ReportErrors>
        <App />
      </ReportErrors>
    </StrictMode>,
  )
}
