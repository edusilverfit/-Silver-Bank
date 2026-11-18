const features = [
  {
    label: '01',
    title: 'Conta digital completa',
    text: 'Controle financeiro em tempo real com transferências, cartões e investimentos em um só lugar.',
  },
  {
    label: '02',
    title: 'Segurança avançada',
    text: 'Proteção com autenticação inteligente, monitoramento de transações e suporte especializado.',
  },
  {
    label: '03',
    title: 'Experiência sob medida',
    text: 'Ferramentas sob medida para pessoas, negócios e quem quer construir um futuro mais sólido.',
  },
];

function Features() {
  return (
    <section className="features">
      {features.map((feature) => (
        <article key={feature.label} className="feature">
          <span>{feature.label}</span>
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
        </article>
      ))}
    </section>
  );
}

export default Features;
