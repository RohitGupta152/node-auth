const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    default: null,
  },
  resetOtp: {
    type: String,
    default: null,
  },
  otpCreatedAt: {
    type: Date,
    default: null,
  },
  otpExpiresAt: {
    type: Date,
    default: null,
  },
  
}, { timestamps: true });



// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
  // If the password field is modified or it's a new user
  if (this.isModified('password') || this.isNew) {
    try {
      // Hash the password using bcrypt with 8 salt rounds
      const salt = await bcrypt.genSalt(10); 
      const hashedPassword = await bcrypt.hash(this.password, salt);
      
      // Replace the plain password with the hashed one
      this.password = hashedPassword;
      next();
    } catch (err) {
      return next(err);  // Pass any error to the next middleware
    }
  } else {
    // If password is not modified, just proceed
    next();
  }
});

// Instance method to compare provided password with stored hash
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Instance method to check if a new password matches the existing one
userSchema.methods.isSamePassword = async function (newPassword) {
  return await bcrypt.compare(newPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
