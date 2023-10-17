const express = require("express");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");
const { requireAuth, checkUser } = require("./middleware/authMiddleware");
const searchController = require("./controllers/searchController");
const profileController = require("./controllers/profileController");
const { Server } = require("socket.io");
const https = require("https");
const User = require("./models/User");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const https_options = {
  key: fs.readFileSync("/etc/pki/tls/private/connections.bizrendevous.com.key"),
  cert: fs.readFileSync("/etc/pki/tls/certs/connections.bizrendevous.com.cert"),
  ca: [
    fs.readFileSync("/etc/pki/tls/certs/ca-bundle.crt"),
    fs.readFileSync("/etc/pki/tls/certs/connections.bizrendevous.com.bundle"),
  ],
};

const app = express();
const server = https.createServer(https_options, app);
const io = new Server(server);

app.use(express.static("public"));
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
  .then((result) => server.listen(8443))
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

app.get("/search_conversation", requireAuth, searchController.search_users);

io.on("connection", (socket) => {
  let userData = [];

  socket.on("disconnect", () => {
  });

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

app.use(authRoutes);
