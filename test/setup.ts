import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { MotionGlobalConfig } from 'motion'

GlobalRegistrator.register()

// motion >=13 drives the Web Animations API, and happy-dom rejects
// animation.finished on cancel, which bun test reports as an unhandled
// error. Instant animations keep deck tests deterministic and quiet.
MotionGlobalConfig.skipAnimations = true
