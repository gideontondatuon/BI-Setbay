import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const configured = Boolean(
  url &&
  key &&
  !url.includes("YOUR_PROJECT") &&
  !key.includes("YOUR_SUPABASE") &&
  url.startsWith("http")
);

// Fallback placeholder URL and key so client initialization never throws during build or when unconfigured
export const supabase = createClient(
  configured ? url : "https://placeholder-project.supabase.co",
  configured ? key : "placeholder-anon-key",
  {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: true,
    },
  }
);
