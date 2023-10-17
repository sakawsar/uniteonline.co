const express = require("express");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");
const { requireAuth, checkUser } = require("./middleware/authMiddleware");
const searchController = require("./controllers/searchController");
const profileController = require("./controllers/profileController");
const { Server } = require("socket.io");
const https = require("https");
const http = require("http");
const User = require("./models/User");
const MailboxUser = require("./models/MailboxUser");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

let mode = "development";
let port = 3000;
let server = null;
let app = null;

const client = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "connectionsserver@gmail.com",
    pass: "buygbhhvqiuyfswi",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

if (mode === "production") {
  port = 8443;

  const https_options = {
    key: fs.readFileSync(
      "/etc/pki/tls/private/connections.bizrendevous.com.key"
    ),
    cert: fs.readFileSync(
      "/etc/pki/tls/certs/connections.bizrendevous.com.cert"
    ),
    ca: [
      fs.readFileSync("/etc/pki/tls/certs/ca-bundle.crt"),
      fs.readFileSync("/etc/pki/tls/certs/connections.bizrendevous.com.bundle"),
    ],
  };

  app = express();
  server = https.createServer(https_options, app);
} else if (mode === "development") {
  app = express();
  server = http.createServer(app);
}

const io = new Server(server);
server.setTimeout(600000);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.set("view engine", "ejs");

const dbURI = "mongodb://0.0.0.0:27017/connections";
mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((result) => server.listen(port))
  .catch((err) => console.error(err));

app.get("*", checkUser);
app.get("/", (req, res) => res.render("home"));

app.get("/conversations", requireAuth, (req, res) =>
  res.render("conversations", {
    page: "chat",
  })
);

app.get("/dashboard", requireAuth, (req, res) =>
  res.render("dashboard", {
    page: "dashboard",
  })
);

app.get("/chat", requireAuth, (req, res) =>
  res.render("chat", {
    page: "chat",
  })
);

app.get("/get_uploaded", requireAuth, (req, res) => {
  const path = req.query.fileLocation;

  res.sendFile(__dirname + "/uploads/" + path);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "/uploads/profile_pictures"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validImageTypes = ["image/png", "image/jpeg", "image/gif"];
    const actualSize = parseInt(req.headers["content-length"]);

    if (!validImageTypes.includes(file.mimetype)) {
      return cb(new Error("File size exceeded, maximum is 10 MB."), false);
    } else if (actualSize > 11 * 1024 * 1024) {
      return cb(new Error("File size exceeded, maximum is 10 MB."), false);
    } else {
      cb(null, true);
    }
  },
});

app.post(
  "/update_profile_with_pfp",
  [requireAuth, upload.single("image")],
  profileController.updateProfileWithPfp
);

app.post(
  "/update_profile_without_pfp",
  [requireAuth, upload.none()],
  profileController.updateProfileWithoutPfp
);

app.get("/pricing_tables", (req, res) => res.render("pricing_tables"));
app.get("/affiliate_form", (req, res) => res.render("affiliate_form"));
app.get("/mailbox_pricing", (req, res) => res.render("mailbox_pricing_table"));
app.get("/form_1583", requireAuth, (req, res) => {
  const token = req.cookies.jwt;
  let userData = [];

  jwt
    .verify(token, "abc123$%^", async (err, decodedToken) => {
      let user = await MailboxUser.findById(decodedToken.id);
      return user;
    })
    .then((data) => {
      userData = data;

      res.render("form_1583", {
        email: data.email,
        fullName: data.fullName,
        company: data.company,
        positionInCompany: data.positionInCompany,
        phone: data.phoneNumber,
        profilePicture: data.saveFilePath,
        password: data.password,
        businessType: data.businessType,
        businessSubType: data.businessSubType,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        mailboxNumber: data.mailboxNumber,
        companyAddress: data.companyAddress,
      });
    });
});
app.get("/search_conversation", requireAuth, searchController.search_users);
app.get("/mailbox_signup", (req, res) => res.render("mailbox_signup"));

