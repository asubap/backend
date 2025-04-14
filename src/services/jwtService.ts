import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function generateSupabaseToken(userId: string): string {
  const payload = {
    sub: userId,
    role: "authenticated",
  };

  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "1h" });
}
