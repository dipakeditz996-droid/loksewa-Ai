/**
 * Canonical 77 districts of Nepal grouped by province.
 * Used for structured, consistent location selection during registration & profile setup.
 */

export interface ProvinceDistricts {
  province: string;
  districts: string[];
}

export const NEPAL_PROVINCES_DISTRICTS: ProvinceDistricts[] = [
  {
    province: "Koshi Province",
    districts: [
      "Bhojpur",
      "Dhankuta",
      "Ilam",
      "Jhapa",
      "Khotang",
      "Morang",
      "Okhaldhunga",
      "Panchthar",
      "Sankhuwasabha",
      "Solukhumbu",
      "Sunsari",
      "Taplejung",
      "Terhathum",
      "Udayapur",
    ],
  },
  {
    province: "Madhesh Province",
    districts: [
      "Bara",
      "Dhanusha",
      "Mahottari",
      "Parsa",
      "Rautahat",
      "Saptari",
      "Sarlahi",
      "Siraha",
    ],
  },
  {
    province: "Bagmati Province",
    districts: [
      "Bhaktapur",
      "Chitwan",
      "Dhading",
      "Dolakha",
      "Kathmandu",
      "Kavrepalanchok",
      "Lalitpur",
      "Makwanpur",
      "Nuwakot",
      "Ramechhap",
      "Rasuwa",
      "Sindhuli",
      "Sindhupalchok",
    ],
  },
  {
    province: "Gandaki Province",
    districts: [
      "Baglung",
      "Gorkha",
      "Kaski",
      "Lamjung",
      "Manang",
      "Mustang",
      "Myagdi",
      "Nawalpur",
      "Parbat",
      "Syangja",
      "Tanahun",
    ],
  },
  {
    province: "Lumbini Province",
    districts: [
      "Arghakhanchi",
      "Banke",
      "Bardiya",
      "Dang",
      "Gulmi",
      "Kapilvastu",
      "Palpa",
      "Parasi",
      "Pyuthan",
      "Rolpa",
      "Rukum East",
      "Rupandehi",
    ],
  },
  {
    province: "Karnali Province",
    districts: [
      "Dailekh",
      "Dolpa",
      "Humla",
      "Jajarkot",
      "Jumla",
      "Kalikot",
      "Mugu",
      "Rukum West",
      "Salyan",
      "Surkhet",
    ],
  },
  {
    province: "Sudurpashchim Province",
    districts: [
      "Achham",
      "Baitadi",
      "Bajhang",
      "Bajura",
      "Dadeldhura",
      "Darchula",
      "Doti",
      "Kailali",
      "Kanchanpur",
    ],
  },
];

export const ALL_NEPAL_DISTRICTS: string[] = NEPAL_PROVINCES_DISTRICTS.flatMap(
  (p) => p.districts
).sort();
