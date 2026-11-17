const getIndiaDayBounds = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const start = new Date(`${values.year}-${values.month}-${values.day}T00:00:00+05:30`);

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000)
  };
};

module.exports = { getIndiaDayBounds };
