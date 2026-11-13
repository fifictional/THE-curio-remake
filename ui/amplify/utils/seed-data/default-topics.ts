/**
 * Default Topics for Knowledge Base
 * 
 * Edit this file to modify the default topics that get loaded into Neptune.
 */

export interface DefaultTopicData {
  subjects: string[];
  id: string;
  displayName: string;
  description?: string;
}

export const DEFAULT_TOPICS: DefaultTopicData[] = [
  // English topics
  {
    subjects: ["english"],
    id: "literacy",
    displayName: "Understanding Passages",
  },
  {
    subjects: ["english"],
    id: "discourse",
    displayName: "Information & Ideas",
  },
  {
    subjects: ["english"],
    id: "articulation",
    displayName: "Improving sentences & Flow",
  },
  {
    subjects: ["english"],
    id: "conventions",
    displayName: "Grammar and Punctuation",
  },

  // Math topics
  {
    subjects: ["math"],
    id: "algebra",
    displayName: "Basic Algebra",
  },
  {
    subjects: ["math"],
    id: "advanced-math",
    displayName: "Complex equation and Algebra",
  },
  {
    subjects: ["math"],
    id: "statistics",
    displayName: "Data Interpretation",
  },
  {
    subjects: ["math"],
    id: "geometry",
    displayName: "Geometry",
  },
  {
    subjects: ["math"],
    id: "trigonometry",
    displayName: "Trigonometry",
  },

  // Physics topics
  {
    subjects: ["physics", "mechanical-engineering"],
    id: "mechanics",
    displayName: "Mechanics",
    description: "The branch of physics concerned with the motion of objects and the forces acting upon them, including kinematics, dynamics, and statics.",
  },
  {
    subjects: ["physics", "mechanical-engineering"],
    id: "thermodynamics",
    displayName: "Thermodynamics",
    description: "The study of heat, energy, and work, including the laws of thermodynamics, entropy, and energy transfer in systems.",
  },
  {
    subjects: ["physics"],
    id: "electromagnetism",
    displayName: "Electromagnetism",
  },
  {
    subjects: ["physics"],
    id: "optics",
    displayName: "Optics",
  },
  {
    subjects: ["physics"],
    id: "quantum-physics",
    displayName: "Quantum Physics",
  },
  {
    subjects: ["physics"],
    id: "waves-oscillations",
    displayName: "Waves & Oscillations",
  },

  // Chemistry topics
  {
    subjects: ["chemistry"],
    id: "general-chemistry",
    displayName: "General Chemistry",
  },
  {
    subjects: ["chemistry"],
    id: "organic-chemistry",
    displayName: "Organic Chemistry",
  },
  {
    subjects: ["chemistry"],
    id: "inorganic-chemistry",
    displayName: "Inorganic Chemistry",
  },
  {
    subjects: ["chemistry"],
    id: "physical-chemistry",
    displayName: "Physical Chemistry",
  },
  {
    subjects: ["chemistry"],
    id: "analytical-chemistry",
    displayName: "Analytical Chemistry",
  },
  {
    subjects: ["chemistry"],
    id: "biochemistry",
    displayName: "Biochemistry",
  },

  // Biology topics
  {
    subjects: ["biology"],
    id: "cell-biology",
    displayName: "Cell Biology",
  },
  {
    subjects: ["biology"],
    id: "genetics",
    displayName: "Genetics",
  },
  {
    subjects: ["biology", "environmental-science"],
    id: "ecology",
    displayName: "Ecology",
  },
  {
    subjects: ["biology"],
    id: "evolution",
    displayName: "Evolution",
  },
  {
    subjects: ["biology"],
    id: "anatomy-physiology",
    displayName: "Anatomy & Physiology",
  },
  {
    subjects: ["biology"],
    id: "molecular-biology",
    displayName: "Molecular Biology",
  },

  // Computer Science topics
  {
    subjects: ["computer-science"],
    id: "programming",
    displayName: "Programming",
  },
  {
    subjects: ["computer-science"],
    id: "data-structures-algorithms",
    displayName: "Data Structures & Algorithms",
  },
  {
    subjects: ["computer-science"],
    id: "software-engineering",
    displayName: "Software Engineering",
  },
  {
    subjects: ["computer-science"],
    id: "databases",
    displayName: "Databases",
  },
  {
    subjects: ["computer-science"],
    id: "networks",
    displayName: "Networks",
  },
  {
    subjects: ["computer-science"],
    id: "artificial-intelligence",
    displayName: "Artificial Intelligence",
  },

  // Literature topics
  {
    subjects: ["literature"],
    id: "literary-analysis",
    displayName: "Literary Analysis",
  },
  {
    subjects: ["literature"],
    id: "poetry",
    displayName: "Poetry",
  },
  {
    subjects: ["literature"],
    id: "prose-fiction",
    displayName: "Prose Fiction",
  },
  {
    subjects: ["literature"],
    id: "drama",
    displayName: "Drama",
  },
  {
    subjects: ["literature"],
    id: "literary-theory",
    displayName: "Literary Theory",
  },
  {
    subjects: ["literature"],
    id: "world-literature",
    displayName: "World Literature",
  },

  // History topics
  {
    subjects: ["history"],
    id: "ancient-history",
    displayName: "Ancient History",
  },
  {
    subjects: ["history"],
    id: "medieval-history",
    displayName: "Medieval History",
  },
  {
    subjects: ["history"],
    id: "modern-history",
    displayName: "Modern History",
  },
  {
    subjects: ["history"],
    id: "world-history",
    displayName: "World History",
  },
  {
    subjects: ["history"],
    id: "regional-history",
    displayName: "Regional History",
  },
  {
    subjects: ["history"],
    id: "historiography",
    displayName: "Historiography",
  },

  // Geography topics
  {
    subjects: ["geography"],
    id: "physical-geography",
    displayName: "Physical Geography",
  },
  {
    subjects: ["geography"],
    id: "human-geography",
    displayName: "Human Geography",
  },
  {
    subjects: ["geography"],
    id: "cartography",
    displayName: "Cartography",
  },
  {
    subjects: ["geography"],
    id: "regional-geography",
    displayName: "Regional Geography",
  },
  {
    subjects: ["geography"],
    id: "environmental-geography",
    displayName: "Environmental Geography",
  },
  {
    subjects: ["geography"],
    id: "gis",
    displayName: "Geographic Information Systems",
  },

  // Economics topics
  {
    subjects: ["economics"],
    id: "microeconomics",
    displayName: "Microeconomics",
  },
  {
    subjects: ["economics"],
    id: "macroeconomics",
    displayName: "Macroeconomics",
  },
  {
    subjects: ["economics"],
    id: "international-economics",
    displayName: "International Economics",
  },
  {
    subjects: ["economics"],
    id: "econometrics",
    displayName: "Econometrics",
  },
  {
    subjects: ["economics"],
    id: "economic-history",
    displayName: "Economic History",
  },
  {
    subjects: ["economics"],
    id: "public-economics",
    displayName: "Public Economics",
  },

  // Business topics
  {
    subjects: ["business"],
    id: "management",
    displayName: "Management",
  },
  {
    subjects: ["business"],
    id: "operations",
    displayName: "Operations",
  },
  {
    subjects: ["business"],
    id: "strategy",
    displayName: "Strategy",
  },
  {
    subjects: ["business"],
    id: "organizational-behavior",
    displayName: "Organizational Behavior",
  },
  {
    subjects: ["business"],
    id: "entrepreneurship",
    displayName: "Entrepreneurship",
  },
  {
    subjects: ["business"],
    id: "business-ethics",
    displayName: "Business Ethics",
  },

  // Accounting topics
  {
    subjects: ["accounting"],
    id: "financial-accounting",
    displayName: "Financial Accounting",
  },
  {
    subjects: ["accounting"],
    id: "managerial-accounting",
    displayName: "Managerial Accounting",
  },
  {
    subjects: ["accounting"],
    id: "auditing",
    displayName: "Auditing",
  },
  {
    subjects: ["accounting"],
    id: "taxation",
    displayName: "Taxation",
  },
  {
    subjects: ["accounting"],
    id: "cost-accounting",
    displayName: "Cost Accounting",
  },
  {
    subjects: ["accounting"],
    id: "financial-analysis",
    displayName: "Financial Analysis",
  },

  // Psychology topics
  {
    subjects: ["psychology"],
    id: "cognitive-psychology",
    displayName: "Cognitive Psychology",
  },
  {
    subjects: ["psychology"],
    id: "developmental-psychology",
    displayName: "Developmental Psychology",
  },
  {
    subjects: ["psychology"],
    id: "social-psychology",
    displayName: "Social Psychology",
  },
  {
    subjects: ["psychology"],
    id: "clinical-psychology",
    displayName: "Clinical Psychology",
  },
  {
    subjects: ["psychology", "sociology"],
    id: "research-methods",
    displayName: "Research Methods",
  },
  {
    subjects: ["psychology"],
    id: "biopsychology",
    displayName: "Biopsychology",
  },

  // Sociology topics
  {
    subjects: ["sociology"],
    id: "social-theory",
    displayName: "Social Theory",
  },
  {
    subjects: ["sociology"],
    id: "social-stratification",
    displayName: "Social Stratification",
  },
  {
    subjects: ["sociology"],
    id: "culture-society",
    displayName: "Culture & Society",
  },
  {
    subjects: ["sociology"],
    id: "social-institutions",
    displayName: "Social Institutions",
  },
  {
    subjects: ["sociology"],
    id: "social-change",
    displayName: "Social Change",
  },

  // Law topics
  {
    subjects: ["law"],
    id: "constitutional-law",
    displayName: "Constitutional Law",
  },
  {
    subjects: ["law"],
    id: "criminal-law",
    displayName: "Criminal Law",
  },
  {
    subjects: ["law"],
    id: "civil-law",
    displayName: "Civil Law",
  },
  {
    subjects: ["law"],
    id: "contract-law",
    displayName: "Contract Law",
  },
  {
    subjects: ["law"],
    id: "property-law",
    displayName: "Property Law",
  },
  {
    subjects: ["law"],
    id: "legal-research",
    displayName: "Legal Research",
  },

  // Political Science topics
  {
    subjects: ["political-science"],
    id: "political-theory",
    displayName: "Political Theory",
  },
  {
    subjects: ["political-science"],
    id: "comparative-politics",
    displayName: "Comparative Politics",
  },
  {
    subjects: ["political-science"],
    id: "international-relations",
    displayName: "International Relations",
  },
  {
    subjects: ["political-science"],
    id: "public-policy",
    displayName: "Public Policy",
  },
  {
    subjects: ["political-science"],
    id: "american-politics",
    displayName: "American Politics",
  },
  {
    subjects: ["political-science"],
    id: "political-methodology",
    displayName: "Political Methodology",
  },

  // Medicine topics
  {
    subjects: ["medicine"],
    id: "anatomy",
    displayName: "Anatomy",
  },
  {
    subjects: ["medicine"],
    id: "physiology",
    displayName: "Physiology",
  },
  {
    subjects: ["medicine"],
    id: "pathology",
    displayName: "Pathology",
  },
  {
    subjects: ["medicine", "nursing"],
    id: "pharmacology",
    displayName: "Pharmacology",
  },
  {
    subjects: ["medicine"],
    id: "clinical-medicine",
    displayName: "Clinical Medicine",
  },
  {
    subjects: ["medicine"],
    id: "medical-ethics",
    displayName: "Medical Ethics",
  },

  // Mechanical Engineering topics
  {
    subjects: ["mechanical-engineering"],
    id: "materials-science",
    displayName: "Materials Science",
  },
  {
    subjects: ["mechanical-engineering"],
    id: "manufacturing",
    displayName: "Manufacturing",
  },
  {
    subjects: ["mechanical-engineering"],
    id: "machine-design",
    displayName: "Machine Design",
  },
  {
    subjects: ["mechanical-engineering"],
    id: "fluid-mechanics",
    displayName: "Fluid Mechanics",
  },

  // Electrical Engineering topics
  {
    subjects: ["electrical-engineering"],
    id: "circuits",
    displayName: "Circuits",
  },
  {
    subjects: ["electrical-engineering"],
    id: "electronics",
    displayName: "Electronics",
  },
  {
    subjects: ["electrical-engineering"],
    id: "power-systems",
    displayName: "Power Systems",
  },
  {
    subjects: ["electrical-engineering"],
    id: "signal-processing",
    displayName: "Signal Processing",
  },
  {
    subjects: ["electrical-engineering"],
    id: "control-systems",
    displayName: "Control Systems",
  },
  {
    subjects: ["electrical-engineering"],
    id: "digital-systems",
    displayName: "Digital Systems",
  },

  // Civil Engineering topics
  {
    subjects: ["civil-engineering"],
    id: "structural-engineering",
    displayName: "Structural Engineering",
  },
  {
    subjects: ["civil-engineering"],
    id: "geotechnical-engineering",
    displayName: "Geotechnical Engineering",
  },
  {
    subjects: ["civil-engineering"],
    id: "transportation-engineering",
    displayName: "Transportation Engineering",
  },
  {
    subjects: ["civil-engineering"],
    id: "water-resources",
    displayName: "Water Resources",
  },
  {
    subjects: ["civil-engineering"],
    id: "environmental-engineering",
    displayName: "Environmental Engineering",
  },
  {
    subjects: ["civil-engineering"],
    id: "construction-management",
    displayName: "Construction Management",
  },

  // Arts & Humanities topics
  {
    subjects: ["arts"],
    id: "visual-arts",
    displayName: "Visual Arts",
  },
  {
    subjects: ["arts"],
    id: "performing-arts",
    displayName: "Performing Arts",
  },
  {
    subjects: ["arts"],
    id: "art-history",
    displayName: "Art History",
  },
  {
    subjects: ["arts"],
    id: "cultural-studies",
    displayName: "Cultural Studies",
  },
  {
    subjects: ["arts"],
    id: "creative-writing",
    displayName: "Creative Writing",
  },
  {
    subjects: ["arts"],
    id: "critical-theory",
    displayName: "Critical Theory",
  },

  // Philosophy topics
  {
    subjects: ["philosophy"],
    id: "ethics",
    displayName: "Ethics",
  },
  {
    subjects: ["philosophy"],
    id: "metaphysics",
    displayName: "Metaphysics",
  },
  {
    subjects: ["philosophy"],
    id: "epistemology",
    displayName: "Epistemology",
  },
  {
    subjects: ["philosophy"],
    id: "logic",
    displayName: "Logic",
  },
  {
    subjects: ["philosophy"],
    id: "philosophy-of-mind",
    displayName: "Philosophy of Mind",
  },
  {
    subjects: ["philosophy"],
    id: "history-of-philosophy",
    displayName: "History of Philosophy",
  },

  // Statistics topics
  {
    subjects: ["statistics"],
    id: "descriptive-statistics",
    displayName: "Descriptive Statistics",
  },
  {
    subjects: ["statistics"],
    id: "inferential-statistics",
    displayName: "Inferential Statistics",
  },
  {
    subjects: ["statistics"],
    id: "probability",
    displayName: "Probability",
  },
  {
    subjects: ["statistics"],
    id: "regression-analysis",
    displayName: "Regression Analysis",
  },
  {
    subjects: ["statistics"],
    id: "experimental-design",
    displayName: "Experimental Design",
  },
  {
    subjects: ["statistics", "data-science"],
    id: "statistical-modeling",
    displayName: "Statistical Modeling",
  },

  // Environmental Science topics
  {
    subjects: ["environmental-science"],
    id: "conservation",
    displayName: "Conservation",
  },
  {
    subjects: ["environmental-science"],
    id: "climate-science",
    displayName: "Climate Science",
  },
  {
    subjects: ["environmental-science"],
    id: "pollution",
    displayName: "Pollution",
  },
  {
    subjects: ["environmental-science"],
    id: "sustainability",
    displayName: "Sustainability",
  },
  {
    subjects: ["environmental-science"],
    id: "environmental-policy",
    displayName: "Environmental Policy",
  },

  // Anthropology topics
  {
    subjects: ["anthropology"],
    id: "cultural-anthropology",
    displayName: "Cultural Anthropology",
  },
  {
    subjects: ["anthropology"],
    id: "physical-anthropology",
    displayName: "Physical Anthropology",
  },
  {
    subjects: ["anthropology"],
    id: "archaeology",
    displayName: "Archaeology",
  },
  {
    subjects: ["anthropology"],
    id: "linguistic-anthropology",
    displayName: "Linguistic Anthropology",
  },
  {
    subjects: ["anthropology"],
    id: "applied-anthropology",
    displayName: "Applied Anthropology",
  },
  {
    subjects: ["anthropology"],
    id: "anthropological-theory",
    displayName: "Anthropological Theory",
  },

  // Communications topics
  {
    subjects: ["communications"],
    id: "media-studies",
    displayName: "Media Studies",
  },
  {
    subjects: ["communications"],
    id: "journalism",
    displayName: "Journalism",
  },
  {
    subjects: ["communications"],
    id: "public-relations",
    displayName: "Public Relations",
  },
  {
    subjects: ["communications"],
    id: "interpersonal-communication",
    displayName: "Interpersonal Communication",
  },
  {
    subjects: ["communications"],
    id: "mass-communication",
    displayName: "Mass Communication",
  },
  {
    subjects: ["communications"],
    id: "digital-media",
    displayName: "Digital Media",
  },

  // Education topics
  {
    subjects: ["education"],
    id: "pedagogy",
    displayName: "Pedagogy",
  },
  {
    subjects: ["education"],
    id: "curriculum-development",
    displayName: "Curriculum Development",
  },
  {
    subjects: ["education"],
    id: "educational-psychology",
    displayName: "Educational Psychology",
  },
  {
    subjects: ["education"],
    id: "learning-theories",
    displayName: "Learning Theories",
  },
  {
    subjects: ["education"],
    id: "assessment",
    displayName: "Assessment",
  },
  {
    subjects: ["education"],
    id: "educational-policy",
    displayName: "Educational Policy",
  },

  // Nursing topics
  {
    subjects: ["nursing"],
    id: "patient-care",
    displayName: "Patient Care",
  },
  {
    subjects: ["nursing"],
    id: "health-assessment",
    displayName: "Health Assessment",
  },
  {
    subjects: ["nursing"],
    id: "nursing-theory",
    displayName: "Nursing Theory",
  },
  {
    subjects: ["nursing"],
    id: "clinical-skills",
    displayName: "Clinical Skills",
  },
  {
    subjects: ["nursing"],
    id: "community-health",
    displayName: "Community Health",
  },

  // Linguistics topics
  {
    subjects: ["linguistics"],
    id: "phonetics-phonology",
    displayName: "Phonetics & Phonology",
  },
  {
    subjects: ["linguistics"],
    id: "syntax",
    displayName: "Syntax",
  },
  {
    subjects: ["linguistics"],
    id: "semantics",
    displayName: "Semantics",
  },
  {
    subjects: ["linguistics"],
    id: "sociolinguistics",
    displayName: "Sociolinguistics",
  },
  {
    subjects: ["linguistics"],
    id: "psycholinguistics",
    displayName: "Psycholinguistics",
  },
  {
    subjects: ["linguistics"],
    id: "historical-linguistics",
    displayName: "Historical Linguistics",
  },

  // Architecture topics
  {
    subjects: ["architecture"],
    id: "architectural-design",
    displayName: "Architectural Design",
  },
  {
    subjects: ["architecture"],
    id: "building-systems",
    displayName: "Building Systems",
  },
  {
    subjects: ["architecture"],
    id: "construction-methods",
    displayName: "Construction Methods",
  },
  {
    subjects: ["architecture"],
    id: "architectural-history",
    displayName: "Architectural History",
  },
  {
    subjects: ["architecture"],
    id: "urban-planning",
    displayName: "Urban Planning",
  },
  {
    subjects: ["architecture"],
    id: "sustainable-design",
    displayName: "Sustainable Design",
  },

  // Finance topics
  {
    subjects: ["finance"],
    id: "corporate-finance",
    displayName: "Corporate Finance",
  },
  {
    subjects: ["finance"],
    id: "investments",
    displayName: "Investments",
  },
  {
    subjects: ["finance"],
    id: "financial-markets",
    displayName: "Financial Markets",
  },
  {
    subjects: ["finance"],
    id: "risk-management",
    displayName: "Risk Management",
  },
  {
    subjects: ["finance"],
    id: "banking",
    displayName: "Banking",
  },
  {
    subjects: ["finance"],
    id: "personal-finance",
    displayName: "Personal Finance",
  },

  // Marketing topics
  {
    subjects: ["marketing"],
    id: "market-research",
    displayName: "Market Research",
  },
  {
    subjects: ["marketing"],
    id: "consumer-behavior",
    displayName: "Consumer Behavior",
  },
  {
    subjects: ["marketing"],
    id: "advertising",
    displayName: "Advertising",
  },
  {
    subjects: ["marketing"],
    id: "branding",
    displayName: "Branding",
  },
  {
    subjects: ["marketing"],
    id: "digital-marketing",
    displayName: "Digital Marketing",
  },
  {
    subjects: ["marketing"],
    id: "strategic-marketing",
    displayName: "Strategic Marketing",
  },

  // Public Health topics
  {
    subjects: ["public-health"],
    id: "epidemiology",
    displayName: "Epidemiology",
  },
  {
    subjects: ["public-health"],
    id: "health-policy",
    displayName: "Health Policy",
  },
  {
    subjects: ["public-health"],
    id: "health-promotion",
    displayName: "Health Promotion",
  },
  {
    subjects: ["public-health"],
    id: "disease-prevention",
    displayName: "Disease Prevention",
  },
  {
    subjects: ["public-health"],
    id: "environmental-health",
    displayName: "Environmental Health",
  },
  {
    subjects: ["public-health"],
    id: "global-health",
    displayName: "Global Health",
  },

  // Data Science topics
  {
    subjects: ["data-science"],
    id: "data-analysis",
    displayName: "Data Analysis",
  },
  {
    subjects: ["data-science"],
    id: "machine-learning",
    displayName: "Machine Learning",
  },
  {
    subjects: ["data-science"],
    id: "data-visualization",
    displayName: "Data Visualization",
  },
  {
    subjects: ["data-science"],
    id: "big-data",
    displayName: "Big Data",
  },
  {
    subjects: ["data-science"],
    id: "data-engineering",
    displayName: "Data Engineering",
  },
  // Travel and Tourism topics
  {
    subjects: ["travel-and-tourism"],
    id: "intro-travel-tourism",
    displayName: "Introduction to Travel & Tourism",
    description: "Overview of the travel and tourism industry, its history, key sectors, and types of tourism."
  },
  {
    subjects: ["travel-and-tourism"],
    id: "tourism-management",
    displayName: "Tourism Management",
    description: "Principles of managing tourism businesses and destinations, including strategy, marketing, and sustainability."
  },
  {
    subjects: ["travel-and-tourism"],
    id: "hospitality-operations",
    displayName: "Hospitality Operations",
    description: "Day-to-day operations in hotels, resorts, and other hospitality settings focused on service quality."
  },
  {
    subjects: ["travel-and-tourism"],
    id: "travel-agency-operations",
    displayName: "Travel Agency & Tour Operations",
    description: "Role of travel agencies and tour operators in planning, packaging, and selling travel experiences."
  },
  {
    subjects: ["travel-and-tourism"],
    id: "tourism-transportation",
    displayName: "Transportation in Tourism",
    description: "How air, land, and sea transport systems support and shape travel and tourism."
  },
  {
    subjects: ["travel-and-tourism"],
    id: "cultural-heritage-tourism",
    displayName: "Cultural & Heritage Tourism",
    description: "Tourism focused on culture, heritage, and historic sites, and balancing access with preservation."
  },
];
