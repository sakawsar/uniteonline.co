const User = require("../models/User");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const handleErrors = (exports.handleErrors = (err) => {
  let errors = {
    email: "",
    password: "",
    phoneNumber: "",
    profilePicture: "",
    businessType: "",
    businessSubType: "",
    address: "",
    region: "",
    city: "",
    state: "",
    zipCode: "",
  };

  if (err.message === "Incorrect email.") {
    errors.email = "Email not registered.";
  }

  if (err.message === "Incorrect password.") {
    errors.password = "The password is not correct.";
  }

  if (err.code === 11000) {
    errors.email = "An account with that email already exists.";
    return errors;
  }

  if (err.message === "image upload error.") {
    errors.profilePicture =
      "Sorry, there was an error uploading your image. Please try again later.";
    return errors;
  }

  if (
    err.message ===
    "Invalid file type, only PNG, JPEG, or GIF files are allowed."
  ) {
    errors.profilePicture =
      "Invalid file type, only PNG, JPEG, or GIF files are allowed.";
    return errors;
  }

  if (err.message === "File size exceeded, maximum is 10 MB.") {
    errors.profilePicture = "File size exceeded, maximum is 10 MB.";
    return errors;
  }

  if (err.message.includes("user validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
});

const maxTokenAge = 3 * 24 * 60 * 60;

const createToken = (id) => {
  return jwt.sign({ id }, "abc123$%^", {
    expiresIn: maxTokenAge,
  });
};

module.exports.signup_get = (req, res) => {
  res.render("signup");
};

module.exports.login_get = (req, res) => {
  res.render("login");
};

module.exports.signup_post = async (req, res) => {
  const {
    email,
    fullName,
    company,
    positionInCompany,
    password,
    phoneNumber,
    businessType,
    businessSubType,
    region,
    city,
    state,
    zipCode,
    address,
  } = req.body;

  if (!req.file) {
    const err = {
      message: "image upload error.",
      code: 12000,
    };
    const errors = handleErrors(err);
    return res.status(400).send({ errors });
  }

  const imageBlob = req.file;
  const fileName = imageBlob.filename;

  const filePath = path.join(
    __dirname,
    "../uploads/profile_pictures",
    fileName
  );
  const readStream = fs.createReadStream(imageBlob.path);
  const writeStream = fs.createWriteStream(filePath);
  readStream.pipe(writeStream);

  const saveFilePath = "profile_pictures/" + fileName;

  try {
    const user = await User.create({
      email: email,
      fullName: fullName,
      company: company,
      positionInCompany: positionInCompany,
      phone: phoneNumber,
      profilePicture: saveFilePath,
      password: password,
      businessType: businessType,
      businessSubType: businessSubType,
      address: address,
      region: region,
      city: city,
      state: state,
      zipCode: zipCode,
    });
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: false, maxAge: maxTokenAge * 1000 });
    res.status(201).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
    fs.unlinkSync(filePath);
  }
};

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: false, maxAge: maxTokenAge * 1000 });
    res.status(200).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = async (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};
