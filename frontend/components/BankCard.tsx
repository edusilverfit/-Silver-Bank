function BankCard() {
  return (
    <div className="bank-card">
      <div className="card-header">
        <span>SILVER BANK</span>
        <span className="card-symbol">✦</span>
      </div>

      <p className="balance-label">
        Saldo disponível
      </p>

      <h2>R$ 24.680,90</h2>

      <div className="card-footer">
        <span>CONTA DIGITAL</span>
        <span>PREMIUM</span>
      </div>
    </div>
  );
}

export default BankCard;