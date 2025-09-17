const Category = require('../../models/categorySchema');

const categoryInfo = async (req, res,next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render('layout',{ body:'category',categories });
  } catch (err) {
    next(err);
  }
};

const toggleBlockStatusCategory = async (req, res,next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false });

    category.isListed = !category.isListed;
    await category.save();

    res.json({ success: true, isListed: category.isListed });
  } catch (err) {
    next(err);
  }
};

const searchCategory = async (req, res,next) => {
  try {
    const query = req.query.query || '';
    const categories = await Category.find({
      name: { $regex: query, $options: 'i' }
    }).sort({ createdAt: -1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

const getPaginatedCategory = async (req, res,next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const query = req.query.query || '';

    const categories = await Category.find({
      name: { $regex: query, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategory = await Category.countDocuments({
      name: { $regex: query, $options: 'i' },
    });

    const totalPages = Math.ceil(totalCategory / limit);

    res.json({ categories, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

const getEditCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send("Category not found");
    }
    res.render("category-edit", { category, errors: {} });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  const { name, description } = req.body;

  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send("Category not found");
    }

    let errors = {};

    // Validations
    if (!name || name.trim() === "") {
      errors.name = "Category name is required.";
    } else if (name.length > 20) {
      errors.name = "Category name must not exceed 20 characters.";
    }

    if (!description || description.trim() === "") {
      errors.description = "Description is required.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("category-edit", {
        category: { ...category.toObject(), name, description },
        errors,
      });
    }

    // Save if valid
    category.name = name;
    category.description = description;
    await category.save();

    res.redirect("/admin/category");
  } catch (err) {
    next(err);
  }
};

const getAddCategory = async (req,res,next)=>{
  res.render('category-add',{
    category:{},
    errors: {},
    isEdit:false,
  });
}

const addCategory = async (req,res,next)=>{
  try{
    const{name,description}=req.body;
    let errors={};

    if(!name || name.trim() === ""){
      errors.name = 'Category name is required';
    }else if(name.length > 20){
      errors.name = 'Category name must not exceed 20 characters.';
    }

    if (!description || description.trim() === "") {
      errors.description = "Description is required.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("category-add", {
        category: { name, description },
        errors,
        isEdit: false,
      });
    }

    const newCategory = new Category({
      name,
      description,
      isListed:true,
    });
    await newCategory.save();
    res.redirect('/admin/category');
  }catch(err){
    next(err);
  }
};

module.exports = {
  categoryInfo,
  toggleBlockStatusCategory,
  searchCategory,
  getPaginatedCategory,
  getEditCategory,
  updateCategory,
  getAddCategory,
  addCategory,
};
