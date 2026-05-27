# **CODEVERTEX AUTH IMPLEMENTATION STANDARD**

## **Canonical Authentication, Identity, Branding & Account Architecture Standard**

### **Version 1.0**

### **Status: Production Canonical Specification**

### **Scope: All CodeVertex ecosystem applications**

---

# **1\. Purpose**

This document defines the mandatory implementation standard for every new application developed inside the CodeVertex ecosystem.

Goals:

* Single canonical identity across ecosystem  
* Per-app branding experience  
* Centralized authentication  
* Centralized account management  
* Centralized billing identity  
* Standardized onboarding  
* Standardized SSO  
* Standardized HELP integration  
* Standardized LEGAL integration  
* Eliminate duplicated authentication systems  
* Prevent security inconsistencies  
* Reduce implementation complexity for future apps

---

# **2\. Canonical Architecture**

Every application follows:

```
APP
↓
AUTH CORE
(auth.codevertex.cc)
↓
Supabase Auth (Core)
↓
Profiles
Memberships
Roles
SSO Tickets
Identity
↓
Application Callback
↓
Application Operational Database
```

Rules:

AUTH CORE owns:

* Identity  
* Login  
* Register  
* Password reset  
* Sessions  
* Connected applications  
* Security activity  
* Device management  
* Consent  
* Privacy controls  
* Account deletion requests

Application owns:

* Operational profile fields  
* Application preferences  
* Application-specific onboarding  
* Operational database entities

---

# **3\. Canonical Identity**

Mandatory canonical identity:

```
codevertex_user_id
```

This is the ecosystem identity.

Never use application operational IDs for:

* Billing  
* Memberships  
* Entitlements  
* Subscriptions  
* Analytics  
* Cross-app permissions  
* Ecosystem ownership

Example:

Correct:

```
Billing → codevertex_user_id
Entitlements → codevertex_user_id
Membership → codevertex_user_id
```

Incorrect:

```
startly_user_id
fleetos_user_id
splitly_user_id
```

Application operational IDs remain internal only.

Example:

```
public.users.id
```

May exist inside application database.

Purpose:

* RLS  
* Local operational entities  
* Internal relationships

---

# **4\. Branding Requirements**

Every application owns its visual identity.

AUTH Core must dynamically apply branding.

Mandatory branding elements:

Database:

```
apps.metadata
```

Required metadata:

```
{
 "brand_name":"Startly",
 "logo_url":"...",
 "primary_color":"#5B8DEF",
 "secondary_color":"#...",
 "return_url":"https://startly.codevertex.cc",
 "allowed_return_urls":[
   "https://startly.codevertex.cc",
   "https://startly.codevertex.cc/sso/callback"
 ]
}
```

Required fields:

```
brand_name
logo_url
primary_color
return_url
allowed_return_urls
```

---

# **5\. AUTH Screens Branding Rules**

AUTH Core MUST dynamically brand:

Login

Example:

Correct:

```
Sign in to Startly
```

Incorrect:

```
Sign in to CodeVertex
```

Branding required:

* Logo  
* Colors  
* App name  
* Background identity  
* Copy

Apply branding to:

```
Login
Register
Forgot Password
Reset Password
Security
Sessions
Connected Apps
Consent
Delete Account
Profile
Logout
```

---

# **6\. Mandatory Authentication Flows**

Every application MUST use AUTH Core.

Never implement local authentication.

Required:

Login:

```
APP
→ AUTH CORE
→ Login
→ Return App
```

Register:

```
APP
→ AUTH CORE
→ Register
→ Return App
```

Forgot password:

```
APP
→ AUTH CORE
→ Supabase resetPasswordForEmail()
```

Reset password:

```
APP
→ AUTH CORE
→ updateUser()
```

Logout:

```
APP
→ AUTH CORE
→ Sign out
→ Return App
```

---

# **7\. Mandatory Routes**

Every application must expose:

```
/login
/register
/profile
/settings
/sso/callback
```

Internally:

```
login
→ AUTH

register
→ AUTH

forgot-password
→ AUTH

reset-password
→ AUTH

profile
→ AUTH

security
→ AUTH
```

---

# **8\. SSO Architecture**

Canonical flow:

```
APP
↓
AUTH Login
↓
create-sso-ticket
↓
Redirect callback
↓
APP /sso/callback
↓
consume-sso-ticket
↓
Identity + memberships
↓
Application session
```

Rules:

SSO Ticket:

Mandatory:

```
One time use
Short TTL
Hash only storage
Single consume
```

Never:

```
Reusable tickets
Persistent tickets
Plain ticket storage
```

---

# **9\. SSO Ticket Security**

Database:

```
sso_tickets
```

Required fields:

```
token_hash
user_id
app_code
expires_at
used_at
return_to
```

