import app from "./app";
import dotenv from "dotenv";
import { Server } from "http";
dotenv.config();

const startServer = async (): Promise<Server> => {
  try {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

    return new Promise((resolve) => {
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        resolve(server);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
