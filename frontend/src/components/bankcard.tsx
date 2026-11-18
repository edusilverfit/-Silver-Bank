interface BankCardProps {
  card: {
    lastFour: string;
    holderName: string;
    expiryMonth: number;
    expiryYear: number;
    status: "ACTIVE" | "BLOCKED";
  };
}

function BankCard({ card }: BankCardProps) {
  return (
    <div className="bank-card">

      <div className="bank-card-header">
        <div className="bank-card-brand">
          <div className="bank-card-logo">S</div>
          <span>SILVER BANK</span>
        </div>

        <span className="card-type">
          {card.status === "ACTIVE" ? "ATIVO" : "BLOQUEADO"}
        </span>
      </div>

      <div className="bank-card-chip">
        <div className="chip-line"></div>
        <div className="chip-line"></div>
        <div className="chip-line"></div>
        <div className="chip-line"></div>
      </div>

      <div className="bank-card-number">
        **** **** **** {card.lastFour}
      </div>

      <div className="bank-card-footer">
        <div>
          <span className="card-label">TITULAR</span>
          <p>{card.holderName}</p>
        </div>

        <div>
          <span className="card-label">VALIDADE</span>
          <p>
            {String(card.expiryMonth).padStart(2, "0")}/
            {String(card.expiryYear).slice(-2)}
          </p>
        </div>

        <div className="card-contactless">
          ))) 
        </div>
      </div>

      <div className="card-demo">
        CARTÃO VIRTUAL
      </div>

    </div>
  );
}

export default BankCard;