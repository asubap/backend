"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = void 0;
var dotenv_1 = require("dotenv");
var supabase_js_1 = require("@supabase/supabase-js");
(0, dotenv_1.config)();
var supabaseUrl = process.env.VITE_SUPABASE_URL || "";
var supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration. Please check your environment variables.");
}
var createSupabaseClient = function (token) {
    if (token) {
        return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: "Bearer ".concat(token)
                }
            }
        });
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
};
exports.createSupabaseClient = createSupabaseClient;
