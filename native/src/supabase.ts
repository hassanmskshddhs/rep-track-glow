import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Same project as the web app (public anon key, already in the web repo).
const supabaseUrl = "https://oeqwcpnfndatxrmmemyw.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lcXdjcG5mbmRhdHhybW1lbXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzM2NzgsImV4cCI6MjA5Mzc0OTY3OH0.YVCEpk4xs6lrbwDURZsx_IgFUchpLGesCaiQm3GPkeY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
