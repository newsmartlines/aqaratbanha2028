const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f1f5f9"/>
  <rect x="290" y="180" width="220" height="160" rx="6" fill="none" stroke="#cbd5e1" stroke-width="5"/>
  <polygon points="270,200 400,110 530,200" fill="none" stroke="#cbd5e1" stroke-width="5" stroke-linejoin="round"/>
  <rect x="358" y="270" width="44" height="70" rx="4" fill="#cbd5e1"/>
  <circle cx="460" cy="230" r="18" fill="none" stroke="#cbd5e1" stroke-width="4"/>
  <text x="400" y="420" font-family="Tajawal, Cairo, Arial" font-size="28" fill="#94a3b8" text-anchor="middle" font-weight="700">لا توجد صورة</text>
</svg>`;

export const NO_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
