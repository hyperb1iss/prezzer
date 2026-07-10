import { Deck } from 'prezzer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'prezzer/styles.css'
import './index.css'
import { acts, slides } from './slides'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

createRoot(root).render(
  <StrictMode>
    <Deck slides={slides} acts={acts} />
  </StrictMode>
)
