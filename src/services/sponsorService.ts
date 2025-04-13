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
    async addSponsors(sponsor_name: string, passcode: string, emailList: string[]) {
        const { data, error } = await this.supabase.from("sponsors_creds")
        .insert({
            sponsor: sponsor_name,
            passcode_hash: passcode,
            emails: emailList
        });
        if (error) throw error;
        return data;
    }

  
  
}

