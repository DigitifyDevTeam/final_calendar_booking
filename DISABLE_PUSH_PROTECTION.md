# How to Disable GitHub Push Protection

## Quick Solution: Disable Push Protection in Repository Settings

### Step 1: Go to Repository Settings
1. Open your repository on GitHub:
   - URL: `https://github.com/DigitifyDevTeam/final_calendar_booking`
   
2. Click on **Settings** tab (top right of repository page)

### Step 2: Navigate to Secret Scanning
1. In the left sidebar, click **Code security and analysis**
2. Scroll down to **Secret scanning** section
3. Find **"Push protection"** option

### Step 3: Disable Push Protection
1. Toggle **OFF** the switch for "Block pushes that contain secrets"
2. Click **Save** or confirm the change

### Step 4: Push Your Code
After disabling, you can push normally:
```bash
git push origin master
```

---

## Alternative: Allow Specific Secrets (One-Time)

If you want to keep push protection but allow these specific secrets, use the URLs from the error message:

1. **For OAuth Refresh Token:**
   Visit: https://github.com/DigitifyDevTeam/final_calendar_booking/security/secret-scanning/unblock-secret/37NzS48RDIpgDm65M2s6kZPsgaB

2. **For OAuth Client ID:**
   Visit: https://github.com/DigitifyDevTeam/final_calendar_booking/security/secret-scanning/unblock-secret/37NzRyY9kAVaqXQt5jU6TH3GgfA

3. **For OAuth Client Secret:**
   Visit: https://github.com/DigitifyDevTeam/final_calendar_booking/security/secret-scanning/unblock-secret/37NzRykWbxU0iRnTUeJk8dfiKpY

Click "Allow secret" on each page, then try pushing again.

---

## Note
- Disabling push protection means GitHub won't warn you about secrets in the future
- This is your repository, so you have full control over these settings
- Secrets will still be scanned in the repository, but they won't block your pushes

