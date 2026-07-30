import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const users = await prisma.user.count();
  const venues = await prisma.venue.count();
  console.log("Conexión OK ✓");
  console.log({ users, venues });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fallo de conexión:", e);
    process.exit(1);
  });
