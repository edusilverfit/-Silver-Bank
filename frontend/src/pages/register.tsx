import { useState } from "react";
import { apiRequest } from "../services/api";

interface RegisterProps {
  onBack: () => void;
  onSuccess: () => void;
}

function Register({ onBack, onSuccess }: RegisterProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      setSuccess(data.message || "Cadastro realizado com sucesso!");

      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o cadastro."
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

        <p>Crie sua conta</p>

        <form onSubmit={handleRegister}>

          <label>Nome completo</label>

          <input
            type="text"
            placeholder="Digite seu nome completo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

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
            placeholder="Mínimo de 8 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          <label>Confirmar senha</label>

          <input
            type="password"
            placeholder="Digite sua senha novamente"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            required
          />

          {error && (
            <p className="login-error">{error}</p>
          )}

          {success && (
            <p>{success}</p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Cadastrando..." : "Criar minha conta"}
          </button>

        </form>

        <div className="register-link">
          <p>Já possui uma conta?</p>

          <button type="button" onClick={onBack}>
            Voltar para o login
          </button>
        </div>

        <span>Silver Bank © 2026</span>
        <span>Eduardo Silveira</span>

      </div>
    </div>
  );
}

export default Register;