/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Blog, FAQ, Coupon, WebsiteSettings } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Golden Chyawanprash - Saffron & Wild Honey",
    sku: "AYUR-CHY-001",
    price: 850,
    originalPrice: 950,
    stock: 45,
    category: "Immunity",
    subcategory: "Syrup",
    brand: "Grams Life Organics",
    description: "An ancient, powerful blend of 45+ premium Ayurvedic herbs, enriched with handpicked Kashmiri saffron, wild forest honey, and organic ghee. Grams Life Chyawanprash acts as a natural immunity shield, restoring youthful energy, boosting stamina, and improving respiratory function.",
    mainImage: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1608797178974-15b35a61d121?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Amalaki (Amla)", description: "Rich source of Vitamin C, potent antioxidant, supports cell regeneration." },
      { name: "Kesar (Saffron)", description: "Improves skin radiance, elevates mood, and boosts cell vitality." },
      { name: "Vanshlochan", description: "Strengthens lungs and respiratory passages, acts as a bone supplement." },
      { name: "Pippali", description: "Enhances bio-availability of nutrients, supports digestion and lung strength." }
    ],
    benefits: [
      "Supercharges overall immune response and respiratory health.",
      "Supports rapid cells recovery and fights early signs of aging.",
      "Improves digestion, toxin elimination, and gut bio-diversity.",
      "Naturally increases energy, daily focus, and physical endurance."
    ],
    dosage: "1 teaspoon (10g) twice a day for adults, 1/2 teaspoon for children under 12.",
    usageInstructions: "Consume directly or dissolve in a cup of warm milk/water. Best taken first thing in the morning on an empty stomach.",
    faqs: [
      { question: "Is this safe to consume in summers?", answer: "Yes. Our Chyawanprash is formulated with cooling herbs like Amalaki and Cardamom to balance the warming elements of pepper and ginger, making it completely safe for year-round consumption." },
      { question: "Can diabetic individuals take this?", answer: "This premium variant contains wild forest honey and minimal rock candy. For severe diabetic conditions, we recommend consulting your physician first, or choosing our sugar-free variants." }
    ],
    rating: 4.8,
    featured: true,
    bestSeller: true,
    lowStockAlertLimit: 10,
    createdDate: "2026-05-01"
  },
  {
    id: "prod-2",
    name: "Pure Ashwagandha KSM-66 Capsules",
    sku: "AYUR-ASH-002",
    price: 490,
    originalPrice: 590,
    stock: 120,
    category: "Immunity",
    subcategory: "Capsules",
    brand: "Grams Life Wellness",
    description: "Premium high-concentration Ashwagandha root extract (standardized to 5% withanolides). Formulated scientifically using KSM-66, the most clinically researched ashwagandha on the market, to reduce daily cortisol levels, eliminate stress, and boost mental calmness.",
    mainImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Ashwagandha Extract KSM-66", description: "Full-spectrum root extract with high bio-availability, standard 5% withanolides." }
    ],
    benefits: [
      "Clinically proven to significantly lower anxiety, stress levels, and stress-induced cravings.",
      "Improves sleep cycle quality, promoting restorative deep REM sleep.",
      "Enhances natural muscle recovery, muscle endurance, and strength.",
      "Supports cognitive performance, memory retention, and brain focus."
    ],
    dosage: "1 capsule twice daily with milk or water after meals.",
    usageInstructions: "Take one capsule in the morning to handle daily stress and one before bedtime for deep sleep.",
    faqs: [
      { question: "What is KSM-66?", answer: "KSM-66 is an award-winning, certified organic root extract of Ashwagandha produced using a unique milk-processing extraction method, keeping the natural chemical balance of the herb fully intact." }
    ],
    rating: 4.7,
    featured: true,
    bestSeller: true,
    lowStockAlertLimit: 15,
    createdDate: "2026-05-10"
  },
  {
    id: "prod-3",
    name: "Kumkumadi Night Elixir Serum",
    sku: "AYUR-KUM-003",
    price: 1890,
    originalPrice: 2200,
    stock: 35,
    category: "Skin Care",
    subcategory: "Oils",
    brand: "Grams Life Beauty",
    description: "An opulent, highly prized face oil made with pure saffron, sandalwood, and 26 precious Ayurvedic botanicals. This fast-absorbing golden elixir is prepared using traditional taila pak vidhi to overnight illuminate your skin, remove pigmentation, and cure fine lines.",
    mainImage: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Kumkuma (Saffron)", description: "Brightens complexion, clears blemishes, and increases skin cell renewal." },
      { name: "Chandana (Sandalwood)", description: "Cools the skin, heals irritation, and creates a flawless matte texture." },
      { name: "Manjistha", description: "Improves blood circulation in skin layers and clarifies internal toxins." }
    ],
    benefits: [
      "Produces a luminous golden skin glow and deeply hydrates skin.",
      "Visibly fades dark circles, pigmentation, age spots, and sun spots.",
      "Improves natural skin elasticity and fights premature wrinkles.",
      "Soothes sensitive skin, curing redness, dry patches, and acne scars."
    ],
    dosage: "3-4 drops for normal to dry skin; 2-3 drops for oily skin.",
    usageInstructions: "Wash face thoroughly. Dampen skin with rose water, take drops on palms, gently massage on face in upward circles until absorbed. Leave overnight.",
    faqs: [
      { question: "Is this suitable for oily, acne-prone skin?", answer: "Yes, but use sparingly. The formulation contains Manjistha and Sandalwood which actively regulate oil glands. Apply only 1-2 drops directly onto scars rather than the entire face if highly prone to breakout." }
    ],
    rating: 4.9,
    featured: true,
    bestSeller: false,
    lowStockAlertLimit: 8,
    createdDate: "2026-04-15"
  },
  {
    id: "prod-4",
    name: "Brahmi & Bringraj Hair Therapy Oil",
    sku: "AYUR-HAIR-004",
    price: 520,
    originalPrice: 590,
    stock: 8,
    category: "Hair Care",
    subcategory: "Oils",
    brand: "Grams Life Beauty",
    description: "Cold-pressed black sesame oil infused with fresh Bhringraj leaves, Brahmi extract, and Amla juice. This intense therapeutic oil penetrates deeply to stimulate hair roots, stop hair fall, cool down the scalp, and prevent premature graying.",
    mainImage: "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Bhringraj", description: "The 'King of Hair' herbs, triggers dormant hair follicles, increases volume." },
      { name: "Brahmi", description: "Cools the mind, reduces stress, and strengthens the root shafts." },
      { name: "Amla", description: "Deeply conditions, provides shine, and prevents premature gray hair." }
    ],
    benefits: [
      "Reduces hair fall up to 90% with regular bi-weekly therapeutic massage.",
      "Soothes itchy, dry scalps and cures dandruff flakes naturally.",
      "Promotes deep sleep, eases headaches, and relieves mental fatigue.",
      "Leaves hair deeply conditioned, voluminous, silky, and lustrous."
    ],
    dosage: "10-15ml depending on hair volume.",
    usageInstructions: "Warm the oil slightly. Part hair and apply directly to the scalp. Massage gently for 10 minutes. Keep overnight or for at least 2 hours before washing with a sulfate-free herbal shampoo.",
    faqs: [
      { question: "How fast will I see results for hair fall?", answer: "Most customers notice a significant reduction in hair fall and a cooler, less irritated scalp within 3 to 4 weeks of consistent bi-weekly usage." }
    ],
    rating: 4.6,
    featured: false,
    bestSeller: true,
    lowStockAlertLimit: 10,
    createdDate: "2026-05-20"
  },
  {
    id: "prod-5",
    name: "Triphala Organic Digestive Cleanse Churna",
    sku: "AYUR-TRI-005",
    price: 250,
    originalPrice: 290,
    stock: 150,
    category: "Digestion",
    subcategory: "Churna",
    brand: "Grams Life Organics",
    description: "The classic Ayurvedic formula for gut health. A perfectly balanced blend of three certified organic fruits (Amalaki, Bibhitaki, and Haritaki) to gently cleanse the digestive tract, cure bloating, regulate bowel movements, and detoxify the entire gastrointestinal system.",
    mainImage: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Organic Amalaki (Emblica officinalis)", description: "Cools the gut, balances acidity, and repairs the digestive lining." },
      { name: "Organic Bibhitaki (Terminalia bellirica)", description: "Clears old toxic mucus from colon, supports liver health." },
      { name: "Organic Haritaki (Terminalia chebula)", description: "Natural laxative, helps eliminate waste and digest toxins." }
    ],
    benefits: [
      "Relieves chronic constipation, acidity, and bloated feeling.",
      "Gently detoxifies the colon without causing dependency or loose stools.",
      "Supports healthy weight management by boosting gut metabolism.",
      "Aids nutrient absorption, leaving you lighter and highly energized."
    ],
    dosage: "1/2 to 1 teaspoon (2.5g to 5g) daily before bedtime.",
    usageInstructions: "Mix in a glass of warm water or drink with honey. Consume at night, ideally 1 hour after dinner.",
    faqs: [
      { question: "Does Triphala cause stomach cramps?", answer: "No. Unlike synthetic laxatives, organic Triphala does not force intestinal contractions; it gently tones colon muscles and moisturizes dry intestines to restore natural stool elimination." }
    ],
    rating: 4.5,
    featured: false,
    bestSeller: true,
    lowStockAlertLimit: 20,
    createdDate: "2026-03-10"
  },
  {
    id: "prod-6",
    name: "Shatavari Balance Capsules - Women's Tonic",
    sku: "AYUR-SHA-006",
    price: 450,
    originalPrice: 490,
    stock: 65,
    category: "Women's Health",
    subcategory: "Capsules",
    brand: "Grams Life Wellness",
    description: "Shatavari is revered in Ayurveda as the ultimate rejuvenating tonic for women. Grams Life uses concentrated Shatavari root extract to balance estrogen naturally, reduce PMS cramps, regulate cycles, and support breast lactation and energy levels.",
    mainImage: "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Shatavari (Asparagus racemosus)", description: "100% organic root extract standardized to 20% saponins." }
    ],
    benefits: [
      "Supports optimal female hormonal balance during PMS, pregnancy, and menopause.",
      "Reduces bloating, fatigue, mood swings, and period cramps significantly.",
      "Improves natural hydration, energy, and overall health.",
      "Enhances healthy lactation in nursing mothers."
    ],
    dosage: "1 capsule twice daily, preferably with warm milk or water.",
    usageInstructions: "Take one capsule post breakfast and one post dinner. Best consumed with warm organic cow milk.",
    faqs: [
      { question: "Can I take this if I have PCOD?", answer: "Shatavari is highly beneficial for PCOD/PCOS as it restores ovulation cycles and reduces ovarian cysts. However, we advise speaking with an Ayurvedic specialist to plan a complete lifestyle regimen." }
    ],
    rating: 4.7,
    featured: false,
    bestSeller: false,
    lowStockAlertLimit: 12,
    createdDate: "2026-04-28"
  },
  {
    id: "prod-7",
    name: "Madhunashini Diabetes Care Tablets",
    sku: "AYUR-MAD-007",
    price: 380,
    originalPrice: 450,
    stock: 90,
    category: "Diabetes",
    subcategory: "Tablets",
    brand: "Grams Life Wellness",
    description: "A clinical Ayurvedic herbal formula featuring Gudmar (literally meaning sugar destroyer), Karela, Jamun seed, and Methi. It helps regenerate pancreatic cells, increases active insulin sensitivity, and controls sweet cravings.",
    mainImage: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Gudmar (Gymnema sylvestre)", description: "Blocks sugar receptors on tongue and intestines, reducing glucose absorption." },
      { name: "Karela (Bitter Melon)", description: "Contains charantin and polypeptide-p which mimic insulin molecules." },
      { name: "Jamun Seed", description: "Slows down conversion of food starch into glucose, avoiding sudden sugar spikes." }
    ],
    benefits: [
      "Maintains healthy fasting and post-meal blood sugar levels.",
      "Reduces insulin resistance and nourishes vital pancreatic cells.",
      "Eliminates sweet cravings and supports healthy weight loss.",
      "Controls diabetic fatigue, frequent urination, and numbness in limbs."
    ],
    dosage: "1 to 2 tablets twice daily on an empty stomach.",
    usageInstructions: "Take with warm water 30 minutes before your morning breakfast and evening dinner.",
    faqs: [
      { question: "Can I take this alongside my regular diabetes pills?", answer: "Yes, it works as an excellent co-therapy. Monitor your blood glucose levels regularly. If levels drop below normal, consult your doctor to adjust your synthetic drug dosages." }
    ],
    rating: 4.4,
    featured: false,
    bestSeller: false,
    lowStockAlertLimit: 15,
    createdDate: "2026-05-18"
  },
  {
    id: "prod-8",
    name: "Nirgundi Joint Care Massage Oil",
    sku: "AYUR-NIR-008",
    price: 340,
    originalPrice: 390,
    stock: 55,
    category: "Joint Care",
    subcategory: "Oils",
    brand: "Grams Life Wellness",
    description: "An instant pain-relieving therapeutic joint oil. Rich in Nirgundi, Shallaki, and Eucalyptus oils. Massaging this oil deeply warms tissues, clears congested fluid, and repairs stiff muscles and inflamed joints.",
    mainImage: "https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Nirgundi", description: "Powerful anti-inflammatory and pain-relieving herb, heals arthritis pain." },
      { name: "Shallaki (Boswellia)", description: "Prevents breakdown of cartilage tissue, repairs joint lubrication." },
      { name: "Eucalyptus Oil", description: "Improves local blood flow, creating a deep warm soothing effect." }
    ],
    benefits: [
      "Relieves joint pain, stiffness, sciatica, knee arthritis, and backaches.",
      "Restores synovial joint lubrication and flexibility.",
      "Combats muscle cramps, sports injuries, and neck stiffness.",
      "100% natural, fast-acting formula without synthetic chemical warming agents."
    ],
    dosage: "Apply 5-10ml on the affected joint area.",
    usageInstructions: "Pour oil and massage gently in circular patterns over joints. Apply warmth with a hot water bag after massage for maximum therapeutic recovery.",
    faqs: [
      { question: "How often can I apply this?", answer: "Apply 2-3 times daily, especially during morning stiffness and before sleeping." }
    ],
    rating: 4.8,
    featured: true,
    bestSeller: false,
    lowStockAlertLimit: 10,
    createdDate: "2026-06-02"
  },
  {
    id: "prod-9",
    name: "Memory & Focus Elixir (Brahmi & Shankhpushpi)",
    sku: "AYUR-BRA-009",
    price: 620,
    originalPrice: 750,
    stock: 40,
    category: "Brain & Memory",
    subcategory: "Capsules",
    brand: "Grams Life Wellness",
    description: "A premium brain tonic designed to boost cognitive function, memory recall, and mental clarity. Infused with organic Brahmi and Shankhpushpi to naturally reduce mental fatigue and support peak focus.",
    mainImage: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Organic Brahmi", description: "Supports brain health, improves blood circulation to the brain, and enhances memory." },
      { name: "Shankhpushpi", description: "Revered as a medhya rasayana, reduces mental stress, anxiety, and enhances focus." }
    ],
    benefits: [
      "Improves daily concentration, analytical skills, and memory retention.",
      "Helps calm mind chatter, enabling sustained, focused work.",
      "Acts as a powerful antioxidant to shield nervous cells from decay."
    ],
    dosage: "1 capsule twice daily with warm milk or water.",
    usageInstructions: "Best taken after meals in the morning and evening for cognitive vitality.",
    faqs: [
      { question: "How long before I see improvement?", answer: "Most users notice enhanced focus and calmness within 2 weeks of daily, regular consumption." }
    ],
    rating: 4.9,
    featured: true,
    bestSeller: true,
    lowStockAlertLimit: 8,
    createdDate: "2026-06-10"
  },
  {
    id: "prod-10",
    name: "Deep Sleep & Calm (Sarpagandha & Tagar)",
    sku: "AYUR-SLE-010",
    price: 480,
    originalPrice: 550,
    stock: 30,
    category: "Sleep & Stress",
    subcategory: "Tablets",
    brand: "Grams Life Wellness",
    description: "Formulated with precious Tagar (Indian Valerian) and Sarpagandha to naturally soothe the central nervous system, lower stress levels, and restore normal sleep cycles without grogginess.",
    mainImage: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Tagar (Indian Valerian)", description: "Naturally promotes sleep, relaxes smooth muscles, and relieves chronic tension." },
      { name: "Sarpagandha", description: "Helps calm hyperactive minds and supports optimal healthy blood pressure." }
    ],
    benefits: [
      "Promotes deep, sound sleep without morning grogginess or dependency.",
      "Helps calm an overactive, racing mind before bedtime.",
      "Provides relief from muscle tension and daily physical stress."
    ],
    dosage: "1 to 2 tablets 30 minutes before bedtime.",
    usageInstructions: "Take with warm water or warm milk shortly before sleep.",
    faqs: [
      { question: "Is this habit-forming?", answer: "No. Our formulation uses natural non-addictive herbs that soothe the body's sleep sensors without altering long-term neuro-chemistry." }
    ],
    rating: 4.7,
    featured: true,
    bestSeller: false,
    lowStockAlertLimit: 5,
    createdDate: "2026-06-15"
  },
  {
    id: "prod-11",
    name: "Shilajit Gold Resin - Himalayan Peak Strength",
    sku: "AYUR-SHI-011",
    price: 1450,
    originalPrice: 1690,
    stock: 25,
    category: "Sexual Wellness",
    subcategory: "Resin",
    brand: "Grams Life Organics",
    description: "100% pure Himalayan Shilajit resin, purified using traditional Ayurvedic Shodhana methods and infused with 24K Swarna Bhasma (Gold) and Safed Musli. Naturally increases stamina, cellular energy, and daily physical vitality.",
    mainImage: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Purified Shilajit", description: "Rich in 80+ trace minerals and high Fulvic acid content for peak cellular energy." },
      { name: "Swarna Bhasma (24K Gold)", description: "Acts as a potent rejuvenator, boosts immunity, and improves micro-circulation." },
      { name: "Safed Musli", description: "Nourishes muscle tissue, boosts natural endurance and physical vitality." }
    ],
    benefits: [
      "Maximizes daily physical endurance, muscle recovery, and stamina.",
      "Improves mitochondrial ATP production, reducing chronic fatigue.",
      "Acts as an excellent aphrodisiac to boost vitality and reproductive health."
    ],
    dosage: "A pea-sized portion (approx. 250mg) once daily.",
    usageInstructions: "Dissolve completely in warm milk or warm water and consume in the morning on an empty stomach.",
    faqs: [
      { question: "Is it certified pure?", answer: "Yes, our Shilajit is sourced from high-altitude Himalayan ranges and undergoes triple filtration and lab-testing to be completely free of heavy metals." }
    ],
    rating: 4.9,
    featured: true,
    bestSeller: true,
    lowStockAlertLimit: 5,
    createdDate: "2026-06-20"
  },
  {
    id: "prod-12",
    name: "Liver Vitality & Detox (Kalmegh & Bhumi Amla)",
    sku: "AYUR-LIV-012",
    price: 420,
    originalPrice: 490,
    stock: 60,
    category: "Liver & Detox",
    subcategory: "Capsules",
    brand: "Grams Life Wellness",
    description: "A powerful hepatoprotective formula that naturally detoxifies the liver, stimulates bile secretion, and protects liver cells from damage. Rich in organic Kalmegh (King of Bitters) and Bhumi Amla.",
    mainImage: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Kalmegh (Andrographis)", description: "Extremely bitter herb, triggers quick liver detox, and stimulates bile production." },
      { name: "Bhumi Amla", description: "Protects liver tissues, regulates enzymes, and reverses cell damage." }
    ],
    benefits: [
      "Supports efficient liver detoxification and natural enzyme levels.",
      "Improves digestion, bloating, and absorption of dietary fats.",
      "Protects the liver from toxins, alcohol, and processed foods."
    ],
    dosage: "1 capsule twice daily with meals.",
    usageInstructions: "Consume daily after your primary lunch and dinner.",
    faqs: [
      { question: "Can I take this daily for general detox?", answer: "Yes, our formulation is gentle yet highly effective for continuous, daily digestive and hepatic system detox." }
    ],
    rating: 4.6,
    featured: false,
    bestSeller: false,
    lowStockAlertLimit: 12,
    createdDate: "2026-06-25"
  },
  {
    id: "prod-13",
    name: "Arjuna Cardio-Shield Capsules",
    sku: "AYUR-HRT-013",
    price: 550,
    originalPrice: 650,
    stock: 50,
    category: "Heart Health",
    subcategory: "Capsules",
    brand: "Grams Life Wellness",
    description: "Made from pure extract of the Arjuna tree bark, a legendary Ayurvedic cardioprotective herb. Supports healthy blood pressure, strengthens cardiovascular muscles, and regulates daily blood circulation.",
    mainImage: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Arjuna Bark Extract", description: "Standardized extract containing co-enzyme Q10 and saponins to nourish heart muscles." }
    ],
    benefits: [
      "Strengthens the heart muscles and aids in normal, healthy cardiac output.",
      "Assists in maintaining optimal arterial blood pressure levels.",
      "Aids in managing oxidative stress in cardiovascular tissues."
    ],
    dosage: "1 capsule twice daily after meals.",
    usageInstructions: "Take one capsule post breakfast and one post dinner with warm water.",
    faqs: [
      { question: "Is Arjuna bark safe to take long-term?", answer: "Yes, Arjuna is a well-tolerated organic cardiotonic that can safely be taken long-term to keep heart functions healthy." }
    ],
    rating: 4.8,
    featured: false,
    bestSeller: false,
    lowStockAlertLimit: 8,
    createdDate: "2026-06-28"
  },
  {
    id: "prod-14",
    name: "Vasaka & Pippali Lung Detox Syrup",
    sku: "AYUR-RSP-014",
    price: 290,
    originalPrice: 350,
    stock: 75,
    category: "Respiratory Care",
    subcategory: "Syrup",
    brand: "Grams Life Organics",
    description: "A comforting herbal syrup that clears bronchial passages, eases congestion, and soothes dry coughs. Infused with Vasaka (Malabar Nut) and Pippali (Long Pepper) for robust respiratory health.",
    mainImage: "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&q=80&w=600"
    ],
    ingredients: [
      { name: "Vasaka (Adhatoda vasica)", description: "Powerful bronchodilator, clears phlegm, and eases chest congestion." },
      { name: "Pippali (Long Pepper)", description: "Warms up lungs, clears respiratory paths, and enhances bio-availability." }
    ],
    benefits: [
      "Provides rapid, comforting relief from seasonal coughs, colds, and sore throats.",
      "Clears airways and eases chronic breathing difficulty.",
      "Strengthens lung tissue and acts as an immunity shield against pollution."
    ],
    dosage: "1 to 2 teaspoons (5-10ml) twice or thrice a day.",
    usageInstructions: "Mix with warm water or drink directly. Best taken after meals.",
    faqs: [
      { question: "Does this syrup contain artificial sugar?", answer: "No, our syrup is sweetened naturally with organic wild forest honey, preserving traditional healing standards." }
    ],
    rating: 4.7,
    featured: false,
    bestSeller: true,
    lowStockAlertLimit: 10,
    createdDate: "2026-07-01"
  }
];

