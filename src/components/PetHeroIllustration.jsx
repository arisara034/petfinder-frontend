function PawPrint({ x, y, scale = 1, rotate = 0, opacity = 0.35, color = '#f97316' }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity} fill={color}>
      <ellipse cx="0" cy="6" rx="10" ry="8" />
      <ellipse cx="-11" cy="-8" rx="4.2" ry="5.4" />
      <ellipse cx="-4" cy="-14" rx="4.2" ry="5.4" />
      <ellipse cx="4" cy="-14" rx="4.2" ry="5.4" />
      <ellipse cx="11" cy="-8" rx="4.2" ry="5.4" />
    </g>
  );
}

function PetHeroIllustration() {
  return (
    <svg viewBox="0 0 480 420" className="pet-hero-illustration" role="img" aria-label="ภาพประกอบสุนัขและแมว">
      {/* พื้นหลังบลอบนุ่มๆ */}
      <circle cx="245" cy="220" r="205" fill="#fff3e0" />
      <circle cx="245" cy="230" r="175" fill="#ffe6c2" opacity="0.7" />

      {/* หมุดตกแต่ง */}
      <PawPrint x="70" y="80" rotate="-25" scale="1.1" opacity="0.3" />
      <PawPrint x="410" y="110" rotate="15" scale="0.9" opacity="0.3" />
      <PawPrint x="400" y="330" rotate="-10" scale="1.2" opacity="0.28" />
      <PawPrint x="55" y="320" rotate="20" scale="0.8" opacity="0.28" />

      {/* หูสุนัข */}
      <ellipse cx="140" cy="205" rx="34" ry="56" fill="#c17f3e" transform="rotate(-22 140 205)" />
      <ellipse cx="232" cy="205" rx="34" ry="56" fill="#c17f3e" transform="rotate(22 232 205)" />

      {/* หัวสุนัข */}
      <circle cx="186" cy="245" r="92" fill="#e0a458" />
      <ellipse cx="186" cy="283" rx="54" ry="38" fill="#fff7ed" />
      <ellipse cx="186" cy="262" rx="13" ry="9" fill="#3f2d20" />
      <circle cx="157" cy="228" r="8" fill="#3f2d20" />
      <circle cx="215" cy="228" r="8" fill="#3f2d20" />
      <circle cx="154.5" cy="225.5" r="2.4" fill="#fff" />
      <circle cx="212.5" cy="225.5" r="2.4" fill="#fff" />
      <path d="M186 271 v10" stroke="#3f2d20" strokeWidth="3" strokeLinecap="round" />
      <path d="M186 281 q-16 14 -30 4" stroke="#3f2d20" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M186 281 q16 14 30 4" stroke="#3f2d20" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="186" cy="296" rx="9" ry="7" fill="#f4879c" />

      {/* หูแมว */}
      <path d="M300 158 L326 96 L352 158 Z" fill="#f4a261" />
      <path d="M308 150 L326 112 L344 150 Z" fill="#fbcfe8" />
      <path d="M352 158 L378 96 L404 158 Z" fill="#f4a261" />
      <path d="M360 150 L378 112 L396 150 Z" fill="#fbcfe8" />

      {/* หัวแมว */}
      <circle cx="352" cy="216" r="72" fill="#f4a261" />
      <ellipse cx="352" cy="240" rx="42" ry="30" fill="#fff7ed" />

      {/* หนวด */}
      <path d="M318 236 h-30" stroke="#c17f3e" strokeWidth="2" strokeLinecap="round" />
      <path d="M316 244 h-28" stroke="#c17f3e" strokeWidth="2" strokeLinecap="round" />
      <path d="M386 236 h30" stroke="#c17f3e" strokeWidth="2" strokeLinecap="round" />
      <path d="M388 244 h28" stroke="#c17f3e" strokeWidth="2" strokeLinecap="round" />

      {/* ตาแมว (ยิ้มหยี) */}
      <path d="M325 202 q10 -10 20 0" stroke="#3f2d20" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M359 202 q10 -10 20 0" stroke="#3f2d20" strokeWidth="3.4" strokeLinecap="round" fill="none" />

      {/* จมูก + ปาก */}
      <path d="M352 226 l-6 6 h12 z" fill="#f4879c" />
      <path d="M352 232 v6" stroke="#3f2d20" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M352 238 q-10 8 -18 2" stroke="#3f2d20" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M352 238 q10 8 18 2" stroke="#3f2d20" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default PetHeroIllustration;
