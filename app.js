const { default: axios } = require("axios");
const bodyParser = require("body-parser");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

const clientId = "77ysyjuj4aeszo";
const clientSecret = "V4QzAh5iL04EPx3U";

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => res.type("html").send("hi"));
app.get("/auth/linkedin/callback", async (req, res) => {
  const { code } = req.query;

  let fname = "";
  let lname = "";
  let profilePictureUrl = null;
  let email = "";

  try {
    const accessTokenRequest = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        grant_type: "authorization_code",
        code,
        redirect_uri: "http://192.168.29.31:3000/auth/linkedin/callback",
        client_id: clientId,
        client_secret: clientSecret,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const accessToken = accessTokenRequest.data.access_token;
    const { data } = await axios.get("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        projection:
          "(localizedFirstName,localizedLastName,id,profilePicture(displayImage~:playableStreams),organizations)",
      },
    });

    const { data: emailAddressData } = await axios.get(
      "https://api.linkedin.com/v2/clientAwareMemberHandles",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          q: "members",
          projection: "(elements*(primary,type,handle~))",
        },
      }
    );

    email = emailAddressData?.elements[0]["handle~"].emailAddress;

    if (data.profilePicture) {
      const profilePictures = data.profilePicture["displayImage~"].elements;
      profilePictureUrl =
        !!profilePictures.length &&
        profilePictures[profilePictures.length - 1].identifiers[0].identifier;
    }

    fname = data.localizedFirstName;
    lname = data.localizedLastName;
    console.log({ email, fname, lname, profilePictureUrl });
  } catch (err) {
    console.log(err);
    return res.redirect(
      `exp://192.168.29.31:19000?fname=${fname}&lname=${lname}&photoUrl=${encodeURIComponent(profilePictureUrl)}&email=${email}`
    );
  }

  return res.redirect(
    `exp://192.168.29.31:19000?fname=${fname}&lname=${lname}&photoUrl=${encodeURIComponent(profilePictureUrl)}&email=${email}`
  );
});

app.get("/auth/apple/callback", async (req, res) => {
  console.log("chal ja get", JSON.stringify(req.query));
  return res.redirect(`exp://192.168.1.14:19000?fname=test`);
});

app.post("/auth/apple/callback", async (req, res) => {
  const { user } = req.body;
  console.log(user, user.name);

  let fname = "";
  let lname = "";
  let email = "";

  if (user) {
    fname = user['name']?.['firstName'];
    lname = user['name']?.['lastName'];
    email = user['email'];
    console.log(fname, lname, email);
  }

  return res.redirect(`exp://192.168.1.14:19000?fname=${fname}&lname=${lname}&email=${email}`);
});

const server = app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)

);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;