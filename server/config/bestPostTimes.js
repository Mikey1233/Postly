// Default best-post-time suggestions, surfaced in the Composer's schedule picker.
// User can override these in Settings (future stage). Times are local — the
// frontend converts them to UTC when scheduling.
module.exports = {
  linkedin: [
    { label: 'Tue–Thu 8am',  days: [2, 3, 4],       hour: 8,  minute: 0 },
    { label: 'Tue–Thu 12pm', days: [2, 3, 4],       hour: 12, minute: 0 },
  ],
  x: [
    { label: 'Weekdays 9am', days: [1, 2, 3, 4, 5], hour: 9,  minute: 0 },
    { label: 'Weekdays 5pm', days: [1, 2, 3, 4, 5], hour: 17, minute: 0 },
  ],
  facebook: [
    { label: 'Wed 11am', days: [3], hour: 11, minute: 0 },
    { label: 'Fri 1pm',  days: [5], hour: 13, minute: 0 },
  ],
  // Reddit's best time depends on the target subreddit — fetched dynamically.
  reddit: 'subreddit-metadata',
};
