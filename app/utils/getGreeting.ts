export function getGreeting(name?: string) {
  const hour = new Date().getHours();
  const suffix = name ? ` ${name}` : "";

  const greetings = [
    { until: 12, text: `God morgon ${suffix} ☀️` },
    { until: 18, text: `God eftermiddag ${suffix} 🌤️` },
    { until: 24, text: `God kväll ${suffix} 🌙` },
  ];

  return greetings.find((g) => hour < g.until)?.text ?? `Hej ${suffix} 👋`;
}
