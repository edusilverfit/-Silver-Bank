import "dotenv/config";
import { sendTestEmail } from "./controllers/services/emailServices.js";

async function testEmail() {
  try {
    await sendTestEmail();

    console.log("E-mail de teste enviado com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
  }
}

testEmail();