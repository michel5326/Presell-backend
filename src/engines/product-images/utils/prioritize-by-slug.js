function prioritizeBySlug(images = [], slug = '') {
  if (!slug) return images;

  const lowerSlug = slug.toLowerCase();

  const withSlug = [];
  const withoutSlug = [];

  for (const img of images) {
    if (img.toLowerCase().includes(lowerSlug)) {
      withSlug.push(img);
    } else {
      withoutSlug.push(img);
    }
  }

  return [...withSlug, ...withoutSlug];
}

module.exports = { prioritizeBySlug };
