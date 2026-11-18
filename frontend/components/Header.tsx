function Header() {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-icon">S</span>
        <span>
          SILVER <strong>BANK</strong>
        </span>
      </div>

      <nav className="navigation">
        <a href="#inicio">Início</a>
        <a href="#sobre">Sobre</a>
        <a href="#beneficios">Benefícios</a>
      </nav>

      <button className="login-button">
        Acessar conta
      </button>
    </header>
  );
}

export default Header;