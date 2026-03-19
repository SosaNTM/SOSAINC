export type VaultItemType = "credential" | "api_key" | "document" | "note";

export interface VaultItem {
  id: string;
  type: VaultItemType;
  name: string;
  category: string;
  isLocked: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null;
  expiresAt: Date | null;
  credential?: { username: string; password: string; url: string; notes: string };
  apiKey?: { key: string; service: string; environment: string; notes: string };
  document?: { filename: string; size: number; mimeType: string };
  note?: { content: string };
}

function d(daysAgo: number, h = 10): Date {
  const dt = new Date(); dt.setDate(dt.getDate() - daysAgo); dt.setHours(h, 0, 0, 0); return dt;
}

export const LOCKED_FOLDER_PASSWORD = "vault2025";

// ── SEED DATA PER PORTAL ─────────────────────────────────────────────────────

const SEED_VAULT: Record<string, VaultItem[]> = {
  sosa: [
    { id: "v_01", type: "credential", name: "AWS Console", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(60), updatedAt: d(5), lastAccessedAt: d(3), expiresAt: null, credential: { username: "admin@company.com", password: "Aw$Pr0d!Secur3#2025", url: "https://console.aws.amazon.com", notes: "Production account" } },
    { id: "v_02", type: "credential", name: "Google Workspace", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(90), updatedAt: d(1), lastAccessedAt: d(0), expiresAt: null, credential: { username: "admin@iconoff.com", password: "G00gl3W0rk$p@ce!", url: "https://admin.google.com", notes: "Super admin account" } },
    { id: "v_03", type: "credential", name: "Shopify Admin", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(45), updatedAt: d(10), lastAccessedAt: d(7), expiresAt: null, credential: { username: "store-admin@iconoff.com", password: "Sh0p1fy@dm1n!", url: "https://iconoff.myshopify.com/admin", notes: "Main storefront" } },
    { id: "v_04", type: "credential", name: "Banking Portal", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(120), updatedAt: d(15), lastAccessedAt: d(2), expiresAt: null, credential: { username: "iconoff-srl", password: "B@nk!ng_Secur3#99", url: "https://business.intesasanpaolo.com", notes: "Company business account" } },
    { id: "v_05", type: "credential", name: "Email Server (SMTP)", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(80), updatedAt: d(20), lastAccessedAt: d(14), expiresAt: null, credential: { username: "noreply@iconoff.com", password: "SMTP_s3nd3r#2025", url: "smtp.mailgun.org:587", notes: "Transactional emails" } },
    { id: "v_06", type: "credential", name: "Hosting Panel", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(100), updatedAt: d(30), lastAccessedAt: d(10), expiresAt: null, credential: { username: "root@iconoff", password: "H0st!ng_P@nel#vps", url: "https://panel.hetzner.com", notes: "VPS management" } },
    { id: "v_07", type: "api_key", name: "Stripe Live Key", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(40), updatedAt: d(5), lastAccessedAt: d(1), expiresAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), apiKey: { key: "sk_demo_51NxCQpGkR7v8LmTfJ2wXyZ9aBcDeFgHiJkLmNoPqRsTuVwXyZ", service: "Stripe", environment: "Production", notes: "Live payment processing" } },
    { id: "v_08", type: "api_key", name: "Google Maps API", category: "API Keys", isLocked: false, createdBy: "usr_002", createdAt: d(55), updatedAt: d(20), lastAccessedAt: d(5), expiresAt: null, apiKey: { key: "AIzaSyB1a2c3D4e5F6g7H8i9J0kLmNoPqRsTuVw", service: "Google Maps", environment: "Production", notes: "Client map widgets" } },
    { id: "v_09", type: "api_key", name: "SendGrid API", category: "API Keys", isLocked: false, createdBy: "usr_002", createdAt: d(35), updatedAt: d(8), lastAccessedAt: d(0), expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), apiKey: { key: "SG.abcdefghijklmnopqrstuvwxyz.1234567890ABCDEFGHIJ", service: "SendGrid", environment: "Production", notes: "Email delivery service" } },
    { id: "v_10", type: "api_key", name: "Analytics Key", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(70), updatedAt: d(12), lastAccessedAt: d(3), expiresAt: null, apiKey: { key: "UA-12345678-1", service: "Google Analytics", environment: "Production", notes: "Website analytics tracking" } },
    { id: "v_11", type: "document", name: "Insurance Policy 2025", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(15), updatedAt: d(15), lastAccessedAt: d(5), expiresAt: null, document: { filename: "Insurance_Policy_2025.pdf", size: 2400000, mimeType: "application/pdf" } },
    { id: "v_12", type: "document", name: "Company Registration", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(200), updatedAt: d(200), lastAccessedAt: d(30), expiresAt: null, document: { filename: "Company_Registration.pdf", size: 1800000, mimeType: "application/pdf" } },
    { id: "v_13", type: "document", name: "Partnership Agreement", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(50), updatedAt: d(50), lastAccessedAt: d(20), expiresAt: null, document: { filename: "Partnership_Agreement.pdf", size: 3200000, mimeType: "application/pdf" } },
    { id: "v_14", type: "credential", name: "Secret Client Portal", category: "Credentials", isLocked: true, createdBy: "usr_001", createdAt: d(25), updatedAt: d(10), lastAccessedAt: d(4), expiresAt: null, credential: { username: "admin", password: "Cl13nt_S3cr3t!#VIP", url: "https://vip-portal.client.com", notes: "VIP client — do not share" } },
    { id: "v_15", type: "document", name: "Confidential Agreement", category: "Documents", isLocked: true, createdBy: "usr_001", createdAt: d(40), updatedAt: d(40), lastAccessedAt: d(15), expiresAt: null, document: { filename: "Confidential_Agreement_NDA.pdf", size: 3200000, mimeType: "application/pdf" } },
    { id: "v_16", type: "note", name: "Emergency Access Codes", category: "Notes", isLocked: true, createdBy: "usr_001", createdAt: d(30), updatedAt: d(10), lastAccessedAt: d(7), expiresAt: null, note: { content: "Recovery codes:\n1. AB12-CD34-EF56\n2. GH78-IJ90-KL12\n3. MN34-OP56-QR78\n\nMaster backup passphrase: correct-horse-battery-staple" } },
  ],
  keylo: [
    { id: "kv_01", type: "credential", name: "Shopify Plus Admin", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(60), updatedAt: d(2), lastAccessedAt: d(0), expiresAt: null, credential: { username: "admin@keylo.com", password: "Keylo_Sh0p!fy#Plus", url: "https://keylo.myshopify.com/admin", notes: "Main storefront admin" } },
    { id: "kv_02", type: "credential", name: "TikTok Ads Manager", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(45), updatedAt: d(1), lastAccessedAt: d(0), expiresAt: null, credential: { username: "ads@keylo.com", password: "T1kt0k_K3yloAds!", url: "https://ads.tiktok.com", notes: "Main ad account" } },
    { id: "kv_03", type: "credential", name: "Meta Business Suite", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(80), updatedAt: d(3), lastAccessedAt: d(1), expiresAt: null, credential: { username: "ads@keylo.com", password: "M3ta_K3ylo#Biz!", url: "https://business.facebook.com", notes: "Facebook & Instagram ads" } },
    { id: "kv_04", type: "credential", name: "Amazon Seller Central", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(100), updatedAt: d(7), lastAccessedAt: d(2), expiresAt: null, credential: { username: "seller@keylo.com", password: "Amazon_S3ll3r#EU!", url: "https://sellercentral.amazon.eu", notes: "EU marketplace account" } },
    { id: "kv_05", type: "credential", name: "Klaviyo Account", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(55), updatedAt: d(5), lastAccessedAt: d(1), expiresAt: null, credential: { username: "email@keylo.com", password: "Klav1yo_K3ylo!", url: "https://www.klaviyo.com", notes: "Email & SMS marketing" } },
    { id: "kv_06", type: "credential", name: "Warehouse WMS Portal", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(90), updatedAt: d(10), lastAccessedAt: d(3), expiresAt: null, credential: { username: "ops@keylo.com", password: "WMS_K3ylo#Ops2025", url: "https://wms.3pl-partner.com", notes: "3PL warehouse management" } },
    { id: "kv_07", type: "api_key", name: "Shopify Storefront API", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(40), updatedAt: d(5), lastAccessedAt: d(1), expiresAt: null, apiKey: { key: "shpat_1a2b3c4d5e6f7g8h9i0jKeylo2025AbCd", service: "Shopify", environment: "Production", notes: "Headless storefront access" } },
    { id: "kv_08", type: "api_key", name: "Klaviyo Private Key", category: "API Keys", isLocked: false, createdBy: "usr_002", createdAt: d(55), updatedAt: d(20), lastAccessedAt: d(4), expiresAt: null, apiKey: { key: "pk_kl_1a2b3c4d5e6f7g8h9i0j_keylo_prod", service: "Klaviyo", environment: "Production", notes: "Email automation flows" } },
    { id: "kv_09", type: "api_key", name: "TikTok Ads API", category: "API Keys", isLocked: false, createdBy: "usr_002", createdAt: d(35), updatedAt: d(8), lastAccessedAt: d(0), expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), apiKey: { key: "TTAS_KeyloAds_1a2b3c4d5e6f7g8h9i0j", service: "TikTok Ads", environment: "Production", notes: "Campaign management API" } },
    { id: "kv_10", type: "api_key", name: "Google Shopping Feed", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(70), updatedAt: d(12), lastAccessedAt: d(3), expiresAt: null, apiKey: { key: "GSF-KeyloEU-1a2b3c4d-5e6f-7g8h", service: "Google Merchant Center", environment: "Production", notes: "Product feed API" } },
    { id: "kv_11", type: "document", name: "Supplier Agreement – Factory A", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(45), updatedAt: d(45), lastAccessedAt: d(10), expiresAt: null, document: { filename: "Supplier_Agreement_FactoryA.pdf", size: 2100000, mimeType: "application/pdf" } },
    { id: "kv_12", type: "document", name: "Brand Trademark Certificate", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(180), updatedAt: d(180), lastAccessedAt: d(30), expiresAt: null, document: { filename: "KEYLO_Trademark_EU.pdf", size: 1500000, mimeType: "application/pdf" } },
    { id: "kv_13", type: "document", name: "3PL Contract 2025", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(60), updatedAt: d(60), lastAccessedAt: d(15), expiresAt: null, document: { filename: "3PL_Contract_2025.pdf", size: 2800000, mimeType: "application/pdf" } },
    { id: "kv_14", type: "credential", name: "Stripe Payments", category: "Credentials", isLocked: true, createdBy: "usr_001", createdAt: d(20), updatedAt: d(8), lastAccessedAt: d(2), expiresAt: null, credential: { username: "payments@keylo.com", password: "Str1pe_K3ylo#Live!", url: "https://dashboard.stripe.com", notes: "Live payment dashboard" } },
    { id: "kv_15", type: "document", name: "Investor Term Sheet", category: "Documents", isLocked: true, createdBy: "usr_001", createdAt: d(35), updatedAt: d(35), lastAccessedAt: d(12), expiresAt: null, document: { filename: "KEYLO_TermSheet_2025.pdf", size: 1200000, mimeType: "application/pdf" } },
    { id: "kv_16", type: "note", name: "Platform Recovery Codes", category: "Notes", isLocked: true, createdBy: "usr_001", createdAt: d(25), updatedAt: d(9), lastAccessedAt: d(5), expiresAt: null, note: { content: "Shopify backup codes:\nKL-1234 / KL-5678 / KL-9012\n\nTikTok 2FA backup:\nTT-ABCD / TT-EFGH\n\nStore offline." } },
  ],
  redx: [
    { id: "rv_01", type: "credential", name: "Meta Ads Manager", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(55), updatedAt: d(1), lastAccessedAt: d(0), expiresAt: null, credential: { username: "ads@redx.agency", password: "R3dX_M3ta#Ads2025!", url: "https://business.facebook.com", notes: "Agency business suite" } },
    { id: "rv_02", type: "credential", name: "Google Ads Account", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(70), updatedAt: d(2), lastAccessedAt: d(0), expiresAt: null, credential: { username: "ads@redx.agency", password: "G00gl3_R3dX#Ads!", url: "https://ads.google.com", notes: "MCC manager account" } },
    { id: "rv_03", type: "credential", name: "HubSpot CRM", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(45), updatedAt: d(3), lastAccessedAt: d(1), expiresAt: null, credential: { username: "crm@redx.agency", password: "HubSp0t_R3dX#CRM!", url: "https://app.hubspot.com", notes: "Client pipeline & deals" } },
    { id: "rv_04", type: "credential", name: "Canva Pro Teams", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(90), updatedAt: d(5), lastAccessedAt: d(2), expiresAt: null, credential: { username: "design@redx.agency", password: "C@nva_R3dX#Pro!", url: "https://www.canva.com", notes: "Agency team workspace" } },
    { id: "rv_05", type: "credential", name: "Adobe Creative Cloud", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(80), updatedAt: d(10), lastAccessedAt: d(3), expiresAt: null, credential: { username: "creative@redx.agency", password: "@dob3_R3dX#CC!", url: "https://creativecloud.adobe.com", notes: "All apps license" } },
    { id: "rv_06", type: "credential", name: "LinkedIn Campaign Manager", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(65), updatedAt: d(8), lastAccessedAt: d(4), expiresAt: null, credential: { username: "ads@redx.agency", password: "L1nk3d1n_R3dX#B2B!", url: "https://www.linkedin.com/campaignmanager", notes: "B2B client campaigns" } },
    { id: "rv_07", type: "api_key", name: "Meta Graph API", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(40), updatedAt: d(5), lastAccessedAt: d(1), expiresAt: null, apiKey: { key: "EAABsbCS4iX0BAK1redxagency2025abcdef", service: "Meta / Facebook", environment: "Production", notes: "Ads reporting & automation" } },
    { id: "rv_08", type: "api_key", name: "Google Ads API", category: "API Keys", isLocked: false, createdBy: "usr_002", createdAt: d(50), updatedAt: d(15), lastAccessedAt: d(3), expiresAt: null, apiKey: { key: "GADS-R3dX-1a2b3c4d5e6f7g8h9i0j-prod", service: "Google Ads", environment: "Production", notes: "Campaign management API" } },
    { id: "rv_09", type: "api_key", name: "HubSpot Private App", category: "API Keys", isLocked: false, createdBy: "usr_002", createdAt: d(30), updatedAt: d(7), lastAccessedAt: d(0), expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), apiKey: { key: "pat-eu1-R3dX1a2b3c4d5e6f7g8h9i0j2025", service: "HubSpot", environment: "Production", notes: "CRM integration key" } },
    { id: "rv_10", type: "api_key", name: "Zapier Webhook Key", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(60), updatedAt: d(20), lastAccessedAt: d(5), expiresAt: null, apiKey: { key: "zap_R3dX_hook_1a2b3c4d5e6f7g8h", service: "Zapier", environment: "Production", notes: "Automation workflows" } },
    { id: "rv_11", type: "document", name: "Client Service Agreement", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(25), updatedAt: d(25), lastAccessedAt: d(8), expiresAt: null, document: { filename: "REDX_Service_Agreement_Template.pdf", size: 2200000, mimeType: "application/pdf" } },
    { id: "rv_12", type: "document", name: "Agency Portfolio 2025", category: "Documents", isLocked: false, createdBy: "usr_002", createdAt: d(60), updatedAt: d(15), lastAccessedAt: d(5), expiresAt: null, document: { filename: "REDX_Portfolio_2025.pdf", size: 8500000, mimeType: "application/pdf" } },
    { id: "rv_13", type: "document", name: "Brand Guidelines", category: "Documents", isLocked: false, createdBy: "usr_002", createdAt: d(90), updatedAt: d(30), lastAccessedAt: d(12), expiresAt: null, document: { filename: "REDX_Brand_Guidelines.pdf", size: 5600000, mimeType: "application/pdf" } },
    { id: "rv_14", type: "credential", name: "Agency Stripe Account", category: "Credentials", isLocked: true, createdBy: "usr_001", createdAt: d(30), updatedAt: d(12), lastAccessedAt: d(3), expiresAt: null, credential: { username: "billing@redx.agency", password: "Str1pe_R3dX#B1ll!", url: "https://dashboard.stripe.com", notes: "Agency invoicing & payouts" } },
    { id: "rv_15", type: "document", name: "Confidential Pitch Deck", category: "Documents", isLocked: true, createdBy: "usr_001", createdAt: d(20), updatedAt: d(20), lastAccessedAt: d(7), expiresAt: null, document: { filename: "REDX_Investor_Pitch_Confidential.pdf", size: 4100000, mimeType: "application/pdf" } },
    { id: "rv_16", type: "note", name: "Emergency Recovery Codes", category: "Notes", isLocked: true, createdBy: "usr_001", createdAt: d(40), updatedAt: d(12), lastAccessedAt: d(8), expiresAt: null, note: { content: "Meta BM recovery:\nMBM-1234 / MBM-5678\n\nGoogle MCC backup:\nGMCC-ABCD / GMCC-EFGH\n\nStore offline only." } },
  ],
  trustme: [
    { id: "tv_01", type: "credential", name: "DocuSign Admin", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(55), updatedAt: d(2), lastAccessedAt: d(0), expiresAt: null, credential: { username: "admin@trustme.com", password: "D0cuS1gn_Trust#2025!", url: "https://admin.docusign.com", notes: "eSignature admin account" } },
    { id: "tv_02", type: "credential", name: "Plaid Dashboard", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(80), updatedAt: d(1), lastAccessedAt: d(0), expiresAt: null, credential: { username: "dev@trustme.com", password: "Pla1d_Trust#D3v!", url: "https://dashboard.plaid.com", notes: "Open banking integrations" } },
    { id: "tv_03", type: "credential", name: "Compliance Portal (RegTech)", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(60), updatedAt: d(3), lastAccessedAt: d(1), expiresAt: null, credential: { username: "compliance@trustme.com", password: "R3gT3ch_Trust#Port!", url: "https://portal.regtech-partner.com", notes: "Regulatory reporting portal" } },
    { id: "tv_04", type: "credential", name: "AWS GovCloud", category: "Credentials", isLocked: false, createdBy: "usr_001", createdAt: d(90), updatedAt: d(5), lastAccessedAt: d(2), expiresAt: null, credential: { username: "admin@trustme-cloud.com", password: "AWS_GovCl0ud#Trust!", url: "https://console.amazonaws-us-gov.com", notes: "Compliant cloud infrastructure" } },
    { id: "tv_05", type: "credential", name: "Twilio Verify", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(40), updatedAt: d(8), lastAccessedAt: d(3), expiresAt: null, credential: { username: "dev@trustme.com", password: "Tw1l1o_Trust#V3rify!", url: "https://console.twilio.com", notes: "SMS 2FA & identity verification" } },
    { id: "tv_06", type: "credential", name: "Salesforce CRM", category: "Credentials", isLocked: false, createdBy: "usr_002", createdAt: d(100), updatedAt: d(15), lastAccessedAt: d(7), expiresAt: null, credential: { username: "crm@trustme.com", password: "SF_Trust#CRM2025!", url: "https://login.salesforce.com", notes: "Enterprise client management" } },
    { id: "tv_07", type: "api_key", name: "Plaid API (Production)", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(45), updatedAt: d(5), lastAccessedAt: d(1), expiresAt: null, apiKey: { key: "prod_trustme_plaid_1a2b3c4d5e6f7g8h9i0j", service: "Plaid", environment: "Production", notes: "Open banking data access" } },
    { id: "tv_08", type: "api_key", name: "Stripe Radar API", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(60), updatedAt: d(20), lastAccessedAt: d(4), expiresAt: null, apiKey: { key: "rk_demo_TrustMe1a2b3c4d5e6f7g8h9i0j2025", service: "Stripe Radar", environment: "Production", notes: "Fraud detection & rules" } },
    { id: "tv_09", type: "api_key", name: "Twilio Auth Token", category: "API Keys", isLocked: false, createdBy: "usr_002", createdAt: d(30), updatedAt: d(7), lastAccessedAt: d(0), expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), apiKey: { key: "ACtrustme1a2b3c4d5e6f7g8h9i0j_2025", service: "Twilio", environment: "Production", notes: "SMS & voice verification" } },
    { id: "tv_10", type: "api_key", name: "DocuSign JWT Key", category: "API Keys", isLocked: false, createdBy: "usr_001", createdAt: d(50), updatedAt: d(10), lastAccessedAt: d(3), expiresAt: null, apiKey: { key: "DS-JWT-TrustMe-1a2b3c4d-5e6f-7g8h-prod", service: "DocuSign", environment: "Production", notes: "Automated envelope signing" } },
    { id: "tv_11", type: "document", name: "ISO 27001 Certificate", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(30), updatedAt: d(30), lastAccessedAt: d(5), expiresAt: null, document: { filename: "TrustMe_ISO27001_Certificate.pdf", size: 1800000, mimeType: "application/pdf" } },
    { id: "tv_12", type: "document", name: "GDPR Data Processing Agreement", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(90), updatedAt: d(45), lastAccessedAt: d(10), expiresAt: null, document: { filename: "TrustMe_GDPR_DPA.pdf", size: 3400000, mimeType: "application/pdf" } },
    { id: "tv_13", type: "document", name: "SOC 2 Report 2025", category: "Documents", isLocked: false, createdBy: "usr_001", createdAt: d(120), updatedAt: d(60), lastAccessedAt: d(20), expiresAt: null, document: { filename: "TrustMe_SOC2_Report_2025.pdf", size: 5200000, mimeType: "application/pdf" } },
    { id: "tv_14", type: "credential", name: "Root CA Certificate", category: "Credentials", isLocked: true, createdBy: "usr_001", createdAt: d(365), updatedAt: d(30), lastAccessedAt: d(14), expiresAt: null, credential: { username: "pki-admin", password: "RootCA_TrustMe#PKI!", url: "https://pki.trustme-internal.com", notes: "Internal PKI — critical access" } },
    { id: "tv_15", type: "document", name: "Regulatory Licence (FCA)", category: "Documents", isLocked: true, createdBy: "usr_001", createdAt: d(200), updatedAt: d(200), lastAccessedAt: d(30), expiresAt: null, document: { filename: "TrustMe_FCA_Licence.pdf", size: 2900000, mimeType: "application/pdf" } },
    { id: "tv_16", type: "note", name: "HSM Recovery & Master Keys", category: "Notes", isLocked: true, createdBy: "usr_001", createdAt: d(180), updatedAt: d(30), lastAccessedAt: d(14), expiresAt: null, note: { content: "HSM slot codes:\nSlot-1: TM-A1B2-C3D4-E5F6\nSlot-2: TM-G7H8-I9J0-K1L2\n\nMaster key split: stored in 3 safety deposit boxes per BCP." } },
  ],
};

// ── STORE STATE ───────────────────────────────────────────────────────────────

let _portal = "sosa";
const _dataByPortal: Record<string, VaultItem[]> = {};
let _items: VaultItem[] = SEED_VAULT.sosa.map(v => ({ ...v }));
let listeners: (() => void)[] = [];

const notify = () => listeners.forEach(fn => fn());

function ensurePortal(id: string) {
  if (!_dataByPortal[id]) {
    _dataByPortal[id] = (SEED_VAULT[id] ?? SEED_VAULT.sosa).map(v => ({ ...v }));
  }
}

export function setActivePortal(id: string) {
  _dataByPortal[_portal] = _items;
  ensurePortal(id);
  _portal = id;
  _items = _dataByPortal[id];
  notify();
}

export function getVaultItems(): VaultItem[] { return _items; }

export function subscribeVault(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

// Keep backward-compatible export for components still using useState(INITIAL_VAULT_ITEMS)
export const INITIAL_VAULT_ITEMS: VaultItem[] = SEED_VAULT.sosa;
