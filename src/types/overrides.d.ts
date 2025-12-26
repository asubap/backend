import { ParamsDictionary, Query } from 'express-serve-static-core';

// Patch Express types which seem to be missing properties in the Vercel environment
declare global {
    namespace Express {
        interface Request {
            params: ParamsDictionary;
            query: Query;
            body: any;
        }
        interface Response {
            status(code: number): this;
            json(body: any): this;
        }
    }
}

// Patch Supabase types for missing admin property
import '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
    interface SupabaseAuthClient {
        admin: {
            getUserById(uid: string): Promise<{ data: { user: any }; error: any }>;
            [key: string]: any;
        };
    }
}
