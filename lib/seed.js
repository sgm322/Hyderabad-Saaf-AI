import { HYDERABAD_AREAS } from './constants';

const AREA = Object.fromEntries(HYDERABAD_AREAS.map((a) => [a.name, a]));

function art(category) {
  const palettes = {
    WASTE: ['#d1fae5', '#059669', '#fbbf24', 'Garbage pile'],
    ROAD: ['#fef3c7', '#d97706', '#78350f', 'Pothole'],
    WATER: ['#dbeafe', '#2563eb', '#0e7490', 'Water leak'],
    LIGHT: ['#ede9fe', '#7c3aed', '#1e1b4b', 'Streetlight'],
  };
  const [bg, fg, accent, label] = palettes[category] || palettes.WASTE;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#ffffff"/>
    </linearGradient></defs>
    <rect width="640" height="420" fill="url(#g)"/>
    <circle cx="540" cy="70" r="120" fill="${fg}" opacity=".12"/>
    <circle cx="70" cy="380" r="90" fill="${accent}" opacity=".18"/>
    <path d="M0 330 Q120 260 250 320 T640 290 V420 H0 Z" fill="${fg}" opacity=".2"/>
    <path d="M0 355 Q160 300 330 350 T640 330 V420 H0 Z" fill="${fg}" opacity=".28"/>
    <g transform="translate(320 190)">
      <circle r="58" fill="#ffffff" opacity=".85"/>
      <text x="0" y="18" font-size="56" text-anchor="middle">${
        category === 'WASTE' ? '🗑️' : category === 'ROAD' ? '🕳️' : category === 'WATER' ? '💧' : '💡'
      }</text>
    </g>
    <text x="320" y="300" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="${fg}" text-anchor="middle">${label}</text>
    <text x="320" y="330" font-family="Arial, sans-serif" font-size="15" fill="${fg}" opacity=".75" text-anchor="middle">Hyderabad, Sindh</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

export function buildSeedComplaints() {
  const raw = [
    {
      id: 'seed-1',
      category: 'WASTE',
      department: 'HMC',
      priority: 'High',
      status: 'Pending',
      title: 'Garbage pile blocking street in Latifabad Unit 3',
      description:
        'A large pile of household waste has been lying on the corner of the street for four days. It smells badly and children are playing near it.',
      formalComplaint:
        'Respected Sir/Madam, A large accumulation of household solid waste has been present at the street corner of Latifabad Unit 3 for the past four days, creating a serious public health and sanitation hazard. The foul odour is affecting nearby residents and children are exposed to the site. Kindly arrange immediate collection and disinfection of the area. Thank you.',
      area: 'Latifabad Unit 3',
      location: { lat: AREA['Latifabad Unit 3'].lat, lng: AREA['Latifabad Unit 3'].lng },
      imageUrl: art('WASTE'),
      aiLabel: 'garbage pile',
      aiConfidence: 0.95,
      reporter: 'Citizen Report',
      language: 'en',
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(5),
    },
    {
      id: 'seed-2',
      category: 'ROAD',
      department: 'HMC',
      priority: 'High',
      status: 'In-Progress',
      title: 'Deep pothole on Qasimabad main road',
      description:
        'A deep pothole near the Qasimabad market turn is causing motorbike accidents at night. Two riders fell last week.',
      formalComplaint:
        'Respected Sir/Madam, A deep pothole has developed on the main road near the Qasimabad market turn. The defect is difficult to see at night and has already caused two motorcycle accidents in the past week. Immediate repair and road levelling is requested to prevent further injury to commuters. Thank you.',
      area: 'Qasimabad',
      location: { lat: AREA.Qasimabad.lat, lng: AREA.Qasimabad.lng },
      imageUrl: art('ROAD'),
      aiLabel: 'pothole / damaged road',
      aiConfidence: 0.88,
      reporter: 'Citizen Report',
      language: 'ur',
      createdAt: hoursAgo(26),
      updatedAt: hoursAgo(9),
    },
    {
      id: 'seed-3',
      category: 'LIGHT',
      department: 'HESCO',
      priority: 'Medium',
      status: 'Pending',
      title: 'Three streetlights not working on Autobahn Road',
      description:
        'The streetlights between the Autobahn Road service lane and the bus stop have been dark for over a week. The area feels unsafe at night.',
      formalComplaint:
        'Respected Sir/Madam, Three consecutive streetlights on the Autobahn Road service lane, near the bus stop, have been non-functional for more than one week. The resulting darkness has created a safety concern for pedestrians and commuters during night hours. Kindly inspect the circuit and restore the lighting at the earliest. Thank you.',
      area: 'Autobahn Road',
      location: { lat: AREA['Autobahn Road'].lat, lng: AREA['Autobahn Road'].lng },
      imageUrl: art('LIGHT'),
      aiLabel: 'streetlight / lamp post',
      aiConfidence: 0.82,
      reporter: 'Citizen Report',
      language: 'en',
      createdAt: hoursAgo(48),
      updatedAt: hoursAgo(48),
    },
    {
      id: 'seed-4',
      category: 'WATER',
      department: 'WASA',
      priority: 'High',
      status: 'Resolved',
      title: 'Sewage overflow in Citizen Colony street',
      description:
        'Sewage water was overflowing from a blocked manhole in Citizen Colony and entering homes. It has now been cleared after reporting.',
      formalComplaint:
        'Respected Sir/Madam, A blocked sewerage line caused untreated wastewater to overflow onto the street and into nearby homes in Citizen Colony. The situation posed an immediate health risk to residents. The complaint has been attended and the blockage cleared. Thank you.',
      area: 'Citizen Colony',
      location: { lat: AREA['Citizen Colony'].lat, lng: AREA['Citizen Colony'].lng },
      imageUrl: art('WATER'),
      aiLabel: 'sewage / standing water',
      aiConfidence: 0.91,
      reporter: 'Citizen Report',
      language: 'sd',
      createdAt: hoursAgo(72),
      updatedAt: hoursAgo(20),
    },
    {
      id: 'seed-5',
      category: 'WASTE',
      department: 'HMC',
      priority: 'Medium',
      status: 'Resolved',
      title: 'Garbage not collected for 3 days on Hali Road',
      description:
        'The community bin on Hali Road was overflowing. Collection has been restored and the bin area was cleaned.',
      formalComplaint:
        'Respected Sir/Madam, The community waste bin located on Hali Road was not collected for three consecutive days, causing an overflow of garbage onto the road. Collection has now been restored and the surrounding area cleaned. Thank you for the prompt action.',
      area: 'Hali Road',
      location: { lat: AREA['Hali Road'].lat, lng: AREA['Hali Road'].lng },
      imageUrl: art('WASTE'),
      aiLabel: 'overflowing bin',
      aiConfidence: 0.87,
      reporter: 'Citizen Report',
      language: 'ur',
      createdAt: hoursAgo(120),
      updatedAt: hoursAgo(96),
    },
  ];
  return raw;
}
