export const ALLOWED_ACTIVITIES = [
  "running",
  "gym",
  "football",
  "basketball",
  "tennis",
  "swimming",
];

export const cleanActivities = (activities) => {
  if (!Array.isArray(activities)) {
    return [];
  }

  const cleaned = activities
    .filter((activity) => typeof activity === "string")
    .map((activity) => activity.trim().toLowerCase())
    .filter((activity) => ALLOWED_ACTIVITIES.includes(activity));

  return [...new Set(cleaned)];
};