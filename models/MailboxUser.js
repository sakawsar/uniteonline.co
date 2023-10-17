const mongoose = require("mongoose");
const { isEmail } = require("validator");
const bcrypt = require("bcrypt");

const mailboxUserSchema = mongoose.Schema({
  region: {
    type: String,
    required: [true, "Please enter a region."],
    maxlength: [60, "Region too long."],
  },
  name: {
    type: String,
    require: [true, "Please enter a name."],
    maxlength: [120, "Name too long."],
  },
  address: {
    type: String,
    require: [true, "Please enter an address."],
    maxlength: [650, "Name too long."],
  },
  zipCode: {
    type: Number,
    require: [true, "Please enter a zip code."],
    maxlength: [9, "Zipcode too long."],
  },
  email: {
    type: String,
    require: [true, "Please enter an email."],
    lowercase: true,
    validate: [isEmail, "Please enter a valid email."],
  },
  fullName: {
    type: String,
    require: [true, "Please enter a full name."],
    maxlength: [180, "Full name too long."],
  },
  company: {
    type: String,
    require: [true, "Please enter a company."],
    maxlength: [180, "Company too long."],
  },
  companyAddress: {
    type: String,
    require: [true, "Please enter a company address."],
    maxlength: [180, "Company address too long."],
  },
  city: {
    type: String,
    require: [true, "Please enter a city."],
    maxlength: [60, "City too long."],
  },
  businessType: {
    type: String,
    require: [true, "Please enter a business type."],
    maxlength: [120, "Business type too long."],
  },
  positionInCompany: {
    type: String,
    require: [true, "Please enter your position in the company."],
    maxlength: [120, "Position in company too long."],
  },
  password: {
    type: String,
    require: [true, "Please enter a password."],
    maxlength: [255, "Password too long."],
  },
  phoneNumber: {
    type: String,
    require: [true, "Please enter a phone number."],
    maxlength: [15, "Phone number too long."],
  },
  mailboxNumber: {
    type: String,
    require: [true, "Please enter a mailbox number."],
    maxlength: [6, "Mailbox number too long."],
  },
});

const MailboxUser = mongoose.model("mailboxUser", mailboxUserSchema);

module.exports = MailboxUser;
