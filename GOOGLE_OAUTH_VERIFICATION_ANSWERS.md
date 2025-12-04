# Google OAuth Verification Questionnaire - Answers

## Question 1: Is your application for personal use only?

**Answer: NO**

**Reasoning**: 
- Your app is a **public website** at `https://www.thelostandunfounds.com`
- Anyone can visit, sign up, and use the platform
- It's not limited to 100 personally known users
- The app is actively used by real users in production

---

## Question 2: Is your application for Internal use only?

**Answer: NO**

**Reasoning**:
- This is a **public-facing platform** where anyone can:
  - Sign up for an account
  - Submit blog articles
  - Create personalized subdomains
  - Subscribe to newsletters
- It's not restricted to users within your organization/domain
- External users can access and use the application

---

## Question 3: Is your application for Development/Testing/Staging use only?

**Answer: NO**

**Reasoning**:
- The app is **already in production** and live
- Website: `https://www.thelostandunfounds.com`
- Actively being used by real users
- Google OAuth is currently working in "Testing" mode (which is why you're requesting verification)
- You want to move from Testing to Production mode

---

## Question 4: Is your application a Gmail SMTP Plugin only for use by WordPress Site Admin(s)?

**Answer: NO**

**Reasoning**:
- This is **not a WordPress Gmail SMTP plugin**
- It's a React/TypeScript web application
- Built with Vite, deployed on Vercel
- Uses Supabase for backend
- Not related to WordPress at all

---

## Question 5: Verification Requirements Acknowledgment

**Answer: YES** (Check the box)

**What this means**:
- You've read the verification requirements
- Your application meets all requirements
- You understand what's needed for verification

**Requirements you meet**:
- ✅ Using only non-sensitive scopes (openid, email, profile)
- ✅ App is in production and publicly accessible
- ✅ OAuth consent screen is properly configured
- ✅ Redirect URIs are correctly set up
- ✅ App description is clear
- ✅ Privacy policy available (if required)

---

## Question 6: Restricted Scopes and CASA Acknowledgment

**Answer: YES** (Check the box, but note you don't need CASA)

**What this means**:
- You understand that **restricted scopes** require CASA (Cloud App Security Assessment)
- You understand CASA must be recertified annually

**Important for your case**:
- ✅ You are **NOT requesting restricted scopes**
- ✅ You only use **non-sensitive scopes**: `openid`, `email`, `profile`
- ✅ **You do NOT need to complete CASA** for this verification
- ✅ This acknowledgment is just confirming you understand the requirement (which doesn't apply to you)

---

## Summary of Your Answers

| Question | Answer | Notes |
|----------|--------|-------|
| Personal use only? | **NO** | Public website, unlimited users |
| Internal use only? | **NO** | Public-facing platform |
| Development/Testing only? | **NO** | Already in production |
| WordPress Gmail SMTP Plugin? | **NO** | React/TypeScript web app |
| Meet verification requirements? | **YES** | Check the box |
| Understand CASA requirements? | **YES** | Check the box (but doesn't apply to you) |

---

## Next Steps After Submission

1. **Wait for Review**: Google typically reviews within 1-7 business days
2. **Respond to Questions**: Google may ask for clarification
3. **Provide Additional Info**: If requested, refer to `GOOGLE_OAUTH_VERIFICATION_INFO.md`
4. **Approval**: Once approved, your app will be verified and users won't see warnings

---

## Important Notes

- ✅ Your app is **production-ready** and meets all requirements
- ✅ You're using **only non-sensitive scopes** (no CASA needed)
- ✅ OAuth client is properly configured
- ✅ App description clearly explains authentication-only usage
- ✅ Test users are available for verification testing

**You're ready to submit!** 🚀
