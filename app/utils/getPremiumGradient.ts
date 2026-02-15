export const getPremiumGradient = () => {
  const gradients = [
    // Vibrant Red / Pink shades with 3 stops
    ["rgba(255,182,193,0.3)", "rgba(255,105,180,0.8)", "rgba(255,20,147,0.9)"],
    ["rgba(255,192,203,0.3)", "rgba(255,105,180,0.8)", "rgba(219,39,119,0.9)"],
    ["rgba(255,160,122,0.3)", "rgba(255,99,71,0.8)", "rgba(220,38,38,0.9)"],

    // Vibrant Green shades with 3 stops
    ["rgba(144,238,144,0.3)", "rgba(50,205,50,0.8)", "rgba(34,197,94,0.9)"],
    ["rgba(152,251,152,0.3)", "rgba(0,255,127,0.8)", "rgba(16,185,129,0.9)"],
    ["rgba(173,255,47,0.3)", "rgba(0,250,154,0.8)", "rgba(5,150,105,0.9)"],

    // Vibrant Blue shades with 3 stops
    ["rgba(173,216,230,0.3)", "rgba(0,191,255,0.8)", "rgba(14,165,233,0.9)"],
    ["rgba(135,206,250,0.3)", "rgba(30,144,255,0.8)", "rgba(37,99,235,0.9)"],
    ["rgba(176,224,230,0.3)", "rgba(70,130,180,0.8)", "rgba(29,78,216,0.9)"],

    // Vibrant Yellow / Orange shades with 3 stops
    ["rgba(255,255,224,0.3)", "rgba(255,215,0,0.8)", "rgba(245,158,11,0.9)"],
    ["rgba(255,239,184,0.3)", "rgba(255,165,0,0.8)", "rgba(249,115,22,0.9)"],
    ["rgba(255,218,185,0.3)", "rgba(255,140,0,0.8)", "rgba(234,88,12,0.9)"],

    // Vibrant Purple / Pink shades with 3 stops
    ["rgba(221,160,221,0.3)", "rgba(218,112,214,0.8)", "rgba(192,38,211,0.9)"],
    ["rgba(255,182,193,0.3)", "rgba(255,105,180,0.8)", "rgba(236,72,153,0.9)"],
    ["rgba(216,191,216,0.3)", "rgba(186,85,211,0.8)", "rgba(147,51,234,0.9)"],

    // Vibrant Cyan / Teal shades with 3 stops
    ["rgba(175,238,238,0.3)", "rgba(64,224,208,0.8)", "rgba(20,184,166,0.9)"],
    ["rgba(127,255,212,0.3)", "rgba(72,209,204,0.8)", "rgba(13,148,136,0.9)"],
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};

export const getPremiumGradientWithOpacity = () => {
  const gradients = [
    // Red / Pink shades (light)
    ["rgba(255,182,193,0.1)", "rgba(255,105,180,0.2)"],
    ["rgba(255,192,203,0.1)", "rgba(255,105,180,0.2)"],
    ["rgba(255,160,122,0.1)", "rgba(255,99,71,0.2)"],

    // Green shades (light)
    ["rgba(144,238,144,0.1)", "rgba(50,205,50,0.2)"],
    ["rgba(152,251,152,0.1)", "rgba(0,255,127,0.2)"],
    ["rgba(173,255,47,0.1)", "rgba(0,250,154,0.2)"],

    // Blue shades (light)
    ["rgba(173,216,230,0.1)", "rgba(0,191,255,0.2)"],
    ["rgba(135,206,250,0.1)", "rgba(30,144,255,0.2)"],
    ["rgba(176,224,230,0.1)", "rgba(70,130,180,0.2)"],

    // Yellow / Orange shades (light)
    ["rgba(255,255,224,0.1)", "rgba(255,215,0,0.2)"],
    ["rgba(255,239,184,0.1)", "rgba(255,165,0,0.2)"],
    ["rgba(255,218,185,0.1)", "rgba(255,140,0,0.2)"],

    // Purple / Pink shades (light)
    ["rgba(221,160,221,0.1)", "rgba(218,112,214,0.2)"],
    ["rgba(255,182,193,0.1)", "rgba(255,105,180,0.2)"],
    ["rgba(216,191,216,0.1)", "rgba(186,85,211,0.2)"],

    // Neutral / Gray shades (light)
    ["rgba(211,211,211,0.1)", "rgba(169,169,169,0.2)"],
    ["rgba(240,240,240,0.1)", "rgba(192,192,192,0.2)"],
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};