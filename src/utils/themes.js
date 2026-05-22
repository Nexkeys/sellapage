/**
 * Cloudinary auto-compression helper.
 * If the URL belongs to Cloudinary, injects f_auto,q_auto,w_{width},c_scale
 * into the upload path to slash payload size for mobile customers.
 */
export const getOptimizedImageUrl = (url, width = 800) => {
  if (!url || typeof url !== 'string') return url ?? ''
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_scale/`)
  }
  return url
}

/**
 * Classic Default — exact replica of the original SellaPage storefront.
 * This theme is used for free-tier users and any store without a storeTheme set.
 * Its primary color dynamically yields to store.themeColor when present.
 */
export const CLASSIC_DEFAULT_THEME = {
  id: 'classic-default',
  name: 'Classic',
  defaultColors: { background: '#f8faf9', card: '#ffffff', text: '#111827', primary: '#15803d', accent: '#22c55e' },
  typography: { headerFontFamily: "system-ui, -apple-system, sans-serif", bodyFontFamily: "system-ui, -apple-system, sans-serif", fontUrl: "" },
  defaultThemeText: { footer: "" },
  structuralStyle: {
    cardBorderRadius: "rounded-2xl",
    cardBorder: "border border-stone-100 shadow-sm shadow-stone-100/70 hover:border-green-100 hover:shadow-lg hover:shadow-stone-200/80",
    containerClasses: "bg-[#f8faf9] text-gray-900",
    buttonClasses: "bg-white text-green-700 hover:bg-green-50 active:bg-green-100 rounded-2xl font-bold text-sm",
  },
  layout: {
    headerLayout: "classic-flat-row",
    navigationDockLayout: "flush-bottom",
    internalTabShellStyle: { cardClasses: "bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/70", textClasses: "text-gray-900" }
  }
}

export const themes = [
  CLASSIC_DEFAULT_THEME,
  {
    id: 'midnight-glow',
    name: 'Midnight Glow',
    defaultColors: { background: '#090514', card: '#160a2b', text: '#ffffff', primary: '#ff007f', accent: '#00e5ff' },
    typography: { headerFontFamily: "'Montserrat', sans-serif", bodyFontFamily: "'Inter', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Inter:wght@400;500;600&display=swap" },
    defaultThemeText: { footer: "Your essential guide to nightlife & entertainment. Stay lit." },
    structuralStyle: {
      cardBorderRadius: "rounded-2xl",
      cardBorder: "border border-pink-500/30 hover:border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.15)] hover:shadow-[0_0_20px_rgba(255,0,127,0.4)] backdrop-blur-sm",
      containerClasses: "bg-[#090514] text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#090514] to-[#090514] pb-10",
      buttonClasses: "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-full font-bold shadow-[0_0_10px_rgba(255,0,127,0.4)]",
    },
    layout: {
      headerLayout: "glass-pill",
      navigationDockLayout: "floating-pill",
      internalTabShellStyle: { cardClasses: "bg-[#160a2b] border border-[#ff007f]/30 shadow-lg shadow-black/50 rounded-2xl", textClasses: "text-white" }
    }
  },
  {
    id: 'artisan-collective',
    name: 'The Artisan Collective',
    defaultColors: { background: '#fcfaf8', card: '#ffffff', text: '#4a3f35', primary: '#c97a5e', accent: '#d4c5b9' },
    typography: { headerFontFamily: "'Playfair Display', serif", bodyFontFamily: "'Lato', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Lato:wght@300;400;700&display=swap" },
    defaultThemeText: { footer: "Explore unique goods made with love by skilled artisans." },
    structuralStyle: {
      cardBorderRadius: "rounded-sm",
      cardBorder: "border-[1px] border-[#d4c5b9]/50 shadow-[4px_4px_0px_rgba(212,197,185,0.3)] hover:shadow-[6px_6px_0px_rgba(201,122,94,0.3)] hover:-translate-y-1 transition-all",
      containerClasses: "bg-[#fcfaf8] text-[#4a3f35] py-8",
      buttonClasses: "bg-[#c97a5e] hover:bg-[#b06348] text-white rounded-none font-medium tracking-[0.15em] uppercase border border-[#c97a5e]",
    },
    layout: {
      headerLayout: "classic-flat-row",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-white border border-[#d4c5b9]/50 rounded-sm shadow-sm", textClasses: "text-[#4a3f35]" }
    }
  },
  {
    id: 'fitness-energy',
    name: 'Fitness Energy',
    defaultColors: { background: '#111111', card: '#1a1a1a', text: '#ffffff', primary: '#ccff00', accent: '#0055ff' },
    typography: { headerFontFamily: "'Oswald', sans-serif", bodyFontFamily: "'Roboto', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Roboto:ital,wght@0,400;0,500;0,700;1,700&display=swap" },
    defaultThemeText: { footer: "Train smart, go fast. The best gear for your workout." },
    structuralStyle: {
      cardBorderRadius: "rounded-none",
      cardBorder: "border-2 border-transparent hover:border-[#ccff00] skew-y-0 hover:-skew-y-1 transition-transform duration-300",
      containerClasses: "bg-[#111111] text-white bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]",
      buttonClasses: "bg-[#ccff00] hover:bg-[#aadd00] text-black rounded-none font-extrabold uppercase italic tracking-wider",
    },
    layout: {
      headerLayout: "asymmetric-heavy",
      navigationDockLayout: "retro-block",
      internalTabShellStyle: { cardClasses: "bg-[#1a1a1a] border-l-4 border-[#ccff00] rounded-none shadow-md", textClasses: "text-white" }
    }
  },
  {
    id: 'sweetie-world',
    name: 'Sweetie World',
    defaultColors: { background: '#fff5f7', card: '#ffffff', text: '#5c4a52', primary: '#ffb6c1', accent: '#a8e6cf' },
    typography: { headerFontFamily: "'Quicksand', sans-serif", bodyFontFamily: "'Nunito', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=Nunito:wght@400;600;700&display=swap" },
    defaultThemeText: { footer: "Shop Magic & Joy! Join our cute family." },
    structuralStyle: {
      cardBorderRadius: "rounded-[2rem]",
      cardBorder: "border-4 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(255,182,193,0.3)] hover:-translate-y-2",
      containerClasses: "bg-[#fff5f7] text-[#5c4a52] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/40 to-transparent",
      buttonClasses: "bg-[#ffb6c1] hover:bg-[#ff9eb0] text-white rounded-full font-bold shadow-[0_4px_15px_rgba(255,182,193,0.4)]",
    },
    layout: {
      headerLayout: "puffy-rounded",
      navigationDockLayout: "floating-pill",
      internalTabShellStyle: { cardClasses: "bg-white border-4 border-[#fff5f7] rounded-[2rem] shadow-xl shadow-pink-100/50", textClasses: "text-[#5c4a52]" }
    }
  },
  {
    id: 'urban-forge',
    name: 'Urban Forge',
    defaultColors: { background: '#2c2c2c', card: '#3a3a3a', text: '#e0e0e0', primary: '#d35400', accent: '#7f8c8d' },
    typography: { headerFontFamily: "'Russo One', sans-serif", bodyFontFamily: "'Open Sans', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Russo+One&family=Open+Sans:wght@400;600;700&display=swap" },
    defaultThemeText: { footer: "Industrial grade gear. Built to last." },
    structuralStyle: {
      cardBorderRadius: "rounded-sm",
      cardBorder: "border-b-[4px] border-[#d35400] shadow-md hover:shadow-xl bg-[#3a3a3a]",
      containerClasses: "bg-[#2c2c2c] text-[#e0e0e0] border-t-8 border-[#d35400]",
      buttonClasses: "bg-[#d35400] hover:bg-[#b04300] text-white rounded-sm font-bold uppercase tracking-widest border border-[#b04300]",
    },
    layout: {
      headerLayout: "heavy-block",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-[#3a3a3a] border-b-[4px] border-[#d35400] rounded-sm", textClasses: "text-[#e0e0e0]" }
    }
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    defaultColors: { background: '#ffffff', card: '#ffffff', text: '#000000', primary: '#000000', accent: '#f3f4f6' },
    typography: { headerFontFamily: "'Cormorant Garamond', serif", bodyFontFamily: "'Inter', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500&display=swap" },
    defaultThemeText: { footer: "Curated for you. The essence of luxury." },
    structuralStyle: {
      cardBorderRadius: "rounded-none",
      cardBorder: "border border-gray-100 shadow-none hover:border-black transition-colors duration-300",
      containerClasses: "bg-white text-black",
      buttonClasses: "bg-black hover:bg-gray-800 text-white rounded-none font-medium uppercase tracking-[0.2em] text-xs border border-black",
    },
    layout: {
      headerLayout: "minimal-underline",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-white border border-black/10 rounded-none", textClasses: "text-black" }
    }
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    defaultColors: { background: '#0a0a1a', card: '#101020', text: '#00ffff', primary: '#ff00ff', accent: '#00ffff' },
    typography: { headerFontFamily: "'Orbitron', sans-serif", bodyFontFamily: "'Rajdhani', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap" },
    defaultThemeText: { footer: "Cyberpunk tech streetwear for the digital edge." },
    structuralStyle: {
      cardBorderRadius: "rounded-none",
      cardBorder: "border border-[#00ffff]/40 hover:border-[#ff00ff] shadow-[0_0_10px_rgba(0,255,255,0.1)] hover:shadow-[0_0_15px_rgba(255,0,255,0.4)] transition-all",
      containerClasses: "bg-[#0a0a1a] text-[#00ffff] bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px]",
      buttonClasses: "bg-transparent hover:bg-[#ff00ff] text-[#ff00ff] hover:text-white border-2 border-[#ff00ff] rounded-none font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(255,0,255,0.3)]",
    },
    layout: {
      headerLayout: "neon-cyber-bordered",
      navigationDockLayout: "retro-block",
      internalTabShellStyle: { cardClasses: "bg-[#101020] border border-[#00ffff]/30 shadow-[0_0_15px_rgba(0,255,255,0.1)] rounded-none", textClasses: "text-[#00ffff]" }
    }
  },
  {
    id: 'groovy-threads',
    name: 'Groovy Threads',
    defaultColors: { background: '#d35400', card: '#fff3e0', text: '#3e2723', primary: '#c0392b', accent: '#f39c12' },
    typography: { headerFontFamily: "'Shrikhand', cursive", bodyFontFamily: "'DM Sans', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Shrikhand&family=DM+Sans:wght@400;500;700&display=swap" },
    defaultThemeText: { footer: "Vintage style, retro vibes. Peace and love." },
    structuralStyle: {
      cardBorderRadius: "rounded-[2rem]",
      cardBorder: "border-4 border-[#3e2723] shadow-[8px_8px_0px_rgba(62,39,35,1)] hover:translate-x-1 hover:-translate-y-1 transition-transform",
      containerClasses: "bg-[#d35400] text-[#3e2723] overflow-x-hidden",
      buttonClasses: "bg-[#c0392b] hover:bg-[#a93226] text-white rounded-full font-bold uppercase tracking-wider border-2 border-[#3e2723]",
    },
    layout: {
      headerLayout: "asymmetric-heavy",
      navigationDockLayout: "floating-pill",
      internalTabShellStyle: { cardClasses: "bg-[#fff3e0] border-4 border-[#3e2723] rounded-[2rem] shadow-[4px_4px_0px_rgba(62,39,35,1)]", textClasses: "text-[#3e2723]" }
    }
  },
  {
    id: 'tropical-breeze',
    name: 'Tropical Breeze',
    defaultColors: { background: '#faf9f6', card: '#ffffff', text: '#2f4f4f', primary: '#ff7f50', accent: '#20b2aa' },
    typography: { headerFontFamily: "'Playfair Display', serif", bodyFontFamily: "'Work Sans', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&family=Work+Sans:wght@300;400;500&display=swap" },
    defaultThemeText: { footer: "Beach & resort wear for your next adventure." },
    structuralStyle: {
      cardBorderRadius: "rounded-3xl",
      cardBorder: "border border-teal-50 shadow-[0_10px_40px_-10px_rgba(32,178,170,0.15)] hover:shadow-[0_20px_50px_-10px_rgba(255,127,80,0.2)]",
      containerClasses: "bg-[#faf9f6] text-[#2f4f4f] bg-[url('https://www.transparenttextures.com/patterns/sandpaper.png')]",
      buttonClasses: "bg-[#ff7f50] hover:bg-[#ff6347] text-white rounded-full font-medium px-8 py-3 shadow-lg hover:shadow-xl",
    },
    layout: {
      headerLayout: "classic-flat-row",
      navigationDockLayout: "floating-pill",
      internalTabShellStyle: { cardClasses: "bg-white border border-teal-50 shadow-xl rounded-3xl", textClasses: "text-[#2f4f4f]" }
    }
  },
  {
    id: 'reserved-cellar',
    name: 'The Reserved Cellar',
    defaultColors: { background: '#2b0b1c', card: '#1a0610', text: '#fdf5e6', primary: '#b8860b', accent: '#8b0000' },
    typography: { headerFontFamily: "'Cinzel', serif", bodyFontFamily: "'Lora', serif", fontUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" },
    defaultThemeText: { footer: "Premium selections for the discerning connoisseur." },
    structuralStyle: {
      cardBorderRadius: "rounded-none",
      cardBorder: "border border-[#b8860b]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-[#b8860b]/80",
      containerClasses: "bg-[#2b0b1c] text-[#fdf5e6]",
      buttonClasses: "bg-transparent border border-[#b8860b] text-[#b8860b] hover:bg-[#b8860b] hover:text-[#1a0610] rounded-none font-serif uppercase tracking-widest text-xs transition-colors duration-500",
    },
    layout: {
      headerLayout: "minimal-underline",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-[#1a0610] border border-[#b8860b]/40 rounded-none shadow-2xl", textClasses: "text-[#fdf5e6]" }
    }
  },
  {
    id: 'corporate-sharp',
    name: 'Corporate Sharp',
    defaultColors: { background: '#f8fafc', card: '#ffffff', text: '#0f172a', primary: '#0f172a', accent: '#64748b' },
    typography: { headerFontFamily: "'Inter', sans-serif", bodyFontFamily: "'Inter', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    defaultThemeText: { footer: "Premium B2B Office Supplies for Productivity." },
    structuralStyle: {
      cardBorderRadius: "rounded-lg",
      cardBorder: "border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300",
      containerClasses: "bg-slate-50 text-slate-900",
      buttonClasses: "bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold px-5 py-2.5",
    },
    layout: {
      headerLayout: "classic-flat-row",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-white border border-slate-200 shadow-sm rounded-lg", textClasses: "text-slate-900" }
    }
  },
  {
    id: 'bloom-baby',
    name: 'Bloom & Baby',
    defaultColors: { background: '#fffbfa', card: '#ffffff', text: '#5d5d5d', primary: '#f4c2c2', accent: '#e6e6fa' },
    typography: { headerFontFamily: "'Lustria', serif", bodyFontFamily: "'Nunito Sans', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Lustria&family=Nunito+Sans:wght@300;400;600&display=swap" },
    defaultThemeText: { footer: "Discover our curated collection of soft baby essentials." },
    structuralStyle: {
      cardBorderRadius: "rounded-3xl",
      cardBorder: "border-2 border-[#f4c2c2]/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(244,194,194,0.3)]",
      containerClasses: "bg-[#fffbfa] text-[#5d5d5d]",
      buttonClasses: "bg-[#f4c2c2] hover:bg-[#eab0b0] text-white rounded-full font-semibold shadow-sm px-6 py-2.5",
    },
    layout: {
      headerLayout: "puffy-rounded",
      navigationDockLayout: "floating-pill",
      internalTabShellStyle: { cardClasses: "bg-white border-2 border-[#f4c2c2]/20 shadow-md rounded-3xl", textClasses: "text-[#5d5d5d]" }
    }
  },
  {
    id: 'fresh-natural',
    name: 'Fresh Natural',
    defaultColors: { background: '#f5f5dc', card: '#fffdfa', text: '#4b5320', primary: '#8a9a5b', accent: '#d2b48c' },
    typography: { headerFontFamily: "'Merriweather', serif", bodyFontFamily: "'Source Sans Pro', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Source+Sans+Pro:wght@400;600&display=swap" },
    defaultThemeText: { footer: "Our commitment to sustainability and organic living." },
    structuralStyle: {
      cardBorderRadius: "rounded-xl",
      cardBorder: "border border-[#8a9a5b]/20 shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:border-[#8a9a5b]/50",
      containerClasses: "bg-[#f5f5dc] text-[#4b5320]",
      buttonClasses: "bg-transparent border-2 border-[#8a9a5b] text-[#8a9a5b] hover:bg-[#8a9a5b] hover:text-white rounded-full font-medium px-6 transition-colors",
    },
    layout: {
      headerLayout: "glass-pill",
      navigationDockLayout: "floating-pill",
      internalTabShellStyle: { cardClasses: "bg-[#fffdfa] border border-[#8a9a5b]/20 shadow-sm rounded-xl", textClasses: "text-[#4b5320]" }
    }
  },
  {
    id: 'lagos-gold',
    name: 'Lagos Gold',
    defaultColors: { background: '#fffff0', card: '#ffffff', text: '#1a472a', primary: '#d4af37', accent: '#1a472a' },
    typography: { headerFontFamily: "'Playfair Display', serif", bodyFontFamily: "'Merriweather', serif", fontUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Merriweather:wght@300;400;700&display=swap" },
    defaultThemeText: { footer: "Premium Nigerian Cuisine & Catering." },
    structuralStyle: {
      cardBorderRadius: "rounded-sm",
      cardBorder: "border-l-[4px] border-l-[#d4af37] border-y border-r border-gray-100 shadow-md hover:shadow-lg",
      containerClasses: "bg-[#fffff0] text-[#1a472a]",
      buttonClasses: "bg-[#d4af37] hover:bg-[#c5a030] text-white rounded-sm font-semibold uppercase text-xs tracking-widest px-6 py-3",
    },
    layout: {
      headerLayout: "heavy-block",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-white border-l-[4px] border-l-[#d4af37] shadow-md rounded-sm", textClasses: "text-[#1a472a]" }
    }
  },
  {
    id: 'ankara-heritage',
    name: 'Ankara Heritage',
    defaultColors: { background: '#fdfbf7', card: '#ffffff', text: '#4a2511', primary: '#cd5c5c', accent: '#d2691e' },
    typography: { headerFontFamily: "'Lora', serif", bodyFontFamily: "'Work Sans', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap" },
    defaultThemeText: { footer: "Authentic Ankara Prints & Handcrafted Cultural Treasures." },
    structuralStyle: {
      cardBorderRadius: "rounded-lg",
      cardBorder: "border border-[#cd5c5c]/30 shadow-md hover:border-[#cd5c5c] hover:shadow-[0_10px_20px_rgba(205,92,92,0.15)]",
      containerClasses: "bg-[#fdfbf7] text-[#4a2511]",
      buttonClasses: "bg-[#cd5c5c] hover:bg-[#b95353] text-white rounded-lg font-semibold px-6 py-2.5",
    },
    layout: {
      headerLayout: "classic-flat-row",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-white border border-[#cd5c5c]/20 shadow-md rounded-lg", textClasses: "text-[#4a2511]" }
    }
  },
  {
    id: 'aura',
    name: 'Aura',
    defaultColors: { background: '#f8f7f5', card: '#ffffff', text: '#333333', primary: '#333333', accent: '#e0e0e0' },
    typography: { headerFontFamily: "'Jost', sans-serif", bodyFontFamily: "'Jost', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap" },
    defaultThemeText: { footer: "Minimalist homeware and ceramics." },
    structuralStyle: {
      cardBorderRadius: "rounded-md",
      cardBorder: "border-[0.5px] border-gray-200 shadow-none hover:shadow-[0_15px_30px_-15px_rgba(0,0,0,0.1)]",
      containerClasses: "bg-[#f8f7f5] text-[#333333] px-4 md:px-12 py-10",
      buttonClasses: "bg-transparent border border-gray-300 text-gray-700 hover:border-gray-500 rounded-md font-medium text-sm px-6",
    },
    layout: {
      headerLayout: "minimal-underline",
      navigationDockLayout: "floating-pill",
      internalTabShellStyle: { cardClasses: "bg-white border-[0.5px] border-gray-200 rounded-md", textClasses: "text-[#333333]" }
    }
  },
  {
    id: 'neon-tech',
    name: 'Neon Tech',
    defaultColors: { background: '#050505', card: '#0a0a0a', text: '#ffffff', primary: '#00ff41', accent: '#333333' },
    typography: { headerFontFamily: "'Teko', sans-serif", bodyFontFamily: "'Chakra Petch', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Teko:wght@600;700&family=Chakra+Petch:wght@400;500;600&display=swap" },
    defaultThemeText: { footer: "Cutting-edge tech and gadgets. Pre-order now." },
    structuralStyle: {
      cardBorderRadius: "rounded-lg",
      cardBorder: "border border-gray-800 shadow-[0_4px_15px_rgba(0,255,65,0.03)] hover:border-[#00ff41]/50 hover:shadow-[0_4px_20px_rgba(0,255,65,0.15)]",
      containerClasses: "bg-[#050505] text-white",
      buttonClasses: "bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black rounded-lg font-bold uppercase tracking-widest px-6",
    },
    layout: {
      headerLayout: "neon-cyber-bordered",
      navigationDockLayout: "retro-block",
      internalTabShellStyle: { cardClasses: "bg-[#0a0a0a] border border-[#00ff41]/40 rounded-lg shadow-[0_0_15px_rgba(0,255,65,0.1)]", textClasses: "text-white" }
    }
  },
  {
    id: 'aura-noir',
    name: 'Aura Noir',
    defaultColors: { background: '#0a0a0a', card: '#000000', text: '#ffffff', primary: '#d4af37', accent: '#222222' },
    typography: { headerFontFamily: "'Prata', serif", bodyFontFamily: "'Cormorant Garamond', serif", fontUrl: "https://fonts.googleapis.com/css2?family=Prata&family=Cormorant+Garamond:wght@300;400;600&display=swap" },
    defaultThemeText: { footer: "Handcrafted elegance for the modern muse." },
    structuralStyle: {
      cardBorderRadius: "rounded-none",
      cardBorder: "border border-gray-900 hover:border-[#d4af37]/60 shadow-2xl",
      containerClasses: "bg-[#0a0a0a] text-white py-12",
      buttonClasses: "bg-transparent border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black rounded-none font-serif text-sm tracking-[0.25em] uppercase px-8",
    },
    layout: {
      headerLayout: "minimal-underline",
      navigationDockLayout: "flush-bottom",
      internalTabShellStyle: { cardClasses: "bg-black border border-gray-900 shadow-2xl rounded-none", textClasses: "text-white" }
    }
  },
  {
    id: 'bold-market',
    name: 'Bold Market',
    defaultColors: { background: '#ffffff', card: '#ffffff', text: '#000000', primary: '#000000', accent: '#000000' },
    typography: { headerFontFamily: "'Archivo Black', sans-serif", bodyFontFamily: "'Space Grotesk', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;600;700&display=swap" },
    defaultThemeText: { footer: "Your destiny, defined by style." },
    structuralStyle: {
      cardBorderRadius: "rounded-none",
      cardBorder: "border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all",
      containerClasses: "bg-white text-black font-black",
      buttonClasses: "bg-black text-white hover:bg-white hover:text-black border-4 border-black rounded-none font-black uppercase text-lg px-6",
    },
    layout: {
      headerLayout: "asymmetric-heavy",
      navigationDockLayout: "retro-block",
      internalTabShellStyle: { cardClasses: "bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none", textClasses: "text-black" }
    }
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    defaultColors: { background: '#0d0d14', card: '#151520', text: '#ffffff', primary: '#ff00ff', accent: '#00ffff' },
    typography: { headerFontFamily: "'Bebas Neue', sans-serif", bodyFontFamily: "'Titillium Web', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Titillium+Web:wght@400;600;700&display=swap" },
    defaultThemeText: { footer: "Street ready sportswear." },
    structuralStyle: {
      cardBorderRadius: "rounded-none",
      cardBorder: "border-[3px] border-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,0.4)] hover:shadow-[0_0_20px_rgba(255,0,255,0.6)] hover:border-[#ff00ff] transition-all duration-300",
      containerClasses: "bg-[#0d0d14] text-white",
      buttonClasses: "bg-[#00ffff] hover:bg-[#00cccc] text-black rounded-none font-bold uppercase tracking-widest text-lg px-8 border-b-4 border-b-[#00aaaa]",
    },
    layout: {
      headerLayout: "neon-cyber-bordered",
      navigationDockLayout: "retro-block",
      internalTabShellStyle: { cardClasses: "bg-[#151520] border-2 border-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.3)] rounded-none", textClasses: "text-white" }
    }
  }
];
