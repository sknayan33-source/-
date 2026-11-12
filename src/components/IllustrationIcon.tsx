import React from 'react';

interface IllustrationProps {
  type: string;
  className?: string;
  customImage?: string;
  altText?: string;
}

export const IllustrationIcon: React.FC<IllustrationProps> = ({
  type,
  className = 'w-14 h-14',
  customImage,
  altText = 'Illustration',
}) => {
  const [imgError, setImgError] = React.useState(false);
  const [retryUrl, setRetryUrl] = React.useState<string | null>(null);

  // Reset error states whenever the image prop changes
  React.useEffect(() => {
    setImgError(false);
    setRetryUrl(null);
  }, [customImage, type]);

  // If a custom image exists and hasn't permanently failed
  if (customImage && !imgError) {
    const activeSrc = retryUrl || customImage;
    return (
      <img
        src={activeSrc}
        alt={altText}
        referrerPolicy="no-referrer"
        loading="eager"
        onError={() => {
          // If image fails to load (e.g. 404 or webview network issue), immediately fall back to beautiful SVG illustration
          setImgError(true);
        }}
        className={`${className} object-cover rounded-2xl shadow-xl border-2 border-white/40 bg-black/10`}
      />
    );
  }

  // Domain SVG Illustrations with lively kid-friendly colors
  switch (type) {
    case 'apple': // A for Apple
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M32 16C30 10 34 6 38 8C36 12 34 14 32 16Z" fill="#15803D" />
          <path d="M30 14Q32 8 36 6" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="26" cy="38" rx="16" ry="18" fill="#EF4444" />
          <ellipse cx="38" cy="38" rx="16" ry="18" fill="#DC2626" />
          <circle cx="22" cy="30" r="4" fill="#F87171" fillOpacity="0.6" />
        </svg>
      );
    case 'ball': // B for Ball
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="22" fill="#3B82F6" />
          <path d="M12 32C12 20 20 12 32 12C44 12 52 20 52 32" stroke="#EF4444" strokeWidth="5" />
          <path d="M14 40C20 48 30 52 42 48" stroke="#FBBF24" strokeWidth="5" />
          <circle cx="32" cy="32" r="6" fill="#FFFFFF" />
        </svg>
      );
    case 'cat': // C for Cat
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="40" rx="16" ry="14" fill="#F97316" />
          <circle cx="32" cy="28" r="12" fill="#FB923C" />
          {/* Ears */}
          <polygon points="22,18 26,28 18,26" fill="#EA580C" />
          <polygon points="42,18 46,26 38,28" fill="#EA580C" />
          {/* Eyes */}
          <circle cx="27" cy="26" r="2.5" fill="#0F172A" />
          <circle cx="37" cy="26" r="2.5" fill="#0F172A" />
          <ellipse cx="32" cy="31" rx="2" ry="1.5" fill="#F43F5E" />
          {/* Whiskers */}
          <line x1="18" y1="30" x2="26" y2="31" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="18" y1="33" x2="26" y2="33" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="46" y1="30" x2="38" y2="31" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="46" y1="33" x2="38" y2="33" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );
    case 'dog': // D for Dog
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="40" rx="16" ry="14" fill="#D97706" />
          <circle cx="32" cy="28" r="12" fill="#F59E0B" />
          {/* Floppy ears */}
          <ellipse cx="20" cy="28" rx="4" ry="8" fill="#B45309" />
          <ellipse cx="44" cy="28" rx="4" ry="8" fill="#B45309" />
          <circle cx="28" cy="26" r="2.5" fill="#0F172A" />
          <circle cx="36" cy="26" r="2.5" fill="#0F172A" />
          <ellipse cx="32" cy="31" rx="3" ry="2" fill="#000" />
          <path d="M32 33V36" stroke="#000" strokeWidth="1.5" />
          <path d="M30 36Q32 39 34 36" stroke="#EF4444" strokeWidth="2" fill="#F87171" />
        </svg>
      );
    case 'fish': // F for Fish
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="32" rx="18" ry="12" fill="#06B6D4" />
          <polygon points="14,32 4,22 4,42" fill="#0891B2" />
          <polygon points="34,20 28,14 24,20" fill="#22D3EE" />
          <circle cx="42" cy="30" r="3" fill="#FFFFFF" />
          <circle cx="43" cy="30" r="1.5" fill="#0F172A" />
          <path d="M26 26C30 32 30 36 26 40" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'grapes': // G for Grapes
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M32 14V8M32 8C28 6 24 8 22 10" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 12C38 8 44 10 46 12" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="26" cy="22" r="6" fill="#9333EA" />
          <circle cx="38" cy="22" r="6" fill="#A855F7" />
          <circle cx="32" cy="30" r="6" fill="#7E22CE" />
          <circle cx="22" cy="32" r="6" fill="#A855F7" />
          <circle cx="42" cy="32" r="6" fill="#9333EA" />
          <circle cx="27" cy="40" r="6" fill="#7E22CE" />
          <circle cx="37" cy="40" r="6" fill="#A855F7" />
          <circle cx="32" cy="48" r="5" fill="#6B21A8" />
        </svg>
      );
    case 'hen': // H for Hen
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="38" rx="16" ry="14" fill="#EA580C" />
          <circle cx="42" cy="24" r="9" fill="#F97316" />
          {/* Comb */}
          <path d="M40 15C42 12 46 12 48 15" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          <polygon points="50,24 58,26 50,28" fill="#FBBF24" />
          <circle cx="44" cy="22" r="2" fill="#000" />
          <path d="M28 52V58M36 52V58" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'icecream': // I for Ice Cream
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Cone */}
          <polygon points="22,34 42,34 32,58" fill="#F59E0B" />
          <line x1="26" y1="40" x2="38" y2="40" stroke="#D97706" strokeWidth="1.5" />
          <line x1="29" y1="48" x2="35" y2="48" stroke="#D97706" strokeWidth="1.5" />
          {/* Scoops */}
          <circle cx="32" cy="28" r="12" fill="#EC4899" />
          <circle cx="32" cy="18" r="10" fill="#F472B6" />
          <circle cx="32" cy="10" r="3.5" fill="#EF4444" />
        </svg>
      );
    case 'jug': // J for Jug
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M22 18H42L46 48C46 54 42 56 32 56C22 56 18 54 18 48L22 18Z" fill="#38BDF8" />
          <path d="M42 24C52 24 52 42 42 44" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 20L16 16H22" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="32" cy="46" rx="10" ry="4" fill="#0EA5E9" fillOpacity="0.4" />
        </svg>
      );
    case 'kite': // K for Kite
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <polygon points="32,6 52,32 32,54 12,32" fill="#8B5CF6" />
          <polygon points="32,6 52,32 32,32" fill="#EC4899" />
          <polygon points="32,32 12,32 32,54" fill="#F59E0B" />
          <line x1="32" y1="6" x2="32" y2="54" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="12" y1="32" x2="52" y2="32" stroke="#FFFFFF" strokeWidth="1.5" />
          <path d="M32 54Q36 60 32 64" stroke="#F43F5E" strokeWidth="2" />
        </svg>
      );
    case 'lion': // L for Lion
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Mane */}
          <circle cx="32" cy="32" r="22" fill="#D97706" />
          {/* Face */}
          <circle cx="32" cy="32" r="14" fill="#FBBF24" />
          <circle cx="27" cy="30" r="2.5" fill="#0F172A" />
          <circle cx="37" cy="30" r="2.5" fill="#0F172A" />
          <polygon points="32,34 30,37 34,37" fill="#78350F" />
          <path d="M29 39Q32 42 35 39" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'nest': // N for Nest
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Eggs */}
          <ellipse cx="26" cy="30" rx="5" ry="7" fill="#BAE6FD" />
          <ellipse cx="38" cy="30" rx="5" ry="7" fill="#BAE6FD" />
          <ellipse cx="32" cy="27" rx="5" ry="7" fill="#E0F2FE" />
          {/* Twig Nest */}
          <path d="M12 36C12 50 52 50 52 36C46 44 18 44 12 36Z" fill="#92400E" />
          <path d="M10 36H54M14 42H50M20 47H44" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'orange': // O for Orange
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="34" r="20" fill="#F97316" />
          <path d="M32 14C32 10 36 8 38 10C36 14 34 14 32 14Z" fill="#16A34A" />
          <circle cx="28" cy="28" r="1.5" fill="#FB923C" />
          <circle cx="36" cy="32" r="1.5" fill="#FB923C" />
          <circle cx="30" cy="40" r="1.5" fill="#FB923C" />
        </svg>
      );
    case 'parrot': // P for Parrot
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="30" cy="36" rx="14" ry="18" fill="#22C55E" />
          <circle cx="36" cy="22" r="10" fill="#16A34A" />
          <circle cx="39" cy="20" r="2" fill="#000" />
          <path d="M44 20C48 20 50 26 44 26" fill="#EF4444" />
          <path d="M22 44L14 58L26 50Z" fill="#15803D" />
        </svg>
      );
    case 'queen': // Q for Queen
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <polygon points="14,44 14,24 24,34 32,18 40,34 50,24 50,44" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
          <circle cx="14" cy="22" r="3" fill="#EF4444" />
          <circle cx="32" cy="16" r="3.5" fill="#3B82F6" />
          <circle cx="50" cy="22" r="3" fill="#EF4444" />
          <rect x="14" y="44" width="36" height="8" rx="2" fill="#D97706" />
          <circle cx="24" cy="48" r="2" fill="#FFF" />
          <circle cx="32" cy="48" r="2" fill="#FFF" />
          <circle cx="40" cy="48" r="2" fill="#FFF" />
        </svg>
      );
    case 'sun': // S for Sun
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="14" fill="#F59E0B" />
          <path d="M32 6V12M32 52V58M6 32H12M52 32H58M14 14L18 18M46 46L50 50M14 50L18 46M46 18L50 14" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
          <circle cx="28" cy="30" r="2" fill="#78350F" />
          <circle cx="36" cy="30" r="2" fill="#78350F" />
          <path d="M29 35Q32 38 35 35" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'umbrella': // U for Umbrella
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M12 36C12 20 22 14 32 14C42 14 52 20 52 36C45 34 39 34 32 36C25 34 19 34 12 36Z" fill="#3B82F6" />
          <path d="M12 36C18 34 24 34 26 36C26 22 28 16 32 14C22 14 12 20 12 36Z" fill="#EF4444" />
          <path d="M38 36C40 34 46 34 52 36C52 20 42 14 32 14C36 16 38 22 38 36Z" fill="#FBBF24" />
          <line x1="32" y1="12" x2="32" y2="48" stroke="#475569" strokeWidth="3" />
          <path d="M32 48C32 54 26 54 26 50" stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'van': // V for Van
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="8" y="24" width="48" height="22" rx="4" fill="#6366F1" />
          <rect x="12" y="28" width="14" height="10" rx="2" fill="#E0E7FF" />
          <rect x="30" y="28" width="14" height="10" rx="2" fill="#E0E7FF" />
          <circle cx="20" cy="46" r="6" fill="#1E1B4B" />
          <circle cx="20" cy="46" r="2.5" fill="#E0E7FF" />
          <circle cx="44" cy="46" r="6" fill="#1E1B4B" />
          <circle cx="44" cy="46" r="2.5" fill="#E0E7FF" />
        </svg>
      );
    case 'watch': // W for Watch
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="26" y="8" width="12" height="48" rx="3" fill="#14B8A6" />
          <circle cx="32" cy="32" r="16" fill="#0F766E" stroke="#5EEAD4" strokeWidth="3" />
          <circle cx="32" cy="32" r="2" fill="#FFF" />
          <line x1="32" y1="32" x2="32" y2="24" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="32" x2="38" y2="32" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'xylophone': // X for Xylophone
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="10" y="16" width="7" height="32" rx="2" fill="#EF4444" />
          <rect x="19" y="18" width="7" height="28" rx="2" fill="#F97316" />
          <rect x="28" y="20" width="7" height="24" rx="2" fill="#FBBF24" />
          <rect x="37" y="22" width="7" height="20" rx="2" fill="#22C55E" />
          <rect x="46" y="24" width="7" height="16" rx="2" fill="#3B82F6" />
          <line x1="8" y1="26" x2="55" y2="28" stroke="#78350F" strokeWidth="2" />
          <line x1="8" y1="36" x2="55" y2="34" stroke="#78350F" strokeWidth="2" />
        </svg>
      );
    case 'yak': // Y for Yak
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="38" rx="18" ry="14" fill="#57534E" />
          <circle cx="20" cy="30" r="8" fill="#44403C" />
          {/* Horns */}
          <path d="M18 24C14 16 10 20 8 18" stroke="#E7E5E4" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 24C26 16 30 20 32 18" stroke="#E7E5E4" strokeWidth="3" strokeLinecap="round" />
          <circle cx="18" cy="30" r="1.5" fill="#000" />
          <path d="M22 52V58M40 52V58" stroke="#292524" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'zebra': // Z for Zebra
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="34" cy="38" rx="18" ry="13" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
          <circle cx="18" cy="28" r="9" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
          <circle cx="16" cy="26" r="2" fill="#000" />
          {/* Stripes */}
          <line x1="28" y1="28" x2="30" y2="48" stroke="#000" strokeWidth="3" />
          <line x1="36" y1="26" x2="38" y2="48" stroke="#000" strokeWidth="3" />
          <line x1="44" y1="28" x2="45" y2="46" stroke="#000" strokeWidth="3" />
          <path d="M24 50V58M42 50V58" stroke="#000" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'turban': // মিঞা (মিঞা ভাই গান গায়)
    case 'mian':
      return (
        <svg viewBox="0 0 100 100" fill="none" className={className}>
          {/* Background warm sunny glow */}
          <circle cx="50" cy="50" r="46" fill="#FDE68A" fillOpacity="0.3" />
          {/* Kurta body */}
          <path d="M25 85C25 70 35 65 50 65C65 65 75 70 75 85V95H25V85Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          {/* Red-checked Gamcha around shoulder */}
          <path d="M35 65C30 72 28 82 32 90" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
          <path d="M65 65C70 72 72 82 68 90" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
          {/* Head & Neck */}
          <rect x="44" y="55" width="12" height="12" rx="4" fill="#FDBA74" />
          <ellipse cx="50" cy="42" rx="16" ry="18" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.5" />
          {/* Friendly cheerful hair */}
          <path d="M34 38C34 26 42 22 50 22C58 22 66 26 66 38C62 30 56 26 50 26C44 26 38 30 34 38Z" fill="#334155" />
          {/* Happy singing eyes */}
          <path d="M42 38C44 35 48 35 50 38" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 38C52 35 56 35 58 38" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          {/* Joyful open singing mouth */}
          <ellipse cx="50" cy="48" rx="5" ry="6" fill="#DC2626" />
          <ellipse cx="50" cy="46" rx="4" ry="2" fill="#FEF08A" />
          {/* Cheeks blush */}
          <circle cx="39" cy="44" r="3" fill="#F43F5E" fillOpacity="0.4" />
          <circle cx="61" cy="44" r="3" fill="#F43F5E" fillOpacity="0.4" />
          {/* Ektara instrument */}
          <path d="M22 60L36 78" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
          <circle cx="20" cy="56" r="6" fill="#EA580C" stroke="#78350F" strokeWidth="2" />
          <circle cx="36" cy="78" r="8" fill="#D97706" />
          {/* Music Notes ♪ ♫ */}
          <path d="M72 30C75 24 82 22 84 26" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="72" cy="30" r="3" fill="#9333EA" />
          <path d="M80 44C84 38 90 38 92 42" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
          <circle cx="80" cy="44" r="2.5" fill="#EC4899" />
        </svg>
      );
    case 'snake': // অজগর (Big, friendly, colorful python snake)
      return (
        <svg viewBox="0 0 100 100" fill="none" className={className}>
          {/* Jungle branch */}
          <path d="M5 80C30 75 70 75 95 80" stroke="#78350F" strokeWidth="8" strokeLinecap="round" />
          <path d="M15 72C20 60 30 65 35 70" stroke="#15803D" strokeWidth="4" strokeLinecap="round" />
          <path d="M75 75C85 62 90 68 95 72" stroke="#15803D" strokeWidth="4" strokeLinecap="round" />
          {/* Python coiled body */}
          <path d="M18 76C14 60 25 50 40 54C55 58 65 48 70 38C75 28 85 24 90 32C94 38 88 48 78 50C68 52 56 65 46 76" stroke="#22C55E" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 76C14 60 25 50 40 54C55 58 65 48 70 38C75 28 85 24 90 32C94 38 88 48 78 50C68 52 56 65 46 76" stroke="#EAB308" strokeWidth="6" strokeLinecap="round" strokeDasharray="6 8" />
          {/* Python Head */}
          <ellipse cx="46" cy="30" rx="14" ry="11" fill="#16A34A" />
          <ellipse cx="48" cy="30" rx="10" ry="8" fill="#22C55E" />
          {/* Python big cute friendly eyes */}
          <circle cx="43" cy="26" r="4.5" fill="#FFFFFF" />
          <circle cx="43" cy="26" r="2.5" fill="#0F172A" />
          <circle cx="44.5" cy="24.5" r="1.2" fill="#FFFFFF" />
          <circle cx="51" cy="26" r="4.5" fill="#FFFFFF" />
          <circle cx="51" cy="26" r="2.5" fill="#0F172A" />
          <circle cx="52.5" cy="24.5" r="1.2" fill="#FFFFFF" />
          {/* Friendly smile & pink tongue */}
          <path d="M42 34C46 37 52 37 56 34" stroke="#064E3B" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M49 36V43L46 46M49 43L52 46" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'pineapple': // আনারস
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M22 18L32 6L42 18L32 14Z" fill="#16A34A" />
          <path d="M26 14L32 4L38 14Z" fill="#22C55E" />
          <ellipse cx="32" cy="38" rx="16" ry="20" fill="#F59E0B" />
          <path d="M22 26L42 46M42 26L22 46M20 36H44" stroke="#D97706" strokeWidth="2.5" />
          <ellipse cx="32" cy="38" rx="14" ry="18" fill="url(#pineappleGlow)" fillOpacity="0.2" />
        </svg>
      );
    case 'mouse': // ইঁদুর
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="38" rx="16" ry="12" fill="#94A3B8" />
          <circle cx="44" cy="32" r="8" fill="#CBD5E1" />
          <circle cx="46" cy="24" r="4.5" fill="#F472B6" />
          <circle cx="48" cy="30" r="2" fill="#0F172A" />
          <path d="M16 40C8 38 6 48 10 52" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
          <path d="M52 35L58 37M52 33L58 31" stroke="#475569" strokeWidth="1.5" />
        </svg>
      );
    case 'eagle': // ঈগল
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M10 32C18 20 28 22 36 28C44 22 54 20 62 32C48 38 40 44 36 54C32 44 24 38 10 32Z" fill="#78350F" />
          <path d="M30 22C30 16 36 12 40 18" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
          <circle cx="36" cy="20" r="7" fill="#F8FAFC" />
          <circle cx="38" cy="18" r="2.5" fill="#000" />
          <path d="M42 20L48 23L42 25Z" fill="#F59E0B" />
        </svg>
      );
    case 'camel': // উট
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="30" cy="40" rx="18" ry="14" fill="#D97706" />
          <ellipse cx="26" cy="26" rx="8" ry="10" fill="#B45309" />
          <path d="M42 40L48 24L52 26" stroke="#D97706" strokeWidth="7" strokeLinecap="round" />
          <circle cx="53" cy="24" r="5" fill="#F59E0B" />
          <path d="M22 52V58M38 52V58" stroke="#92400E" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'sunrise': // ঊষা
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="40" r="16" fill="#F59E0B" />
          <path d="M10 48H54" stroke="#EC4899" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 14V20M18 22L22 26M46 22L42 26M10 36H16M48 36H54" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'sage': // ঋষি
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="20" r="10" fill="#FED7AA" />
          <path d="M24 20C24 30 40 30 40 20" fill="#92400E" />
          <path d="M26 14C28 8 36 8 38 14" stroke="#92400E" strokeWidth="4" />
          <path d="M18 52C18 38 46 38 46 52Z" fill="#F97316" />
        </svg>
      );
    case 'ektara': // একতারা
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="46" rx="14" ry="10" fill="#EA580C" />
          <path d="M26 44V16L32 10L38 16V44" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <line x1="32" y1="12" x2="32" y2="44" stroke="#FDE047" strokeWidth="2" />
        </svg>
      );
    case 'elephant': // ঐরাবত / হাতি
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="34" cy="38" rx="18" ry="14" fill="#64748B" />
          <circle cx="20" cy="30" r="12" fill="#94A3B8" />
          <circle cx="24" cy="26" r="2.5" fill="#0F172A" />
          <path d="M12 32C8 38 8 46 14 48" stroke="#64748B" strokeWidth="5" strokeLinecap="round" />
          <path d="M26 48V58M42 48V58" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'squirrel': // কাঠবিড়ালি
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="28" cy="38" rx="12" ry="14" fill="#C2410C" />
          <circle cx="34" cy="24" r="9" fill="#EA580C" />
          <circle cx="37" cy="22" r="2" fill="#000" />
          <path d="M18 42C10 32 12 16 26 14C24 20 20 28 24 38" stroke="#9A3412" strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="36" cy="34" rx="4" ry="4" fill="#22C55E" />
        </svg>
      );
    case 'rabbit': // খরগোশ
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="42" rx="14" ry="12" fill="#E2E8F0" />
          <circle cx="34" cy="28" r="9" fill="#F1F5F9" />
          <path d="M28 22C26 10 30 8 32 16M36 22C38 10 42 8 40 16" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          <circle cx="36" cy="26" r="2" fill="#EC4899" />
        </svg>
      );
    case 'cow': // গরু
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="34" cy="38" rx="18" ry="13" fill="#FFF" stroke="#475569" strokeWidth="2" />
          <circle cx="18" cy="30" r="9" fill="#FDE047" />
          <path d="M12 24L8 20M24 24L28 20" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <circle cx="16" cy="30" r="2" fill="#000" />
          <ellipse cx="28" cy="36" rx="6" ry="4" fill="#78350F" />
        </svg>
      );
    case 'horse': // ঘোড়া
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M22 46C20 36 26 24 36 20L44 14L48 20L44 26C40 32 44 42 42 46Z" fill="#B45309" />
          <circle cx="42" cy="18" r="2" fill="#000" />
          <path d="M24 46V58M38 46V58" stroke="#78350F" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'frog': // ব্যাঙ
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="40" rx="16" ry="12" fill="#22C55E" />
          <circle cx="24" cy="26" r="6" fill="#86EFAC" />
          <circle cx="40" cy="26" r="6" fill="#86EFAC" />
          <circle cx="24" cy="26" r="2.5" fill="#0F172A" />
          <circle cx="40" cy="26" r="2.5" fill="#0F172A" />
          <path d="M24 40Q32 46 40 40" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'singing_bird': // পাখি (প)
    case 'sparrow':
    case 'magpie':
    case 'mynah':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="30" cy="36" rx="16" ry="12" fill="#38BDF8" />
          <circle cx="42" cy="26" r="9" fill="#0284C7" />
          <circle cx="44" cy="24" r="2.5" fill="#000" />
          <path d="M48 26L56 28L48 31Z" fill="#F59E0B" />
          <path d="M18 36L6 32L14 42Z" fill="#0369A1" />
          <path d="M26 46L24 54M34 46L36 54" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 14Q54 10 58 14" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'flower': // ফুল (ফ)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="24" r="8" fill="#EC4899" />
          <circle cx="40" cy="32" r="8" fill="#F43F5E" />
          <circle cx="32" cy="40" r="8" fill="#FB7185" />
          <circle cx="24" cy="32" r="8" fill="#F43F5E" />
          <circle cx="32" cy="32" r="7" fill="#FBBF24" />
          <path d="M32 44V58" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 50Q40 46 44 48" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'tiger': // বাঘ (ব)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="36" rx="18" ry="14" fill="#F97316" />
          <circle cx="20" cy="22" r="6" fill="#EA580C" />
          <circle cx="44" cy="22" r="6" fill="#EA580C" />
          <circle cx="26" cy="32" r="3" fill="#000" />
          <circle cx="38" cy="32" r="3" fill="#000" />
          <path d="M22 28L26 30M42 28L38 30M32 24V28" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="32" cy="42" rx="5" ry="3" fill="#FEF08A" />
        </svg>
      );
    case 'bear': // ভালুক (ভ)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="34" r="16" fill="#78350F" />
          <circle cx="20" cy="22" r="6" fill="#92400E" />
          <circle cx="44" cy="22" r="6" fill="#92400E" />
          <circle cx="26" cy="30" r="2" fill="#000" />
          <circle cx="38" cy="30" r="2" fill="#000" />
          <ellipse cx="32" cy="38" rx="7" ry="5" fill="#D97706" />
          <ellipse cx="32" cy="37" rx="3" ry="2" fill="#000" />
        </svg>
      );
    case 'peacock': // ময়ূর (ম)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M12 28C16 12 48 12 52 28C46 40 18 40 12 28Z" fill="#0D9488" />
          <circle cx="20" cy="22" r="3" fill="#FBBF24" />
          <circle cx="32" cy="18" r="3" fill="#FBBF24" />
          <circle cx="44" cy="22" r="3" fill="#FBBF24" />
          <ellipse cx="32" cy="40" rx="7" ry="12" fill="#0284C7" />
          <circle cx="32" cy="28" r="5" fill="#0369A1" />
        </svg>
      );
    case 'chariot': // রথ (র)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M16 42H48L44 24H20L16 42Z" fill="#DC2626" />
          <path d="M26 24V14L32 8L38 14V24" stroke="#F59E0B" strokeWidth="3" />
          <circle cx="22" cy="48" r="7" fill="#FBBF24" stroke="#B45309" strokeWidth="2.5" />
          <circle cx="42" cy="48" r="7" fill="#FBBF24" stroke="#B45309" strokeWidth="2.5" />
        </svg>
      );
    case 'spinning_top': // লাটিম (ল)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M16 26C16 18 48 18 48 26L33 52L16 26Z" fill="#8B5CF6" />
          <path d="M16 26C20 32 44 32 48 26" stroke="#F43F5E" strokeWidth="4" />
          <line x1="32" y1="12" x2="32" y2="20" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="54" r="2" fill="#E2E8F0" />
        </svg>
      );
    case 'water_lily': // শাপলা (শ)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <ellipse cx="32" cy="46" rx="22" ry="6" fill="#15803D" />
          <path d="M32 16C26 26 24 38 32 44C40 38 38 26 32 16Z" fill="#F43F5E" />
          <path d="M22 28C20 36 24 42 32 44C26 40 24 34 22 28Z" fill="#FB7185" />
          <path d="M42 28C44 36 40 42 32 44C38 40 40 34 42 28Z" fill="#FB7185" />
        </svg>
      );
    case 'lion': // সিংহ (স)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="34" r="18" fill="#F59E0B" />
          <circle cx="32" cy="34" r="12" fill="#FDE047" />
          <circle cx="26" cy="30" r="2.5" fill="#000" />
          <circle cx="38" cy="30" r="2.5" fill="#000" />
          <ellipse cx="32" cy="38" rx="4" ry="2" fill="#78350F" />
          <path d="M20 22C14 26 14 42 20 46M44 22C50 26 50 42 44 46" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'car': // গাড়ি (ড়)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M12 40L18 26H42L50 40H54V46H10V40H12Z" fill="#EF4444" />
          <circle cx="22" cy="48" r="6" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
          <circle cx="44" cy="48" r="6" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
          <path d="M22 28H30V38H18L22 28Z" fill="#BAE6FD" />
          <path d="M34 28H42L46 38H34V28Z" fill="#BAE6FD" />
        </svg>
      );
    case 'rainbow': // রংধনু (ং)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M12 46A20 20 0 0 1 52 46" stroke="#EF4444" strokeWidth="4" />
          <path d="M16 46A16 16 0 0 1 48 46" stroke="#F59E0B" strokeWidth="4" />
          <path d="M20 46A12 12 0 0 1 44 46" stroke="#10B981" strokeWidth="4" />
          <path d="M24 46A8 8 0 0 1 40 46" stroke="#3B82F6" strokeWidth="4" />
          <circle cx="14" cy="46" r="6" fill="#E2E8F0" />
          <circle cx="50" cy="46" r="6" fill="#E2E8F0" />
        </svg>
      );
    case 'moon': // চাঁদ (ঁ চন্দ্রবিন্দু)
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path d="M42 12C28 14 20 28 22 42C24 50 30 56 38 58C24 56 14 44 14 30C14 18 26 12 42 12Z" fill="#FBBF24" />
          <circle cx="46" cy="18" r="2" fill="#FEF08A" />
          <circle cx="44" cy="38" r="3" fill="#FEF08A" />
          <circle cx="34" cy="48" r="2" fill="#FEF08A" />
          <circle cx="52" cy="30" r="1.5" fill="#FFF" />
        </svg>
      );
    default:
      // Colorful friendly star badge
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="22" fill="#F59E0B" />
          <path d="M32 18L35 27H45L37 33L40 42L32 36L24 42L27 33L19 27H29L32 18Z" fill="#FEF08A" />
        </svg>
      );
  }
};
