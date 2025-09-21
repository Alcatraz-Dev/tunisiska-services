export const getPremiumGradient = () => {
  const gradients = [
    // Red / Pink shades (light)
    ["rgba(255,182,193,0.1)", "rgba(255,105,180,0.7)"], // Light Pink to Hot Pink
    ["rgba(255,192,203,0.1)", "rgba(255,105,180,0.7)"], // Pink
    ["rgba(255,160,122,0.1)", "rgba(255,99,71,0.7)"],   // Light Salmon

    // Green shades (light)
    ["rgba(144,238,144,0.1)", "rgba(50,205,50,0.7)"],  // Light Green to Lime Green
    ["rgba(152,251,152,0.1)", "rgba(0,255,127,0.7)"],  // Pale Green to Spring Green
    ["rgba(173,255,47,0.1)", "rgba(0,250,154,0.7)"],   // Green Yellow to Medium Spring Green

    // Blue shades (light)
    ["rgba(173,216,230,0.1)", "rgba(0,191,255,0.7)"], // Light Blue to Deep Sky Blue
    ["rgba(135,206,250,0.1)", "rgba(30,144,255,0.7)"], // Sky Blue to Dodger Blue
    ["rgba(176,224,230,0.1)", "rgba(70,130,180,0.7)"], // Powder Blue to Steel Blue

    // Yellow / Orange shades (light)
    ["rgba(255,255,224,0.1)", "rgba(255,215,0,0.7)"], // Light Yellow to Gold
    ["rgba(255,239,184,0.1)", "rgba(255,165,0,0.7)"], // Light Orange to Orange
    ["rgba(255,218,185,0.1)", "rgba(255,140,0,0.7)"], // Peach Puff to Dark Orange

    // Purple / Pink shades (light)
    ["rgba(221,160,221,0.1)", "rgba(218,112,214,0.7)"], // Plum to Orchid
    ["rgba(255,182,193,0.1)", "rgba(255,105,180,0.7)"], // Light Pink to Hot Pink
    ["rgba(216,191,216,0.1)", "rgba(186,85,211,0.7)"],  // Thistle to Medium Orchid

    // Neutral / Gray shades (light)
    ["rgba(211,211,211,0.1)", "rgba(169,169,169,0.7)"], // Light Gray to Dark Gray (soft)
    ["rgba(240,240,240,0.1)", "rgba(192,192,192,0.7)"], // Very Light Gray to Silver
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