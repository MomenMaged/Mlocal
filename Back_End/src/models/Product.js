import mongoose from "mongoose";

const productSizeSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true


    },
    price:{
    type:Number,
    required: true

    },
    image: {
    type: String,
    trim: true,
  },
    images: {
    type: [String],
    default: [],
    },
    categories:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    
        },
        // Per-size stock. Free-text labels such as "40", "M" or "One Size".
        sizes: {
  type: [productSizeSchema],
  default: [],
},
        // Derived total stock. Always the sum of sizes[].quantity.
        quantity: {
  type: Number,
  required: true,
  min: 0,
  default: 0,
  
}
})

const Product = mongoose.model('Product', ProductSchema);

export default Product;
