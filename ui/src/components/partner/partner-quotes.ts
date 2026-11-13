export interface Quote {
  text: string;
  attribution: string;
}

export const PARTNER_QUOTES: Quote[] = [
  {
    text: 'I would like to express my sincere appreciation for your product. I truly hope more people will have the opportunity to discover and use it.',
    attribution: 'A.N, high school student',
  },
  {
    text: 'The quizzes are honestly really helpful and made me master my work as well as the flashcards. The questions were excellent and aligned with the work i uploaded.',
    attribution: 'A.M, undergraduate',
  },
  {
    text: 'Curio helped me with understanding concepts as well as applying my knowledge on the topic. I\'d definitely keep using it in the future.',
    attribution: 'L.D, working professional',
  },
  {
    text: 'Over the past exam season, Curio became one of the most valuable tools in my entire study process. I used it consistently for all four of my modules, and it genuinely transformed the way I revise, understand, and interact with my learning material.',
    attribution: 'F.M, undergraduate student',
  },
  {
    text: 'I really appreciate and enjoyed the engagement and the proper explanation that I got from the platform. I liked the fact that the platform teaches you and ensures that you understand.',
    attribution: 'J.T, postgraduate',
  },
  {
    text: 'I love that it can make test for me and it can make flashcards so I can remember that what I like so far',
    attribution: 'S.P, undergraduate',
  },
  {
    text: 'Curio has significantly improved my understanding by prompting insightful questions that guide my thinking and help me structure my approach.',
    attribution: 'A.S, working professional',
  },
];

export function getRandomQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * PARTNER_QUOTES.length);
  return PARTNER_QUOTES[randomIndex];
}

