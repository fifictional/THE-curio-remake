/**
 * HTML email template for Cognito verification emails
 * The {####} placeholder will be replaced with the actual verification code
 */
export const verificationEmailTemplate = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Curio OTP</title>
<style>
body { margin:0; padding:0; background:#fdfaf5; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.card { background:#ffffff; border-radius:12px; border:1px solid #E6E6E6; padding:24px; max-width:600px; margin:20px auto; }
.headline { font-size:22px; font-weight:600; margin:16px 0 8px; color:#1a1a1a; }
.text { font-size:15px; line-height:1.5; color:#333333; margin:12px 0; }
.code { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:32px; letter-spacing:12px; font-weight:700; text-align:center; background:#f2f9f5; color:#1a1a1a; padding:16px 12px; border-radius:10px; border:1px solid #CCE5DA; user-select:all; margin:24px 0; }
.footer { font-size:12px; color:#666666; text-align:center; margin:24px 0 0; }
a { color:#1F7A4D; text-decoration:underline; }
</style>
</head>
<body>
<div class="card">
<!-- header with logo -->
<div style="margin-bottom: 20px;">
<img src="https://framerusercontent.com/images/aHT2bsmMICSVdsZq2oahcSAkE.png?width=500&height=144"
alt="Curio" width="120" style="display:block;">
</div>
<!-- story-style intro -->
<p class="text">Hey superstar ✨,</p>
<p class="text">
Every big journey starts with a single step — and yours starts here.
You're one code away from unlocking your space in Curio.
</p>
<!-- otp -->
<h1 class="headline">Your verification code</h1>
<p class="text">Enter this code to continue signing in:</p>
<div class="code">{####}</div>
<!-- supportive outro -->
<p class="text">
We can't wait to see what you'll learn, build, and explore.
Remember — you're not just logging in, you're stepping into your next chapter 🚀
</p>
<!-- security note -->
<p class="text" style="font-size:13px; color:#666;">
If you didn't request this, just ignore the email. Need help?
<a href="mailto:akshay@curio.to">akshay@curio.to</a>
</p>
<!-- footer -->
<div class="footer">
© 2025 Curio • <a href="https://curio.to">curio.to</a><br>
This is a transactional email for account security.
</div>
</div>
</body>
</html>`;

