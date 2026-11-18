import BankCard from "./BankCard.tsx";

function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-content">
        <span className="tagline">SEU BANCO. SEU FUTURO.</span>

        <h1>
          Sua vida financeira em um novo <span>nível.</span>
        </h1>

        <p>
          Uma experiência bancária moderna, simples e exclusiva. Tenha controle
          total do seu dinheiro com o Silver Bank.
        </p>

        <div className="hero-buttons">
          <button type="button" className="primary-button">
            Conheça o Silver Bank
          </button>

          <button type="button" className="secondary-button">
            Saiba mais →
          </button>
        </div>
      </div>

      <BankCard />
    </section>
  );
}

export default Hero;