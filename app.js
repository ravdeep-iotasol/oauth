const { default: axios } = require("axios");
const bodyParser = require("body-parser");
const express = require("express");
const { decode } = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

const clientId = "ADD_SECRET_SAUCE_HERE";
const clientSecret = "ADD_SECRET_SAUCE_HERE";

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
        redirect_uri: "https://apple-linkedin-login.onrender.com/auth/linkedin/callback",
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
      `com.ravdeepiota.expoapp://?fname=${fname}&lname=${lname}&photoUrl=${encodeURIComponent(profilePictureUrl)}&email=${email}`
    );
  }

  return res.redirect(
    `com.ravdeepiota.expoapp://?fname=${fname}&lname=${lname}&photoUrl=${encodeURIComponent(profilePictureUrl)}&email=${email}`
  );
});

app.post("/auth/apple/callback", async (req, res) => {
  const { user, id_token } = req.body;

  let fname = "";
  let lname = "";
  let email = "";

  // user object will only be there when it's first request for that unique user  
  if (user) {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser) {
        fname = parsedUser['name']?.['firstName'];
        lname = parsedUser['name']?.['lastName'];
        email = parsedUser['email'];
      }
    } catch (err) {
      console.log(err);

      return res.redirect(`com.ravdeepiota.expoapp://`);
    }
  } else {
    // we can get only email by decdoing the token for the subsequent requests
    const parsedToken = decode(id_token);
    email = parsedToken.email;
  }

  console.log({ email, fname, lname });
  return res.redirect(`exp://192.168.29.31:19000?fname=${fname}&lname=${lname}&email=${email}`);
});

const server = app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;