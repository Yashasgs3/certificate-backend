# PHP to Node.js Backend Integration Guide

## ✅ What Just Happened

You now have a complete **PHP ↔ Node.js ↔ MongoDB** integration system.

### The Flow:

```
1. User scans QR code on certificate
                ↓
2. QR opens broadbeachonline.com/admin/pages/admincontactus.php?cert=CERT-001
                ↓
3. PHP page loads & calls your Node.js backend API
                ↓
4. Backend fetches certificate from MongoDB
                ↓
5. PHP displays certificate details automatically
                ↓
6. View is logged to MongoDB (who viewed, when, from where)
```

---

## 📋 STEP 1: Update Your QR Code to Point to PHP

In your `certificateGenerator.js`, update the QR URL:

**Current:**
```javascript
const qrUrl = verificationUrl || `${BASE_URL}/verify?cert=${certificateNumber}`;
```

**CHANGE TO:**
```javascript
const qrUrl = `https://www.broadbeachonline.com/admin/pages/admincontactus.php?cert=${certificateNumber}`;
```

---

## 📋 STEP 2: Copy PHP File to Your Server

Copy the file we created:
```
backend/public/admincontactus-template.php
```

To your broadbeachonline.com server:
```
/admin/pages/admincontactus.php
```

**Steps:**
1. Download `admincontactus-template.php` from your backend folder
2. Upload to: `https://www.broadbeachonline.com/admin/pages/admincontactus.php`
3. Replace the old file

---

## 📋 STEP 3: Verify Backend API Works

The backend now has these endpoints ready:

### **GET** - Verify Certificate (Returns Data)
```
https://certificate-backend-1kcb.onrender.com/api/certificates/verify/CERT-FINAL-2026-001
```

**Response:**
```json
{
  "valid": true,
  "certificate": {
    "fullName": "Yashas G S",
    "email": "yashasgs7@gmail.com",
    "courseName": "ISO 9001 Quality Management",
    "certificateNumber": "CERT-FINAL-2026-001",
    "issueDate": "17 Feb 2026",
    "status": "active"
  }
}
```

### **POST** - Log View (Stores in MongoDB)
```
https://certificate-backend-1kcb.onrender.com/api/certificates/log-view
```

**Request Body:**
```json
{
  "certificateNumber": "CERT-FINAL-2026-001",
  "viewedAt": "2026-02-18T10:30:00",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🔄 How It Works (Behind The Scenes)

### **What Happens When User Scans QR:**

1. **QR Scanned**
   - Certificate QR → broadbeachonline.com/admin/pages/admincontactus.php?cert=CERT-001

2. **PHP Page Loads**
   ```php
   $cert_id = $_GET['cert'];  // Gets CERT-001 from URL
   ```

3. **PHP Calls Backend**
   ```php
   $api_url = "https://...onrender.com/api/certificates/verify/" . $cert_id;
   $response = file_get_contents($api_url);  // REST API call
   $data = json_decode($response, true);     // Parse JSON
   ```

4. **Backend Queries MongoDB**
   ```javascript
   Certificate.findOne({ certificateNumber: "CERT-001" })
   // Returns: fullName, email, courseName, issueDate, status
   ```

5. **PHP Displays Data**
   ```php
   echo $data['fullName'];      // Yashas G S
   echo $data['courseName'];    // ISO 9001
   ```

6. **View is Logged**
   ```javascript
   certificate.verificationCount++  // Now = 1
   certificate.lastVerifiedAt = new Date()
   certificate.verificationIPs.push("192.168.1.1")
   certificate.save()  // Saved to MongoDB
   ```

---

## 📊 MongoDB Schema (Updated)

**Certificate Document Now Tracks:**

```javascript
{
  fullName: "Yashas G S",
  email: "yashasgs7@gmail.com",
  courseName: "ISO 9001",
  certificateNumber: "CERT-001",
  status: "active",
  
  // NEW - Verification Tracking:
  verificationCount: 5,           // How many times viewed
  lastVerifiedAt: 2026-02-18,    // Last view date
  verificationIPs: [              // IPs that viewed certificate
    "192.168.1.1",
    "203.456.789.1",
    "10.0.0.5"
  ]
}
```

---

## 🔐 Security Features

✅ **Cross-Origin Requests Allowed** - PHP can call Node.js backend from different domain
✅ **Certificate Status Verified** - Shows "revoked" or "expired" if applicable
✅ **IP Tracking** - Records who viewed certificate
✅ **Error Handling** - Shows friendly messages if certificate invalid

---

## 📱 Test It Right Now

### **Test 1: Verify API Works**
```
Open in Browser:
https://certificate-backend-1kcb.onrender.com/api/certificates/verify/CERT-FINAL-2026-001
```
You should see JSON response ✅

### **Test 2: Open PHP Page**
```
https://www.broadbeachonline.com/admin/pages/admincontactus.php?cert=CERT-FINAL-2026-001
```
Certificate details should auto-populate ✅

### **Test 3: Check MongoDB**
```
Go to MongoDB Atlas → Collections → Certificate
Find the certificate → Check verificationCount increased ✅
```

---

## 🚀 Features Included

| Feature | Status |
|---------|--------|
| Auto-fetch from MongoDB | ✅ |
| Display certificate details | ✅ |
| Log views to database | ✅ |
| Show verification status | ✅ |
| Handle errors gracefully | ✅ |
| Professional UI design | ✅ |
| Mobile responsive | ✅ |
| Track IP addresses | ✅ |
| Track view dates | ✅ |

---

## 🎯 Next Steps

1. ✅ Update `certificateGenerator.js` with new QR URL
2. ✅ Upload `admincontactus.php` to broadbeachonline.com
3. ✅ Generate new certificate to test
4. ✅ Scan QR code - should auto-populate PHP page
5. ✅ Check MongoDB - verification count should increase

---

## 📝 Summary

Your system now:
- ✅ Generates PDFs with QR codes (Puppeteer)
- ✅ QR points to PHP verification page
- ✅ PHP fetches certificate data from MongoDB (Node.js)
- ✅ Page auto-populates with certificate details
- ✅ Views are logged to MongoDB for tracking
- ✅ Shows professional verification page
- ✅ Tracks who viewed certificate and when

**Like a real verification system (Coursera, Udemy style)** ✨

---

## ⚠️ Important Notes

1. **Backend Must Be Running** - `node server.js` needs to be active
2. **CORS Enabled** - Already configured in server.js
3. **Email Included** - PHP receives email in response (optional to display)
4. **Render.com URL** - Update if you change deployment later

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| PHP shows "Certificate not found" | Check certificate number is correct in MongoDB |
| Page doesn't auto-populate | Verify backend server is running |
| No data in verificationCount | Make sure changes are deployed |
| PHP page blank | Check file was uploaded to correct location |
| CORS error | Verify `cors()` is enabled in server.js |

---

## 📧 Questions?

Everything is automated now. Just:
1. Scan QR
2. Details appear
3. Views tracked in MongoDB

Enjoy! 🎉
