/* ===========================================================
   mascot.js — Globert, the shop-floor mascot.
   Globert IS the Widget: the green rounded block with the
   signature "G" notch, given a hard hat and a face.
   window.globertMascot({size, idDelay}) -> SVG markup string.
   Used by the homepage hero and the promotion overlay.
   =========================================================== */
(function(){
  let uid = 0;
  window.globertMascot = function(opts){
    opts = opts || {};
    const s = opts.size || 240;
    const id = 'gm' + (uid++);
    return `
<svg class="globert-mascot" width="${s}" height="${s}" viewBox="0 0 240 240" fill="none"
     xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Globert the Widget mascot">
  <defs>
    <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4cb852"/>
      <stop offset="0.55" stop-color="#34a13a"/>
      <stop offset="1" stop-color="#2b8a31"/>
    </linearGradient>
    <linearGradient id="${id}-hat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6cf5e"/>
      <stop offset="1" stop-color="#e6b43c"/>
    </linearGradient>
  </defs>

  <!-- soft ground shadow -->
  <ellipse cx="120" cy="222" rx="64" ry="11" fill="#1c2722" opacity="0.10"/>

  <!-- feet -->
  <rect x="86"  y="196" width="26" height="22" rx="9" fill="#256f2a"/>
  <rect x="128" y="196" width="26" height="22" rx="9" fill="#256f2a"/>

  <!-- body: the Widget block -->
  <rect x="52" y="74" width="136" height="132" rx="36" fill="url(#${id}-body)"/>
  <!-- bottom-left low-poly facet -->
  <path d="M52 140 v30 a36 36 0 0 0 36 36 h22 Z" fill="#1f6b27" opacity="0.28"/>
  <!-- top highlight -->
  <path d="M88 74 h64 a36 36 0 0 1 14 6 q-50 14 -104 0 a36 36 0 0 1 26 -6Z" fill="#ffffff" opacity="0.16"/>
  <!-- signature G notch, top-right -->
  <rect x="150" y="70" width="42" height="27" rx="8" fill="#eef1ec"/>
  <rect x="150" y="70" width="42" height="27" rx="8" fill="none" stroke="#1f6b27" stroke-opacity="0.18" stroke-width="2"/>

  <!-- face -->
  <g>
    <!-- eyes -->
    <ellipse cx="99"  cy="132" rx="18" ry="21" fill="#ffffff"/>
    <ellipse cx="143" cy="132" rx="18" ry="21" fill="#ffffff"/>
    <circle cx="103" cy="137" r="8.5" fill="#1c2722"/>
    <circle cx="147" cy="137" r="8.5" fill="#1c2722"/>
    <circle cx="106" cy="134" r="2.6" fill="#ffffff"/>
    <circle cx="150" cy="134" r="2.6" fill="#ffffff"/>
    <!-- rosy cheeks -->
    <ellipse cx="80"  cy="156" rx="9" ry="6" fill="#ffffff" opacity="0.18"/>
    <ellipse cx="162" cy="156" rx="9" ry="6" fill="#ffffff" opacity="0.18"/>
    <!-- smile -->
    <path d="M99 166 Q121 184 143 166" stroke="#163e1b" stroke-width="6"
          stroke-linecap="round" fill="none"/>
  </g>

  <!-- hard hat -->
  <g>
    <ellipse cx="120" cy="78" rx="74" ry="14" fill="url(#${id}-hat)"/>
    <ellipse cx="120" cy="76" rx="74" ry="13" fill="#fcd874" opacity="0.5"/>
    <path d="M64 78 Q66 34 120 32 Q174 34 176 78 Z" fill="url(#${id}-hat)"/>
    <path d="M104 33 Q104 60 104 78" stroke="#d9a437" stroke-width="4" fill="none" opacity="0.7"/>
    <path d="M136 33 Q136 60 136 78" stroke="#d9a437" stroke-width="4" fill="none" opacity="0.7"/>
    <path d="M64 78 Q66 34 120 32 Q174 34 176 78" stroke="#caa133" stroke-width="2.5" fill="none" opacity="0.6"/>
    <!-- hat badge with real G mark -->
    <circle cx="120" cy="56" r="15" fill="#1f6b27"/>
    <g transform="translate(120 56) scale(0.64) translate(-21.56 -101.71)">
      <path fill="#ffffff" d="M26.72,106.6H21.64v-5.31H36.9l0,15.94-4.95,0,0-6a14,14,0,0,1-11.19,6h-.29A14.15,14.15,0,0,1,6.84,106.77c0-.1-.07-.19-.09-.29h0s0,0,0,0A13.84,13.84,0,0,1,6.42,105h0a8.23,8.23,0,0,1-.16-1.31,7.84,7.84,0,0,1,0-1.37c0-.07,0-.14,0-.2,0-.39,0-.77.1-1.16a13.88,13.88,0,0,1,.23-1.46,15.56,15.56,0,0,1,7.59-11.3,12.74,12.74,0,0,1,7.3-2c.57,0,1.14.06,1.71.13A16.05,16.05,0,0,1,36.38,98l-7.55,0a.3.3,0,0,1,0-.08c-2-5.06-4.06-5.57-5.37-6.33-4.5-2-9.81-.54-13.27,3.07h0a12.78,12.78,0,0,0-3.52,7.7s0,.08,0,.12a.56.56,0,0,1,0-.12,11.41,11.41,0,0,1,9.84-8.38,9.77,9.77,0,0,0-1,.63,7.35,7.35,0,0,0-3,3.54,8.62,8.62,0,0,0-.79,3.6,8.84,8.84,0,0,0,6.46,8.43,7.91,7.91,0,0,0,1.07.25,4.87,4.87,0,0,0,.55.06,9.1,9.1,0,0,0,.91,0,9,9,0,0,0,6.82-3.08,7.08,7.08,0,0,0,.66-.79Z"/>
    </g>
  </g>
</svg>`;
  };
})();
