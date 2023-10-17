const User = require("../models/User");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

module.exports.updateProfileWithPfp = (req, res) => {
  const query = req.body;
  const errors = [];
  const token = req.cookies.jwt;

  jwt
    .verify(token, "abc123$%^", async (err, decodedToken) => {
      let user = await User.findById(decodedToken.id);
      return user;
    })
    .then((data) => {
      const user_id = data._id;
      const existingProfilePicture = data.profilePicture;

      if (!req.file) {
        errors.push("There was an error uploading your image.");
        let error = errors;
        return res.status(400).json({ error });
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
        User.updateOne(
          { _id: user_id },
          {
            fullName: query.fullName,
            company: query.company,
            positionInCompany: query.positionInCompany,
            phone: query.phoneNumber,
            profilePicture: saveFilePath,
          },
          function (err, doc) {
            if (err) {
              fs.unlinkSync(filePath);
              let error = err;
              return res.status(400).json({ error });
            }
            fs.unlinkSync(
              path.join(__dirname, "../uploads/", existingProfilePicture)
            );
            return res
              .status(200)
              .json({ success: "Profile updated successfully." });
          }
        );
      } catch (err) {
        errors.push(err);
        let error = errors;
        res.status(400).json({ error });
        fs.unlinkSync(filePath);
      }
    });
};

module.exports.updateProfileWithoutPfp = (req, res) => {
  const query = req.body;
  const errors = [];
  const token = req.cookies.jwt;

  jwt
    .verify(token, "abc123$%^", async (err, decodedToken) => {
      let user = await User.findById(decodedToken.id);
      return user;
    })
    .then((data) => {
      const user_id = data._id;

      try {
        User.updateOne(
          { _id: user_id },
          {
            fullName: query.fullName,
            company: query.company,
            positionInCompany: query.positionInCompany,
            phone: query.phoneNumber,
          },
          function (err, doc) {
            if (err) {
              let error = err;
              return res.status(400).json({ error });
            }
            return res
              .status(200)
              .json({ success: "Profile updated successfully." });
          }
        );
      } catch (err) {
        errors.push(err);
        let error = errors;
        res.status(400).json({ error });
      }
    });
};
