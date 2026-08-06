# Aswamithra — Client Requirements & Onboarding Checklist

To begin development, integration, and deployment of the **Aswamithra** platform without friction, the development team requires the following credentials, assets, operational decisions, and legal documents from the client/project owner.

---

## 1. Third-Party API Credentials & Accounts

| Service | Purpose | Specific Requirement Needed | Status |
| :--- | :--- | :--- | :---: |
| **Razorpay + Route** | Payment Gateway & Farmer Payout Split | API Key ID, Key Secret, and **Razorpay Route** feature activation enabled. Account Validation enabled for ₹1 penny-drop KYC. | ⏳ Pending |
| **Mapbox** | Maps, Pin Picker & Geo-distance | Mapbox Public Access Token (`pk.eyJ...`) & Secret Token (`sk.eyJ...`). | ⏳ Pending |
| **SMS Gateway (India)** | Mobile OTP Delivery | **MSG91** or **Fast2SMS** API Key, Sender ID, and DLT Template ID (TRAI compliance). | ⏳ Pending |
| **WhatsApp Business API** | Real-time Order & Delivery Alerts | **Interakt** / **Gupshup** API Key & approved HSM message templates (Order Placed, Out for Delivery, Payout Sent). | ⏳ Pending |
| **Firebase (FCM)** | Free Unlimited Push Notifications | Firebase Project `serviceAccountKey.json` for FCM push notification server integration. | ⏳ Pending |
| **Supabase (Self-hosted/Cloud)** | Auth, OTP Hooks & Storage | Supabase URL, Anon Key, Service Role Key, and S3 Storage bucket details. | ⏳ Pending |

---

## 2. Server & Infrastructure Access

| Item | Details Needed | Status |
| :--- | :--- | :---: |
| **VPS Server Credentials** | Server IP address, SSH Access Port, SSH Key or Sudo Username/Password (minimum 4 vCPU / 8GB RAM recommended for Docker containers). | ⏳ Pending |
| **Domain & DNS Access** | Access to DNS panel (Cloudflare / GoDaddy / Namecheap) to configure subdomains: <br>• Website: `aswamithra.in`<br>• API Server: `api.aswamithra.in`<br>• Admin Console: `admin.aswamithra.in` | ⏳ Pending |

---

## 3. Business & Operational Decisions

1. **Phase 1 Target Launch Region**:
   - Confirm the initial pilot district/mandal (e.g. *Vijayawada & Krishna District, Andhra Pradesh*).
2. **Delivery Model Confirmation**:
   - Confirm the logistics model for initial launch:
     - [ ] Option A: Farmer Self-Delivery
     - [ ] Option B: Platform Delivery Partners (Assigned per district)
     - [ ] Option C: Customer Pickup Points
3. **Commission Slab Rates Approval**:
   - Confirm initial commission slabs:
     - Orders ₹0 – ₹10,000 $\rightarrow$ **4.5%** platform commission
     - Orders ₹10,001+ $\rightarrow$ **4.0%** platform commission
4. **Market Reference Baseline Prices**:
   - Initial reference mandi market price list per product category (used for calculating "You Saved ₹X" and "Extra Earned ₹X").

---

## 4. Brand Assets & Content

- [ ] **Brand Logos**: High-resolution Vector/SVG logo (Light & Dark variants), Favicon (32x32), App Icon (512x512).
- [ ] **Homepage Banners**: 3–4 hero promotional banner graphics (1920x600px for web, 800x400px for app).
- [ ] **Social Media Links**: Official URLs for Facebook, Instagram, YouTube, X (Twitter), and WhatsApp Channel for the site footer.

---

## 5. Legal & Compliance Documents

- [ ] **Terms & Conditions**: Legal text for customer and farmer marketplace usage.
- [ ] **Privacy Policy**: Data protection terms (specifically addressing Aadhaar encryption & masked storage).
- [ ] **Refund & Dispute Policy**: Policy on damaged produce, order cancellations, and refund timelines.
- [ ] **Platform Business Details**: Platform GSTIN and FSSAI License number (if platform operates own hub storage).
