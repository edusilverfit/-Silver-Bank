import { useState } from "react";
import { apiRequest } from "../services/api";

interface ForgotPasswordProps {
  onBack: () => void;
}

function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setMessage(data.message);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar a recuperação de senha."
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

        <p>Recuperação de senha</p>

        <form onSubmit={handleSubmit}>
          <label>E-mail cadastrado</label>

          <input
            type="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {message && <p className="success-message">{message}</p>}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
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

export default ForgotPassword;