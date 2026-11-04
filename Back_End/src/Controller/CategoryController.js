import Category from "../models/Category.js"

export const createCategory = async (req, res) => {
try {
const { name } = req.body;


        const category = new Category({name})

        const savedCategories =  await category.save()

         res.status(201).json({ savedCategories });


} catch (error) {
res.status(500).json({
message: "Cannot"
});
}
};

// @desc Get all categories
// @route GET /api/categories
export const getAllCategories = async (req, res) => {
try {
const categories = await Category.find();

res.status(200).json({
  count: categories.length,
  categories
});

} catch (error) {
res.status(500).json({
message: error.message
});
}
};

export const deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};