app.post("/mailbox_signup", async (req, res) => {
  const handleErrors = (err) => {
    let errors = {
      region: "",
      name: "",
      address: "",
      zipCode: "",
      email: "",
      fullName: "",
      company: "",
      companyAddress: "",
      city: "",
      businessType: "",
      positionInCompany: "",
      password: "",
      phoneNumber: "",
      mailboxNumber: "",
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

    if (err.message.includes("mailboxUser validation failed")) {
      Object.values(err.errors).forEach(({ properties }) => {
        errors[properties.path] = properties.message;
      });
    }

    return errors;
  };

  const maxTokenAge = 3 * 24 * 60 * 60;

  const createToken = (id) => {
    return jwt.sign({ id }, "abc123$%^", {
      expiresIn: maxTokenAge,
    });
  };

  try {
    const {
      region,
      name,
      address,
      zipCode,
      email,
      fullName,
      company,
      companyAddress,
      city,
      businessType,
      positionInCompany,
      password,
      phoneNumber,
      mailboxNumber,
    } = req.body;

    const user = await MailboxUser.create({
      region: region,
      name: name,
      address: address,
      zipCode: zipCode,
      email: email,
      fullName: fullName,
      company: company,
      companyAddress: companyAddress,
      city: city,
      businessType: businessType,
      positionInCompany: positionInCompany,
      password: password,
      phoneNumber: phoneNumber,
      mailboxNumber: mailboxNumber,
    });

    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: false, maxAge: maxTokenAge * 1000 });
    res.status(201).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
});

app.post("/form_1583", requireAuth, (req, res) => {
  const token = req.cookies.jwt;

  jwt
    .verify(token, "abc123$%^", async (err, decodedToken) => {
      let user = await User.findById(decodedToken.id);
      return user;
    })
    .then((data) => {
      const doc = new PDFDocument();

      let random = Math.random() * 100;
      let fileName = data._id + random + "form_1583";

      const storage = multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, path.join(__dirname, "./temp"));
        },
        filename: function (req, file, cb) {
          cb(
            null,
            file.fieldname +
              "-" +
              Date.now() +
              file.originalname.match(/\..*$/)[0]
          );
        },
      });

      const multi_upload = multer({
        storage,
        limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
        fileFilter: (req, file, cb) => {
          if (
            file.mimetype == "image/png" ||
            file.mimetype == "image/jpg" ||
            file.mimetype == "image/jpeg"
          ) {
            cb(null, true);
          } else {
            cb(null, false);
            const err = new Error("Only .png, .jpg and .jpeg formats allowed!");
            err.name = "ExtensionError";
            return cb(err);
          }
        },
      }).fields([
        {
          name: "signature_of_agent",
          maxCount: 1,
        },
        {
          name: "signature_of_applicant",
          maxCount: 1,
        },
      ]);

      multi_upload(req, res, function (err) {
        if (err != undefined) {
          console.log("error: " + err);
        } else {
          doc.pipe(fs.createWriteStream(`temp/${fileName}.pdf`));
          doc
            .fontSize(27)
            .text(`Form 1583's Content for ${data.company}`, 100, 100);
          doc.moveDown(1);

          let reqObj = JSON.parse(JSON.stringify(req.body));

          for (let key in req.body) {
            if (reqObj.hasOwnProperty(key)) {
              let val = req.body[key];

              key = key && key[0].toUpperCase() + key.slice(1);
              key = key.replace(/_/g, " ");

              doc.fontSize(15).text(`${key}: ${val}`, 100, doc.y);

              doc.moveDown(1);
            }
          }

          doc.fontSize(15).text("Signature of Applicant: ", 100, doc.y);
          doc.moveDown(1);
          doc.image(req.files.signature_of_applicant[0].path, 100, doc.y, {
            width: 205,
            align: "center",
            valign: "center",
          });
          doc.moveDown(1);
          doc.fontSize(15).text("Signature of Agent: ", 100, doc.y);
          doc.moveDown(1);
          doc.image(req.files.signature_of_agent[0].path, 100, doc.y, {
            width: 205,
            align: "center",
            valign: "center",
          });
          doc.moveDown(5);
          doc
            .fontSize(14)
            .text(
              `This pdf was programmatically generated by Connections according to the preferences of ${data.company}'s operator on Connections.`,
              100,
              doc.y + 20,
              {
                align: "center",
              }
            );

          doc.end();
        }
      });

      res
        .status(201)
        .send(
          "<p style=\"width: 100%; text-align: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;\">Thanks for filling this form! We will be in touch with you shortly.</p><br /><a href=\"/\" style=\"display: block; width: 100%; text-align: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;\">Return to Home</a>"
        );

      client.sendMail({
        from: "connectionsserver@gmail.com",
        to: data.email,
        subject:
          "Thank you for filling out our form, please find attached a copy of the filled Form 1583",
        text: `
          If you have any questions, please don't hesitate to ask.

          Kind regards.
          Team Connections.
        `,
        attachments: [
          {
            filename: `form_1583_content.pdf`,
            path: __dirname + `/temp/${fileName}.pdf`,
          },
        ],
      });
    });
});

