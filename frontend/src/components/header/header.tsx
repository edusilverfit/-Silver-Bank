function Header() {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">S</div>
        <strong>SILVER</strong>
      </div>

      <nav className="navigation" aria-label="Main navigation">
        <a href="#">Home</a>
        <a href="#">Produtos</a>
        <a href="#">Vantagens</a>
        <a href="#">Contato</a>
      </nav>

      <button type="button" className="login-button">
        Login
      </button>
    </header>
  );
}

export default Header;
