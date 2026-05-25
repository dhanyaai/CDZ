import { randomBytes, scryptSync } from "node:crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
function hash(p: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(p, salt, 64).toString("hex")}`;
}
const map: Record<string, string> = {
  "admin@gifterp.com": "admin123",
  "priya@gifterp.com": "sales123",
  "arjun@gifterp.com": "sales123",
  "vikram@gifterp.com": "wh123",
  "anita@gifterp.com": "fin123",
};
for (const [email, pw] of Object.entries(map)) {
  await db.update(usersTable).set({ passwordHash: hash(pw) }).where(eq(usersTable.email, email));
}
console.log("rehashed", Object.keys(map).length, "users");
process.exit(0);
