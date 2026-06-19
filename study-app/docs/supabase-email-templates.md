# Supabase Email Templates

Paste these in Supabase Dashboard -> Authentication -> Emails -> Templates.

Supabase supports variables like `{{ .ConfirmationURL }}`, `{{ .Email }}`, and `{{ .SiteURL }}` inside auth email templates.

## Confirm Sign Up

Subject:

```text
Confirm your CCNY Study AI account
```

Body:

```html
<div style="margin:0;background:#f7f4ff;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#302d2a;">
  <div style="margin:0 auto;max-width:560px;border:1px solid #ded8ef;border-radius:28px;background:#ffffff;box-shadow:0 24px 70px rgba(49,31,91,0.14);overflow:hidden;">
    <div style="padding:28px 30px 12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="height:44px;width:44px;border-radius:14px;background:#6d28ff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;letter-spacing:-0.03em;">CC</div>
        <div>
          <div style="font-size:20px;font-weight:900;letter-spacing:-0.03em;">CCNY Study AI</div>
          <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#6d28ff;">Course-aware workspace</div>
        </div>
      </div>
    </div>

    <div style="padding:18px 30px 34px;">
      <h1 style="margin:0 0 10px;font-size:34px;line-height:1.05;letter-spacing:-0.04em;color:#302d2a;">Confirm your account</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#6d6964;">
        Welcome to CCNY Study AI. Confirm <strong>{{ .Email }}</strong> so your courses, chats, notes, flashcards, and study history can stay connected to your account.
      </p>

      <a href="{{ .ConfirmationURL }}" style="display:block;border-radius:18px;background:#6d28ff;padding:16px 20px;text-align:center;color:#ffffff;text-decoration:none;font-size:16px;font-weight:900;">
        Confirm email
      </a>

      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#8b8791;">
        If the button does not work, copy and paste this link into your browser:<br>
        <span style="word-break:break-all;color:#6d28ff;">{{ .ConfirmationURL }}</span>
      </p>
    </div>
  </div>

  <p style="margin:18px auto 0;max-width:560px;text-align:center;font-size:13px;line-height:1.5;color:#8b8791;">
    Built for students at The City College of New York. Created by Raghed Soliman.
  </p>
</div>
```

## Reset Password

Subject:

```text
Reset your CCNY Study AI password
```

Body:

```html
<div style="margin:0;background:#f7f4ff;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#302d2a;">
  <div style="margin:0 auto;max-width:560px;border:1px solid #ded8ef;border-radius:28px;background:#ffffff;box-shadow:0 24px 70px rgba(49,31,91,0.14);overflow:hidden;">
    <div style="padding:28px 30px 12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="height:44px;width:44px;border-radius:14px;background:#6d28ff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;letter-spacing:-0.03em;">CC</div>
        <div>
          <div style="font-size:20px;font-weight:900;letter-spacing:-0.03em;">CCNY Study AI</div>
          <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#6d28ff;">Account security</div>
        </div>
      </div>
    </div>

    <div style="padding:18px 30px 34px;">
      <h1 style="margin:0 0 10px;font-size:34px;line-height:1.05;letter-spacing:-0.04em;color:#302d2a;">Reset your password</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#6d6964;">
        Use this secure link to choose a new password for <strong>{{ .Email }}</strong>. After saving it, you can login with your email and new password.
      </p>

      <a href="{{ .ConfirmationURL }}" style="display:block;border-radius:18px;background:#6d28ff;padding:16px 20px;text-align:center;color:#ffffff;text-decoration:none;font-size:16px;font-weight:900;">
        Choose new password
      </a>

      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#8b8791;">
        If you did not request this, you can ignore this email. Your current password will stay the same.
      </p>
      <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#8b8791;">
        Link: <span style="word-break:break-all;color:#6d28ff;">{{ .ConfirmationURL }}</span>
      </p>
    </div>
  </div>

  <p style="margin:18px auto 0;max-width:560px;text-align:center;font-size:13px;line-height:1.5;color:#8b8791;">
    Built for students at The City College of New York. Created by Raghed Soliman.
  </p>
</div>
```