export const INITIAL_BLOGS: Blog[] = [
  {
    id: "blog-1",
    title: "Understanding the Three Doshas: Vata, Pitta, and Kapha",
    slug: "understanding-the-three-doshas",
    summary: "Discover your unique Ayurvedic mind-body constitution and learn how to balance your biological energies for flawless mental and physical health.",
    content: "In Ayurvedic philosophy, the universe is made of five elements: space, air, fire, water, and earth. These elements combine in the human body to form three life forces or humors, known as Doshas: Vata, Pitta, and Kapha.\n\n### 1. Vata (Air & Space)\nVata controls all movement in the mind and body. It governs blood flow, breathing, heartbeats, and nerve signals. When Vata is in balance, you feel energetic, creative, and highly adaptable. When out of balance, Vata leads to anxiety, dry skin, insomnia, and bloating.\n\n### 2. Pitta (Fire & Water)\nPitta governs metabolism, digestion, and temperature regulation. Balanced Pitta results in sharp intelligence, courage, and strong digestive fire (Agni). Imbalanced Pitta causes anger, acne breakouts, acidity, and chronic inflammation.\n\n### 3. Kapha (Water & Earth)\nKapha governs physical structure, muscle growth, lubrication, and immune strength. Balanced Kapha offers patience, love, stable energy, and calm strength. Out of balance, it leads to lethargy, weight gain, congestion, and stubborn attachment.\n\n### Finding Your Perfect Balance\nTrue health occurs when these three energies are in perfect balance based on your birth constitution (Prakriti). By adjusting your diet, yoga, and herbs like Ashwagandha and Triphala, you can regain control of your doshas and experience deep, sustainable health.",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
    author: "Dr. Arundhati Sharma, Ayurvedic Acharya",
    date: "2026-06-15",
    categories: ["Ayurveda Basics", "Holistic Wellness"],
    readTime: "5 mins read"
  },
  {
    id: "blog-2",
    title: "The Golden Herb: Ashwagandha's Mind & Body Miracle",
    slug: "ashwagandha-mind-body-miracle",
    summary: "A deep dive into Ashwagandha (Withania somnifera), the king of adaptogenic herbs, and how KSM-66 clinical extracts are fighting modern stress epidemics.",
    content: "For over 3,000 years, Ashwagandha has been crowned as the 'Rasayana' (rejuvenator) of Ayurveda. Literally translating to 'the smell of a horse,' it was traditionally believed to give the strength, energy, and sexual stamina of a stallion.\n\n### Modern Cortisol & Adaptogens\nIn today's fast-paced corporate landscapes, our nervous system is continuously under siege. Chronic stress elevates our stress hormone—cortisol. This leads to fatigue, weight gain around the belly, insomnia, and rapid aging.\nAshwagandha acts as a smart adaptogen, modulating your body's stress response. It doesn't force a state change; if you're hyper, it calms you; if you're exhausted, it energizes you.\n\n### Benefits Confirmed by Clinical Science\n1. **Reduces Stress & Cortisol:** Clinical studies on KSM-66 Ashwagandha report up to a 28% reduction in cortisol levels over 8 weeks.\n2. **Enhances Memory & Focus:** Boosts synaptic plasticity and protects brain cells from oxidative damage.\n3. **Restores Hormonal Sleep:** Calms neurotransmitters to ease transition into peaceful, uninterrupted REM sleep cycles.",
    image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
    author: "Dr. Rohan Vasistha, Lead Herbal Scientist",
    date: "2026-06-20",
    categories: ["Herbs Guide", "Stress Management"],
    readTime: "6 mins read"
  }
];

