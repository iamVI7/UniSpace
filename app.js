// =====================================
// 1. Module Imports
// =====================================

// Core framework & utilities
require('dotenv').config();  // change for deployment #1
const express = require('express');
const path = require('path');
const fs = require('fs');

const rateLimit = require('express-rate-limit');

// MongoDB and middleware
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const { type } = require('os');

// =====================================
// 2. App Initialization & Configuration
// =====================================

const app = express();
const port = process.env.PORT || 7070;   //change for deployment #2

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Serve static assets from 'public' and 'uploads' folders
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Parse JSON and form data (URL-encoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// 3. Session Setup
// =====================================

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false, // Changed to false for security
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true, // Prevent client-side JS access
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// =====================================
// 4. Database Connection (MongoDB)
// =====================================

mongoose.connect(process.env.MONGO_URI)   //change for deployment #3
  .then(() => console.log('Connected to MongoDB, Above link is active now !'))
  .catch(err => console.error('MongoDB connection error:', err));


// =====================================
// 5. Mongoose Schemas & Models
// =====================================

// For project queries
const projectSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  message: { type: String, required: true }
});
const Project = mongoose.model('Project', projectSchema);

// For contact messages
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  message: { type: String, required: true }
});
const Contact = mongoose.model('Contact', contactSchema);

// In your server.js file, add this with other schemas
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String },
  author: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', blogSchema);

// For user profile, PDFs, and images
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  profession: { type: String, required: true },
  pass: { type: String, required: true },
  profilePicture: {
    filename: String,
    path: String,
    uploadDate: { type: Date, default: Date.now }
  },
  pdfs: [{
    name: String,
    filename: String,
    path: String,
    uploadDate: { type: Date, default: Date.now },
    size: Number
  }],
  images: [{
    name: String,
    filename: String,
    path: String,
    uploadDate: { type: Date, default: Date.now },
    size: Number
  }]
});
const User = mongoose.model('User', userSchema);

// =====================================
// 6. File Upload Configurations (Multer)
// =====================================

// First, define all file filter functions at the top
const fileFilter = (req, file, cb) => {
  file.mimetype === 'application/pdf'
    ? cb(null, true)
    : cb(new Error('Only PDF files are allowed'), false);
};

const imageFileFilter = (req, file, cb) => {
  file.mimetype.startsWith('image/')
    ? cb(null, true)
    : cb(new Error('Only image files are allowed'), false);
};

