const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function getSender() {
  const email = process.env.BREVO_SENDER_EMAIL;

  if (!email) {
    throw new Error("BREVO_SENDER_EMAIL não configurado.");
  }

  return {
    name: process.env.BREVO_SENDER_NAME || "Silver Bank",
    email,
  };
}

async function sendEmail(payload: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY não configurada.");
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: getSender(),
      ...payload,
    }),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(`Erro ao enviar e-mail pela Brevo: ${error}`);
  }

  return response.json();
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
) {
  await sendEmail({
    to: [{ email, name }],
    subject: "Recuperação de senha - Silver Bank",

    htmlContent: `
      <div style="font-family: Arial, sans-serif; background: #080808; color: #ffffff; padding: 35px; border-radius: 10px;">
        <h1 style="color: #D4AF37;">Silver Bank</h1>

        <h2>Olá, ${name}!</h2>

        <p>
          Recebemos uma solicitação para redefinir a senha da sua conta.
        </p>

        <p>
          Clique no botão abaixo para criar uma nova senha:
        </p>

        <a
          href="${resetLink}"
          style="
            display: inline-block;
            background: #D4AF37;
            color: #080808;
            padding: 14px 25px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          "
        >
          Redefinir minha senha
        </a>

        <p>
          Este link expira em 30 minutos e pode ser utilizado apenas uma vez.
        </p>

        <p>
          Se você não solicitou essa alteração, ignore este e-mail.
        </p>

        <hr style="border-color: #333;">

        <p style="color: #999; font-size: 12px;">
          Silver Bank - Segurança e confiança.
        </p>
      </div>
    `,

    textContent: `Olá, ${name}! Acesse ${resetLink} para redefinir sua senha. Este link expira em 30 minutos.`,
  });
}

export async function sendTestEmail() {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL não configurado.");
  }

  await sendEmail({
    to: [{ email: senderEmail }],
    subject: "Teste de e-mail - Silver Bank",

    textContent:
      "Parabéns! O envio de e-mails do Silver Bank está funcionando corretamente.",

    htmlContent: `
      <div style="font-family: Arial; background: #080808; color: white; padding: 30px;">
        <h1 style="color: #D4AF37;">Silver Bank</h1>
        <h2>Teste de envio concluído!</h2>
        <p>O serviço de e-mails está funcionando corretamente.</p>
      </div>
    `,
  });
}