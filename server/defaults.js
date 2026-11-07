// What the site says today. Used to fill the database the first time the server runs.

export const DEFAULT_CONTENT = {
  settings: {
    base: 'Dolor Sit',
    from: 'Amet Consectetur',
    openTo: 'Lorem ipsum dolor sit amet, consectetur adipiscing',
    availability: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor',
    social: {
      linkedin: '',
      github: '',
      instagram: '',
      x: '',
    },
  },
  home: {
    role: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    statement: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    hot: 'ipsum, tempor, veniam',
  },
  about: {
    lede: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    specs: [
      {
        key: 'role',
        value: 'Lorem ipsum dolor sit amet',
      },
      {
        key: 'focus',
        value: 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt',
      },
      {
        key: 'based in',
        value: 'Dolor Sit',
      },
      {
        key: 'from',
        value: 'Amet Consectetur',
      },
      {
        key: 'languages',
        value: 'Lorem ipsum, dolor sit amet, consectetur adipiscing',
      },
      {
        key: 'off hours',
        value: 'Ut enim ad minim veniam, quis nostrud exercitation',
      },
    ],
    experience: [
      {
        title: 'Lorem Ipsum Dolor',
        company: 'Sit Amet Consectetur, Inc',
        period: '2022-02 → 2025-06',
        length: '3 yr 5 mo',
        place: 'Remote',
        bullets: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
          'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
          'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
          'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
        ],
      },
      {
        title: 'Adipiscing Elit Sed',
        company: 'Eiusmod Tempor LLC',
        period: '2019-06 → 2022-01',
        length: '2 yr 8 mo',
        place: 'On site',
        bullets: [
          'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.',
          'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.',
          'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.',
          'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.',
          'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.',
        ],
      },
    ],
    skills: [
      {
        name: 'Lorem',
        items: ['Ipsum', 'Dolor', 'Sit', 'Amet', 'Elit'],
      },
      {
        name: 'Consectetur',
        items: ['Adipiscing'],
      },
      {
        name: 'Eiusmod',
        items: ['Tempor', 'Incididunt', 'Labore'],
      },
      {
        name: 'Dolore',
        items: ['Magna Aliqua'],
      },
      {
        name: 'Veniam',
        items: ['Quis Nostrud', 'Exercitation'],
      },
      {
        name: 'Ullamco',
        items: ['Laboris nisi ut aliquip ex ea commodo, Certified Lorem/Ipsum'],
      },
    ],
    education: [
      {
        years: '2015 → 2019',
        school: 'Lorem Ipsum University',
        degree: 'B.A. in Lorem Ipsum Dolor',
      },
    ],
  },
};

// The nine illustrated frames. `art` on the public site matches a frame's title to its drawing.
export const DEFAULT_FRAMES = [
  { title: 'Lorem Ipsum', place: 'Dolor Sit', time: 'Amet', tag: 'Lorem', ratio: [4, 5], seed: 11 },
  { title: 'Dolor Sit Amet', place: 'Consectetur', time: 'Adipiscing', tag: 'Ipsum', ratio: [3, 2], seed: 23 },
  { title: 'Consectetur Elit', place: 'Sed Eiusmod', time: 'Tempor', tag: 'Dolor', ratio: [2, 3], seed: 37 },
  { title: 'Sed Eiusmod', place: 'Incididunt', time: 'Ut labore', tag: 'Amet', ratio: [3, 4], seed: 41 },
  { title: 'Tempor Incididunt', place: 'Dolore Magna', time: 'Aliqua', tag: 'Dolor', ratio: [4, 3], seed: 53 },
  { title: 'Ut Enim Minim', place: 'Veniam Quis', time: 'Nostrud', tag: 'Lorem', ratio: [16, 9], seed: 61 },
  { title: 'Exercitation Ullamco', place: 'Laboris Nisi', time: 'Aliquip', tag: 'Amet', ratio: [1, 1], seed: 71 },
  { title: 'Commodo Consequat', place: 'Duis Aute', time: 'Irure Dolor', tag: 'Lorem', ratio: [5, 4], seed: 83 },
  { title: 'Reprehenderit Velit', place: 'Esse Cillum', time: 'Fugiat Nulla', tag: 'Ipsum', ratio: [4, 5], seed: 97 },
];

export const ART_KEYS = DEFAULT_FRAMES.map((f) => f.title);
