// src/utils/marketplaceCategories.js
// The fixed list of Dropshipping Marketplace categories (plan decision J7).
//
// WHERE IT CAME FROM (2026-09-25): the top level of Google's product taxonomy
// (21 branches, the de-facto standard for product feeds), Alibaba.com's
// wholesale industries, and Jumia Nigeria's departments, merged and trimmed to
// what Nigerian suppliers actually stock. Power & Solar, Native & traditional
// wear, Foodstuff and Vehicle spare parts are their own branches because they
// are large, distinct markets here that global lists bury.
//
// `nafdac: true` marks a subcategory whose goods must be NAFDAC-registered
// before they can be sold in Nigeria (food, drinks, cosmetics, supplements,
// medical devices, agrochemicals). A listing there must carry a NAFDAC number,
// which the admin can check. That protects dropshippers, who are the ones
// selling the item, and Sellapage.
//
// `adult: true` marks age-restricted goods (18+). Shown as a note; enforcement
// at checkout is a Phase 4 question.
//
// Ids are stored on products, so NEVER rename or reuse one. Add new ones; to
// retire one, add `retired: true` (existing listings keep working, new ones
// cannot pick it).
//
// Deliberately absent, because they cannot be sold here at all: prescription
// medicines, weapons and ammunition (including air guns), fireworks, narcotics,
// counterfeit or replica branded goods, live animals, and anything on the
// FCCPC or Customs absolutely-prohibited lists. See PROHIBITED_GOODS.

