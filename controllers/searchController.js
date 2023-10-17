const User = require("../models/User");

module.exports.search_users = async (req, res) => {
  const query = req.query.query;

  try {
    const users = await User.searchUsers(query);
    const users_companies = [];
    const users_pfps = [];
    const users_email = [];

    const data = {
      companies: users_companies,
      profile_pictures: users_pfps,
      emails: users_email,
    };

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      users_companies.push(user.company);
      users_pfps.push(user.profilePicture);
      users_email.push(user.email);
    }

    res.status(201).json({ data });
  } catch (err) {
    res.status(400).json({ err });
  }
};
