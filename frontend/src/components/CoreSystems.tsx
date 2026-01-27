const CoreSystems = () => {
  const features = [
    {
      number: '01',
      date: '2026.01.27',
      title: 'x402 Payment Integration',
      description: 'V2 compatible x402 payment processing. Pay-per-query model with non-custodial payments. No subscriptions, no locked balances, just pay as you go.',
    },
    {
      number: '02',
      date: '2026.01.27',
      title: 'Oracle Data Execution',
      description: 'Fetch external APIs, price feeds, or generate randomness. Every response is trackable via API and delivered in real-time via WebSocket.',
    },
    {
      number: '03',
      date: '2026.01.27',
      title: 'Webhook Automation',
      description: 'Trigger external webhooks when oracle queries complete. Build automations and integrations without running your own infrastructure.',
    },
    {
      number: '04',
      date: '2026.01.27',
      title: 'Real-time Updates',
      description: 'WebSocket support for live job status updates. Track oracle queries from creation to completion with instant notifications.',
    },
  ]

  return (
    <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-black">
      <div className="mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">
          KEY FEATURES
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="bg-gray-950 border border-gray-900 rounded-lg p-6 hover:border-purple-600 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="text-purple-400 font-mono text-sm font-bold">NO. {feature.number}</div>
              <div className="text-gray-500 text-xs font-mono">{feature.date}</div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CoreSystems
