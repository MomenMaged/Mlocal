
export const buildProductText = (product) => {
  // Get the category name from the populated category object.
  const categoryName =
    typeof product.categories === "object"
      ? product.categories?.name
      : product.categories;

  // Build the text that will be converted into an embedding.
  const productText = [
    product.name && `Product: ${product.name}`,
    categoryName && `Category: ${categoryName}`,
    product.description && `Description: ${product.description}`,
  ]
    .filter(Boolean)
    .join(". ");

  return productText;
};
