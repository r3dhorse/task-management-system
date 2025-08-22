import { hc } from "hono/client";
import { Apptype } from "@/app/api/[[...route]]/route";

// For client-side usage, use relative URLs to ensure proper session handling
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser should use relative URL
    return '';
  }
  
  // Server-side fallback
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  return 'http://localhost:3000';
};

export const client = hc<Apptype>(getBaseUrl(), {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: 'include', // This ensures cookies are included
    });
  },
});