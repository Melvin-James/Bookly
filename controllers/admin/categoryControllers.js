const Category = require('../../models/categorySchema');

const categoryInfo = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render('layout',{ body:'category',categories });
  } catch (err) {
    next(err);
  }
};

const toggleBlockStatusCategory = async (req, res) => {
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

const searchCategory = async (req, res) => {
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

const getPaginatedCategory = async (req, res) => {
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

const getEditCategory = async(req,res)=>{
  try{
    const category = await Category.findById(req.params.id);
    if(!category){
      return res.status(404).send('Category not found');
    }
    res.render('category-edit',{category});
  }catch(err){
    next(err);
  }
}

const updateCategory = async(req,res)=>{
  const {name,description}=req.body;

  try{
    const category = await Category.findById(req.params.id);
    if(!category){
      return res.status(404).send('Category not found');
    }
    category.name=name;
    category.description=description;
    await category.save();
    res.redirect('/admin/category');
  }catch(err){
    next(err);
  }
};

const getAddCategory = async (req,res)=>{
  res.render('category-add',{
    category:{},
    isEdit:false,
  });
}

const addCategory = async (req,res)=>{
  try{
    const{name,description}=req.body;

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
