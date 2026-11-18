import { useState } from "react";
import { apiRequest } from "../services/api";

interface ResetPasswordProps {
  onBack: () => void;
}

function ResetPassword({ onBack }: ResetPasswordProps) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("Link de recuperação inválido ou incompleto.");
      return;
    }

    if (newPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      setMessage(data.message);

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível redefinir sua senha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand-logo">
          <div className="logo-symbol">S</div>
        </div>

        <h1>SILVER BANK</h1>

        <p>Crie uma nova senha</p>

        <form onSubmit={handleSubmit}>
          <label>Nova senha</label>

          <input
            type="password"
            placeholder="Digite sua nova senha"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            required
          />

          <label>Confirme sua nova senha</label>

          <input
            type="password"
            placeholder="Confirme sua nova senha"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />

          {message && (
            <p className="success-message">{message}</p>
          )}

          {error && (
            <p className="login-error">{error}</p>
          )}

          <button type="submit" disabled={loading || !token || !!message}>
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>

        <button
          type="button"
          className="forgot-password-link"
          onClick={onBack}
        >
          Voltar para o login
        </button>

        <span>Silver Bank © 2026</span>
        <span>Eduardo Silveira</span>
      </div>
    </div>
  );
}

export default ResetPassword;