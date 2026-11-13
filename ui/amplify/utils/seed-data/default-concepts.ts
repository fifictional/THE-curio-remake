/**
 * Default Concepts for Knowledge Base
 * Based on SAT - Sheet1 (1).csv
 * 
 * Edit this file to modify the default concepts that get loaded into the database.
 */

export interface DefaultConceptData {
  topics: string[];
  id: string;
  displayName: string;
  tag?: string;
  description?: string;
  exampleQuestion?: string;
}

export const DEFAULT_CONCEPTS: DefaultConceptData[] = [
  // English - Understanding Passages (literacy)
  {
    topics: ["literacy"],
    id: "text-purpose-tone",
    displayName: "Text Purpose & Tone",
    tag: "SAT",
    description: "Identify why an author wrote a passage, tone, or perspective",
    exampleQuestion: "What is the author's purpose in paragraph 3?"
  },
  {
    topics: ["literacy"],
    id: "word-choice-meaning",
    displayName: "Word Choice & Meaning",
    tag: "SAT",
    description: "Interpret meaning of words in context",
    exampleQuestion: "What does \"arduous\" most nearly mean in line 12?"
  },
  {
    topics: ["literacy"],
    id: "text-structure",
    displayName: "Text Structure",
    tag: "SAT",
    description: "Recognize organization (cause-effect, comparison, etc.)",
    exampleQuestion: "How does paragraph 2 develop the idea introduced earlier?"
  },

  // English - Information & Ideas (discourse)
  {
    topics: ["discourse"],
    id: "main-idea-central-theme",
    displayName: "Main Idea & Central Theme",
    tag: "SAT",
    description: "Identify key argument or claim",
    exampleQuestion: "What is the main idea of the passage?"
  },
  {
    topics: ["discourse"],
    id: "supporting-evidence",
    displayName: "Supporting Evidence",
    tag: "SAT",
    description: "Select lines that best support an answer",
    exampleQuestion: "Which line provides the best evidence for your answer?"
  },
  {
    topics: ["discourse"],
    id: "data-interpretation-in-texts",
    displayName: "Data Interpretation in Texts",
    tag: "SAT",
    description: "Use tables/graphs within reading passages",
    exampleQuestion: "What trend is shown in the data table?"
  },

  // English - Improving sentences & Flow (articulation)
  {
    topics: ["articulation"],
    id: "organization-logical-flow",
    displayName: "Organization & Logical Flow",
    tag: "SAT",
    description: "Improve logical order, transitions, and cohesion",
    exampleQuestion: "Choose the sentence that best connects ideas between paragraphs."
  },
  {
    topics: ["articulation"],
    id: "style-precision",
    displayName: "Style & Precision",
    tag: "SAT",
    description: "Revise for conciseness and tone",
    exampleQuestion: "Which choice best improves clarity?"
  },

  // English - Grammar and Punctuation (conventions)
  {
    topics: ["conventions"],
    id: "sentence-structure",
    displayName: "Sentence Structure",
    tag: "SAT",
    description: "Identify run-ons, fragments, or parallelism errors",
    exampleQuestion: "Which sentence correctly uses parallel structure?"
  },
  {
    topics: ["conventions"],
    id: "grammar-usage",
    displayName: "Grammar & Usage",
    tag: "SAT",
    description: "Subject-verb agreement, pronoun clarity",
    exampleQuestion: "Choose the grammatically correct sentence."
  },
  {
    topics: ["conventions"],
    id: "punctuation",
    displayName: "Punctuation",
    tag: "SAT",
    description: "Correct commas, semicolons, apostrophes",
    exampleQuestion: "Which option correctly punctuates the sentence?"
  },

  // Maths - Basic Algebra (algebra)
  {
    topics: ["algebra"],
    id: "linear-equations",
    displayName: "Linear Equations",
    tag: "SAT",
    description: "Solving, rearranging, interpreting equations",
    exampleQuestion: "Solve for x: (2x + 3 = 11)"
  },
  {
    topics: ["algebra"],
    id: "systems-of-equations",
    displayName: "Systems of Equations",
    tag: "SAT",
    description: "Solving 2-variable systems algebraically or graphically",
    exampleQuestion: "Find where two lines intersect"
  },
  {
    topics: ["algebra"],
    id: "inequalities-absolute-value",
    displayName: "Inequalities & Absolute Value",
    tag: "SAT",
    description: "Solving and graphing inequalities",
    exampleQuestion: "Solve |x - 3| < 5"
  },
  {
    topics: ["algebra"],
    id: "functions",
    displayName: "Functions",
    tag: "SAT",
    description: "Understanding function notation, slope, and rate of change",
    exampleQuestion: "If f(x)=3x+2, find f(−1)"
  },

  // Maths - Complex equation and Algebra (advanced-math)
  {
    topics: ["advanced-math"],
    id: "quadratic-equations",
    displayName: "Quadratic Equations",
    tag: "SAT",
    description: "Factoring, completing square, quadratic formula",
    exampleQuestion: "Solve x^2 - 5x + 6 = 0"
  },
  {
    topics: ["advanced-math"],
    id: "polynomials-rational-expressions",
    displayName: "Polynomials & Rational Expressions",
    tag: "SAT",
    description: "Simplifying, factoring, roots",
    exampleQuestion: "Simplify (x^2 - 9)/(x - 3)"
  },
  {
    topics: ["advanced-math"],
    id: "exponents-radicals-rational-powers",
    displayName: "Exponents, Radicals & Rational Powers",
    tag: "SAT",
    description: "Simplify expressions with exponents or roots",
    exampleQuestion: "Simplify x^(3/2) × x^(1/2)"
  },
  {
    topics: ["advanced-math"],
    id: "nonlinear-relationships",
    displayName: "Nonlinear Relationships",
    tag: "SAT",
    description: "Graphing parabolas, exponentials, radicals",
    exampleQuestion: "What is the vertex of y = x^2 - 4x + 3?"
  },

  // Maths - Data Interpretation (statistics)
  {
    topics: ["statistics"],
    id: "ratios-proportions",
    displayName: "Ratios & Proportions",
    tag: "SAT",
    description: "Solving percentage or ratio-based problems",
    exampleQuestion: "If 3 pens cost $2, what's the cost of 5 pens?"
  },
  {
    topics: ["statistics"],
    id: "statistics-probability",
    displayName: "Statistics & Probability",
    tag: "SAT",
    description: "Mean, median, mode, probability of events",
    exampleQuestion: "What is the probability of drawing a red card?"
  },
  {
    topics: ["statistics"],
    id: "data-analysis",
    displayName: "Data Analysis",
    tag: "SAT",
    description: "Interpreting graphs, scatterplots, linear regression",
    exampleQuestion: "Which line best fits the data trend?"
  },
  {
    topics: ["statistics"],
    id: "units-rates",
    displayName: "Units & Rates",
    tag: "SAT",
    description: "Working with unit conversions and rates",
    exampleQuestion: "Convert 60 miles/hour to meters/second"
  },

  // Maths - Geometry (geometry)
  {
    topics: ["geometry"],
    id: "angles-triangles",
    displayName: "Angles & Triangles",
    tag: "SAT",
    description: "Properties of triangles, angle sums",
    exampleQuestion: "Find the missing angle in a triangle"
  },
  {
    topics: ["geometry"],
    id: "circles-polygons",
    displayName: "Circles & Polygons",
    tag: "SAT",
    description: "Area, circumference, polygon properties",
    exampleQuestion: "Find the circumference of a circle with r = 5"
  },
  {
    topics: ["geometry"],
    id: "coordinate-geometry",
    displayName: "Coordinate Geometry",
    tag: "SAT",
    description: "Slope, distance, midpoint formulas",
    exampleQuestion: "Find midpoint between (2,3) and (6,7)"
  },
  {
    topics: ["geometry"],
    id: "volume-surface-area",
    displayName: "Volume & Surface Area",
    tag: "SAT",
    description: "3D shapes, cylinders, cones, spheres",
    exampleQuestion: "Find the volume of a cylinder (r=3, h=10)"
  },

  // Maths - Trigonometry (trigonometry)
  {
    topics: ["trigonometry"],
    id: "trigonometric-ratios",
    displayName: "Trigonometric Ratios",
    tag: "SAT",
    description: "Sine, cosine, tangent in right triangles",
    exampleQuestion: "Find sin(θ) if opposite = 3, hypotenuse = 5"
  },

  // Physics - Mechanics
  {
    topics: ["mechanics"],
    id: "kinematics",
    displayName: "Kinematics",
    description: "Motion, velocity, acceleration, and displacement",
    exampleQuestion: "A car accelerates from rest to 60 m/s in 10 seconds. What is its acceleration?"
  },
  {
    topics: ["mechanics"],
    id: "dynamics",
    displayName: "Dynamics",
    description: "Forces, Newton's laws, and motion",
    exampleQuestion: "What force is required to accelerate a 5kg object at 2 m/s²?"
  },
  {
    topics: ["mechanics"],
    id: "energy-work",
    displayName: "Energy & Work",
    description: "Kinetic energy, potential energy, work, and conservation of energy",
    exampleQuestion: "Calculate the kinetic energy of a 2kg object moving at 5 m/s"
  },
  {
    topics: ["mechanics"],
    id: "momentum-collisions",
    displayName: "Momentum & Collisions",
    description: "Linear momentum, impulse, and elastic/inelastic collisions",
    exampleQuestion: "Two objects collide. If one has momentum 10 kg·m/s, what is the total momentum?"
  },
  {
    topics: ["mechanics"],
    id: "rotational-motion",
    displayName: "Rotational Motion",
    description: "Angular velocity, torque, and rotational dynamics",
    exampleQuestion: "What is the angular velocity of a wheel rotating at 60 rpm?"
  },

  // Physics - Thermodynamics
  {
    topics: ["thermodynamics"],
    id: "temperature-heat",
    displayName: "Temperature & Heat",
    description: "Thermal energy, heat transfer, and temperature scales",
    exampleQuestion: "How much heat is needed to raise 1kg of water by 10°C?"
  },
  {
    topics: ["thermodynamics"],
    id: "laws-of-thermodynamics",
    displayName: "Laws of Thermodynamics",
    description: "First and second laws, entropy, and heat engines",
    exampleQuestion: "What does the first law of thermodynamics state?"
  },
  {
    topics: ["thermodynamics"],
    id: "ideal-gases",
    displayName: "Ideal Gases",
    description: "Gas laws, kinetic theory, and ideal gas equation",
    exampleQuestion: "If pressure doubles and volume halves, what happens to temperature?"
  },
  {
    topics: ["thermodynamics"],
    id: "phase-changes",
    displayName: "Phase Changes",
    description: "Melting, boiling, condensation, and latent heat",
    exampleQuestion: "Why does temperature remain constant during phase changes?"
  },

  // Physics - Electromagnetism
  {
    topics: ["electromagnetism"],
    id: "electric-fields",
    displayName: "Electric Fields",
    description: "Electric field strength, field lines, and Coulomb's law",
    exampleQuestion: "What is the electric field strength 2m from a 5μC charge?"
  },
  {
    topics: ["electromagnetism"],
    id: "magnetic-fields",
    displayName: "Magnetic Fields",
    description: "Magnetic field strength, field lines, and magnetic force",
    exampleQuestion: "What direction does a magnetic field point around a current-carrying wire?"
  },
  {
    topics: ["electromagnetism"],
    id: "electromagnetic-induction",
    displayName: "Electromagnetic Induction",
    description: "Faraday's law, Lenz's law, and generators",
    exampleQuestion: "What happens to induced current when magnetic flux changes?"
  },
  {
    topics: ["electromagnetism"],
    id: "circuits",
    displayName: "Circuits",
    description: "Ohm's law, series and parallel circuits, and power",
    exampleQuestion: "What is the total resistance of two 10Ω resistors in parallel?"
  },

  // Physics - Optics
  {
    topics: ["optics"],
    id: "reflection-refraction",
    displayName: "Reflection & Refraction",
    description: "Light rays, mirrors, lenses, and Snell's law",
    exampleQuestion: "What is the angle of refraction when light enters water from air at 30°?"
  },
  {
    topics: ["optics"],
    id: "lenses",
    displayName: "Lenses",
    description: "Convex and concave lenses, focal length, and image formation",
    exampleQuestion: "Where is the image formed by a converging lens with focal length 10cm?"
  },
  {
    topics: ["optics"],
    id: "wave-optics",
    displayName: "Wave Optics",
    description: "Interference, diffraction, and polarization",
    exampleQuestion: "What causes interference patterns in double-slit experiments?"
  },

  // Physics - Quantum Physics
  {
    topics: ["quantum-physics"],
    id: "photoelectric-effect",
    displayName: "Photoelectric Effect",
    description: "Photon energy, work function, and electron emission",
    exampleQuestion: "What is the minimum frequency needed to eject electrons from a metal?"
  },
  {
    topics: ["quantum-physics"],
    id: "atomic-structure",
    displayName: "Atomic Structure",
    description: "Bohr model, electron orbitals, and energy levels",
    exampleQuestion: "What happens when an electron transitions between energy levels?"
  },
  {
    topics: ["quantum-physics"],
    id: "wave-particle-duality",
    displayName: "Wave-Particle Duality",
    description: "De Broglie wavelength and quantum uncertainty",
    exampleQuestion: "What is the de Broglie wavelength of an electron?"
  },

  // Physics - Waves & Oscillations
  {
    topics: ["waves-oscillations"],
    id: "simple-harmonic-motion",
    displayName: "Simple Harmonic Motion",
    description: "Oscillations, period, frequency, and amplitude",
    exampleQuestion: "What is the period of a pendulum with length 1m?"
  },
  {
    topics: ["waves-oscillations"],
    id: "wave-properties",
    displayName: "Wave Properties",
    description: "Wavelength, frequency, amplitude, and wave speed",
    exampleQuestion: "If wavelength is 2m and frequency is 5Hz, what is the wave speed?"
  },
  {
    topics: ["waves-oscillations"],
    id: "sound-waves",
    displayName: "Sound Waves",
    description: "Sound propagation, Doppler effect, and resonance",
    exampleQuestion: "What happens to frequency when a sound source moves toward you?"
  },

  // Chemistry - General Chemistry
  {
    topics: ["general-chemistry"],
    id: "atomic-structure",
    displayName: "Atomic Structure",
    description: "Protons, neutrons, electrons, and atomic models",
    exampleQuestion: "How many protons does an atom with atomic number 6 have?"
  },
  {
    topics: ["general-chemistry"],
    id: "periodic-table",
    displayName: "Periodic Table",
    description: "Periodic trends, groups, periods, and element properties",
    exampleQuestion: "Why do elements in the same group have similar properties?"
  },
  {
    topics: ["general-chemistry"],
    id: "chemical-bonding",
    displayName: "Chemical Bonding",
    description: "Ionic, covalent, and metallic bonds",
    exampleQuestion: "What type of bond forms between sodium and chlorine?"
  },
  {
    topics: ["general-chemistry"],
    id: "stoichiometry",
    displayName: "Stoichiometry",
    description: "Mole concept, balancing equations, and calculations",
    exampleQuestion: "How many moles are in 18g of water?"
  },
  {
    topics: ["general-chemistry"],
    id: "acids-bases",
    displayName: "Acids & Bases",
    description: "pH scale, acid-base reactions, and buffers",
    exampleQuestion: "What is the pH of a solution with [H+] = 0.001 M?"
  },

  // Chemistry - Organic Chemistry
  {
    topics: ["organic-chemistry"],
    id: "hydrocarbons",
    displayName: "Hydrocarbons",
    description: "Alkanes, alkenes, alkynes, and aromatic compounds",
    exampleQuestion: "What is the molecular formula of butane?"
  },
  {
    topics: ["organic-chemistry"],
    id: "functional-groups",
    displayName: "Functional Groups",
    description: "Alcohols, aldehydes, ketones, carboxylic acids, and esters",
    exampleQuestion: "What functional group is present in ethanol?"
  },
  {
    topics: ["organic-chemistry"],
    id: "reaction-mechanisms",
    displayName: "Reaction Mechanisms",
    description: "Substitution, elimination, and addition reactions",
    exampleQuestion: "What type of reaction is SN1?"
  },
  {
    topics: ["organic-chemistry"],
    id: "stereochemistry",
    displayName: "Stereochemistry",
    description: "Isomers, chirality, and stereoisomers",
    exampleQuestion: "What is the difference between enantiomers and diastereomers?"
  },

  // Chemistry - Inorganic Chemistry
  {
    topics: ["inorganic-chemistry"],
    id: "coordination-compounds",
    displayName: "Coordination Compounds",
    description: "Complex ions, ligands, and coordination numbers",
    exampleQuestion: "What is the coordination number of [Fe(CN)6]4-?"
  },
  {
    topics: ["inorganic-chemistry"],
    id: "transition-metals",
    displayName: "Transition Metals",
    description: "Properties, electron configurations, and oxidation states",
    exampleQuestion: "Why do transition metals have multiple oxidation states?"
  },
  {
    topics: ["inorganic-chemistry"],
    id: "main-group-elements",
    displayName: "Main Group Elements",
    description: "Groups 1-2 and 13-18, their properties and reactions",
    exampleQuestion: "What is the trend in reactivity down group 1?"
  },

  // Chemistry - Physical Chemistry
  {
    topics: ["physical-chemistry"],
    id: "thermodynamics",
    displayName: "Thermodynamics",
    description: "Enthalpy, entropy, Gibbs free energy, and spontaneity",
    exampleQuestion: "Is a reaction spontaneous if ΔG < 0?"
  },
  {
    topics: ["physical-chemistry"],
    id: "kinetics",
    displayName: "Kinetics",
    description: "Reaction rates, rate laws, and activation energy",
    exampleQuestion: "How does temperature affect reaction rate?"
  },
  {
    topics: ["physical-chemistry"],
    id: "equilibrium",
    displayName: "Equilibrium",
    description: "Chemical equilibrium, Le Chatelier's principle, and K values",
    exampleQuestion: "What happens to equilibrium when pressure increases?"
  },

  // Chemistry - Analytical Chemistry
  {
    topics: ["analytical-chemistry"],
    id: "spectroscopy",
    displayName: "Spectroscopy",
    description: "UV-Vis, IR, NMR, and mass spectrometry",
    exampleQuestion: "What information does IR spectroscopy provide?"
  },
  {
    topics: ["analytical-chemistry"],
    id: "chromatography",
    displayName: "Chromatography",
    description: "Separation techniques, GC, HPLC, and TLC",
    exampleQuestion: "How does chromatography separate mixtures?"
  },
  {
    topics: ["analytical-chemistry"],
    id: "titration",
    displayName: "Titration",
    description: "Acid-base titration, equivalence point, and indicators",
    exampleQuestion: "What is the equivalence point in a titration?"
  },

  // Chemistry - Biochemistry
  {
    topics: ["biochemistry"],
    id: "proteins",
    displayName: "Proteins",
    description: "Amino acids, protein structure, and enzymes",
    exampleQuestion: "How many amino acids are in a protein?"
  },
  {
    topics: ["biochemistry"],
    id: "carbohydrates",
    displayName: "Carbohydrates",
    description: "Monosaccharides, disaccharides, and polysaccharides",
    exampleQuestion: "What is the difference between glucose and fructose?"
  },
  {
    topics: ["biochemistry"],
    id: "lipids",
    displayName: "Lipids",
    description: "Fatty acids, triglycerides, and phospholipids",
    exampleQuestion: "What is the structure of a phospholipid?"
  },
  {
    topics: ["biochemistry"],
    id: "nucleic-acids",
    displayName: "Nucleic Acids",
    description: "DNA, RNA, nucleotides, and base pairing",
    exampleQuestion: "Which bases pair together in DNA?"
  },

  // Biology - Cell Biology
  {
    topics: ["cell-biology"],
    id: "cell-structure",
    displayName: "Cell Structure",
    description: "Organelles, cell membrane, and cellular organization",
    exampleQuestion: "What is the function of mitochondria?"
  },
  {
    topics: ["cell-biology"],
    id: "cell-division",
    displayName: "Cell Division",
    description: "Mitosis, meiosis, and the cell cycle",
    exampleQuestion: "What happens during prophase of mitosis?"
  },
  {
    topics: ["cell-biology"],
    id: "membrane-transport",
    displayName: "Membrane Transport",
    description: "Diffusion, osmosis, active transport, and endocytosis",
    exampleQuestion: "What is the difference between diffusion and active transport?"
  },
  {
    topics: ["cell-biology"],
    id: "cellular-respiration",
    displayName: "Cellular Respiration",
    description: "Glycolysis, Krebs cycle, and electron transport chain",
    exampleQuestion: "Where does glycolysis occur in the cell?"
  },

  // Biology - Genetics
  {
    topics: ["genetics"],
    id: "mendelian-genetics",
    displayName: "Mendelian Genetics",
    description: "Dominant and recessive traits, Punnett squares, and inheritance",
    exampleQuestion: "What is the probability of offspring with recessive trait?"
  },
  {
    topics: ["genetics"],
    id: "dna-replication",
    displayName: "DNA Replication",
    description: "Semi-conservative replication, DNA polymerase, and replication forks",
    exampleQuestion: "What is semi-conservative replication?"
  },
  {
    topics: ["genetics"],
    id: "gene-expression",
    displayName: "Gene Expression",
    description: "Transcription, translation, and protein synthesis",
    exampleQuestion: "What is the role of mRNA in protein synthesis?"
  },
  {
    topics: ["genetics"],
    id: "mutations",
    displayName: "Mutations",
    description: "Point mutations, frameshift mutations, and chromosomal abnormalities",
    exampleQuestion: "What is the difference between a point mutation and frameshift mutation?"
  },

  // Biology - Ecology
  {
    topics: ["ecology"],
    id: "ecosystems",
    displayName: "Ecosystems",
    description: "Biotic and abiotic factors, food webs, and energy flow",
    exampleQuestion: "What is the difference between a food chain and food web?"
  },
  {
    topics: ["ecology"],
    id: "population-ecology",
    displayName: "Population Ecology",
    description: "Population growth, carrying capacity, and limiting factors",
    exampleQuestion: "What is carrying capacity?"
  },
  {
    topics: ["ecology"],
    id: "community-ecology",
    displayName: "Community Ecology",
    description: "Species interactions, competition, and symbiosis",
    exampleQuestion: "What is the difference between mutualism and parasitism?"
  },
  {
    topics: ["ecology"],
    id: "biogeochemical-cycles",
    displayName: "Biogeochemical Cycles",
    description: "Carbon, nitrogen, water, and phosphorus cycles",
    exampleQuestion: "How does carbon cycle through ecosystems?"
  },

  // Biology - Evolution
  {
    topics: ["evolution"],
    id: "natural-selection",
    displayName: "Natural Selection",
    description: "Mechanisms of evolution, adaptation, and fitness",
    exampleQuestion: "How does natural selection lead to evolution?"
  },
  {
    topics: ["evolution"],
    id: "speciation",
    displayName: "Speciation",
    description: "Formation of new species, allopatric and sympatric speciation",
    exampleQuestion: "What is the difference between allopatric and sympatric speciation?"
  },
  {
    topics: ["evolution"],
    id: "evidence-of-evolution",
    displayName: "Evidence of Evolution",
    description: "Fossils, comparative anatomy, and molecular evidence",
    exampleQuestion: "What evidence supports the theory of evolution?"
  },
  {
    topics: ["evolution"],
    id: "phylogenetics",
    displayName: "Phylogenetics",
    description: "Evolutionary relationships, cladistics, and phylogenetic trees",
    exampleQuestion: "What does a phylogenetic tree represent?"
  },

  // Biology - Anatomy & Physiology
  {
    topics: ["anatomy-physiology"],
    id: "organ-systems",
    displayName: "Organ Systems",
    description: "Circulatory, respiratory, digestive, and nervous systems",
    exampleQuestion: "What is the function of the circulatory system?"
  },
  {
    topics: ["anatomy-physiology"],
    id: "homeostasis",
    displayName: "Homeostasis",
    description: "Maintaining internal balance, feedback loops, and regulation",
    exampleQuestion: "How does the body maintain temperature homeostasis?"
  },
  {
    topics: ["anatomy-physiology"],
    id: "tissues",
    displayName: "Tissues",
    description: "Epithelial, connective, muscle, and nervous tissues",
    exampleQuestion: "What are the four main types of tissues?"
  },

  // Biology - Molecular Biology
  {
    topics: ["molecular-biology"],
    id: "gene-regulation",
    displayName: "Gene Regulation",
    description: "Transcription factors, operons, and gene control",
    exampleQuestion: "How do transcription factors regulate gene expression?"
  },
  {
    topics: ["molecular-biology"],
    id: "recombinant-dna",
    displayName: "Recombinant DNA",
    description: "Genetic engineering, PCR, and cloning",
    exampleQuestion: "What is the purpose of PCR?"
  },
  {
    topics: ["molecular-biology"],
    id: "genomics",
    displayName: "Genomics",
    description: "Genome sequencing, gene mapping, and bioinformatics",
    exampleQuestion: "What is the difference between genomics and genetics?"
  },

  // Computer Science - Programming
  {
    topics: ["programming"],
    id: "programming-fundamentals",
    displayName: "Programming Fundamentals",
    description: "Variables, data types, control structures, and basic syntax",
    exampleQuestion: "What is the difference between a variable and a constant?"
  },
  {
    topics: ["programming"],
    id: "object-oriented-programming",
    displayName: "Object-Oriented Programming",
    description: "Classes, objects, inheritance, polymorphism, and encapsulation",
    exampleQuestion: "What are the four pillars of object-oriented programming?"
  },
  {
    topics: ["programming"],
    id: "functions-methods",
    displayName: "Functions & Methods",
    description: "Function definition, parameters, return values, and recursion",
    exampleQuestion: "What is the difference between a function and a method?"
  },
  {
    topics: ["programming"],
    id: "error-handling",
    displayName: "Error Handling",
    description: "Exceptions, try-catch blocks, and debugging techniques",
    exampleQuestion: "How do you handle exceptions in code?"
  },

  // Computer Science - Data Structures & Algorithms
  {
    topics: ["data-structures-algorithms"],
    id: "arrays-lists",
    displayName: "Arrays & Lists",
    description: "Arrays, linked lists, dynamic arrays, and list operations",
    exampleQuestion: "What is the time complexity of accessing an element in an array?"
  },
  {
    topics: ["data-structures-algorithms"],
    id: "trees-graphs",
    displayName: "Trees & Graphs",
    description: "Binary trees, BST, graph representation, and traversal",
    exampleQuestion: "What is the difference between BFS and DFS?"
  },
  {
    topics: ["data-structures-algorithms"],
    id: "sorting-searching",
    displayName: "Sorting & Searching",
    description: "Sorting algorithms, search algorithms, and complexity analysis",
    exampleQuestion: "What is the time complexity of quicksort?"
  },
  {
    topics: ["data-structures-algorithms"],
    id: "hash-tables",
    displayName: "Hash Tables",
    description: "Hash functions, collision resolution, and hash table operations",
    exampleQuestion: "How do hash tables achieve O(1) average lookup time?"
  },
  {
    topics: ["data-structures-algorithms"],
    id: "algorithm-complexity",
    displayName: "Algorithm Complexity",
    description: "Big O notation, time and space complexity, and optimization",
    exampleQuestion: "What does O(n log n) time complexity mean?"
  },

  // Computer Science - Software Engineering
  {
    topics: ["software-engineering"],
    id: "software-design",
    displayName: "Software Design",
    description: "Design patterns, SOLID principles, and architecture",
    exampleQuestion: "What is the Singleton design pattern?"
  },
  {
    topics: ["software-engineering"],
    id: "version-control",
    displayName: "Version Control",
    description: "Git, branching, merging, and collaborative development",
    exampleQuestion: "What is the difference between merge and rebase?"
  },
  {
    topics: ["software-engineering"],
    id: "testing",
    displayName: "Testing",
    description: "Unit testing, integration testing, and test-driven development",
    exampleQuestion: "What is the purpose of unit testing?"
  },
  {
    topics: ["software-engineering"],
    id: "agile-methodology",
    displayName: "Agile Methodology",
    description: "Scrum, sprints, user stories, and iterative development",
    exampleQuestion: "What are the key principles of Agile development?"
  },

  // Computer Science - Databases
  {
    topics: ["databases"],
    id: "relational-databases",
    displayName: "Relational Databases",
    description: "SQL, tables, relationships, and normalization",
    exampleQuestion: "What is the difference between a primary key and foreign key?"
  },
  {
    topics: ["databases"],
    id: "database-design",
    displayName: "Database Design",
    description: "ER diagrams, schema design, and data modeling",
    exampleQuestion: "What is database normalization?"
  },
  {
    topics: ["databases"],
    id: "queries",
    displayName: "Queries",
    description: "SELECT, JOIN, subqueries, and query optimization",
    exampleQuestion: "What is the difference between INNER JOIN and LEFT JOIN?"
  },
  {
    topics: ["databases"],
    id: "nosql-databases",
    displayName: "NoSQL Databases",
    description: "Document databases, key-value stores, and graph databases",
    exampleQuestion: "When would you use a NoSQL database instead of SQL?"
  },

  // Computer Science - Networks
  {
    topics: ["networks"],
    id: "network-protocols",
    displayName: "Network Protocols",
    description: "TCP/IP, HTTP, HTTPS, and protocol layers",
    exampleQuestion: "What is the difference between TCP and UDP?"
  },
  {
    topics: ["networks"],
    id: "network-architecture",
    displayName: "Network Architecture",
    description: "Client-server, peer-to-peer, and distributed systems",
    exampleQuestion: "What is the client-server model?"
  },
  {
    topics: ["networks"],
    id: "security",
    displayName: "Network Security",
    description: "Encryption, authentication, firewalls, and security protocols",
    exampleQuestion: "What is the purpose of SSL/TLS?"
  },

  // Computer Science - Artificial Intelligence
  {
    topics: ["artificial-intelligence"],
    id: "machine-learning",
    displayName: "Machine Learning",
    description: "Supervised learning, unsupervised learning, and neural networks",
    exampleQuestion: "What is the difference between supervised and unsupervised learning?"
  },
  {
    topics: ["artificial-intelligence"],
    id: "natural-language-processing",
    displayName: "Natural Language Processing",
    description: "Text processing, language models, and NLP applications",
    exampleQuestion: "What is tokenization in NLP?"
  },
  {
    topics: ["artificial-intelligence"],
    id: "computer-vision",
    displayName: "Computer Vision",
    description: "Image processing, object detection, and image recognition",
    exampleQuestion: "What is convolutional neural network used for?"
  },

  // Literature - Literary Analysis
  {
    topics: ["literary-analysis"],
    id: "theme-analysis",
    displayName: "Theme Analysis",
    description: "Identifying themes, motifs, and central ideas in texts",
    exampleQuestion: "What is the main theme of this passage?"
  },
  {
    topics: ["literary-analysis"],
    id: "character-analysis",
    displayName: "Character Analysis",
    description: "Character development, motivation, and characterization",
    exampleQuestion: "How does the protagonist change throughout the story?"
  },
  {
    topics: ["literary-analysis"],
    id: "narrative-techniques",
    displayName: "Narrative Techniques",
    description: "Point of view, narrative structure, and storytelling devices",
    exampleQuestion: "What is the effect of first-person narration?"
  },
  {
    topics: ["literary-analysis"],
    id: "symbolism-imagery",
    displayName: "Symbolism & Imagery",
    description: "Symbols, metaphors, similes, and figurative language",
    exampleQuestion: "What does the symbol represent in this text?"
  },

  // Literature - Poetry
  {
    topics: ["poetry"],
    id: "poetic-forms",
    displayName: "Poetic Forms",
    description: "Sonnet, haiku, free verse, and traditional forms",
    exampleQuestion: "What is the structure of a sonnet?"
  },
  {
    topics: ["poetry"],
    id: "meter-rhythm",
    displayName: "Meter & Rhythm",
    description: "Iambic pentameter, rhyme schemes, and poetic meter",
    exampleQuestion: "What is iambic pentameter?"
  },
  {
    topics: ["poetry"],
    id: "poetic-devices",
    displayName: "Poetic Devices",
    description: "Alliteration, assonance, enjambment, and caesura",
    exampleQuestion: "What is the effect of alliteration in poetry?"
  },

  // Literature - Prose Fiction
  {
    topics: ["prose-fiction"],
    id: "novel-analysis",
    displayName: "Novel Analysis",
    description: "Novel structure, plot development, and narrative arc",
    exampleQuestion: "What is the three-act structure in novels?"
  },
  {
    topics: ["prose-fiction"],
    id: "short-stories",
    displayName: "Short Stories",
    description: "Short story elements, brevity, and narrative compression",
    exampleQuestion: "What makes a short story effective?"
  },
  {
    topics: ["prose-fiction"],
    id: "genre-fiction",
    displayName: "Genre Fiction",
    description: "Science fiction, fantasy, mystery, and genre conventions",
    exampleQuestion: "What are the characteristics of science fiction?"
  },

  // Literature - Drama
  {
    topics: ["drama"],
    id: "dramatic-structure",
    displayName: "Dramatic Structure",
    description: "Five-act structure, rising action, climax, and resolution",
    exampleQuestion: "What is the climax of a play?"
  },
  {
    topics: ["drama"],
    id: "dialogue",
    displayName: "Dialogue",
    description: "Dialogue techniques, subtext, and character voice",
    exampleQuestion: "How does dialogue reveal character?"
  },
  {
    topics: ["drama"],
    id: "tragedy-comedy",
    displayName: "Tragedy & Comedy",
    description: "Tragic hero, comic relief, and dramatic genres",
    exampleQuestion: "What is a tragic flaw?"
  },

  // Literature - Literary Theory
  {
    topics: ["literary-theory"],
    id: "critical-theory",
    displayName: "Critical Theory",
    description: "Formalism, structuralism, post-structuralism, and deconstruction",
    exampleQuestion: "What is the difference between formalism and structuralism?"
  },
  {
    topics: ["literary-theory"],
    id: "feminist-criticism",
    displayName: "Feminist Criticism",
    description: "Gender analysis, patriarchy, and feminist literary theory",
    exampleQuestion: "How does feminist criticism analyze literature?"
  },
  {
    topics: ["literary-theory"],
    id: "postcolonial-theory",
    displayName: "Postcolonial Theory",
    description: "Colonialism, identity, and postcolonial literature",
    exampleQuestion: "What is postcolonial criticism?"
  },

  // Literature - World Literature
  {
    topics: ["world-literature"],
    id: "comparative-literature",
    displayName: "Comparative Literature",
    description: "Cross-cultural analysis and global literary movements",
    exampleQuestion: "How do different cultures approach storytelling?"
  },
  {
    topics: ["world-literature"],
    id: "translation-studies",
    displayName: "Translation Studies",
    description: "Literary translation, cultural adaptation, and translation theory",
    exampleQuestion: "What challenges exist in translating literature?"
  },

  // History - Ancient History
  {
    topics: ["ancient-history"],
    id: "ancient-civilizations",
    displayName: "Ancient Civilizations",
    description: "Mesopotamia, Egypt, Greece, Rome, and early civilizations",
    exampleQuestion: "What were the key achievements of ancient Egypt?"
  },
  {
    topics: ["ancient-history"],
    id: "classical-periods",
    displayName: "Classical Periods",
    description: "Classical Greece, Roman Empire, and classical culture",
    exampleQuestion: "What was the significance of the Roman Republic?"
  },
  {
    topics: ["ancient-history"],
    id: "ancient-religions",
    displayName: "Ancient Religions",
    description: "Polytheism, early monotheism, and religious practices",
    exampleQuestion: "How did religion shape ancient societies?"
  },

  // History - Medieval History
  {
    topics: ["medieval-history"],
    id: "feudalism",
    displayName: "Feudalism",
    description: "Feudal system, manorialism, and medieval social structure",
    exampleQuestion: "What was the feudal system?"
  },
  {
    topics: ["medieval-history"],
    id: "crusades",
    displayName: "Crusades",
    description: "Religious wars, cultural exchange, and medieval conflicts",
    exampleQuestion: "What were the causes of the Crusades?"
  },
  {
    topics: ["medieval-history"],
    id: "medieval-church",
    displayName: "Medieval Church",
    description: "Papacy, monasticism, and religious influence",
    exampleQuestion: "What role did the Church play in medieval Europe?"
  },
  {
    topics: ["medieval-history"],
    id: "renaissance",
    displayName: "Renaissance",
    description: "Cultural rebirth, humanism, and artistic achievements",
    exampleQuestion: "What characterized the Renaissance period?"
  },

  // History - Modern History
  {
    topics: ["modern-history"],
    id: "enlightenment",
    displayName: "Enlightenment",
    description: "Age of reason, philosophical movements, and intellectual revolution",
    exampleQuestion: "What were the key ideas of the Enlightenment?"
  },
  {
    topics: ["modern-history"],
    id: "industrial-revolution",
    displayName: "Industrial Revolution",
    description: "Technological change, urbanization, and economic transformation",
    exampleQuestion: "What were the social impacts of the Industrial Revolution?"
  },
  {
    topics: ["modern-history"],
    id: "world-wars",
    displayName: "World Wars",
    description: "WWI, WWII, causes, consequences, and global impact",
    exampleQuestion: "What were the main causes of World War I?"
  },
  {
    topics: ["modern-history"],
    id: "cold-war",
    displayName: "Cold War",
    description: "Superpower rivalry, proxy wars, and ideological conflict",
    exampleQuestion: "What characterized the Cold War period?"
  },

  // History - World History
  {
    topics: ["world-history"],
    id: "global-interactions",
    displayName: "Global Interactions",
    description: "Trade routes, cultural exchange, and globalization",
    exampleQuestion: "How did the Silk Road facilitate cultural exchange?"
  },
  {
    topics: ["world-history"],
    id: "colonialism-imperialism",
    displayName: "Colonialism & Imperialism",
    description: "European expansion, colonial systems, and decolonization",
    exampleQuestion: "What were the effects of European colonialism?"
  },
  {
    topics: ["world-history"],
    id: "modern-globalization",
    displayName: "Modern Globalization",
    description: "Economic integration, cultural diffusion, and global challenges",
    exampleQuestion: "What factors contributed to modern globalization?"
  },

  // History - Regional History
  {
    topics: ["regional-history"],
    id: "american-history",
    displayName: "American History",
    description: "US history, founding, expansion, and development",
    exampleQuestion: "What were the causes of the American Revolution?"
  },
  {
    topics: ["regional-history"],
    id: "european-history",
    displayName: "European History",
    description: "European development, conflicts, and integration",
    exampleQuestion: "What led to the formation of the European Union?"
  },
  {
    topics: ["regional-history"],
    id: "asian-history",
    displayName: "Asian History",
    description: "Asian civilizations, dynasties, and modern development",
    exampleQuestion: "What were the major Chinese dynasties?"
  },
  {
    topics: ["regional-history"],
    id: "african-history",
    displayName: "African History",
    description: "African kingdoms, colonialism, and independence movements",
    exampleQuestion: "What were the effects of the Scramble for Africa?"
  },

  // History - Historiography
  {
    topics: ["historiography"],
    id: "historical-methods",
    displayName: "Historical Methods",
    description: "Research methods, source analysis, and historical evidence",
    exampleQuestion: "What is the difference between primary and secondary sources?"
  },
  {
    topics: ["historiography"],
    id: "historical-interpretation",
    displayName: "Historical Interpretation",
    description: "Historical perspectives, bias, and multiple viewpoints",
    exampleQuestion: "How do historians interpret historical events differently?"
  },
  {
    topics: ["historiography"],
    id: "historical-writing",
    displayName: "Historical Writing",
    description: "Narrative history, analytical history, and historical argumentation",
    exampleQuestion: "What makes a strong historical argument?"
  },

  // Geography - Physical Geography
  {
    topics: ["physical-geography"],
    id: "landforms",
    displayName: "Landforms",
    description: "Mountains, valleys, plains, and geological formations",
    exampleQuestion: "How are mountains formed?"
  },
  {
    topics: ["physical-geography"],
    id: "climate-weather",
    displayName: "Climate & Weather",
    description: "Climate zones, weather patterns, and atmospheric systems",
    exampleQuestion: "What is the difference between climate and weather?"
  },
  {
    topics: ["physical-geography"],
    id: "water-systems",
    displayName: "Water Systems",
    description: "Rivers, oceans, lakes, and hydrological cycles",
    exampleQuestion: "What is the water cycle?"
  },
  {
    topics: ["physical-geography"],
    id: "biomes",
    displayName: "Biomes",
    description: "Ecosystems, biomes, and environmental zones",
    exampleQuestion: "What are the characteristics of a desert biome?"
  },

  // Geography - Human Geography
  {
    topics: ["human-geography"],
    id: "population",
    displayName: "Population",
    description: "Population distribution, demographics, and migration",
    exampleQuestion: "What factors influence population distribution?"
  },
  {
    topics: ["human-geography"],
    id: "urban-geography",
    displayName: "Urban Geography",
    description: "Cities, urbanization, and urban planning",
    exampleQuestion: "What are the characteristics of urban areas?"
  },
  {
    topics: ["human-geography"],
    id: "cultural-geography",
    displayName: "Cultural Geography",
    description: "Culture, language, religion, and cultural landscapes",
    exampleQuestion: "How does geography influence culture?"
  },
  {
    topics: ["human-geography"],
    id: "economic-geography",
    displayName: "Economic Geography",
    description: "Economic activities, resources, and development",
    exampleQuestion: "What is the difference between primary and secondary economic activities?"
  },

  // Geography - Cartography
  {
    topics: ["cartography"],
    id: "map-types",
    displayName: "Map Types",
    description: "Topographic maps, thematic maps, and map projections",
    exampleQuestion: "What is a topographic map?"
  },
  {
    topics: ["cartography"],
    id: "map-reading",
    displayName: "Map Reading",
    description: "Scale, legend, coordinates, and map interpretation",
    exampleQuestion: "How do you read coordinates on a map?"
  },
  {
    topics: ["cartography"],
    id: "projections",
    displayName: "Map Projections",
    description: "Mercator, equal-area, and distortion in map projections",
    exampleQuestion: "What is the problem with the Mercator projection?"
  },

  // Geography - Regional Geography
  {
    topics: ["regional-geography"],
    id: "regional-analysis",
    displayName: "Regional Analysis",
    description: "Regional characteristics, boundaries, and regional identity",
    exampleQuestion: "What defines a geographic region?"
  },
  {
    topics: ["regional-geography"],
    id: "regional-comparison",
    displayName: "Regional Comparison",
    description: "Comparing regions, similarities, and differences",
    exampleQuestion: "How do regions differ in their physical and human characteristics?"
  },

  // Geography - Environmental Geography
  {
    topics: ["environmental-geography"],
    id: "environmental-issues",
    displayName: "Environmental Issues",
    description: "Environmental problems, degradation, and conservation",
    exampleQuestion: "What are the main environmental challenges facing regions?"
  },
  {
    topics: ["environmental-geography"],
    id: "human-environment",
    displayName: "Human-Environment Interaction",
    description: "Human impact on environment and environmental adaptation",
    exampleQuestion: "How do humans modify their environment?"
  },

  // Geography - GIS
  {
    topics: ["gis"],
    id: "gis-fundamentals",
    displayName: "GIS Fundamentals",
    description: "Geographic information systems, spatial data, and GIS software",
    exampleQuestion: "What is GIS used for?"
  },
  {
    topics: ["gis"],
    id: "spatial-analysis",
    displayName: "Spatial Analysis",
    description: "Spatial queries, overlay analysis, and spatial modeling",
    exampleQuestion: "What is spatial analysis?"
  },
  {
    topics: ["gis"],
    id: "remote-sensing",
    displayName: "Remote Sensing",
    description: "Satellite imagery, aerial photography, and data collection",
    exampleQuestion: "What is remote sensing?"
  },

  // Economics - Microeconomics
  {
    topics: ["microeconomics"],
    id: "supply-demand",
    displayName: "Supply & Demand",
    description: "Market forces, equilibrium, and price determination",
    exampleQuestion: "What happens to price when demand increases?"
  },
  {
    topics: ["microeconomics"],
    id: "elasticity",
    displayName: "Elasticity",
    description: "Price elasticity, income elasticity, and cross-price elasticity",
    exampleQuestion: "What does price elasticity of demand measure?"
  },
  {
    topics: ["microeconomics"],
    id: "consumer-theory",
    displayName: "Consumer Theory",
    description: "Utility, indifference curves, and consumer choice",
    exampleQuestion: "What is utility in economics?"
  },
  {
    topics: ["microeconomics"],
    id: "production-costs",
    displayName: "Production & Costs",
    description: "Production functions, cost curves, and firm behavior",
    exampleQuestion: "What is the difference between fixed and variable costs?"
  },
  {
    topics: ["microeconomics"],
    id: "market-structures",
    displayName: "Market Structures",
    description: "Perfect competition, monopoly, oligopoly, and monopolistic competition",
    exampleQuestion: "What are the characteristics of perfect competition?"
  },

  // Economics - Macroeconomics
  {
    topics: ["macroeconomics"],
    id: "gdp",
    displayName: "GDP & National Income",
    description: "Gross domestic product, national income, and economic indicators",
    exampleQuestion: "What is GDP and how is it calculated?"
  },
  {
    topics: ["macroeconomics"],
    id: "inflation-unemployment",
    displayName: "Inflation & Unemployment",
    description: "Price levels, inflation rates, and unemployment types",
    exampleQuestion: "What causes inflation?"
  },
  {
    topics: ["macroeconomics"],
    id: "fiscal-policy",
    displayName: "Fiscal Policy",
    description: "Government spending, taxation, and budget deficits",
    exampleQuestion: "What is expansionary fiscal policy?"
  },
  {
    topics: ["macroeconomics"],
    id: "monetary-policy",
    displayName: "Monetary Policy",
    description: "Interest rates, money supply, and central banking",
    exampleQuestion: "How does the central bank control money supply?"
  },
  {
    topics: ["macroeconomics"],
    id: "economic-growth",
    displayName: "Economic Growth",
    description: "Long-term growth, productivity, and development",
    exampleQuestion: "What factors contribute to economic growth?"
  },

  // Economics - International Economics
  {
    topics: ["international-economics"],
    id: "international-trade",
    displayName: "International Trade",
    description: "Comparative advantage, trade barriers, and trade agreements",
    exampleQuestion: "What is comparative advantage?"
  },
  {
    topics: ["international-economics"],
    id: "exchange-rates",
    displayName: "Exchange Rates",
    description: "Currency markets, exchange rate systems, and balance of payments",
    exampleQuestion: "What factors affect exchange rates?"
  },
  {
    topics: ["international-economics"],
    id: "globalization",
    displayName: "Globalization",
    description: "Global economic integration, trade flows, and international finance",
    exampleQuestion: "What are the benefits and costs of globalization?"
  },

  // Economics - Econometrics
  {
    topics: ["econometrics"],
    id: "regression-analysis",
    displayName: "Regression Analysis",
    description: "Linear regression, multiple regression, and statistical inference",
    exampleQuestion: "What does a regression coefficient represent?"
  },
  {
    topics: ["econometrics"],
    id: "time-series",
    displayName: "Time Series Analysis",
    description: "Time series data, trends, and forecasting",
    exampleQuestion: "What is a time series?"
  },
  {
    topics: ["econometrics"],
    id: "causality",
    displayName: "Causality",
    description: "Causal inference, endogeneity, and identification",
    exampleQuestion: "What is the difference between correlation and causation?"
  },

  // Economics - Economic History
  {
    topics: ["economic-history"],
    id: "economic-systems",
    displayName: "Economic Systems",
    description: "Capitalism, socialism, and historical economic organization",
    exampleQuestion: "What are the key features of capitalism?"
  },
  {
    topics: ["economic-history"],
    id: "economic-crises",
    displayName: "Economic Crises",
    description: "Depressions, recessions, and financial crises",
    exampleQuestion: "What caused the Great Depression?"
  },

  // Economics - Public Economics
  {
    topics: ["public-economics"],
    id: "public-goods",
    displayName: "Public Goods",
    description: "Public goods, externalities, and market failure",
    exampleQuestion: "What is a public good?"
  },
  {
    topics: ["public-economics"],
    id: "taxation",
    displayName: "Taxation",
    description: "Tax systems, tax incidence, and tax policy",
    exampleQuestion: "What is tax incidence?"
  },
  {
    topics: ["public-economics"],
    id: "welfare-economics",
    displayName: "Welfare Economics",
    description: "Social welfare, efficiency, and equity",
    exampleQuestion: "What is Pareto efficiency?"
  },

  // Business - Management
  {
    topics: ["management"],
    id: "leadership",
    displayName: "Leadership",
    description: "Leadership styles, motivation, and team management",
    exampleQuestion: "What are the key characteristics of effective leadership?"
  },
  {
    topics: ["management"],
    id: "planning",
    displayName: "Planning",
    description: "Strategic planning, goal setting, and decision making",
    exampleQuestion: "What is the difference between strategic and tactical planning?"
  },
  {
    topics: ["management"],
    id: "organizing",
    displayName: "Organizing",
    description: "Organizational structure, delegation, and coordination",
    exampleQuestion: "What is organizational structure?"
  },
  {
    topics: ["management"],
    id: "controlling",
    displayName: "Controlling",
    description: "Performance measurement, feedback, and control systems",
    exampleQuestion: "What is the control function in management?"
  },

  // Business - Operations
  {
    topics: ["operations"],
    id: "production-management",
    displayName: "Production Management",
    description: "Production processes, quality control, and efficiency",
    exampleQuestion: "What is lean production?"
  },
  {
    topics: ["operations"],
    id: "supply-chain",
    displayName: "Supply Chain Management",
    description: "Supply chains, logistics, and inventory management",
    exampleQuestion: "What is supply chain management?"
  },
  {
    topics: ["operations"],
    id: "quality-management",
    displayName: "Quality Management",
    description: "Total quality management, Six Sigma, and quality assurance",
    exampleQuestion: "What is Total Quality Management?"
  },

  // Business - Strategy
  {
    topics: ["strategy"],
    id: "competitive-strategy",
    displayName: "Competitive Strategy",
    description: "Competitive advantage, Porter's Five Forces, and strategic positioning",
    exampleQuestion: "What is competitive advantage?"
  },
  {
    topics: ["strategy"],
    id: "strategic-analysis",
    displayName: "Strategic Analysis",
    description: "SWOT analysis, environmental scanning, and strategic planning",
    exampleQuestion: "What does SWOT stand for?"
  },
  {
    topics: ["strategy"],
    id: "corporate-strategy",
    displayName: "Corporate Strategy",
    description: "Diversification, mergers, acquisitions, and corporate development",
    exampleQuestion: "What is diversification strategy?"
  },

  // Business - Organizational Behavior
  {
    topics: ["organizational-behavior"],
    id: "individual-behavior",
    displayName: "Individual Behavior",
    description: "Personality, attitudes, perception, and motivation",
    exampleQuestion: "What factors influence individual behavior in organizations?"
  },
  {
    topics: ["organizational-behavior"],
    id: "group-dynamics",
    displayName: "Group Dynamics",
    description: "Team formation, group behavior, and conflict resolution",
    exampleQuestion: "What are the stages of group development?"
  },
  {
    topics: ["organizational-behavior"],
    id: "organizational-culture",
    displayName: "Organizational Culture",
    description: "Culture, values, norms, and organizational climate",
    exampleQuestion: "What is organizational culture?"
  },

  // Business - Entrepreneurship
  {
    topics: ["entrepreneurship"],
    id: "business-planning",
    displayName: "Business Planning",
    description: "Business plans, feasibility analysis, and startup planning",
    exampleQuestion: "What are the key components of a business plan?"
  },
  {
    topics: ["entrepreneurship"],
    id: "innovation",
    displayName: "Innovation",
    description: "Innovation management, creativity, and product development",
    exampleQuestion: "What is the difference between innovation and invention?"
  },
  {
    topics: ["entrepreneurship"],
    id: "venture-capital",
    displayName: "Venture Capital & Funding",
    description: "Funding sources, venture capital, and financial planning",
    exampleQuestion: "What is venture capital?"
  },

  // Business - Business Ethics
  {
    topics: ["business-ethics"],
    id: "ethical-decision-making",
    displayName: "Ethical Decision Making",
    description: "Ethical frameworks, moral reasoning, and ethical dilemmas",
    exampleQuestion: "What is utilitarianism in business ethics?"
  },
  {
    topics: ["business-ethics"],
    id: "corporate-social-responsibility",
    displayName: "Corporate Social Responsibility",
    description: "CSR, sustainability, and stakeholder management",
    exampleQuestion: "What is corporate social responsibility?"
  },
  {
    topics: ["business-ethics"],
    id: "ethical-leadership",
    displayName: "Ethical Leadership",
    description: "Ethical leadership, integrity, and ethical culture",
    exampleQuestion: "What makes an ethical leader?"
  },

  // Accounting - Financial Accounting
  {
    topics: ["financial-accounting"],
    id: "accounting-equation",
    displayName: "Accounting Equation",
    description: "Assets, liabilities, equity, and the fundamental equation",
    exampleQuestion: "What is the accounting equation?"
  },
  {
    topics: ["financial-accounting"],
    id: "financial-statements",
    displayName: "Financial Statements",
    description: "Balance sheet, income statement, and cash flow statement",
    exampleQuestion: "What is included in a balance sheet?"
  },
  {
    topics: ["financial-accounting"],
    id: "double-entry-bookkeeping",
    displayName: "Double-Entry Bookkeeping",
    description: "Debits, credits, and the double-entry system",
    exampleQuestion: "What is double-entry bookkeeping?"
  },
  {
    topics: ["financial-accounting"],
    id: "accounting-cycles",
    displayName: "Accounting Cycles",
    description: "Journal entries, ledgers, and closing entries",
    exampleQuestion: "What are the steps in the accounting cycle?"
  },

  // Accounting - Managerial Accounting
  {
    topics: ["managerial-accounting"],
    id: "cost-accounting",
    displayName: "Cost Accounting",
    description: "Cost classification, cost allocation, and cost behavior",
    exampleQuestion: "What is the difference between fixed and variable costs?"
  },
  {
    topics: ["managerial-accounting"],
    id: "budgeting",
    displayName: "Budgeting",
    description: "Budget preparation, variance analysis, and budget control",
    exampleQuestion: "What is a master budget?"
  },
  {
    topics: ["managerial-accounting"],
    id: "performance-measurement",
    displayName: "Performance Measurement",
    description: "Key performance indicators, ROI, and performance evaluation",
    exampleQuestion: "What is ROI?"
  },

  // Accounting - Auditing
  {
    topics: ["auditing"],
    id: "audit-process",
    displayName: "Audit Process",
    description: "Audit planning, evidence gathering, and audit reports",
    exampleQuestion: "What is the purpose of an audit?"
  },
  {
    topics: ["auditing"],
    id: "internal-controls",
    displayName: "Internal Controls",
    description: "Control systems, risk assessment, and control testing",
    exampleQuestion: "What are internal controls?"
  },
  {
    topics: ["auditing"],
    id: "audit-standards",
    displayName: "Audit Standards",
    description: "GAAS, audit procedures, and professional standards",
    exampleQuestion: "What are Generally Accepted Auditing Standards?"
  },

  // Accounting - Taxation
  {
    topics: ["taxation"],
    id: "income-tax",
    displayName: "Income Tax",
    description: "Taxable income, deductions, and tax calculations",
    exampleQuestion: "What is taxable income?"
  },
  {
    topics: ["taxation"],
    id: "tax-planning",
    displayName: "Tax Planning",
    description: "Tax strategies, tax credits, and tax minimization",
    exampleQuestion: "What is tax planning?"
  },
  {
    topics: ["taxation"],
    id: "corporate-tax",
    displayName: "Corporate Tax",
    description: "Corporate tax rates, tax structures, and corporate taxation",
    exampleQuestion: "How is corporate income taxed?"
  },

  // Accounting - Cost Accounting
  {
    topics: ["cost-accounting"],
    id: "job-costing",
    displayName: "Job Costing",
    description: "Job order costing, cost accumulation, and job cost sheets",
    exampleQuestion: "What is job costing used for?"
  },
  {
    topics: ["cost-accounting"],
    id: "process-costing",
    displayName: "Process Costing",
    description: "Process cost systems, equivalent units, and cost flows",
    exampleQuestion: "What is process costing?"
  },
  {
    topics: ["cost-accounting"],
    id: "activity-based-costing",
    displayName: "Activity-Based Costing",
    description: "ABC systems, cost drivers, and activity cost pools",
    exampleQuestion: "What is activity-based costing?"
  },

  // Accounting - Financial Analysis
  {
    topics: ["financial-analysis"],
    id: "ratio-analysis",
    displayName: "Ratio Analysis",
    description: "Financial ratios, liquidity ratios, and profitability ratios",
    exampleQuestion: "What is the current ratio?"
  },
  {
    topics: ["financial-analysis"],
    id: "financial-forecasting",
    displayName: "Financial Forecasting",
    description: "Financial projections, forecasting methods, and analysis",
    exampleQuestion: "What is financial forecasting?"
  },

  // Psychology - Cognitive Psychology
  {
    topics: ["cognitive-psychology"],
    id: "memory",
    displayName: "Memory",
    description: "Encoding, storage, retrieval, and memory systems",
    exampleQuestion: "What is the difference between short-term and long-term memory?"
  },
  {
    topics: ["cognitive-psychology"],
    id: "attention",
    displayName: "Attention",
    description: "Selective attention, divided attention, and attention processes",
    exampleQuestion: "What is selective attention?"
  },
  {
    topics: ["cognitive-psychology"],
    id: "thinking-reasoning",
    displayName: "Thinking & Reasoning",
    description: "Problem solving, decision making, and cognitive biases",
    exampleQuestion: "What is confirmation bias?"
  },
  {
    topics: ["cognitive-psychology"],
    id: "language",
    displayName: "Language",
    description: "Language acquisition, processing, and comprehension",
    exampleQuestion: "How do children acquire language?"
  },

  // Psychology - Developmental Psychology
  {
    topics: ["developmental-psychology"],
    id: "child-development",
    displayName: "Child Development",
    description: "Physical, cognitive, and social development in childhood",
    exampleQuestion: "What are Piaget's stages of cognitive development?"
  },
  {
    topics: ["developmental-psychology"],
    id: "adolescent-development",
    displayName: "Adolescent Development",
    description: "Puberty, identity formation, and adolescent challenges",
    exampleQuestion: "What is identity formation in adolescence?"
  },
  {
    topics: ["developmental-psychology"],
    id: "adult-development",
    displayName: "Adult Development",
    description: "Adult stages, aging, and lifespan development",
    exampleQuestion: "What are the stages of adult development?"
  },
  {
    topics: ["developmental-psychology"],
    id: "attachment",
    displayName: "Attachment",
    description: "Attachment theory, bonding, and early relationships",
    exampleQuestion: "What is attachment theory?"
  },

  // Psychology - Social Psychology
  {
    topics: ["social-psychology"],
    id: "social-cognition",
    displayName: "Social Cognition",
    description: "Social perception, attribution, and social thinking",
    exampleQuestion: "What is fundamental attribution error?"
  },
  {
    topics: ["social-psychology"],
    id: "attitudes-persuasion",
    displayName: "Attitudes & Persuasion",
    description: "Attitude formation, change, and persuasive communication",
    exampleQuestion: "What factors influence attitude change?"
  },
  {
    topics: ["social-psychology"],
    id: "group-behavior",
    displayName: "Group Behavior",
    description: "Conformity, obedience, and group dynamics",
    exampleQuestion: "What is conformity?"
  },
  {
    topics: ["social-psychology"],
    id: "interpersonal-relationships",
    displayName: "Interpersonal Relationships",
    description: "Attraction, love, and relationship dynamics",
    exampleQuestion: "What factors influence interpersonal attraction?"
  },

  // Psychology - Clinical Psychology
  {
    topics: ["clinical-psychology"],
    id: "psychological-disorders",
    displayName: "Psychological Disorders",
    description: "Diagnosis, classification, and mental health disorders",
    exampleQuestion: "What is the DSM used for?"
  },
  {
    topics: ["clinical-psychology"],
    id: "psychotherapy",
    displayName: "Psychotherapy",
    description: "Therapeutic approaches, CBT, and treatment methods",
    exampleQuestion: "What is cognitive-behavioral therapy?"
  },
  {
    topics: ["clinical-psychology"],
    id: "assessment",
    displayName: "Psychological Assessment",
    description: "Testing, evaluation, and diagnostic assessment",
    exampleQuestion: "What is psychological assessment?"
  },

  // Psychology - Research Methods
  {
    topics: ["research-methods"],
    id: "experimental-design",
    displayName: "Experimental Design",
    description: "Experiments, control groups, and variables",
    exampleQuestion: "What is the difference between independent and dependent variables?"
  },
  {
    topics: ["research-methods"],
    id: "data-collection",
    displayName: "Data Collection",
    description: "Surveys, observations, and research methods",
    exampleQuestion: "What are the advantages of surveys?"
  },
  {
    topics: ["research-methods"],
    id: "statistical-analysis",
    displayName: "Statistical Analysis",
    description: "Descriptive statistics, inferential statistics, and data analysis",
    exampleQuestion: "What is the difference between descriptive and inferential statistics?"
  },

  // Psychology - Biopsychology
  {
    topics: ["biopsychology"],
    id: "nervous-system",
    displayName: "Nervous System",
    description: "Brain structure, neurons, and neural communication",
    exampleQuestion: "What is the function of neurons?"
  },
  {
    topics: ["biopsychology"],
    id: "brain-function",
    displayName: "Brain Function",
    description: "Brain regions, localization, and brain-behavior relationships",
    exampleQuestion: "What is the function of the frontal lobe?"
  },
  {
    topics: ["biopsychology"],
    id: "neurotransmitters",
    displayName: "Neurotransmitters",
    description: "Chemical messengers, neurotransmitters, and brain chemistry",
    exampleQuestion: "What is the role of neurotransmitters?"
  },

  // Sociology - Social Theory
  {
    topics: ["social-theory"],
    id: "functionalism",
    displayName: "Functionalism",
    description: "Structural functionalism, social systems, and social functions",
    exampleQuestion: "What is functionalism in sociology?"
  },
  {
    topics: ["social-theory"],
    id: "conflict-theory",
    displayName: "Conflict Theory",
    description: "Social conflict, power, and inequality",
    exampleQuestion: "What is conflict theory?"
  },
  {
    topics: ["social-theory"],
    id: "symbolic-interactionism",
    displayName: "Symbolic Interactionism",
    description: "Symbols, meaning, and social interaction",
    exampleQuestion: "What is symbolic interactionism?"
  },

  // Sociology - Research Methods
  {
    topics: ["research-methods"],
    id: "qualitative-research",
    displayName: "Qualitative Research",
    description: "Ethnography, interviews, and qualitative methods",
    exampleQuestion: "What is ethnography?"
  },
  {
    topics: ["research-methods"],
    id: "quantitative-research",
    displayName: "Quantitative Research",
    description: "Surveys, experiments, and statistical analysis",
    exampleQuestion: "What is quantitative research?"
  },
  {
    topics: ["research-methods"],
    id: "research-ethics",
    displayName: "Research Ethics",
    description: "Ethical considerations, informed consent, and research standards",
    exampleQuestion: "What is informed consent?"
  },

  // Sociology - Social Stratification
  {
    topics: ["social-stratification"],
    id: "social-class",
    displayName: "Social Class",
    description: "Class systems, social mobility, and economic inequality",
    exampleQuestion: "What is social stratification?"
  },
  {
    topics: ["social-stratification"],
    id: "race-ethnicity",
    displayName: "Race & Ethnicity",
    description: "Racial and ethnic relations, discrimination, and identity",
    exampleQuestion: "What is the difference between race and ethnicity?"
  },
  {
    topics: ["social-stratification"],
    id: "gender-inequality",
    displayName: "Gender Inequality",
    description: "Gender roles, patriarchy, and gender-based discrimination",
    exampleQuestion: "What is gender stratification?"
  },

  // Sociology - Culture & Society
  {
    topics: ["culture-society"],
    id: "culture",
    displayName: "Culture",
    description: "Cultural norms, values, symbols, and cultural diversity",
    exampleQuestion: "What is culture in sociology?"
  },
  {
    topics: ["culture-society"],
    id: "socialization",
    displayName: "Socialization",
    description: "Social learning, agents of socialization, and identity formation",
    exampleQuestion: "What are the agents of socialization?"
  },
  {
    topics: ["culture-society"],
    id: "deviance",
    displayName: "Deviance",
    description: "Social norms, deviant behavior, and social control",
    exampleQuestion: "What is deviance?"
  },

  // Sociology - Social Institutions
  {
    topics: ["social-institutions"],
    id: "family",
    displayName: "Family",
    description: "Family structures, functions, and family dynamics",
    exampleQuestion: "What are the functions of the family?"
  },
  {
    topics: ["social-institutions"],
    id: "education",
    displayName: "Education",
    description: "Educational systems, functions, and inequality in education",
    exampleQuestion: "What are the functions of education?"
  },
  {
    topics: ["social-institutions"],
    id: "religion",
    displayName: "Religion",
    description: "Religious institutions, functions, and religious diversity",
    exampleQuestion: "What are the functions of religion in society?"
  },
  {
    topics: ["social-institutions"],
    id: "government",
    displayName: "Government",
    description: "Political systems, power, and governance",
    exampleQuestion: "What is the role of government in society?"
  },

  // Sociology - Social Change
  {
    topics: ["social-change"],
    id: "social-movements",
    displayName: "Social Movements",
    description: "Collective action, social change, and movement dynamics",
    exampleQuestion: "What is a social movement?"
  },
  {
    topics: ["social-change"],
    id: "social-change-theories",
    displayName: "Social Change Theories",
    description: "Theories of change, modernization, and social transformation",
    exampleQuestion: "What causes social change?"
  },
  {
    topics: ["social-change"],
    id: "globalization-society",
    displayName: "Globalization & Society",
    description: "Global processes, cultural diffusion, and social impacts",
    exampleQuestion: "How does globalization affect society?"
  },

  // Law - Constitutional Law
  {
    topics: ["constitutional-law"],
    id: "constitutional-principles",
    displayName: "Constitutional Principles",
    description: "Separation of powers, checks and balances, and constitutional structure",
    exampleQuestion: "What is the separation of powers?"
  },
  {
    topics: ["constitutional-law"],
    id: "constitutional-rights",
    displayName: "Constitutional Rights",
    description: "Bill of Rights, civil liberties, and fundamental rights",
    exampleQuestion: "What are civil liberties?"
  },
  {
    topics: ["constitutional-law"],
    id: "judicial-review",
    displayName: "Judicial Review",
    description: "Constitutional interpretation, judicial power, and precedent",
    exampleQuestion: "What is judicial review?"
  },

  // Law - Criminal Law
  {
    topics: ["criminal-law"],
    id: "criminal-elements",
    displayName: "Criminal Elements",
    description: "Actus reus, mens rea, and elements of crimes",
    exampleQuestion: "What is mens rea?"
  },
  {
    topics: ["criminal-law"],
    id: "criminal-defenses",
    displayName: "Criminal Defenses",
    description: "Self-defense, insanity, and affirmative defenses",
    exampleQuestion: "What is an affirmative defense?"
  },
  {
    topics: ["criminal-law"],
    id: "criminal-procedure",
    displayName: "Criminal Procedure",
    description: "Arrest, search and seizure, and due process",
    exampleQuestion: "What is due process?"
  },

  // Law - Civil Law
  {
    topics: ["civil-law"],
    id: "tort-law",
    displayName: "Tort Law",
    description: "Negligence, intentional torts, and liability",
    exampleQuestion: "What is negligence?"
  },
  {
    topics: ["civil-law"],
    id: "civil-procedure",
    displayName: "Civil Procedure",
    description: "Pleadings, discovery, and civil litigation",
    exampleQuestion: "What is discovery in civil procedure?"
  },

  // Law - Contract Law
  {
    topics: ["contract-law"],
    id: "contract-formation",
    displayName: "Contract Formation",
    description: "Offer, acceptance, consideration, and contract elements",
    exampleQuestion: "What are the elements of a valid contract?"
  },
  {
    topics: ["contract-law"],
    id: "contract-breach",
    displayName: "Contract Breach",
    description: "Breach of contract, remedies, and damages",
    exampleQuestion: "What constitutes a breach of contract?"
  },

  // Law - Property Law
  {
    topics: ["property-law"],
    id: "real-property",
    displayName: "Real Property",
    description: "Land ownership, property rights, and real estate law",
    exampleQuestion: "What is real property?"
  },
  {
    topics: ["property-law"],
    id: "intellectual-property",
    displayName: "Intellectual Property",
    description: "Copyright, patents, trademarks, and IP rights",
    exampleQuestion: "What is the difference between copyright and patent?"
  },

  // Law - Legal Research
  {
    topics: ["legal-research"],
    id: "case-law",
    displayName: "Case Law",
    description: "Precedent, case analysis, and legal reasoning",
    exampleQuestion: "What is legal precedent?"
  },
  {
    topics: ["legal-research"],
    id: "statutory-research",
    displayName: "Statutory Research",
    description: "Statutes, regulations, and legislative research",
    exampleQuestion: "What is statutory law?"
  },

  // Political Science - Political Theory
  {
    topics: ["political-theory"],
    id: "democracy",
    displayName: "Democracy",
    description: "Democratic theory, representation, and democratic institutions",
    exampleQuestion: "What are the key principles of democracy?"
  },
  {
    topics: ["political-theory"],
    id: "political-ideologies",
    displayName: "Political Ideologies",
    description: "Liberalism, conservatism, socialism, and political thought",
    exampleQuestion: "What is liberalism?"
  },
  {
    topics: ["political-theory"],
    id: "justice",
    displayName: "Justice",
    description: "Theories of justice, fairness, and distributive justice",
    exampleQuestion: "What is distributive justice?"
  },

  // Political Science - Comparative Politics
  {
    topics: ["comparative-politics"],
    id: "political-systems",
    displayName: "Political Systems",
    description: "Presidential, parliamentary, and hybrid systems",
    exampleQuestion: "What is the difference between presidential and parliamentary systems?"
  },
  {
    topics: ["comparative-politics"],
    id: "electoral-systems",
    displayName: "Electoral Systems",
    description: "Voting systems, proportional representation, and elections",
    exampleQuestion: "What is proportional representation?"
  },

  // Political Science - International Relations
  {
    topics: ["international-relations"],
    id: "international-theory",
    displayName: "International Theory",
    description: "Realism, liberalism, constructivism, and IR theories",
    exampleQuestion: "What is realism in international relations?"
  },
  {
    topics: ["international-relations"],
    id: "international-organizations",
    displayName: "International Organizations",
    description: "UN, NATO, and global governance",
    exampleQuestion: "What is the role of the United Nations?"
  },
  {
    topics: ["international-relations"],
    id: "conflict-resolution",
    displayName: "Conflict Resolution",
    description: "Diplomacy, negotiation, and peace processes",
    exampleQuestion: "What is diplomacy?"
  },

  // Political Science - Public Policy
  {
    topics: ["public-policy"],
    id: "policy-process",
    displayName: "Policy Process",
    description: "Agenda setting, policy formulation, and implementation",
    exampleQuestion: "What are the stages of the policy process?"
  },
  {
    topics: ["public-policy"],
    id: "policy-analysis",
    displayName: "Policy Analysis",
    description: "Policy evaluation, cost-benefit analysis, and policy outcomes",
    exampleQuestion: "What is policy analysis?"
  },

  // Political Science - American Politics
  {
    topics: ["american-politics"],
    id: "congress",
    displayName: "Congress",
    description: "Legislative process, committees, and congressional power",
    exampleQuestion: "How does a bill become a law?"
  },
  {
    topics: ["american-politics"],
    id: "presidency",
    displayName: "Presidency",
    description: "Executive power, presidential roles, and executive branch",
    exampleQuestion: "What are the powers of the president?"
  },
  {
    topics: ["american-politics"],
    id: "political-parties",
    displayName: "Political Parties",
    description: "Party systems, party organization, and party functions",
    exampleQuestion: "What is the role of political parties?"
  },

  // Political Science - Political Methodology
  {
    topics: ["political-methodology"],
    id: "political-research",
    displayName: "Political Research",
    description: "Research design, data collection, and political analysis",
    exampleQuestion: "What is political research?"
  },
  {
    topics: ["political-methodology"],
    id: "quantitative-methods",
    displayName: "Quantitative Methods",
    description: "Statistical analysis, surveys, and quantitative research",
    exampleQuestion: "What are quantitative methods in political science?"
  },

  // Medicine - Anatomy
  {
    topics: ["anatomy"],
    id: "human-anatomy",
    displayName: "Human Anatomy",
    description: "Body systems, organs, and anatomical structures",
    exampleQuestion: "What are the major body systems?"
  },
  {
    topics: ["anatomy"],
    id: "regional-anatomy",
    displayName: "Regional Anatomy",
    description: "Head and neck, thorax, abdomen, and regional structures",
    exampleQuestion: "What is regional anatomy?"
  },

  // Medicine - Physiology
  {
    topics: ["physiology"],
    id: "cellular-physiology",
    displayName: "Cellular Physiology",
    description: "Cell function, metabolism, and cellular processes",
    exampleQuestion: "What is cellular physiology?"
  },
  {
    topics: ["physiology"],
    id: "system-physiology",
    displayName: "System Physiology",
    description: "Cardiovascular, respiratory, and other system functions",
    exampleQuestion: "How does the cardiovascular system work?"
  },

  // Medicine - Pathology
  {
    topics: ["pathology"],
    id: "disease-mechanisms",
    displayName: "Disease Mechanisms",
    description: "Pathogenesis, disease processes, and pathology",
    exampleQuestion: "What is pathogenesis?"
  },
  {
    topics: ["pathology"],
    id: "diagnostic-pathology",
    displayName: "Diagnostic Pathology",
    description: "Disease diagnosis, laboratory tests, and pathology",
    exampleQuestion: "What is diagnostic pathology?"
  },

  // Medicine - Pharmacology
  {
    topics: ["pharmacology"],
    id: "pharmacokinetics",
    displayName: "Pharmacokinetics",
    description: "Drug absorption, distribution, metabolism, and excretion",
    exampleQuestion: "What is pharmacokinetics?"
  },
  {
    topics: ["pharmacology"],
    id: "pharmacodynamics",
    displayName: "Pharmacodynamics",
    description: "Drug action, mechanisms, and drug effects",
    exampleQuestion: "What is pharmacodynamics?"
  },
  {
    topics: ["pharmacology"],
    id: "drug-therapy",
    displayName: "Drug Therapy",
    description: "Therapeutic uses, drug interactions, and treatment",
    exampleQuestion: "What factors influence drug therapy?"
  },

  // Medicine - Clinical Medicine
  {
    topics: ["clinical-medicine"],
    id: "clinical-diagnosis",
    displayName: "Clinical Diagnosis",
    description: "History taking, physical examination, and diagnosis",
    exampleQuestion: "What is the process of clinical diagnosis?"
  },
  {
    topics: ["clinical-medicine"],
    id: "treatment",
    displayName: "Treatment",
    description: "Treatment planning, interventions, and patient care",
    exampleQuestion: "What factors influence treatment decisions?"
  },

  // Medicine - Medical Ethics
  {
    topics: ["medical-ethics"],
    id: "bioethics",
    displayName: "Bioethics",
    description: "Ethical principles, patient autonomy, and medical ethics",
    exampleQuestion: "What is informed consent?"
  },
  {
    topics: ["medical-ethics"],
    id: "medical-decision-making",
    displayName: "Medical Decision Making",
    description: "Ethical dilemmas, end-of-life care, and ethical frameworks",
    exampleQuestion: "What are ethical dilemmas in medicine?"
  },

  // Mechanical Engineering - Materials Science
  {
    topics: ["materials-science"],
    id: "material-properties",
    displayName: "Material Properties",
    description: "Strength, elasticity, and material characteristics",
    exampleQuestion: "What is material strength?"
  },
  {
    topics: ["materials-science"],
    id: "material-selection",
    displayName: "Material Selection",
    description: "Choosing materials, material design, and applications",
    exampleQuestion: "What factors influence material selection?"
  },

  // Mechanical Engineering - Manufacturing
  {
    topics: ["manufacturing"],
    id: "manufacturing-processes",
    displayName: "Manufacturing Processes",
    description: "Machining, casting, and manufacturing methods",
    exampleQuestion: "What are common manufacturing processes?"
  },
  {
    topics: ["manufacturing"],
    id: "quality-control",
    displayName: "Quality Control",
    description: "Quality assurance, inspection, and manufacturing quality",
    exampleQuestion: "What is quality control in manufacturing?"
  },

  // Mechanical Engineering - Machine Design
  {
    topics: ["machine-design"],
    id: "design-process",
    displayName: "Design Process",
    description: "Engineering design, design methodology, and design principles",
    exampleQuestion: "What is the engineering design process?"
  },
  {
    topics: ["machine-design"],
    id: "stress-analysis",
    displayName: "Stress Analysis",
    description: "Stress, strain, and structural analysis",
    exampleQuestion: "What is stress analysis?"
  },

  // Mechanical Engineering - Fluid Mechanics
  {
    topics: ["fluid-mechanics"],
    id: "fluid-dynamics",
    displayName: "Fluid Dynamics",
    description: "Flow, pressure, and fluid behavior",
    exampleQuestion: "What is fluid dynamics?"
  },
  {
    topics: ["fluid-mechanics"],
    id: "thermodynamics-applications",
    displayName: "Thermodynamics Applications",
    description: "Heat transfer, energy systems, and thermal applications",
    exampleQuestion: "What is heat transfer?"
  },

  // Electrical Engineering - Circuits
  {
    topics: ["circuits"],
    id: "circuit-analysis",
    displayName: "Circuit Analysis",
    description: "Ohm's law, Kirchhoff's laws, and circuit theory",
    exampleQuestion: "What is circuit analysis?"
  },
  {
    topics: ["circuits"],
    id: "ac-circuits",
    displayName: "AC Circuits",
    description: "Alternating current, impedance, and AC analysis",
    exampleQuestion: "What is AC current?"
  },

  // Electrical Engineering - Electronics
  {
    topics: ["electronics"],
    id: "semiconductor-devices",
    displayName: "Semiconductor Devices",
    description: "Diodes, transistors, and semiconductor components",
    exampleQuestion: "What is a transistor?"
  },
  {
    topics: ["electronics"],
    id: "electronic-circuits",
    displayName: "Electronic Circuits",
    description: "Amplifiers, filters, and electronic circuit design",
    exampleQuestion: "What is an amplifier?"
  },

  // Electrical Engineering - Power Systems
  {
    topics: ["power-systems"],
    id: "power-generation",
    displayName: "Power Generation",
    description: "Power plants, generators, and power production",
    exampleQuestion: "How is electrical power generated?"
  },
  {
    topics: ["power-systems"],
    id: "power-distribution",
    displayName: "Power Distribution",
    description: "Transmission, distribution, and power grids",
    exampleQuestion: "What is power distribution?"
  },

  // Electrical Engineering - Signal Processing
  {
    topics: ["signal-processing"],
    id: "digital-signal-processing",
    displayName: "Digital Signal Processing",
    description: "Signal analysis, filtering, and digital processing",
    exampleQuestion: "What is digital signal processing?"
  },
  {
    topics: ["signal-processing"],
    id: "fourier-analysis",
    displayName: "Fourier Analysis",
    description: "Frequency domain, transforms, and signal analysis",
    exampleQuestion: "What is Fourier analysis?"
  },

  // Electrical Engineering - Control Systems
  {
    topics: ["control-systems"],
    id: "feedback-control",
    displayName: "Feedback Control",
    description: "Control theory, feedback loops, and system control",
    exampleQuestion: "What is feedback control?"
  },
  {
    topics: ["control-systems"],
    id: "system-stability",
    displayName: "System Stability",
    description: "Stability analysis, control design, and system response",
    exampleQuestion: "What is system stability?"
  },

  // Electrical Engineering - Digital Systems
  {
    topics: ["digital-systems"],
    id: "digital-logic",
    displayName: "Digital Logic",
    description: "Boolean algebra, logic gates, and digital circuits",
    exampleQuestion: "What is digital logic?"
  },
  {
    topics: ["digital-systems"],
    id: "microprocessors",
    displayName: "Microprocessors",
    description: "CPU architecture, microcontrollers, and digital systems",
    exampleQuestion: "What is a microprocessor?"
  },

  // Civil Engineering - Structural Engineering
  {
    topics: ["structural-engineering"],
    id: "structural-analysis",
    displayName: "Structural Analysis",
    description: "Loads, forces, and structural behavior",
    exampleQuestion: "What is structural analysis?"
  },
  {
    topics: ["structural-engineering"],
    id: "structural-design",
    displayName: "Structural Design",
    description: "Design codes, safety factors, and structural design",
    exampleQuestion: "What is structural design?"
  },

  // Civil Engineering - Geotechnical Engineering
  {
    topics: ["geotechnical-engineering"],
    id: "soil-mechanics",
    displayName: "Soil Mechanics",
    description: "Soil properties, soil behavior, and geotechnical analysis",
    exampleQuestion: "What is soil mechanics?"
  },
  {
    topics: ["geotechnical-engineering"],
    id: "foundations",
    displayName: "Foundations",
    description: "Foundation design, bearing capacity, and foundations",
    exampleQuestion: "What is foundation design?"
  },

  // Civil Engineering - Transportation Engineering
  {
    topics: ["transportation-engineering"],
    id: "transportation-planning",
    displayName: "Transportation Planning",
    description: "Traffic flow, transportation systems, and planning",
    exampleQuestion: "What is transportation planning?"
  },
  {
    topics: ["transportation-engineering"],
    id: "highway-design",
    displayName: "Highway Design",
    description: "Road design, geometric design, and highway engineering",
    exampleQuestion: "What is highway design?"
  },

  // Civil Engineering - Water Resources
  {
    topics: ["water-resources"],
    id: "hydrology",
    displayName: "Hydrology",
    description: "Water cycle, water resources, and hydrologic analysis",
    exampleQuestion: "What is hydrology?"
  },
  {
    topics: ["water-resources"],
    id: "water-systems",
    displayName: "Water Systems",
    description: "Water supply, wastewater, and water infrastructure",
    exampleQuestion: "What are water systems?"
  },

  // Civil Engineering - Environmental Engineering
  {
    topics: ["environmental-engineering"],
    id: "water-treatment",
    displayName: "Water Treatment",
    description: "Water quality, treatment processes, and water purification",
    exampleQuestion: "What is water treatment?"
  },
  {
    topics: ["environmental-engineering"],
    id: "waste-management",
    displayName: "Waste Management",
    description: "Solid waste, waste disposal, and environmental protection",
    exampleQuestion: "What is waste management?"
  },

  // Civil Engineering - Construction Management
  {
    topics: ["construction-management"],
    id: "project-management",
    displayName: "Project Management",
    description: "Construction planning, scheduling, and project control",
    exampleQuestion: "What is construction project management?"
  },
  {
    topics: ["construction-management"],
    id: "construction-methods",
    displayName: "Construction Methods",
    description: "Construction techniques, equipment, and construction processes",
    exampleQuestion: "What are construction methods?"
  },

  // Arts & Humanities - Visual Arts
  {
    topics: ["visual-arts"],
    id: "art-techniques",
    displayName: "Art Techniques",
    description: "Drawing, painting, and artistic methods",
    exampleQuestion: "What are basic art techniques?"
  },
  {
    topics: ["visual-arts"],
    id: "art-elements",
    displayName: "Art Elements",
    description: "Line, color, form, and visual elements",
    exampleQuestion: "What are the elements of art?"
  },

  // Arts & Humanities - Performing Arts
  {
    topics: ["performing-arts"],
    id: "theater",
    displayName: "Theater",
    description: "Acting, stagecraft, and theatrical performance",
    exampleQuestion: "What is theater?"
  },
  {
    topics: ["performing-arts"],
    id: "music-performance",
    displayName: "Music Performance",
    description: "Musical performance, composition, and music theory",
    exampleQuestion: "What is music performance?"
  },

  // Arts & Humanities - Art History
  {
    topics: ["art-history"],
    id: "art-movements",
    displayName: "Art Movements",
    description: "Renaissance, modernism, and artistic movements",
    exampleQuestion: "What is the Renaissance?"
  },
  {
    topics: ["art-history"],
    id: "art-criticism",
    displayName: "Art Criticism",
    description: "Art analysis, interpretation, and critical evaluation",
    exampleQuestion: "What is art criticism?"
  },

  // Arts & Humanities - Cultural Studies
  {
    topics: ["cultural-studies"],
    id: "cultural-analysis",
    displayName: "Cultural Analysis",
    description: "Cultural texts, cultural practices, and cultural meaning",
    exampleQuestion: "What is cultural analysis?"
  },
  {
    topics: ["cultural-studies"],
    id: "identity-representation",
    displayName: "Identity & Representation",
    description: "Cultural identity, representation, and cultural politics",
    exampleQuestion: "What is cultural identity?"
  },

  // Arts & Humanities - Creative Writing
  {
    topics: ["creative-writing"],
    id: "narrative-writing",
    displayName: "Narrative Writing",
    description: "Storytelling, plot, and narrative structure",
    exampleQuestion: "What is narrative writing?"
  },
  {
    topics: ["creative-writing"],
    id: "poetry-writing",
    displayName: "Poetry Writing",
    description: "Poetic forms, imagery, and poetic techniques",
    exampleQuestion: "What are poetic techniques?"
  },

  // Arts & Humanities - Critical Theory
  {
    topics: ["critical-theory"],
    id: "literary-criticism",
    displayName: "Literary Criticism",
    description: "Critical approaches, theory, and textual analysis",
    exampleQuestion: "What is literary criticism?"
  },
  {
    topics: ["critical-theory"],
    id: "cultural-theory",
    displayName: "Cultural Theory",
    description: "Cultural studies, theory, and cultural analysis",
    exampleQuestion: "What is cultural theory?"
  },

  // Philosophy - Ethics
  {
    topics: ["ethics"],
    id: "moral-theory",
    displayName: "Moral Theory",
    description: "Utilitarianism, deontology, and ethical theories",
    exampleQuestion: "What is utilitarianism?"
  },
  {
    topics: ["ethics"],
    id: "applied-ethics",
    displayName: "Applied Ethics",
    description: "Bioethics, environmental ethics, and practical ethics",
    exampleQuestion: "What is applied ethics?"
  },

  // Philosophy - Metaphysics
  {
    topics: ["metaphysics"],
    id: "reality",
    displayName: "Reality",
    description: "Ontology, existence, and the nature of reality",
    exampleQuestion: "What is ontology?"
  },
  {
    topics: ["metaphysics"],
    id: "causation",
    displayName: "Causation",
    description: "Causality, determinism, and causal relationships",
    exampleQuestion: "What is causation?"
  },

  // Philosophy - Epistemology
  {
    topics: ["epistemology"],
    id: "knowledge",
    displayName: "Knowledge",
    description: "Knowledge theory, justification, and belief",
    exampleQuestion: "What is knowledge?"
  },
  {
    topics: ["epistemology"],
    id: "skepticism",
    displayName: "Skepticism",
    description: "Doubt, skepticism, and knowledge limits",
    exampleQuestion: "What is skepticism?"
  },

  // Philosophy - Logic
  {
    topics: ["logic"],
    id: "formal-logic",
    displayName: "Formal Logic",
    description: "Propositional logic, predicate logic, and logical systems",
    exampleQuestion: "What is formal logic?"
  },
  {
    topics: ["logic"],
    id: "logical-reasoning",
    displayName: "Logical Reasoning",
    description: "Arguments, validity, and logical inference",
    exampleQuestion: "What is logical reasoning?"
  },

  // Philosophy - Philosophy of Mind
  {
    topics: ["philosophy-of-mind"],
    id: "consciousness",
    displayName: "Consciousness",
    description: "Mind-body problem, consciousness, and mental states",
    exampleQuestion: "What is the mind-body problem?"
  },
  {
    topics: ["philosophy-of-mind"],
    id: "mental-states",
    displayName: "Mental States",
    description: "Intentionality, mental representation, and cognitive states",
    exampleQuestion: "What are mental states?"
  },

  // Philosophy - History of Philosophy
  {
    topics: ["history-of-philosophy"],
    id: "ancient-philosophy",
    displayName: "Ancient Philosophy",
    description: "Greek philosophy, Plato, Aristotle, and ancient thought",
    exampleQuestion: "Who was Plato?"
  },
  {
    topics: ["history-of-philosophy"],
    id: "modern-philosophy",
    displayName: "Modern Philosophy",
    description: "Enlightenment, rationalism, empiricism, and modern thought",
    exampleQuestion: "What is rationalism?"
  },

  // Statistics - Descriptive Statistics
  {
    topics: ["descriptive-statistics"],
    id: "measures-of-central-tendency",
    displayName: "Measures of Central Tendency",
    description: "Mean, median, mode, and central measures",
    exampleQuestion: "What is the mean?"
  },
  {
    topics: ["descriptive-statistics"],
    id: "measures-of-variability",
    displayName: "Measures of Variability",
    description: "Variance, standard deviation, and variability measures",
    exampleQuestion: "What is standard deviation?"
  },
  {
    topics: ["descriptive-statistics"],
    id: "data-visualization",
    displayName: "Data Visualization",
    description: "Graphs, charts, and visual representation of data",
    exampleQuestion: "What is data visualization?"
  },

  // Statistics - Inferential Statistics
  {
    topics: ["inferential-statistics"],
    id: "hypothesis-testing",
    displayName: "Hypothesis Testing",
    description: "Null hypothesis, p-values, and statistical tests",
    exampleQuestion: "What is hypothesis testing?"
  },
  {
    topics: ["inferential-statistics"],
    id: "confidence-intervals",
    displayName: "Confidence Intervals",
    description: "Interval estimation, confidence levels, and estimation",
    exampleQuestion: "What is a confidence interval?"
  },

  // Statistics - Probability
  {
    topics: ["probability"],
    id: "probability-theory",
    displayName: "Probability Theory",
    description: "Probability rules, conditional probability, and probability distributions",
    exampleQuestion: "What is probability?"
  },
  {
    topics: ["probability"],
    id: "random-variables",
    displayName: "Random Variables",
    description: "Discrete and continuous random variables, distributions",
    exampleQuestion: "What is a random variable?"
  },

  // Statistics - Regression Analysis
  {
    topics: ["regression-analysis"],
    id: "linear-regression",
    displayName: "Linear Regression",
    description: "Simple and multiple regression, regression models",
    exampleQuestion: "What is linear regression?"
  },
  {
    topics: ["regression-analysis"],
    id: "regression-diagnostics",
    displayName: "Regression Diagnostics",
    description: "Model assumptions, residuals, and model validation",
    exampleQuestion: "What are regression diagnostics?"
  },

  // Statistics - Experimental Design
  {
    topics: ["experimental-design"],
    id: "experimental-design-principles",
    displayName: "Experimental Design Principles",
    description: "Randomization, replication, and experimental control",
    exampleQuestion: "What is randomization?"
  },
  {
    topics: ["experimental-design"],
    id: "analysis-of-variance",
    displayName: "Analysis of Variance",
    description: "ANOVA, variance analysis, and experimental analysis",
    exampleQuestion: "What is ANOVA?"
  },

  // Statistics - Statistical Modeling
  {
    topics: ["statistical-modeling"],
    id: "model-building",
    displayName: "Model Building",
    description: "Model selection, model fitting, and statistical models",
    exampleQuestion: "What is statistical modeling?"
  },
  {
    topics: ["statistical-modeling"],
    id: "advanced-models",
    displayName: "Advanced Models",
    description: "Generalized linear models, time series, and advanced techniques",
    exampleQuestion: "What are generalized linear models?"
  },

  // Environmental Science - Conservation
  {
    topics: ["conservation"],
    id: "biodiversity",
    displayName: "Biodiversity",
    description: "Species diversity, conservation biology, and biodiversity protection",
    exampleQuestion: "What is biodiversity?"
  },
  {
    topics: ["conservation"],
    id: "conservation-strategies",
    displayName: "Conservation Strategies",
    description: "Protected areas, conservation methods, and preservation",
    exampleQuestion: "What are conservation strategies?"
  },

  // Environmental Science - Climate Science
  {
    topics: ["climate-science"],
    id: "climate-change",
    displayName: "Climate Change",
    description: "Global warming, greenhouse gases, and climate impacts",
    exampleQuestion: "What causes climate change?"
  },
  {
    topics: ["climate-science"],
    id: "climate-systems",
    displayName: "Climate Systems",
    description: "Climate patterns, weather systems, and atmospheric processes",
    exampleQuestion: "What are climate systems?"
  },

  // Environmental Science - Pollution
  {
    topics: ["pollution"],
    id: "air-pollution",
    displayName: "Air Pollution",
    description: "Air quality, pollutants, and air pollution control",
    exampleQuestion: "What causes air pollution?"
  },
  {
    topics: ["pollution"],
    id: "water-pollution",
    displayName: "Water Pollution",
    description: "Water quality, contaminants, and water pollution",
    exampleQuestion: "What is water pollution?"
  },

  // Environmental Science - Sustainability
  {
    topics: ["sustainability"],
    id: "sustainable-development",
    displayName: "Sustainable Development",
    description: "Sustainability principles, sustainable practices, and development",
    exampleQuestion: "What is sustainable development?"
  },
  {
    topics: ["sustainability"],
    id: "renewable-resources",
    displayName: "Renewable Resources",
    description: "Renewable energy, resource management, and sustainability",
    exampleQuestion: "What are renewable resources?"
  },

  // Environmental Science - Environmental Policy
  {
    topics: ["environmental-policy"],
    id: "environmental-regulation",
    displayName: "Environmental Regulation",
    description: "Environmental laws, regulations, and policy",
    exampleQuestion: "What is environmental regulation?"
  },
  {
    topics: ["environmental-policy"],
    id: "environmental-governance",
    displayName: "Environmental Governance",
    description: "Policy making, environmental management, and governance",
    exampleQuestion: "What is environmental governance?"
  },

  // Anthropology - Cultural Anthropology
  {
    topics: ["cultural-anthropology"],
    id: "ethnography",
    displayName: "Ethnography",
    description: "Fieldwork, cultural research, and ethnographic methods",
    exampleQuestion: "What is ethnography?"
  },
  {
    topics: ["cultural-anthropology"],
    id: "cultural-practices",
    displayName: "Cultural Practices",
    description: "Rituals, customs, and cultural behaviors",
    exampleQuestion: "What are cultural practices?"
  },

  // Anthropology - Physical Anthropology
  {
    topics: ["physical-anthropology"],
    id: "human-evolution",
    displayName: "Human Evolution",
    description: "Human origins, evolution, and biological anthropology",
    exampleQuestion: "What is human evolution?"
  },
  {
    topics: ["physical-anthropology"],
    id: "primatology",
    displayName: "Primatology",
    description: "Primate studies, primate behavior, and comparative anatomy",
    exampleQuestion: "What is primatology?"
  },

  // Anthropology - Archaeology
  {
    topics: ["archaeology"],
    id: "archaeological-methods",
    displayName: "Archaeological Methods",
    description: "Excavation, dating methods, and archaeological research",
    exampleQuestion: "What are archaeological methods?"
  },
  {
    topics: ["archaeology"],
    id: "material-culture",
    displayName: "Material Culture",
    description: "Artifacts, material remains, and cultural material",
    exampleQuestion: "What is material culture?"
  },

  // Anthropology - Linguistic Anthropology
  {
    topics: ["linguistic-anthropology"],
    id: "language-culture",
    displayName: "Language & Culture",
    description: "Language and culture relationships, linguistic diversity",
    exampleQuestion: "How does language relate to culture?"
  },
  {
    topics: ["linguistic-anthropology"],
    id: "language-documentation",
    displayName: "Language Documentation",
    description: "Language preservation, documentation, and linguistic research",
    exampleQuestion: "What is language documentation?"
  },

  // Anthropology - Applied Anthropology
  {
    topics: ["applied-anthropology"],
    id: "applied-research",
    displayName: "Applied Research",
    description: "Applied anthropology, practical applications, and problem-solving",
    exampleQuestion: "What is applied anthropology?"
  },
  {
    topics: ["applied-anthropology"],
    id: "development-anthropology",
    displayName: "Development Anthropology",
    description: "Development projects, cultural sensitivity, and applied work",
    exampleQuestion: "What is development anthropology?"
  },

  // Anthropology - Anthropological Theory
  {
    topics: ["anthropological-theory"],
    id: "anthropological-perspectives",
    displayName: "Anthropological Perspectives",
    description: "Theoretical frameworks, cultural theory, and anthropological thought",
    exampleQuestion: "What are anthropological perspectives?"
  },
  {
    topics: ["anthropological-theory"],
    id: "cultural-relativism",
    displayName: "Cultural Relativism",
    description: "Cultural relativism, ethnocentrism, and cultural understanding",
    exampleQuestion: "What is cultural relativism?"
  },

  // Communications - Media Studies
  {
    topics: ["media-studies"],
    id: "media-analysis",
    displayName: "Media Analysis",
    description: "Media content, media effects, and media criticism",
    exampleQuestion: "What is media analysis?"
  },
  {
    topics: ["media-studies"],
    id: "media-literacy",
    displayName: "Media Literacy",
    description: "Critical media consumption, media understanding, and literacy",
    exampleQuestion: "What is media literacy?"
  },

  // Communications - Journalism
  {
    topics: ["journalism"],
    id: "news-writing",
    displayName: "News Writing",
    description: "News reporting, journalistic writing, and news gathering",
    exampleQuestion: "What is news writing?"
  },
  {
    topics: ["journalism"],
    id: "journalistic-ethics",
    displayName: "Journalistic Ethics",
    description: "Media ethics, objectivity, and journalistic standards",
    exampleQuestion: "What are journalistic ethics?"
  },

  // Communications - Public Relations
  {
    topics: ["public-relations"],
    id: "pr-strategy",
    displayName: "PR Strategy",
    description: "Public relations planning, campaigns, and PR management",
    exampleQuestion: "What is PR strategy?"
  },
  {
    topics: ["public-relations"],
    id: "crisis-communication",
    displayName: "Crisis Communication",
    description: "Crisis management, reputation management, and crisis response",
    exampleQuestion: "What is crisis communication?"
  },

  // Communications - Interpersonal Communication
  {
    topics: ["interpersonal-communication"],
    id: "verbal-communication",
    displayName: "Verbal Communication",
    description: "Speaking, listening, and verbal interaction",
    exampleQuestion: "What is verbal communication?"
  },
  {
    topics: ["interpersonal-communication"],
    id: "nonverbal-communication",
    displayName: "Nonverbal Communication",
    description: "Body language, gestures, and nonverbal cues",
    exampleQuestion: "What is nonverbal communication?"
  },

  // Communications - Mass Communication
  {
    topics: ["mass-communication"],
    id: "mass-media",
    displayName: "Mass Media",
    description: "Broadcasting, print media, and mass communication channels",
    exampleQuestion: "What is mass media?"
  },
  {
    topics: ["mass-communication"],
    id: "audience-analysis",
    displayName: "Audience Analysis",
    description: "Audience research, demographics, and audience understanding",
    exampleQuestion: "What is audience analysis?"
  },

  // Communications - Digital Media
  {
    topics: ["digital-media"],
    id: "social-media",
    displayName: "Social Media",
    description: "Social media platforms, digital communication, and online media",
    exampleQuestion: "What is social media?"
  },
  {
    topics: ["digital-media"],
    id: "digital-communication",
    displayName: "Digital Communication",
    description: "Online communication, digital platforms, and digital media",
    exampleQuestion: "What is digital communication?"
  },

  // Education - Pedagogy
  {
    topics: ["pedagogy"],
    id: "teaching-methods",
    displayName: "Teaching Methods",
    description: "Instructional strategies, teaching techniques, and pedagogy",
    exampleQuestion: "What are teaching methods?"
  },
  {
    topics: ["pedagogy"],
    id: "classroom-management",
    displayName: "Classroom Management",
    description: "Classroom organization, discipline, and management strategies",
    exampleQuestion: "What is classroom management?"
  },

  // Education - Curriculum Development
  {
    topics: ["curriculum-development"],
    id: "curriculum-design",
    displayName: "Curriculum Design",
    description: "Curriculum planning, course design, and educational programs",
    exampleQuestion: "What is curriculum design?"
  },
  {
    topics: ["curriculum-development"],
    id: "learning-objectives",
    displayName: "Learning Objectives",
    description: "Learning goals, objectives, and educational outcomes",
    exampleQuestion: "What are learning objectives?"
  },

  // Education - Educational Psychology
  {
    topics: ["educational-psychology"],
    id: "learning-processes",
    displayName: "Learning Processes",
    description: "How students learn, cognitive processes, and learning psychology",
    exampleQuestion: "How do students learn?"
  },
  {
    topics: ["educational-psychology"],
    id: "motivation",
    displayName: "Motivation",
    description: "Student motivation, engagement, and motivational strategies",
    exampleQuestion: "What is student motivation?"
  },

  // Education - Learning Theories
  {
    topics: ["learning-theories"],
    id: "constructivism",
    displayName: "Constructivism",
    description: "Constructivist learning, active learning, and knowledge construction",
    exampleQuestion: "What is constructivism?"
  },
  {
    topics: ["learning-theories"],
    id: "behaviorism",
    displayName: "Behaviorism",
    description: "Behavioral learning, conditioning, and behaviorist approaches",
    exampleQuestion: "What is behaviorism?"
  },

  // Education - Assessment
  {
    topics: ["assessment"],
    id: "formative-assessment",
    displayName: "Formative Assessment",
    description: "Ongoing assessment, feedback, and learning assessment",
    exampleQuestion: "What is formative assessment?"
  },
  {
    topics: ["assessment"],
    id: "summative-assessment",
    displayName: "Summative Assessment",
    description: "Final assessment, testing, and evaluation",
    exampleQuestion: "What is summative assessment?"
  },

  // Education - Educational Policy
  {
    topics: ["educational-policy"],
    id: "education-reform",
    displayName: "Education Reform",
    description: "Policy changes, educational reform, and policy implementation",
    exampleQuestion: "What is education reform?"
  },
  {
    topics: ["educational-policy"],
    id: "educational-equity",
    displayName: "Educational Equity",
    description: "Equity in education, access, and educational equality",
    exampleQuestion: "What is educational equity?"
  },

  // Nursing - Patient Care
  {
    topics: ["patient-care"],
    id: "nursing-process",
    displayName: "Nursing Process",
    description: "Assessment, diagnosis, planning, implementation, and evaluation",
    exampleQuestion: "What is the nursing process?"
  },
  {
    topics: ["patient-care"],
    id: "patient-safety",
    displayName: "Patient Safety",
    description: "Safety protocols, error prevention, and patient protection",
    exampleQuestion: "What is patient safety?"
  },

  // Nursing - Health Assessment
  {
    topics: ["health-assessment"],
    id: "physical-assessment",
    displayName: "Physical Assessment",
    description: "Health examination, assessment techniques, and patient evaluation",
    exampleQuestion: "What is physical assessment?"
  },
  {
    topics: ["health-assessment"],
    id: "health-history",
    displayName: "Health History",
    description: "Patient history, health records, and medical history",
    exampleQuestion: "What is health history?"
  },

  // Nursing - Nursing Theory
  {
    topics: ["nursing-theory"],
    id: "nursing-models",
    displayName: "Nursing Models",
    description: "Nursing frameworks, theoretical models, and nursing concepts",
    exampleQuestion: "What are nursing models?"
  },
  {
    topics: ["nursing-theory"],
    id: "caring-theory",
    displayName: "Caring Theory",
    description: "Caring in nursing, patient-centered care, and nursing philosophy",
    exampleQuestion: "What is caring theory?"
  },

  // Nursing - Clinical Skills
  {
    topics: ["clinical-skills"],
    id: "clinical-procedures",
    displayName: "Clinical Procedures",
    description: "Nursing procedures, clinical skills, and technical competencies",
    exampleQuestion: "What are clinical procedures?"
  },
  {
    topics: ["clinical-skills"],
    id: "medication-administration",
    displayName: "Medication Administration",
    description: "Medication safety, drug administration, and pharmacology",
    exampleQuestion: "What is medication administration?"
  },

  // Nursing - Community Health
  {
    topics: ["community-health"],
    id: "public-health-nursing",
    displayName: "Public Health Nursing",
    description: "Community health, population health, and public health",
    exampleQuestion: "What is public health nursing?"
  },
  {
    topics: ["community-health"],
    id: "health-promotion",
    displayName: "Health Promotion",
    description: "Health education, prevention, and health promotion",
    exampleQuestion: "What is health promotion?"
  },

  // Nursing - Pharmacology
  {
    topics: ["pharmacology"],
    id: "pharmacology-principles",
    displayName: "Pharmacology Principles",
    description: "Drug actions, pharmacokinetics, and pharmacodynamics",
    exampleQuestion: "What are pharmacology principles?"
  },
  {
    topics: ["pharmacology"],
    id: "drug-classifications",
    displayName: "Drug Classifications",
    description: "Drug categories, drug classes, and medication types",
    exampleQuestion: "What are drug classifications?"
  },

  // Linguistics - Phonetics & Phonology
  {
    topics: ["phonetics-phonology"],
    id: "phonetics",
    displayName: "Phonetics",
    description: "Speech sounds, articulation, and phonetic analysis",
    exampleQuestion: "What is phonetics?"
  },
  {
    topics: ["phonetics-phonology"],
    id: "phonology",
    displayName: "Phonology",
    description: "Sound systems, phonemes, and phonological rules",
    exampleQuestion: "What is phonology?"
  },

  // Linguistics - Syntax
  {
    topics: ["syntax"],
    id: "sentence-structure",
    displayName: "Sentence Structure",
    description: "Grammar, sentence formation, and syntactic analysis",
    exampleQuestion: "What is syntax?"
  },
  {
    topics: ["syntax"],
    id: "grammatical-theory",
    displayName: "Grammatical Theory",
    description: "Grammatical rules, syntax theory, and linguistic structure",
    exampleQuestion: "What is grammatical theory?"
  },

  // Linguistics - Semantics
  {
    topics: ["semantics"],
    id: "meaning",
    displayName: "Meaning",
    description: "Word meaning, sentence meaning, and semantic analysis",
    exampleQuestion: "What is semantics?"
  },
  {
    topics: ["semantics"],
    id: "pragmatics",
    displayName: "Pragmatics",
    description: "Language use, context, and pragmatic meaning",
    exampleQuestion: "What is pragmatics?"
  },

  // Linguistics - Sociolinguistics
  {
    topics: ["sociolinguistics"],
    id: "language-variation",
    displayName: "Language Variation",
    description: "Dialects, language variation, and sociolinguistic patterns",
    exampleQuestion: "What is language variation?"
  },
  {
    topics: ["sociolinguistics"],
    id: "language-society",
    displayName: "Language & Society",
    description: "Language and social factors, language attitudes",
    exampleQuestion: "How does language relate to society?"
  },

  // Linguistics - Psycholinguistics
  {
    topics: ["psycholinguistics"],
    id: "language-processing",
    displayName: "Language Processing",
    description: "Language comprehension, production, and cognitive processing",
    exampleQuestion: "What is language processing?"
  },
  {
    topics: ["psycholinguistics"],
    id: "language-acquisition",
    displayName: "Language Acquisition",
    description: "First language acquisition, learning, and development",
    exampleQuestion: "What is language acquisition?"
  },

  // Linguistics - Historical Linguistics
  {
    topics: ["historical-linguistics"],
    id: "language-change",
    displayName: "Language Change",
    description: "Language evolution, historical change, and language development",
    exampleQuestion: "What is language change?"
  },
  {
    topics: ["historical-linguistics"],
    id: "language-families",
    displayName: "Language Families",
    description: "Language relationships, language families, and historical linguistics",
    exampleQuestion: "What are language families?"
  },

  // Architecture - Architectural Design
  {
    topics: ["architectural-design"],
    id: "design-process",
    displayName: "Design Process",
    description: "Architectural design, design methodology, and design thinking",
    exampleQuestion: "What is the architectural design process?"
  },
  {
    topics: ["architectural-design"],
    id: "spatial-design",
    displayName: "Spatial Design",
    description: "Space planning, spatial relationships, and design",
    exampleQuestion: "What is spatial design?"
  },

  // Architecture - Building Systems
  {
    topics: ["building-systems"],
    id: "structural-systems",
    displayName: "Structural Systems",
    description: "Building structure, structural design, and load-bearing systems",
    exampleQuestion: "What are structural systems?"
  },
  {
    topics: ["building-systems"],
    id: "mechanical-systems",
    displayName: "Mechanical Systems",
    description: "HVAC, building services, and mechanical systems",
    exampleQuestion: "What are mechanical systems?"
  },

  // Architecture - Construction Methods
  {
    topics: ["construction-methods"],
    id: "construction-techniques",
    displayName: "Construction Techniques",
    description: "Building methods, construction processes, and techniques",
    exampleQuestion: "What are construction techniques?"
  },
  {
    topics: ["construction-methods"],
    id: "building-materials",
    displayName: "Building Materials",
    description: "Construction materials, material properties, and material selection",
    exampleQuestion: "What are building materials?"
  },

  // Architecture - Architectural History
  {
    topics: ["architectural-history"],
    id: "architectural-styles",
    displayName: "Architectural Styles",
    description: "Historical styles, architectural movements, and style analysis",
    exampleQuestion: "What are architectural styles?"
  },
  {
    topics: ["architectural-history"],
    id: "architectural-preservation",
    displayName: "Architectural Preservation",
    description: "Historic preservation, conservation, and restoration",
    exampleQuestion: "What is architectural preservation?"
  },

  // Architecture - Urban Planning
  {
    topics: ["urban-planning"],
    id: "urban-design",
    displayName: "Urban Design",
    description: "City planning, urban form, and urban design principles",
    exampleQuestion: "What is urban design?"
  },
  {
    topics: ["urban-planning"],
    id: "land-use-planning",
    displayName: "Land Use Planning",
    description: "Zoning, land use, and planning regulations",
    exampleQuestion: "What is land use planning?"
  },

  // Architecture - Sustainable Design
  {
    topics: ["sustainable-design"],
    id: "green-building",
    displayName: "Green Building",
    description: "Sustainable architecture, green design, and environmental design",
    exampleQuestion: "What is green building?"
  },
  {
    topics: ["sustainable-design"],
    id: "energy-efficiency",
    displayName: "Energy Efficiency",
    description: "Energy-efficient design, passive design, and sustainability",
    exampleQuestion: "What is energy efficiency in architecture?"
  },

  // Finance - Corporate Finance
  {
    topics: ["corporate-finance"],
    id: "capital-budgeting",
    displayName: "Capital Budgeting",
    description: "Investment decisions, NPV, IRR, and capital allocation",
    exampleQuestion: "What is capital budgeting?"
  },
  {
    topics: ["corporate-finance"],
    id: "capital-structure",
    displayName: "Capital Structure",
    description: "Debt, equity, financing decisions, and capital structure",
    exampleQuestion: "What is capital structure?"
  },
  {
    topics: ["corporate-finance"],
    id: "working-capital",
    displayName: "Working Capital",
    description: "Cash management, working capital management, and liquidity",
    exampleQuestion: "What is working capital?"
  },

  // Finance - Investments
  {
    topics: ["investments"],
    id: "portfolio-theory",
    displayName: "Portfolio Theory",
    description: "Diversification, portfolio management, and risk-return",
    exampleQuestion: "What is portfolio theory?"
  },
  {
    topics: ["investments"],
    id: "asset-valuation",
    displayName: "Asset Valuation",
    description: "Valuation methods, asset pricing, and investment analysis",
    exampleQuestion: "What is asset valuation?"
  },
  {
    topics: ["investments"],
    id: "securities-analysis",
    displayName: "Securities Analysis",
    description: "Stock analysis, bond analysis, and security evaluation",
    exampleQuestion: "What is securities analysis?"
  },

  // Finance - Financial Markets
  {
    topics: ["financial-markets"],
    id: "market-structure",
    displayName: "Market Structure",
    description: "Market types, market efficiency, and market organization",
    exampleQuestion: "What is market structure?"
  },
  {
    topics: ["financial-markets"],
    id: "market-participants",
    displayName: "Market Participants",
    description: "Investors, traders, and market players",
    exampleQuestion: "Who are market participants?"
  },

  // Finance - Risk Management
  {
    topics: ["risk-management"],
    id: "risk-assessment",
    displayName: "Risk Assessment",
    description: "Risk identification, risk measurement, and risk analysis",
    exampleQuestion: "What is risk assessment?"
  },
  {
    topics: ["risk-management"],
    id: "hedging",
    displayName: "Hedging",
    description: "Risk hedging, derivatives, and risk mitigation",
    exampleQuestion: "What is hedging?"
  },

  // Finance - Banking
  {
    topics: ["banking"],
    id: "banking-operations",
    displayName: "Banking Operations",
    description: "Bank functions, banking services, and bank operations",
    exampleQuestion: "What are banking operations?"
  },
  {
    topics: ["banking"],
    id: "credit-analysis",
    displayName: "Credit Analysis",
    description: "Credit evaluation, lending, and credit risk",
    exampleQuestion: "What is credit analysis?"
  },

  // Finance - Personal Finance
  {
    topics: ["personal-finance"],
    id: "financial-planning",
    displayName: "Financial Planning",
    description: "Personal financial planning, budgeting, and financial goals",
    exampleQuestion: "What is financial planning?"
  },
  {
    topics: ["personal-finance"],
    id: "retirement-planning",
    displayName: "Retirement Planning",
    description: "Retirement savings, pension planning, and retirement strategies",
    exampleQuestion: "What is retirement planning?"
  },

  // Marketing - Market Research
  {
    topics: ["market-research"],
    id: "research-methods",
    displayName: "Research Methods",
    description: "Surveys, focus groups, and market research techniques",
    exampleQuestion: "What are market research methods?"
  },
  {
    topics: ["market-research"],
    id: "data-analysis",
    displayName: "Data Analysis",
    description: "Market data analysis, research findings, and insights",
    exampleQuestion: "What is market data analysis?"
  },

  // Marketing - Consumer Behavior
  {
    topics: ["consumer-behavior"],
    id: "buying-process",
    displayName: "Buying Process",
    description: "Consumer decision making, purchase process, and buying behavior",
    exampleQuestion: "What is the consumer buying process?"
  },
  {
    topics: ["consumer-behavior"],
    id: "consumer-motivation",
    displayName: "Consumer Motivation",
    description: "Consumer needs, wants, and motivations",
    exampleQuestion: "What motivates consumers?"
  },

  // Marketing - Advertising
  {
    topics: ["advertising"],
    id: "advertising-strategy",
    displayName: "Advertising Strategy",
    description: "Campaign planning, media selection, and advertising",
    exampleQuestion: "What is advertising strategy?"
  },
  {
    topics: ["advertising"],
    id: "creative-development",
    displayName: "Creative Development",
    description: "Creative concepts, ad development, and creative strategy",
    exampleQuestion: "What is creative development?"
  },

  // Marketing - Branding
  {
    topics: ["branding"],
    id: "brand-identity",
    displayName: "Brand Identity",
    description: "Brand positioning, brand image, and brand development",
    exampleQuestion: "What is brand identity?"
  },
  {
    topics: ["branding"],
    id: "brand-management",
    displayName: "Brand Management",
    description: "Brand strategy, brand equity, and brand management",
    exampleQuestion: "What is brand management?"
  },

  // Marketing - Digital Marketing
  {
    topics: ["digital-marketing"],
    id: "online-marketing",
    displayName: "Online Marketing",
    description: "Digital channels, online advertising, and digital strategies",
    exampleQuestion: "What is online marketing?"
  },
  {
    topics: ["digital-marketing"],
    id: "social-media-marketing",
    displayName: "Social Media Marketing",
    description: "Social media strategies, social platforms, and social marketing",
    exampleQuestion: "What is social media marketing?"
  },

  // Marketing - Strategic Marketing
  {
    topics: ["strategic-marketing"],
    id: "marketing-strategy",
    displayName: "Marketing Strategy",
    description: "Strategic planning, marketing plans, and strategy development",
    exampleQuestion: "What is marketing strategy?"
  },
  {
    topics: ["strategic-marketing"],
    id: "marketing-mix",
    displayName: "Marketing Mix",
    description: "4Ps, product, price, place, promotion, and marketing mix",
    exampleQuestion: "What is the marketing mix?"
  },

  // Public Health - Epidemiology
  {
    topics: ["epidemiology"],
    id: "disease-surveillance",
    displayName: "Disease Surveillance",
    description: "Disease tracking, monitoring, and surveillance systems",
    exampleQuestion: "What is disease surveillance?"
  },
  {
    topics: ["epidemiology"],
    id: "outbreak-investigation",
    displayName: "Outbreak Investigation",
    description: "Disease outbreaks, investigation methods, and epidemiology",
    exampleQuestion: "What is outbreak investigation?"
  },

  // Public Health - Health Policy
  {
    topics: ["health-policy"],
    id: "health-systems",
    displayName: "Health Systems",
    description: "Healthcare systems, health policy, and system organization",
    exampleQuestion: "What are health systems?"
  },
  {
    topics: ["health-policy"],
    id: "healthcare-financing",
    displayName: "Healthcare Financing",
    description: "Health insurance, healthcare costs, and financing",
    exampleQuestion: "What is healthcare financing?"
  },

  // Public Health - Health Promotion
  {
    topics: ["health-promotion"],
    id: "health-education",
    displayName: "Health Education",
    description: "Health literacy, education programs, and health communication",
    exampleQuestion: "What is health education?"
  },
  {
    topics: ["health-promotion"],
    id: "behavior-change",
    displayName: "Behavior Change",
    description: "Health behavior, behavior modification, and health promotion",
    exampleQuestion: "What is behavior change?"
  },

  // Public Health - Disease Prevention
  {
    topics: ["disease-prevention"],
    id: "preventive-measures",
    displayName: "Preventive Measures",
    description: "Prevention strategies, vaccination, and preventive care",
    exampleQuestion: "What are preventive measures?"
  },
  {
    topics: ["disease-prevention"],
    id: "screening-programs",
    displayName: "Screening Programs",
    description: "Health screening, early detection, and screening programs",
    exampleQuestion: "What are screening programs?"
  },

  // Public Health - Environmental Health
  {
    topics: ["environmental-health"],
    id: "environmental-hazards",
    displayName: "Environmental Hazards",
    description: "Environmental risks, hazards, and health impacts",
    exampleQuestion: "What are environmental hazards?"
  },
  {
    topics: ["environmental-health"],
    id: "environmental-protection",
    displayName: "Environmental Protection",
    description: "Environmental regulations, protection, and public health",
    exampleQuestion: "What is environmental protection?"
  },

  // Public Health - Global Health
  {
    topics: ["global-health"],
    id: "global-health-issues",
    displayName: "Global Health Issues",
    description: "International health, global health challenges, and health equity",
    exampleQuestion: "What are global health issues?"
  },
  {
    topics: ["global-health"],
    id: "health-disparities",
    displayName: "Health Disparities",
    description: "Health inequalities, disparities, and health equity",
    exampleQuestion: "What are health disparities?"
  },

  // Data Science - Data Analysis
  {
    topics: ["data-analysis"],
    id: "exploratory-data-analysis",
    displayName: "Exploratory Data Analysis",
    description: "EDA, data exploration, and initial data analysis",
    exampleQuestion: "What is exploratory data analysis?"
  },
  {
    topics: ["data-analysis"],
    id: "data-cleaning",
    displayName: "Data Cleaning",
    description: "Data preprocessing, data quality, and data preparation",
    exampleQuestion: "What is data cleaning?"
  },

  // Data Science - Machine Learning
  {
    topics: ["machine-learning"],
    id: "supervised-learning",
    displayName: "Supervised Learning",
    description: "Classification, regression, and supervised algorithms",
    exampleQuestion: "What is supervised learning?"
  },
  {
    topics: ["machine-learning"],
    id: "unsupervised-learning",
    displayName: "Unsupervised Learning",
    description: "Clustering, dimensionality reduction, and unsupervised methods",
    exampleQuestion: "What is unsupervised learning?"
  },
  {
    topics: ["machine-learning"],
    id: "model-evaluation",
    displayName: "Model Evaluation",
    description: "Model performance, validation, and evaluation metrics",
    exampleQuestion: "What is model evaluation?"
  },

  // Data Science - Data Visualization
  {
    topics: ["data-visualization"],
    id: "visualization-techniques",
    displayName: "Visualization Techniques",
    description: "Charts, graphs, and data visualization methods",
    exampleQuestion: "What are visualization techniques?"
  },
  {
    topics: ["data-visualization"],
    id: "interactive-visualization",
    displayName: "Interactive Visualization",
    description: "Interactive dashboards, dynamic visualizations, and tools",
    exampleQuestion: "What is interactive visualization?"
  },

  // Data Science - Big Data
  {
    topics: ["big-data"],
    id: "big-data-technologies",
    displayName: "Big Data Technologies",
    description: "Hadoop, Spark, and big data platforms",
    exampleQuestion: "What are big data technologies?"
  },
  {
    topics: ["big-data"],
    id: "distributed-computing",
    displayName: "Distributed Computing",
    description: "Distributed systems, parallel processing, and scalability",
    exampleQuestion: "What is distributed computing?"
  },

  // Data Science - Data Engineering
  {
    topics: ["data-engineering"],
    id: "data-pipelines",
    displayName: "Data Pipelines",
    description: "ETL processes, data pipelines, and data flow",
    exampleQuestion: "What are data pipelines?"
  },
  {
    topics: ["data-engineering"],
    id: "data-warehousing",
    displayName: "Data Warehousing",
    description: "Data warehouses, data storage, and data architecture",
    exampleQuestion: "What is data warehousing?"
  },

  // Data Science - Statistical Modeling
  {
    topics: ["statistical-modeling"],
    id: "predictive-modeling",
    displayName: "Predictive Modeling",
    description: "Prediction models, forecasting, and predictive analytics",
    exampleQuestion: "What is predictive modeling?"
  },
  {
    topics: ["statistical-modeling"],
    id: "model-selection",
    displayName: "Model Selection",
    description: "Model comparison, selection criteria, and model choice",
    exampleQuestion: "What is model selection?"
  },
  // Travel and Tourism - Introduction to Travel & Tourism (intro-travel-tourism)
  {
    topics: ["intro-travel-tourism"],
    id: "tt-definition-scope",
    displayName: "Definition & Scope of Tourism",
    description: "Understand how travel and tourism are defined and the main sectors that make up the industry.",
    exampleQuestion: "Explain the difference between travel and tourism and name three key sectors of the tourism industry."
  },
  {
    topics: ["intro-travel-tourism"],
    id: "tt-history-types",
    displayName: "History & Types of Tourism",
    description: "Trace the development of modern tourism and distinguish major types such as leisure, business, and adventure travel.",
    exampleQuestion: "Describe two major milestones in the history of tourism and give examples of leisure and business tourism."
  },

  // Travel and Tourism - Tourism Management (tourism-management)
  {
    topics: ["tourism-management"],
    id: "tt-destination-management",
    displayName: "Destination Management",
    description: "Understand how destinations are planned, developed, and managed to attract and satisfy visitors.",
    exampleQuestion: "What is destination management and why is it important for maintaining a competitive tourism offering?"
  },
  {
    topics: ["tourism-management"],
    id: "tt-sustainable-tourism",
    displayName: "Sustainable Tourism Practices",
    description: "Apply sustainability principles to reduce negative environmental and social impacts of tourism.",
    exampleQuestion: "Give two examples of sustainable tourism practices a destination could implement."
  },

  // Travel and Tourism - Hospitality Operations (hospitality-operations)
  {
    topics: ["hospitality-operations"],
    id: "tt-hotel-operations-basics",
    displayName: "Hotel Operations Basics",
    description: "Identify core hotel departments and how they work together to deliver guest experiences.",
    exampleQuestion: "Name three key hotel departments and briefly describe the role of each."
  },
  {
    topics: ["hospitality-operations"],
    id: "tt-customer-service-hospitality",
    displayName: "Customer Service in Hospitality",
    description: "Use service standards and communication skills to handle guest interactions professionally.",
    exampleQuestion: "Describe two techniques staff can use to handle a guest complaint effectively."
  },

  // Travel and Tourism - Travel Agency & Tour Operations (travel-agency-operations)
  {
    topics: ["travel-agency-operations"],
    id: "tt-role-travel-agency",
    displayName: "Role of Travel Agencies",
    description: "Explain the functions of travel agencies in advising clients and arranging travel services.",
    exampleQuestion: "What are two key services a travel agency provides to individual travelers?"
  },
  {
    topics: ["travel-agency-operations"],
    id: "tt-tour-itinerary-design",
    displayName: "Tour Itinerary Design",
    description: "Design basic tour itineraries that balance logistics, cost, and customer experience.",
    exampleQuestion: "Outline a two-day city tour itinerary including transport, accommodation, and key attractions."
  },

  // Travel and Tourism - Transportation in Tourism (tourism-transportation)
  {
    topics: ["tourism-transportation"],
    id: "tt-transport-modes",
    displayName: "Modes of Transport in Tourism",
    description: "Compare major transport modes used in tourism and their advantages and limitations.",
    exampleQuestion: "Compare air and rail travel for tourists in terms of speed, cost, and convenience."
  },
  {
    topics: ["tourism-transportation"],
    id: "tt-transport-logistics",
    displayName: "Transport Logistics & Connectivity",
    description: "Understand how connectivity, scheduling, and logistics affect tourist flows and experiences.",
    exampleQuestion: "How can poor transport connectivity negatively affect a destination’s tourism industry?"
  },

  // Travel and Tourism - Cultural & Heritage Tourism (cultural-heritage-tourism)
  {
    topics: ["cultural-heritage-tourism"],
    id: "tt-cultural-heritage-concepts",
    displayName: "Cultural Heritage Concepts",
    description: "Recognize different forms of cultural and heritage assets and why they attract tourists.",
    exampleQuestion: "Give two examples of cultural or heritage attractions and explain why tourists visit them."
  },
  {
    topics: ["cultural-heritage-tourism"],
    id: "tt-preservation-vs-access",
    displayName: "Preservation vs Tourist Access",
    description: "Balance visitor access with the need to protect cultural and heritage sites.",
    exampleQuestion: "Describe one challenge of allowing tourists to visit fragile heritage sites and a strategy to mitigate it."
  },
];

