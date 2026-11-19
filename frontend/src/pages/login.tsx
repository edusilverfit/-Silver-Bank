import { useState } from "react";
import { apiRequest } from "../services/api";

interface LoginProps {
  onLogin: (token: string) => void;
  onForgotPassword: () => void;
  onRegister: () => void;
}

function Login({ onLogin, onForgotPassword, onRegister }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      onLogin(data.token);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login."
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

        <p>Acesse sua conta</p>

        <form onSubmit={handleLogin}>
          <label>E-mail</label>

          <input
            type="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label>Senha</label>

          <input
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button
            type="button"
            className="forgot-password-link"
            onClick={onForgotPassword}
          >
            Esqueci minha senha
          </button>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

        </form>

        <div className="register-link">
          <p>Ainda não tem uma conta?</p>

        <button type="button" onClick={onRegister}>
        Criar minha conta
        </button>
        </div>

        <span>Silver Bank © 2026</span>
        <span>Eduardo Silveira</span>
      </div>
    </div>
  );
}

export default Login;