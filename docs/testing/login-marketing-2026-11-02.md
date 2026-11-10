# AccrueHR login showcase — 2 November 2026

The login page now combines a prominent sign-in card with product copy, a clean standalone vector brand mark and live monthly package pricing below the main area. The header and product name use AccrueHR capitalization. The generated workplace photograph contains no logos or lettering; branding and captions are independent HTML/SVG elements. The previous motivational wall text is removed from the active asset.

Pricing is fetched anonymously from /api/public/pricing, which returns only currency and BillingCatalog entries. It contains no tenant subscription details or payment-provider settings. Existing authenticated billing routes remain protected. Workspace enquiries use explicit email links because public self-registration is not implemented; no email was sent during this work.

Validation:
- Frontend production build passed; backend static bundles updated.
- PublicPricingControllerTest passed, checking the public response contract and absence of organization/payment details.
- Running anonymous pricing endpoint returned 200 and four catalog plans.
- Browser desktop verified image, crisp brand lockup, product benefits and pricing (Free ₹0; Basic ₹1,000; Standard ₹4,000; Enterprise ₹9,000 per month, as currently configured).
- Browser mobile verified sign-in comes first; DOM viewport width equals document content width, with no horizontal overflow.
- Invalid synthetic credentials still produce the persistent standard inline error without reloading.
- Temporary browser viewport restored and test tab closed. No live user, plan or organization records changed.

Desktop proof: /private/tmp/accruehr-login-desktop.png.
