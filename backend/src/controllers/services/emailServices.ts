import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
) {
  await transporter.sendMail({
    from: `"Silver Bank" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Recuperação de senha - Silver Bank",

    html: `
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
  });
}

export async function sendTestEmail() {
  const email = process.env.SMTP_USER;

  if (!email) {
    throw new Error("SMTP_USER não configurado.");
  }

  await transporter.verify();

  await transporter.sendMail({
    from: `"Silver Bank" <${email}>`,
    to: email,
    subject: "Teste de e-mail - Silver Bank",
    text: "Parabéns! O envio de e-mails do Silver Bank está funcionando corretamente.",
    html: `
      <div style="font-family: Arial; background: #080808; color: white; padding: 30px;">
        <h1 style="color: #D4AF37;">Silver Bank</h1>
        <h2>Teste de envio concluído!</h2>
        <p>O serviço de e-mails está funcionando corretamente.</p>
      </div>
    `,
  });
}