io.on("connection", (socket) => {
  let userData = [];

  socket.on("disconnect", () => {});

  let jwtCookie = cookieParser.JSONCookies(socket.handshake.headers.cookie);
  jwtCookie = jwtCookie.split("; ");
  let token = {};
  for (let i in jwtCookie) {
    const cur = jwtCookie[i].split("=");
    token[cur[0]] = cur[1];
  }
  token = token.jwt;

  if (token) {
    jwt.verify(token, "abc123$%^", async (err, decodedToken) => {
      if (err) {
        console.error(err);
        return err;
      } else {
        const user = await User.findById(decodedToken.id);
        userData = user;
      }
    });
  } else {
    console.error("No or invalid token.");
  }

  socket.on("Chat Message Send", (content) => {
    const to = content.to;
    const userMessage = content.message;
    const from = userData.email;

    try {
      if (to !== from) {
        Conversation.countDocuments(
          {
            $or: [
              {
                conversation_starter_email: from,
                conversation_responder_email: to,
              },
              {
                conversation_starter_email: to,
                conversation_responder_email: from,
              },
            ],
          },
          function async(err, count) {
            if (count > 0) {
              Conversation.findOne(
                {
                  $or: [
                    {
                      conversation_starter_email: from,
                      conversation_responder_email: to,
                    },
                    {
                      conversation_starter_email: to,
                      conversation_responder_email: from,
                    },
                  ],
                },
                function (err, obj) {
                  const message = Message.create({
                    conversation_id: obj._id,
                    message_from: from,
                    message_to: to,
                    message: userMessage,
                  });

                  io.emit("Chat Message Receive", {
                    from: from,
                    to: to,
                    userMessage: userMessage,
                  });
                }
              );
            } else {
              const conversation = Conversation.create({
                conversation_starter_email: from,
                conversation_responder_email: to,
              }).then((data) => {
                const message = Message.create({
                  conversation_id: data._id,
                  message_from: from,
                  message_to: to,
                  message: userMessage,
                });

                io.emit("Chat Message Receive", {
                  from: from,
                  to: to,
                  userMessage: userMessage,
                });
              });
            }
          }
        );
      } else {
        throw "Can't start a conversation with yourself.";
      }
    } catch (err) {
      console.error(err);
    }
  });
});

app.post("/check_conversation", requireAuth, async (req, res) => {
  const { email_one, email_two } = req.body;

  try {
    Conversation.findOne(
      {
        $or: [
          {
            conversation_starter_email: email_one,
            conversation_responder_email: email_two,
          },
          {
            conversation_starter_email: email_two,
            conversation_responder_email: email_one,
          },
        ],
      },
      function (err, obj) {
        if (obj === null) {
          res.status(404).json({
            res: "Nothing found",
          });
        } else {
          const messagesList = Message.find(
            { conversation_id: obj._id },
            function (err, list) {
              res.status(201).json(list);
            }
          );
        }
      }
    );
  } catch (err) {
    console.error(err);
  }
});

app.post("/affiliate_form", async (req, res) => {
  const {
    company,
    first_name,
    last_name,
    email,
    address,
    country,
    state,
    city,
    zip_code,
    phone_number,
    industry,
    affiliate_type,
    source_of_visit,
    promocode,
    terms_and_conditions,
  } = req.body;

  client.sendMail({
    from: "connectionsserver@gmail.com",
    to: "info@bizrendevous.com",
    subject: "Email from Connections: Affiliate Program",
    text: `
      Company: ${company} \n
      First Name: ${first_name} \n
      Last Name: ${last_name} \n
      Email: ${email} \n
      Address: ${address} \n
      Country: ${country} \n
      State: ${state} \n
      City: ${city} \n
      Zip Code: ${zip_code} \n
      Phone Number: ${phone_number} \n
      Industry: ${industry} \n
      Affiliate Type: ${affiliate_type} \n
      How they found about Connections and/or Bizrendevous: ${source_of_visit} \n
      Promo code: ${promocode} \n
    `,
  });

  if (email) {
    client.sendMail({
      from: "connectionsserver@gmail.com",
      to: email,
      subject: "Email from Connections: Affiliate Program",
      text: `
        Thank you for filling our affiliate form, we will stay in touch with you. \n \n

        Kind regards. \n
        Team Connections.
      `,
    });
  }

  res
    .status(201)
    .send(
      "<p style=\"width: 100%; text-align: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;\">Thanks for contacting us! We will be in touch with you shortly.</p><br /><a href=\"/\" style=\"display: block; width: 100%; text-align: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;\">Return to Home</a>"
    );
});

app.use(authRoutes);
