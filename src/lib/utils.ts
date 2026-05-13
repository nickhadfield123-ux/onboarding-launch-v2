import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the user's hub URL from URL parameters or default
 */
export function getHubUrl(): string {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const hubParam = urlParams.get('hub')
    if (hubParam) {
      return hubParam
    }
  }
  return 'https://onboarding-launch-v2.vercel.app/onboardingv4.html'
}