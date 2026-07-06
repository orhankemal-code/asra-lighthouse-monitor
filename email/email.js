const nodemailer = require("nodemailer");

async function sendMail(subject, html) {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: process.env.MAIL_TO,
        subject,
        html,
    });

    console.log("✅ Mail başarıyla gönderildi.");
}

module.exports = sendMail;