// ------------------------
// PDF Upload Setup
// ------------------------
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/pdfs/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: pdfStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ------------------------
// Image Upload Setup
// ------------------------
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/images/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ------------------------
// Profile Picture Upload Setup
// ------------------------
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-pictures/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ------------------------
// Blog Image Upload Setup
// ------------------------
const blogImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/blog-images/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadBlogImage = multer({
  storage: blogImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// =====================================
// 7. Upload & Deletion Routes
// =====================================

// -------- PDF Upload/Deletion --------
app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  // Upload a PDF and store it in user's record
  try {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const newPdf = {
      name: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path
    };

    await User.findByIdAndUpdate(req.session.userId, { $push: { pdfs: newPdf } });

    res.status(201).json({ message: 'File uploaded successfully', filename: req.file.filename });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

app.delete('/delete-pdf/:userId/:filename', async (req, res) => {
  // Delete PDF from file system and user record
  try {
    const { userId, filename } = req.params;
    if (req.session.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });

    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(__dirname, 'uploads', 'pdfs', sanitizedFilename);

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    await fs.promises.unlink(filePath);
    await User.findByIdAndUpdate(userId, { $pull: { pdfs: { filename: sanitizedFilename } } });

    res.json({ success: true, message: 'PDF deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- Image Upload/Deletion --------
app.post('/upload-image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const newImage = {
      name: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    };

    await User.findByIdAndUpdate(req.session.userId, { $push: { images: newImage } });

    res.status(201).json({ message: 'Image uploaded successfully', filename: req.file.filename });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

app.delete('/delete-image/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    if (req.session.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });

    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(__dirname, 'uploads', 'images', sanitizedFilename);

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    await fs.promises.unlink(filePath);
    await User.findByIdAndUpdate(userId, { $pull: { images: { filename: sanitizedFilename } } });

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- Profile Picture Upload --------
app.post('/upload-profile-picture', uploadProfile.single('profile'), async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const user = await User.findById(req.session.userId);

    // Delete old profile picture if exists
    if (user.profilePicture?.filename) {
      const oldPath = path.join(__dirname, 'uploads', 'profile-pictures', user.profilePicture.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Save new profile picture
    user.profilePicture = {
      filename: req.file.filename,
      path: req.file.path,
      url: `/uploads/profile-pictures/${req.file.filename}`
    };

    await user.save();
    res.json({ success: true, url: user.profilePicture.url });
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// =====================================
// 8. File Access Routes
// =====================================

// View/download PDFs
app.get('/pdfs/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'pdfs', req.params.filename);
  res.sendFile(filePath);
});
app.get('/pdfs/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'pdfs', req.params.filename);
  res.download(filePath);
});

// View images
app.get('/images/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'images', req.params.filename);
  res.sendFile(filePath);
});

// View profile pictures
app.get('/profile-pictures/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'profile-pictures', req.params.filename);
  res.sendFile(filePath);
});

// Simple admin authentication middleware
const requireAdminAuth = (req, res, next) => {
  if (req.session.isAdmin && req.session.adminEmail === process.env.ADMIN_EMAIL) {
    next();
  } else {
    // Clear any invalid session
    req.session.destroy();
    res.redirect('/');
  }
};

// =====================================
// 9. Static Page Rendering Routes
// =====================================

app.get('/', (req, res) => res.render('Home', { title: 'Home' }));
app.get('/about', (req, res) => res.render('About', { title: 'About' }));
app.get('/projects', (req, res) => res.render('Projects', { title: 'Projects' }));
app.get('/blog', (req, res) => res.render('Blog', { title: 'Blog' }));
app.get('/contact', (req, res) => res.render('Contact', { title: 'Contact' }));
app.get('/register', (req, res) => res.render('Register', { title: 'Register' }));
app.get('/add', (req, res) => res.render('add', { title: 'addimage' }));
app.get('/login', (req, res) => res.render('login', { title: 'Login' }));
app.get('/admin_login', (req, res) => res.render('admin_login', { title: '' }));
app.get('/admin_space', requireAdminAuth, async (req, res) => {
  try {
    // Fetch all contact, project queries, and users from the database
    const contacts = await Contact.find().sort({ createdAt: -1 }).lean();
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    const users = await User.find().sort({ createdAt: -1 }).lean();

    res.render('admin_space', {
      title: 'Admin Dashboard',
      contacts,
      projects,
      users // Pass the users data to the template
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error loading admin dashboard');
  }
});

// GET all blogs for the blog page
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

// GET single blog for editing
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blog' });
  }
});

// =====================================
// Blog Routes
// =====================================

// Get single blog post
app.get('/blog/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).render('404', { title: 'Blog Not Found' });
    }

    res.render('blog-detail', {
      title: blog.title,
      blog,
      currentUrl: req.originalUrl
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).render('500', { title: 'Server Error' });
  }
});

// POST create new blog (admin only)
app.post('/api/blogs', requireAdminAuth, uploadBlogImage.single('image'), async (req, res) => {
  try {
    const { title, excerpt, content, category } = req.body;

    const newBlog = new Blog({
      title,
      excerpt,
      content,
      category,
      imageUrl: req.file ? `/uploads/blog-images/${req.file.filename}` : null
    });

    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    res.status(400).json({ message: 'Error creating blog' });
  }
});

// PUT update blog (admin only)
app.put('/api/blogs/:id', requireAdminAuth, uploadBlogImage.single('image'), async (req, res) => {
  try {
    const { title, excerpt, content, category } = req.body;
    const updateData = {
      title,
      excerpt,
      content,
      category,
      updatedAt: Date.now()
    };

    // If new image is uploaded, update the image URL
    if (req.file) {
      // First, delete the old image if it exists
      const oldBlog = await Blog.findById(req.params.id);
      if (oldBlog.imageUrl) {
        const oldImagePath = path.join(__dirname, oldBlog.imageUrl);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }

      updateData.imageUrl = `/uploads/blog-images/${req.file.filename}`;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedBlog) return res.status(404).json({ message: 'Blog not found' });
    res.json(updatedBlog);
  } catch (error) {
    res.status(400).json({ message: 'Error updating blog' });
  }
});

// DELETE blog (admin only)
app.delete('/api/blogs/:id', requireAdminAuth, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    // Delete associated image if exists
    if (blog.imageUrl) {
      const imagePath = path.join(__dirname, blog.imageUrl);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting blog' });
  }
});

// Add this to your server code to delete users from admin space
app.delete('/admin/users/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete all associated files
    // Delete profile picture if exists
    if (user.profilePicture?.filename) {
      const profilePath = path.join(__dirname, 'uploads', 'profile-pictures', user.profilePicture.filename);
      if (fs.existsSync(profilePath)) fs.unlinkSync(profilePath);
    }

    // Delete all PDFs
    if (user.pdfs && user.pdfs.length > 0) {
      for (const pdf of user.pdfs) {
        const pdfPath = path.join(__dirname, 'uploads', 'pdfs', pdf.filename);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      }
    }

    // Delete all images
    if (user.images && user.images.length > 0) {
      for (const image of user.images) {
        const imagePath = path.join(__dirname, 'uploads', 'images', image.filename);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
    }

    // Delete the user record
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

// Add this to your server code to delete contacts info from admin space
app.delete('/admin/contacts/:id', requireAdminAuth, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ success: false, message: 'Error deleting contact' });
  }
});

// Add this to your server code to delete projects info from admin space
app.delete('/admin/projects/:id', requireAdminAuth, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Error deleting project query' });
  }
});

