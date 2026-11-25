
import { buildProductText } from "../utils/productTextBuilder.js";

const product = {
  _id: "6ada8fc7271c0612de99c748",
  name: "Superstar II",
  price: 4500,
  categories: {
    _id: "6ad7a2cb42d6b6fb784ad291",
    name: "Shoes",
  },
  quantity: 6,
  sizes: [
    { size: "38", quantity: 2 },
    { size: "39", quantity: 0 },
    { size: "40", quantity: 2 },
    { size: "44", quantity: 2 },
  ],
};

const result = buildProductText(product);

console.log("Generated product text:");
console.log(result);