Storage:

```
SHA256(ticket)
```

Never:

```
Store raw ticket
```

---

# **10\. Setup Token Architecture**

Used when application does NOT have native operational Supabase session.

Example:

Startly.

AUTH returns:

```
{
"setup_token":"JWT"
}
```

JWT:

```
{
"sub":"codevertex_user_id",
"email":"user@email.com",
"app_code":"STARTLY",
"purpose":"startly_setup",
"iat":1770000000,
"exp":1770001200
}
```

Rules:

Required claims:

```
sub
email
app_code
purpose
iat
exp
```

Required security:

```
HMAC server validation
Short TTL
Server validation only
```

Never:

```
Frontend validation trust
Secret frontend exposure
```

---

# **11\. Operational Database Ownership**

Application database owns:

Example Startly:

```
school_year
subjects
help_goals
study_preferences
main_blocker
setup_completed
```

AUTH never owns operational fields.

Operational persistence:

Preferred:

```
Edge Function
Service Role
Setup Token validation
```

Never:

```
Trust browser identity payload
```

---

# **12\. Profile Ownership Rules**

AUTH owns:

```
Name
Email
Password
Sessions
Security Activity
Devices
Connected Apps
Consent
Privacy
Delete Requests
```

Application owns:

```
Application settings
Operational profile
Preferences
Progress
```

---

# **13\. Logout Standard**

Required flow:

```
Clear local app state
↓
Clear operational session
↓
Clear SSO context
↓
AUTH signOut()
↓
Redirect branding-aware login
```

Never:

```
App local logout only
```

---

# **14\. HELP Integration**

Mandatory:

```
help.codevertex.cc
```

Required parameters:

```
app_code
locale
screen
return_url
```

Example:

```
/help?app=STARTLY&screen=setup
```

---

# **15\. LEGAL Integration**

Mandatory:

```
legal.codevertex.cc
```

Required:

```
Terms
Privacy
Cookies
Delete Request
GDPR
Security
```

Context:

```
?app=STARTLY
```

Required routes:

```
/privacy
/terms
/delete-request
/cookies
/security
```

---

# **16\. Billing Identity**

Mandatory identity:

```
codevertex_user_id
```

Never:

```
Operational database IDs
```

Billing ownership:

```
billing.codevertex.cc
```

Frontend:

```
POST Billing Core
```

Never:

```
Stripe SDK inside ecosystem applications
```

---

# **17\. Environment Variables Standard**

Required:

```
VITE_APP_CODE=

VITE_AUTH_BASE_URL=
VITE_CODEVERTEX_SUPABASE_URL=
VITE_CODEVERTEX_SUPABASE_ANON_KEY=

VITE_HELP_BASE_URL=
VITE_LEGAL_BASE_URL=

VITE_BILLING_BASE_URL=

VITE_BILLING_CHECKOUT_PATH=
VITE_BILLING_ENTITLEMENTS_PATH=
```

Server only:

```
SUPABASE_SERVICE_ROLE_KEY=

STARTLY_SSO_SHARED_SECRET=

STRIPE_SECRET_KEY=

SUPABASE_URL=
```

Never frontend:

```
SERVICE_ROLE
STRIPE_SECRET
SSO_SHARED_SECRET
```

---

# **18\. Production Domains Standard**

Core:

```
auth.codevertex.cc
billing.codevertex.cc
help.codevertex.cc
legal.codevertex.cc
```

Apps:

```
startly.codevertex.cc
splitly.codevertex.cc
fleetos.codevertex.cc
stocklist.codevertex.cc
store.codevertex.cc
```

---

# **19\. Production Deployment Checklist**

Before production:

```
[ ] Branding configured
[ ] App metadata configured
[ ] allowed_return_urls configured
[ ] Login works
[ ] Register works
[ ] Forgot password works
[ ] Reset password works
[ ] Logout works
[ ] Profile works
[ ] Security works
[ ] SSO callback works
[ ] HELP integrated
[ ] LEGAL integrated
[ ] Billing integrated
[ ] Entitlements integrated
[ ] Build OK
[ ] Lint OK
[ ] Vercel ENV configured
[ ] Edge deployed
[ ] RLS validated
[ ] No service role frontend exposure
```

---

# **20\. Application Creation Standard**

New application process:

```
Create App Metadata
↓
Configure Branding
↓
Configure Callback URLs
↓
Configure HELP
↓
Configure LEGAL
↓
Implement SSO
↓
Implement Operational Database
↓
Implement Edge Functions
↓
Validate Identity
↓
Validate Billing
↓
Production Checklist
↓
Release
```

---

# **Canonical Principle**

```
One ecosystem identity.
Application-specific branding.
Operational data isolated.
Centralized authentication.
Centralized security.
Centralized billing.
```

