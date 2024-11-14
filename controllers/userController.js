const { uploadUserImg } = require("../middleware/uploader");

const {
  signupService,
  findUserByEmailService,
  findUserByIdService,
  updateUserService,
  findUserByTokenService,
  dashboardUserDataService,
  dashboardOrderDataService,
} = require("../services/userService");
const { userImgPath } = require("../utils/constants");
const sendMail = require("../utils/email");
const { oauth2Client } = require("../utils/googleClient");

const {
  response,
  isObjEmpty,

  restrictField,
} = require("../utils/helperFunctions");
const { generateToken, revokedToken, getToken } = require("../utils/token");

exports.signup = async (req, res) => {
  try {
    if (isObjEmpty(req.body)) {
      return response(res, 400, "failed", "No data found!!!");
    }

    const user = await signupService(req.body);

    response(res, 201, true, "successfully signed up");
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return response(res, 400, false, "Please provide your credentials");
    }

    const user = await findUserByEmailService(email);

    if (!user) {
      return response(
        res,
        404,
        false,
        "No user found. Please create an account"
      );
    }

    const isPasswordValid = user.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return response(res, 400, false, "Wrong Password!!");
    }

    if (user.status !== "active") {
      return response(
        res,
        400,
        false,
        `Sorry!. Your account is ${user.status}.${
          user.status === "inactive"
            ? "Please Verify Your Account Via Email"
            : "Please Contact Via Support"
        }`
      );
    }

    const token = generateToken(user);

    const { password: pwd, ...others } = user.toObject();

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    response(res, 200, true, "successfully logged in", null, {
      user: others,
      token,
    });
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

//google auth
// exports.googleAuth = async (req, res) => {
//   const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email&access_type=offline`;
//   res.redirect(url);
// };

