import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import extractEmail from "../utils/extractEmail";
import { getDistance } from "geolib";

export class SponsorService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  setToken(token: string) {
    this.supabase = createSupabaseClient(token);
  }
  

  
  
}

