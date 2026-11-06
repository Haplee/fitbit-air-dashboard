import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Mantener aquí los imports originales.

async function main(): Promise<void> {
const rl=createInterface({input:stdin,output:stdout});
const password=await rl.question("Contraseña para Fitbit Air Dashboard: ");
rl.close();
if(password.length<12)throw new Error("Usa una contraseña de al menos 12 caracteres.");
console.log("APP_PASSWORD_HASH="+await bcrypt.hash(password,12));
}

main().catch((error: unknown) => {
  console.error("Password hash generation failed:", error);
  process.exitCode = 1;
});