exports.googleAuthCallback = async (req, res) => {
  const { code } = req.query;
  try {
    const googleResponse = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleResponse.tokens);

    const fetchGoogleUser = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleResponse.tokens.access_token}`
    );

    const result = await fetchGoogleUser.json();

    if (result?.error) {
      return response(res, 400, false, "something went wrong");
    }

    const { email, name } = result;

    const user = await findUserByEmailService(email);

    if (!user) {
      const password =
        Math.random().toString(36).slice(-8) + new Date().getTime();

      const isAlphabet = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/.test(name); //regex to check if name contains only alphabets

      const newUser = await signupService({
        fullName: isAlphabet ? name : "John Doe",
        email,
        password,
        confirmPassword: password,
        status: "active",
        gender: "male",
        lastLogin: new Date(),
      });
      const token = generateToken(newUser);
      const { password: pwd, ...others } = newUser.toObject();

      return response(res, 200, true, "successfully logged in", null, {
        user: others,
        token,
      });
    } else {
      if (user.status !== "active") {
        return response(
          res,
          400,
          false,
          `Sorry!. Your account is ${user.status}.${
            user.status === "inactive"
              ? "Please Verify Your Account Via Email"
              : "Please Contact Via Support"
          }`
        );
      }

      const token = generateToken(user);

      const { password: pwd, ...others } = user.toObject();

      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      return response(res, 200, true, "successfully logged in", null, {
        user: others,
        token,
      });
    }
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.getMe = async (req, res) => {
  const userId = req?.user?.id;

  try {
    const user = await findUserByIdService(
      userId,
      "-_id fullName email contactNumber gender address"
    );

    if (!user) {
      return response(res, 404, false, "No user Found");
    }

    response(res, 200, true, null, null, user);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.updateUserProfile = async (req, res) => {
  const { id: userId } = req?.user;
  try {
    if (isObjEmpty(req.body)) {
      return response(res, 400, false, "No data found!!!");
    }

    const allowedFieldArray = [
      "fullName",
      "email",
      "gender",
      "address",
      "contactNumber",
    ];

    const isValidField = Object.keys(req.body).every((field) =>
      allowedFieldArray.includes(field)
    );

    if (!isValidField) {
      return response(
        res,
        400,
        false,
        "You are trying to update invalid field",
        null
      );
    }

    const result = await updateUserService(userId, req.body);

    if (!result.acknowledged) {
      return response(res, 400, false, "Updated failed!!!");
    }

    return response(res, 200, true, "successfully updated");
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.updateUserImage = async (req, res) => {
  const { id: userId } = req.user;
  try {
    if (!req.file) {
      return response(res, 400, false, "field required!!!");
    }
    // const user = await findUserByIdService(userId);
    const imgUrl = await uploadUserImg(req, res);
    const updatedImg = await updateUserService(userId, {
      imgUrl: imgUrl,
    });
    if (!updatedImg.acknowledged) {
      return response(res, 400, false, "Updated failed!!!");
    }
    response(res, 200, true, "successfully updated profile picture");
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req?.body;
    const { id: userId } = req?.user;

    const user = await findUserByIdService(userId);

    const isSamePassword = user.comparePassword(password, user.password);

    if (isSamePassword) {
      return response(res, 400, false, "you are using old password again");
    }

    user.password = password;
    user.confirmPassword = confirmPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    const existingToken = getToken(req);

    revokedToken.add(existingToken);

    response(res, 200, true, "successfully updated");
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.resetPasswordToken = async (req, res, next) => {
  try {
    const email = req.body?.email;

    if (!email) {
      return response(res, 400, false, "Email Required!!!");
    }
    const user = await findUserByEmailService(email);

    if (!user) {
      return response(res, 404, false, "No user found with this email!!!");
    }

    if (user.status !== "active") {
      return response(res, 400, false, "Your account is not active");
    }

    const token = await user.generateResetToken();

    if (!token) {
      return response(res, 400, false, "Something went wrong!!! Try Again");
    }

    await user.save({ validateBeforeSave: false });

    const resetPasswordUri = `${process.env.CLIENT_URI}/new-password/${token}`;

    const mailData = {
      to: email,
      subject: "Password Reset Request - EZ BUY",
      body: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your ezbuy Password</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
        body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background-color: #4A90E2;
            text-align: center;
            padding: 20px;
        }
        .logo {
            color: white;
            font-size: 28px;
            font-weight: 700;
            text-decoration: none;
        }
        .content {
            padding: 40px 20px;
        }
        h1 {
            color: #e74c3c;
            font-size: 24px;
            margin-bottom: 20px;
        }
        p {
            margin-bottom: 20px;
            font-size: 16px;
        }
        .button {
            display: inline-block;
            background-color: #e74c3c;
            color: white !important;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            link: none;
        }
       a:link, a:visited {
          text-decoration: none !important;
          color: white !important;
        }
        .info {
            background-color: #f9f9f9;
            border-left: 4px solid #4A90E2;
            padding: 15px;
            margin-top: 20px;
        }
        .footer {
            background-color: #333333;
            color: #ffffff;
            text-align: center;
            padding: 20px;
            font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
            }
            .content {
                padding: 20px 10px;
            }
            .button {
                display: block;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <p  class="logo">EZbuy</p>
        </div>
        <div class="content">
            <h1>Reset Your Password</h1>
            <p>Hello,</p>
            <p>We received a request to reset the password for your ezbuy account. If you didn't make this request, you can safely ignore this email.</p>
            <a href="${resetPasswordUri}" class="button">Reset My Password</a>
           
            <div class="info">
                <p style="margin-bottom: 10px;"><strong>Important:</strong></p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>This link will expire in 5 minutes.</li>
                    <li>For security reasons, please reset your password immediately.</li>
                </ul>
            </div>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The ezbuy Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ezbuy. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`,
    };

    await sendMail(mailData);

    response(res, 200, true, "Reset Password Link Sent to Your Email");
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.getResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await findUserByTokenService(token);

    if (!user) {
      return response(res, 404, false, "Invalid Token. Try Again!!!");
    }
    const expired = new Date() > new Date(user.passwordResetExpires);
    if (expired) {
      return response(res, 404, false, "Token Expired!!!");
    }
    response(res, 200, true, "Token is valid", null, {
      token,
    });
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req?.body;

    if (!password || !confirmPassword) {
      return response(res, 400, false, "field required!!!");
    }

    const { token } = req?.params;

    if (!token) {
      return response(res, 400, false, "Something went wrong!!!");
    }

    const user = await findUserByTokenService(token);

    if (!user) {
      return response(res, 404, false, "Invalid Token. Try Again!!!");
    }
    const expired = new Date() > new Date(user.passwordResetExpires);

    if (expired) {
      return response(res, 404, false, "Token Expired!!!");
    }

    user.password = password;
    user.confirmPassword = confirmPassword;
    user.passwordResetExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordChangedAt = new Date();

    await user.save();
    response(res, 200, true, "Successfully updated password");
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = getToken(req);

    if (!token) {
      return response(res, 400, false, "Something went wrong!!!");
    }

    revokedToken.add(token);

    response(res, 200, true, "Logout successfully");
  } catch (error) {
    response(res, 400, false, "Something Went Wrong", error);
    r;
  }
};

exports.dashboardAnalytics = async (req, res) => {
  const userId = req?.user?.id;

  try {
    if (!userId) {
      return response(res, 400, false, "Invalid User");
    }
    const userAnalytics = await dashboardUserDataService(userId);

    if (!userAnalytics) {
      return response(res, 404, false, "No user Found");
    }

    const orderAnalytics = await dashboardOrderDataService(userId);

    if (!orderAnalytics) {
      return response(res, 404, false, "No order Found");
    }

    response(res, 200, true, "successfully fetched user data analytics", null, {
      user: userAnalytics,
      order: orderAnalytics[0],
    });
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};
