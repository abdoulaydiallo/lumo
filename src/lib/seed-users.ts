import { db } from "./db";
import { users } from "./db/schema";
import { hashPassword } from "./utils";

interface UserSeed {
  name: string;
  email: string;
  password: string;
  role: "user" | "store" | "driver" | "admin" | "manager";
  phoneNumber: string;
}

async function seedUsers(): Promise<void> {
  const usersToInsert: UserSeed[] = [
    { name: "Acheteur Test", email: "user@example.com", password: "user123", role: "user", phoneNumber: "1234567890" },
    { name: "Vendeur Test", email: "store@example.com", password: "store123", role: "store", phoneNumber: "0987654321" },
    // ... autres utilisateurs ...
  ];

  try {
    const usersData = usersToInsert.map((user) => ({
      name: user.name,
      email: user.email,
      password: hashPassword(user.password),
      role: user.role,
      status: "active" as const,
      phoneNumber: user.phoneNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.insert(users).values(usersData).onConflictDoNothing();
    console.log("Utilisateurs insérés avec succès :", usersToInsert);
  } catch (error) {
    console.error("Erreur lors de l'insertion :", error);
    throw error;
  }
}

seedUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});