export const INITIAL_FAQS: FAQ[] = [
  {
    id: "faq-1",
    category: "General",
    question: "What is Ayurveda and how does it work?",
    answer: "Ayurveda is a 5,000-year-old holistic healing system from India. It focuses on maintaining health and curing diseases by balancing your mind, body, and consciousness. Instead of suppressing symptoms, Ayurveda heals root imbalances using customized diet plans, herbal formulations, and therapeutic lifestyle practices."
  },
  {
    id: "faq-2",
    category: "Product Usage",
    question: "Are Grams Life Ayurvedic products completely safe and lab-tested?",
    answer: "Absolutely. All our products are manufactured in GMP-certified, AYUSH-approved facilities. We rigorously lab-test every single batch for heavy metals, pesticides, and microbial contamination to guarantee the highest safety, purity, and clinical efficacy."
  },
  {
    id: "faq-3",
    category: "Shipping & Delivery",
    question: "How long does shipping take and how can I track my order?",
    answer: "Orders are processed within 24 hours. Delivery takes 3-5 business days across major cities. Once shipped, you will receive a tracking link via SMS, email, and inside your user dashboard to follow your shipment in real-time."
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: "AYUR15",
    discountType: "percentage",
    value: 15,
    minOrderValue: 1000,
    maxDiscount: 300,
    expiryDate: "2026-12-31",
    active: true
  },
  {
    code: "WELCOME100",
    discountType: "fixed",
    value: 100,
    minOrderValue: 500,
    expiryDate: "2026-12-31",
    active: true
  }
];

export const DEFAULT_SETTINGS: WebsiteSettings = {
  logoName: "Grams Life",
  contactEmail: "care@gramslife.com",
  contactPhone: "+1 (800) 555-GRAM",
  address: "Grams Life Herbals, Green Valley, Silicon City, CA 94016",
  facebook: "facebook.com/gramslife",
  instagram: "instagram.com/gramslife.ayur",
  twitter: "twitter.com/gramslife",
  defaultTaxPercentage: 12, // 12% GST/tax for Ayurvedic goods
  baseShippingCharge: 50,
  freeShippingThreshold: 999 // Free shipping above 999 INR
};
