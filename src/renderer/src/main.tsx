// src/renderer/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Assuming App is imported correctly

console.log('Renderer: main.tsx executing.') // <-- ADD LOG

const rootElement = document.getElementById('root')
if (rootElement) {
  console.log('Renderer: Found root element #root.') // <-- ADD LOG
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Renderer: Error during ReactDOM.render:', error) // <-- ADD LOG
    // Handle the error gracefully, maybe show an error message in the UI
  }
} else {
  // This error is critical if it appears!
}
