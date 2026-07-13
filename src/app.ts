import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import routes from "./routes";

dotenv.config();

const app = express();

const defaultAllowedOrigins = [
    "https://asubap.com",
    "https://www.asubap.com",
    "https://frontend-iota-gules-58.vercel.app",
    "http://localhost:5173"
];

const allowedOrigins = [
    ...defaultAllowedOrigins,
    ...(process.env.FRONTEND_ORIGIN ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
];

// Configure CORS
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Mount all routes
app.use("/", routes);

export default app;
