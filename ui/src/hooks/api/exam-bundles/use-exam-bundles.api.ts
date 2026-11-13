const examBundles = [
  // {
  //   code: 'sat-math',
  //   title: 'SAT Math',
  // },
  {
    code: 'sat-reading-writing',
    title: 'SAT Reading & Writing',
  },
];

export const useExamBundlesApi = () => {
  return {
    examBundles,
    isLoading: false,
  };
};