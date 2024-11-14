const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI_MAIL
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN_MAIL,
});

const sendMail = async (data) => {
  const accessToken = await oAuth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GOOGLE_SENDER_MAIL,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN_MAIL,
      accessToken,
    },
  });

  const mailData = {
    from: `EZ BUY <${process.env.GOOGLE_SENDER_MAIL}>`,
    to: data.to,
    subject: data.subject,
    html: data.body,
  };

  const result = await transporter.sendMail(mailData);
};

module.exports = sendMail;