export const MARKETPLACE_CATEGORIES = [
  {
    id: 'phones-tablets', label: 'Phones & Tablets', subs: [
      { id: 'mobile-phones', label: 'Mobile phones' },
      { id: 'tablets', label: 'Tablets' },
      { id: 'phone-accessories', label: 'Cases, chargers & cables' },
      { id: 'power-banks', label: 'Power banks' },
      { id: 'wearables', label: 'Smart watches & wearables' },
      { id: 'phone-parts', label: 'Phone parts & repair tools' },
    ],
  },
  {
    id: 'computing', label: 'Computers & Office Tech', subs: [
      { id: 'laptops', label: 'Laptops' },
      { id: 'desktops-monitors', label: 'Desktops & monitors' },
      { id: 'computer-accessories', label: 'Keyboards, mice & accessories' },
      { id: 'storage', label: 'Storage & memory' },
      { id: 'networking', label: 'Routers, modems & networking' },
      { id: 'printers', label: 'Printers, scanners & ink' },
      { id: 'computer-parts', label: 'Computer parts' },
      { id: 'software', label: 'Software & licences' },
    ],
  },
  {
    id: 'electronics', label: 'Electronics', subs: [
      { id: 'televisions', label: 'Televisions' },
      { id: 'audio', label: 'Speakers, headphones & earbuds' },
      { id: 'home-theatre', label: 'Home theatre & sound systems' },
      { id: 'cameras', label: 'Cameras, drones & accessories' },
      { id: 'security-cctv', label: 'CCTV, smart locks & security' },
      { id: 'electrical', label: 'Cables, sockets & electrical' },
      { id: 'other-electronics', label: 'Other electronics' },
    ],
  },
  {
    id: 'power-solar', label: 'Power & Solar', subs: [
      { id: 'generators', label: 'Generators' },
      { id: 'inverters', label: 'Inverters & UPS' },
      { id: 'solar-panels', label: 'Solar panels & kits' },
      { id: 'batteries', label: 'Inverter & solar batteries' },
      { id: 'stabilisers', label: 'Stabilisers & surge protectors' },
      { id: 'rechargeables', label: 'Rechargeable fans & lamps' },
    ],
  },
  {
    id: 'appliances', label: 'Home Appliances', subs: [
      { id: 'fridges-freezers', label: 'Fridges & freezers' },
      { id: 'washing-machines', label: 'Washing machines & dryers' },
      { id: 'air-conditioners', label: 'Air conditioners' },
      { id: 'fans', label: 'Fans & air coolers' },
      { id: 'kitchen-appliances', label: 'Blenders, microwaves & small kitchen appliances' },
      { id: 'cookers', label: 'Cookers, ovens & gas cylinders' },
      { id: 'irons-cleaning', label: 'Irons, vacuums & cleaning machines' },
      { id: 'water-dispensers', label: 'Water dispensers & purifiers' },
    ],
  },
  {
    id: 'home-kitchen', label: 'Home & Kitchen', subs: [
      { id: 'cookware', label: 'Pots, pans & cookware' },
      { id: 'tableware', label: 'Plates, cups & tableware' },
      { id: 'kitchen-storage', label: 'Food storage & kitchen tools' },
      { id: 'bedding', label: 'Bedding & mattresses' },
      { id: 'furniture', label: 'Furniture' },
      { id: 'decor', label: 'Home decor & curtains' },
      { id: 'lighting', label: 'Lighting' },
      { id: 'bathroom', label: 'Bathroom & laundry' },
      { id: 'cleaning-supplies', label: 'Cleaning supplies' },
      { id: 'garden', label: 'Garden & outdoor' },
    ],
  },
  {
    id: 'fashion', label: 'Fashion', subs: [
      { id: 'womens-clothing', label: "Women's clothing" },
      { id: 'mens-clothing', label: "Men's clothing" },
      { id: 'kids-clothing', label: "Children's clothing" },
      { id: 'native-wear', label: 'Native & traditional wear' },
      { id: 'fabrics', label: 'Fabrics, Ankara & lace' },
      { id: 'shoes', label: 'Shoes & slippers' },
      { id: 'bags', label: 'Bags & luggage' },
      { id: 'jewellery', label: 'Jewellery' },
      { id: 'watches', label: 'Watches' },
      { id: 'eyewear', label: 'Sunglasses & eyewear' },
      { id: 'underwear', label: 'Underwear & nightwear' },
      { id: 'fashion-accessories', label: 'Belts, caps & accessories' },
    ],
  },
  {
    id: 'beauty', label: 'Beauty & Personal Care', subs: [
      { id: 'skincare', label: 'Skincare', nafdac: true },
      { id: 'makeup', label: 'Makeup', nafdac: true },
      { id: 'hair-care', label: 'Hair care products', nafdac: true },
      { id: 'wigs-extensions', label: 'Wigs, weaves & extensions' },
      { id: 'fragrances', label: 'Perfumes & fragrances', nafdac: true },
      { id: 'personal-care', label: 'Soap, deodorant & oral care', nafdac: true },
      { id: 'mens-grooming', label: "Men's grooming", nafdac: true },
      { id: 'beauty-tools', label: 'Beauty tools & accessories' },
    ],
  },
  {
    id: 'health', label: 'Health & Wellness', subs: [
      { id: 'supplements', label: 'Vitamins & supplements', nafdac: true },
      { id: 'medical-devices', label: 'BP monitors, thermometers & medical devices', nafdac: true },
      { id: 'first-aid', label: 'First aid', nafdac: true },
      { id: 'sexual-wellness', label: 'Sexual wellness', nafdac: true, adult: true },
      { id: 'mobility', label: 'Mobility & orthopaedic aids' },
    ],
  },
  {
    id: 'baby-kids', label: 'Baby & Kids', subs: [
      { id: 'diapers', label: 'Diapers & wipes', nafdac: true },
      { id: 'baby-food', label: 'Baby food & formula', nafdac: true },
      { id: 'feeding', label: 'Feeding bottles & accessories' },
      { id: 'baby-gear', label: 'Strollers, car seats & carriers' },
      { id: 'baby-care', label: 'Baby bath & skincare', nafdac: true },
      { id: 'toys', label: 'Toys & games' },
      { id: 'school', label: 'School bags & supplies' },
    ],
  },
  {
    id: 'food', label: 'Food & Groceries', subs: [
      { id: 'grains', label: 'Rice, beans & grains (packaged)', nafdac: true },
      { id: 'foodstuff', label: 'Garri, flour & swallow (packaged)', nafdac: true },
      { id: 'oils', label: 'Cooking oils', nafdac: true },
      { id: 'spices', label: 'Spices & seasonings', nafdac: true },
      { id: 'snacks', label: 'Snacks, biscuits & sweets', nafdac: true },
      { id: 'breakfast', label: 'Cereals, beverages powder & spreads', nafdac: true },
      { id: 'canned', label: 'Canned & packaged foods', nafdac: true },
      { id: 'frozen', label: 'Frozen foods', nafdac: true },
      { id: 'fresh-produce', label: 'Fresh produce (unpackaged)' },
    ],
  },
  {
    id: 'drinks', label: 'Drinks', subs: [
      { id: 'water', label: 'Bottled & sachet water', nafdac: true },
      { id: 'soft-drinks', label: 'Soft drinks & juices', nafdac: true },
      { id: 'energy-malt', label: 'Malt & energy drinks', nafdac: true },
      { id: 'tea-coffee', label: 'Tea & coffee', nafdac: true },
      { id: 'alcohol', label: 'Beer, wine & spirits', nafdac: true, adult: true },
    ],
  },
  {
    id: 'automotive', label: 'Vehicles & Automotive', subs: [
      { id: 'cars', label: 'Cars & vehicles' },
      { id: 'motorcycles', label: 'Motorcycles & tricycles' },
      { id: 'car-parts', label: 'Car spare parts' },
      { id: 'motorcycle-parts', label: 'Motorcycle & tricycle parts' },
      { id: 'tyres', label: 'Tyres & rims' },
      { id: 'car-batteries', label: 'Car batteries' },
      { id: 'oils-fluids', label: 'Engine oils & fluids' },
      { id: 'car-electronics', label: 'Car electronics & trackers' },
      { id: 'car-care', label: 'Car care & interior accessories' },
      { id: 'auto-tools', label: 'Tools & garage equipment' },
    ],
  },
  {
    id: 'sports', label: 'Sports & Fitness', subs: [
      { id: 'gym-equipment', label: 'Gym & fitness equipment' },
      { id: 'sportswear', label: 'Sportswear & jerseys' },
      { id: 'team-sports', label: 'Football & team sports' },
      { id: 'outdoor', label: 'Camping & outdoor' },
      { id: 'cycling', label: 'Bicycles & cycling' },
    ],
  },
  {
    id: 'gaming', label: 'Gaming', subs: [
      { id: 'consoles', label: 'Consoles' },
      { id: 'games', label: 'Games' },
      { id: 'gaming-accessories', label: 'Controllers & gaming accessories' },
    ],
  },
  {
    id: 'books-stationery', label: 'Books, Stationery & Office', subs: [
      { id: 'books', label: 'Books' },
      { id: 'stationery', label: 'Stationery & school supplies' },
      { id: 'office-supplies', label: 'Office supplies' },
      { id: 'office-furniture', label: 'Office furniture' },
      { id: 'art-supplies', label: 'Art & craft supplies' },
    ],
  },
  {
    id: 'music', label: 'Musical Instruments', subs: [
      { id: 'instruments', label: 'Instruments' },
      { id: 'studio', label: 'Studio, microphones & PA systems' },
      { id: 'music-accessories', label: 'Strings, stands & accessories' },
    ],
  },
  {
    id: 'tools-building', label: 'Tools, Hardware & Building', subs: [
      { id: 'power-tools', label: 'Power tools' },
      { id: 'hand-tools', label: 'Hand tools' },
      { id: 'plumbing', label: 'Plumbing' },
      { id: 'building-materials', label: 'Building materials, tiles & paint' },
      { id: 'safety', label: 'Safety gear & PPE' },
    ],
  },
  {
    id: 'industrial', label: 'Industrial & Business', subs: [
      { id: 'machinery', label: 'Machinery & equipment' },
      { id: 'commercial-kitchen', label: 'Commercial kitchen & catering' },
      { id: 'packaging', label: 'Packaging & printing' },
      { id: 'pos-retail', label: 'POS, scales & shop fittings' },
    ],
  },
  {
    id: 'agriculture', label: 'Agriculture', subs: [
      { id: 'seeds', label: 'Seeds & seedlings' },
      { id: 'agrochemicals', label: 'Fertilisers & agrochemicals', nafdac: true },
      { id: 'animal-feed', label: 'Animal feed', nafdac: true },
      { id: 'farm-tools', label: 'Farm tools & equipment' },
    ],
  },
  {
    id: 'pets', label: 'Pet Supplies', subs: [
      { id: 'pet-food', label: 'Pet food & treats', nafdac: true },
      { id: 'pet-accessories', label: 'Pet accessories & grooming' },
    ],
  },
  {
    id: 'gifts-party', label: 'Gifts, Party & Religious', subs: [
      { id: 'gifts', label: 'Gift items & souvenirs' },
      { id: 'party', label: 'Party & event supplies' },
      { id: 'religious', label: 'Religious items' },
    ],
  },
]

export const PROHIBITED_GOODS = [
  'Prescription medicines',
  'Weapons, ammunition and air guns',
  'Fireworks and explosives',
  'Narcotics and illegal drugs',
  'Counterfeit, fake or replica branded goods',
  'Live animals',
  'Anything on the FCCPC or Nigeria Customs absolutely-prohibited lists',
]

const BY_ID = new Map(MARKETPLACE_CATEGORIES.map((c) => [c.id, c]))

export function findCategory(categoryId) {
  return BY_ID.get(String(categoryId || '')) || null
}

export function findSubcategory(categoryId, subId) {
  return findCategory(categoryId)?.subs.find((s) => s.id === String(subId || '')) || null
}

/** Human label, e.g. "Beauty & Personal Care / Skincare". Empty when unknown. */
export function categoryLabel(categoryId, subId) {
  const cat = findCategory(categoryId)
  const sub = findSubcategory(categoryId, subId)
  if (!cat) return ''
  return sub ? `${cat.label} / ${sub.label}` : cat.label
}
