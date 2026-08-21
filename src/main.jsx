// Primeiro import de propósito: precisa ler o hash da URL antes do supabase-js
// processar o link de e-mail e limpar o endereço.
import './lib/linkAuth'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
