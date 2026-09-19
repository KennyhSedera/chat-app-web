'use client'

import { AuthProvider } from "./AuthContext"
import { ChatProvider } from "./ChatContext"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>
        {/*  <ThemeProvider> */}
        {children}
        {/* </ThemeProvider> */}
      </ChatProvider>
    </AuthProvider>
  )
}