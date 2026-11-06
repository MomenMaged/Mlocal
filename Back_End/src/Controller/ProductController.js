import Product from "../models/Product.js";
import mongoose from "mongoose";

function parseSizes(rawSizes) {
  if (!Array.isArray(rawSizes)) {
    return { error: "Sizes must be an array" };
  }

  const seen = new Set();
  const sizes = [];

  for (const entry of rawSizes) {
    if (!entry || typeof entry !== "object") {
      return { error: "Each size must include a size and quantity" };
    }

    const label = typeof entry.size === "string" ? entry.size.trim() : "";

    if (!label) {
      return { error: "Each size must have a name" };
    }

    const key = label.toLowerCase();

    if (seen.has(key)) {
      return { error: `Duplicate size: ${label}` };
    }

    seen.add(key);

    const quantity = Number(entry.quantity);

    if (!Number.isInteger(quantity) || quantity < 0) {
      return {
        error: `Quantity for size ${label} must be a non-negative whole number`,
      };
    }

    sizes.push({ size: label, quantity });
  }

  return { sizes };
}

function sumSizes(sizes) {
  return sizes.reduce((total, entry) => total + entry.quantity, 0);
}

export const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";

    const filters = req.query.filters || "";

    const page = req.query.page === undefined ? 1 : Number(req.query.page);

    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

    const { sortName, sortPrice } = req.query;

const sortOptions = {};

if (sortName) {
  if (!["asc", "desc"].includes(sortName)) {
    return res.status(400).json({
      message: "sortName must be 'asc' or 'desc'",
    });
  }

  sortOptions.name = sortName === "asc" ? 1 : -1;
}

if (sortPrice) {
  if (!["asc", "desc"].includes(sortPrice)) {
    return res.status(400).json({
      message: "sortPrice must be 'asc' or 'desc'",
    });
  }

  sortOptions.price = sortPrice === "asc" ? 1 : -1;
}


    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        message: "Page must be a positive integer",
      });
    }

    // Validate limit
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        message: "Limit must be an integer between 1 and 100",
      });
    }

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip) || skip > 100000) {
      return res.status(400).json({
        message: "Requested page is too large",
      });
    }

    const filter = {};
    if (search) {
  filter.name = {
    $regex: search,
    $options: "i"
  };
}

if (filters) {
  const parts = filters.split("-");

  for (const part of parts) {
    const [key, value] = part.split(":");

    if (key === "Category") {
      if (!mongoose.isValidObjectId(value)) {
        return res.status(400).json({
          message: "Invalid category ID",
        });
      }

      filter.categories = value;
    }

     if (key === "price") {
      const price = Number(value);

      if (!Number.isFinite(price)) {
        return res.status(400).json({
          message: "Invalid price filter",
        });
      }

      filter.price = price;
    }
  }
}

    // if (search) {
    //   const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    //   filter.$or = [
    //     {
    //       categories: {
    //         $regex: escapedSearch,
    //         $options: "i"
    //       }
    //     }
    //   ];

    // }

    console.log("Query params:", req.query);
console.log("Sort options:", sortOptions);

    const [products, totalProducts] = await Promise.all([
  Product.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate("categories"),

  Product.countDocuments(filter),
]);

res.status(200).json({
  products,
  pagination: {
    currentPage: page,
    limit,
    totalProducts,
    totalPages: Math.ceil(totalProducts / limit),
    hasNextPage: page < Math.ceil(totalProducts / limit),
    hasPreviousPage: page > 1,
  },
});
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// Create Product


export const createProduct = async (req, res) => {
  try {
    const { name, price, image, images, categories, sizes } = req.body;
    const productImages = Array.isArray(images)
      ? images.filter((value) => typeof value === "string" && value.trim())
      : [];
    const primaryImage = typeof image === "string" ? image.trim() : "";

    const parsed = parseSizes(sizes ?? []);

    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const product = new Product({
      name,
      price,
      image: primaryImage || productImages[0] || "",
      images: productImages,
      categories,
      sizes: parsed.sizes,
      quantity: sumSizes(parsed.sizes),
    });

    const savedProducts = await product.save();

    res.status(201).json({ savedProducts });
  } catch (error) {
    console.log("Cannot create", error);

    res.status(400).json({ message: "Can't create" });
  }
};

export const getProductByID = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("categories");

    if (!product) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ message: "error by ID" });
    console.log("Error");
  }
};

export const updateProduct = async (req, res) => {
  try {
     const { name, price, image, images, quantity, categories, sizes } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({ message: "Images must be an array" });
      }

      updates.images = images.filter(
        (value) => typeof value === "string" && value.trim()
      );
    }

    if (image !== undefined) updates.image = image;
    if (categories !== undefined) updates.categories = categories;

    if (sizes !== undefined) {
      const parsed = parseSizes(sizes);

      if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
      }

      updates.sizes = parsed.sizes;
      // Total stock is always derived from the per-size stock.
      updates.quantity = sumSizes(parsed.sizes);
    } else if (quantity !== undefined) {
      updates.quantity = quantity;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
     
      { $set: updates },
      { new: true },
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