app.get('/admin_logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Admin logout error:', err);
      return res.redirect('/admin_space');
    }
    res.redirect('/');
  });
});

// =====================================
// 10. User Dashboard ("Space")
// =====================================

app.get('/space', async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    const user = await User.findById(req.session.userId).lean();
    if (!user) return res.redirect('/login');

    if (user.profilePicture) {
      user.profilePicture.url = `/uploads/profile-pictures/${user.profilePicture.filename}`;
    }

    res.render('space', {
      title: 'User Space',
      user,
      cacheBust: Date.now() // Force refresh for dynamic image display
    });
  } catch (error) {
    console.error('Space error:', error);
    res.redirect('/login');
  }
});

// =====================================
// 11. Form Submission Handling
// =====================================

app.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const contact = new Contact({ name, email, subject, message });
    await contact.save();
    res.status(201).send('sent !');
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post('/projectquery', async (req, res) => {
  try {
    const { email, message } = req.body;
    const project = new Project({ email, message });
    await project.save();
    res.status(201).send('sent !');
  } catch (error) {
    res.status(400).send(error);
  }
});

// =====================================
// 12. Authentication Routes
// =====================================

//admin authentication routes
// Remove the existing Admin model and schema since we won't use database storage
// Replace the admin_login route with this:
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later'
});

app.post('/admin_login', adminLimiter, async (req, res) => {
  try {
    const { email, pass } = req.body;
    
    // Compare with environment variables
    if (email === process.env.ADMIN_EMAIL && pass === process.env.ADMIN_PASSWORD) {
      // Store admin info in session
      req.session.isAdmin = true;
      req.session.adminEmail = email;
      
      return res.redirect('/admin_space');
    }
    
    res.status(401).send('Invalid admin credentials');
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).send("Login error");
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, profession, pass } = req.body;
    const user = new User({ name, email, profession, pass });
    await user.save();
    req.session.userId = user._id;
    res.redirect('/space');
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, pass } = req.body;
    const user = await User.findOne({ email });
    if (user && pass === user.pass) {
      req.session.userId = user._id;
      res.redirect('/space');
    } else {
      res.status(400).send('Invalid email or password');
    }
  } catch (error) {
    res.status(500).send("Login error");
  }
});

app.post('/delete/:id', async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (error) {
    res.status(500).send(error);
  }
});

// =====================================
// 13. Logout & Error Handling
// =====================================

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.redirect('/');
  });
});

// Generic Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// =====================================
// 14. Start the Server
// =====================================

app.listen(port, () => {
  console.log(`Server is active on http://localhost:${port}`);
});