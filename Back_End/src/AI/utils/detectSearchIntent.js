
const activityKeywords = {
  running: [
    "running",
    "run",
    "jogging",
    "jog",
    "marathon",
  ],

  gym: [
    "gym",
    "workout",
    "work out",
    "training",
  ],

  football: [
    "football",
    "soccer",
  ],

  basketball: [
    "basketball",
  ],

  tennis: [
    "tennis",
  ],

  swimming: [
    "swimming",
    "swim",
  ],
};

const detectActivity = (query) => {
  const normalizedQuery = query.toLowerCase();

  for (const [activity, keywords] of Object.entries(activityKeywords)) {
    if (
      keywords.some((keyword) =>
        normalizedQuery.includes(keyword)
      )
    ) {
      return activity;
    }
  }

  return null;
};

export default detectActivity;
