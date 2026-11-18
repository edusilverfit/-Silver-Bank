function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="tagline">BANKING REIMAGINED</span>
        <h1>
          Seu futuro financeiro começa com <span>mais liberdade</span>
        </h1>
        <p>
          A Silver Bank conecta suas metas, investimentos e pagamentos em uma
          experiência moderna, simples e segura para viver com confiança.
        </p>

        <div className="hero-buttons">
          <button type="button" className="primary-button">
            Abrir conta
          </button>
          <button type="button" className="secondary-button">
            Ver mais
          </button>
        </div>
      </div>

      <div className="bank-card" aria-label="Detalhes do cartão">
        <div className="card-header">
          <span>silver</span>
          <span className="card-symbol">◈</span>
        </div>

        <div className="balance-label">Saldo disponível</div>
        <h2>R$ 24.890,00</h2>

        <div className="card-footer">
          <span>•••• 3245</span>
          <span>09/28</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
