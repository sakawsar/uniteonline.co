const mongoose = require("mongoose");
const { isEmail } = require("validator");
const bcrypt = require("bcrypt");

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please enter an email."],
    unique: true,
    lowercase: true,
    validate: [isEmail, "Please enter a valid email."],
  },
  fullName: {
    type: String,
    required: [true, "Please enter your full name."],
    maxlength: [90, "Full name too long. The maximum length is 90 characters."],
  },
  company: {
    type: String,
    required: [true, "Please enter your company's name."],
    maxlength: [
      90,
      "Company name too long. The maximum length is 90 characters.",
    ],
  },
  positionInCompany: {
    type: String,
    required: [true, "Please enter your position in the company."],
    maxlength: [
      20,
      "Company Position too long. The maximum length is 20 characters.",
    ],
  },
  phone: {
    type: String,
    required: [true, "Please enter a phone number."],
    maxlength: [15, "Phone number too long. The maximum length is 15"],
  },
  profilePicture: {
    type: String,
    maxlength: [256, "File name too long."],
  },
  password: {
    type: String,
    required: [true, "Please enter a password."],
    minlength: [8, "Password must have a minimum length of 8 characters."],
  },
  address: {
    required: [true, "Please enter an address."],
    type: String,
    maxlength: [512, "Address too long."],
  },
  businessType: {
    required: [true, "Please enter a business type."],
    type: String,
    maxlength: [100, "Business type too long."],
  },
  businessSubType: {
    required: [true, "Please enter a business sub type."],
    type: String,
    maxlength: [100, "Business sub-type too long."],
  },
  region: {
    required: [true, "Please enter a region."],
    type: String,
    maxlength: [120, "Region too long."],
  },
  city: {
    required: [true, "Please enter a city."],
    type: String,
    maxlength: [130, "City too long."],
  },
  state: {
    required: [true, "Please enter a state."],
    type: String,
    maxlength: [130, "State too long."],
  },
  zipCode: {
    required: [true, "Please enter a zipcode."],
    type: String,
    maxlength: [130, "Zipcode too long."],
  },
});

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre("updateOne", function (next) {
  this.options.runValidators = true;
  next();
});

userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);

    if (auth) {
      return user;
    }

    throw Error("Incorrect password.");
  }
  throw Error("Incorrect email.");
};

userSchema.statics.searchUsers = async function (query) {
  const users = await this.find(
    { email: { $regex: query, $options: "i" } },
    function (err, docs) {
      return docs;
    }
  );

  return users;
};

const User = mongoose.model("user", userSchema);

module.exports = User;
