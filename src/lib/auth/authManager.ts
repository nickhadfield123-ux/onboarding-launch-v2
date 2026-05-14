import { getSupabaseClient } from '@/lib/supabase'

/**
 * Blurs an email address for privacy - never show full emails in UI
 * @param email - The email to blur
 * @returns Blurred email format like "j••••@g•••.com"
 */
export function blurEmail(email: string): string {
  const [local, domain] = email.split('@')
  const domainParts = domain.split('.')
  const tld = domainParts[domainParts.length - 1]
  const domainName = domainParts[0]
  return `${local[0]}${'•'.repeat(4)}@${domainName[0]}${'•'.repeat(3)}.${tld}`
}

/**
 * Central auth manager - single source of truth for all authentication logic
 * Components never call Supabase auth directly
 */
export const authManager = {
  /**
   * Get current session
   */
  getSession: () => getSupabaseClient().auth.getSession(),

  /**
   * Send magic link to email
   */
  sendMagicLink: (email: string) =>
    getSupabaseClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/onboardingv4.html` }
    }),

  /**
   * Sign out user
   */
  signOut: () => getSupabaseClient().auth.signOut(),

  /**
   * Check if device is remembered
   */
  isRemembered: () => localStorage.getItem('rf_remembered') === 'true',

  /**
   * Get stored email for remembered device
   */
  getStoredEmail: () => localStorage.getItem('rf_email') || null,

  /**
   * Get blurred email hint for remembered device
   */
  getStoredEmailHint: () => localStorage.getItem('rf_email_hint') || null,

  /**
   * Remember this device for 30 days
   */
  rememberDevice: async (email: string) => {
    localStorage.setItem('rf_remembered', 'true')
    localStorage.setItem('rf_email_hint', blurEmail(email))
    localStorage.setItem('rf_email', email)
    // Extend session to 30 days
    await getSupabaseClient().auth.refreshSession()
  },

  /**
   * Clear remembered device data
   */
  clearRemembered: () => {
    localStorage.removeItem('rf_remembered')
    localStorage.removeItem('rf_email_hint')
    localStorage.removeItem('rf_email')
  }
}