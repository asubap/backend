import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { testUserInjector } from "./middleware/testUserInjector";

dotenv.config();

const app = express();

// Configure CORS
app.use(cors({
    origin: [
        "https://frontend-iota-gules-58.vercel.app",
        "http://localhost:5173",
        "https://www.asubap.com"
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Test-User-Id', 'X-Test-User-Email', 'X-Test-User-Role']
}));

app.use(express.json());
app.use(cookieParser());

// Inject test user from headers (test branch only)
app.use(testUserInjector);

// Mount all routes
app.use("/", routes);

export default app;
