# Sellapage media

Each folder here is one spot on the website. Drop a photo or a video into
a folder, then run this from the project root:

    npm run media

It compresses everything for phones and slow connections and puts it on
the site. An empty folder means that spot keeps its current design.

Photos: JPG, PNG or WebP. iPhone HEIC photos will not work; save them as
JPG first. Videos: MP4 or MOV, 10 to 15 seconds, no sound needed. Anything
longer than 20 seconds is cut at 20.

If a folder has a photo AND a video, the photo is shown while the video
loads. Newest file wins if you put in more than one of the same kind.

The files you put here stay on your computer (they are not uploaded to
GitHub). Only the small compressed copies are.

| Folder | Where it shows | Shape | Suggestion |
|---|---|---|---|
| `home-hero-scene` | Homepage, "A store that sells for you" card, the wide photo on the right | landscape | A Nigerian shop owner smiling at her phone, with products around her, bright and green. Keep the left side calm. |
| `home-bookings` | Homepage, "Bookings that fill your week" card, above the calendar | landscape | A salon owner checking her appointments on a tablet, mint green salon. |
| `home-delivery` | Homepage, "Book delivery without leaving your dashboard" card, left photo | landscape | A delivery rider handing a parcel to a smiling customer at her door. |
| `home-mission` | Homepage, "See everything happening in your business" card, the photo with features circling it | landscape | A Nigerian business owner checking orders on a phone, with a laptop and products on the table. |
| `home-app-1` | Homepage, "Run your shop from your pocket", first phone | portrait | An app screen. |
| `home-app-2` | Homepage, "Run your shop from your pocket", second phone | portrait | Another app screen. |
| `dashboard-banner` | Dashboard home, top right, the "Level up your store" banner | landscape | Products and a plant on a light background, fading to white on the right where the text sits. |
| `dashboard-howto` | Dashboard home, the "Watch how Sellapage works" card under Recent Activity | landscape | The still shown on the card. The card itself only appears once HOWTO_VIDEO_URL in src/media/howto.js is set. |
| `products-hero` | Products and Services tabs, top banner, right side | portrait | Product boxes and a sneaker on a light green background. |
| `products-marketing-phone` | Products tab, "Turn browsing into buying" card | portrait | A phone showing a store. |
| `products-empty-hero` | Products and Services tabs with nothing added yet, top banner | landscape | A phone with a store and an Add Product button. |
| `products-empty-art` | Products and Services tabs with nothing added yet, above "No products added yet" | landscape | A product card with a sneaker and a small plant. |
| `products-first-popper` | Products and Services tabs with nothing added yet, "Good things start" card | square | A small party popper, 3D style. |
| `products-growth-chart` | Products and Services tabs, "Get more with Growth" card | square | Green rising bars with an arrow. |
| `billing-countdown-art` | Billing tab, the plan countdown card, right side | landscape | A calendar on a green box, light background. |
| `billing-banner-bag` | Billing tab, "More tools. More growth." banner, left | landscape | A green Sellapage shopping bag with leaves and a rising arrow. |
| `billing-script` | Billing tab, "Built for Nigerian businesses" handwriting, right of the banner | landscape | Green handwriting on a transparent or white background. |
| `business-hero` | Business Page tab, top banner, right side | landscape | A phone showing a store, with leaves. |
| `business-brand-script` | Business Page tab, "Your brand matters." handwriting in the side card | landscape | Dark green handwriting on a light background. |
| `business-brand-leaves` | Business Page tab, leaves along the right edge of the "Your brand matters" card | portrait | Green leaves, tall and narrow. |
| `referral-hero` | Referral tab, top banner, right side | landscape | A megaphone with people cards and "Bring more businesses on board" handwriting. |
| `referral-wallet` | Referral tab, "Withdrawal details" card | landscape | A green wallet with naira notes. |
| `referral-script` | Referral tab, "It is easy, fast and rewarding!" handwriting on the bottom banner | landscape | Green handwriting with a curly arrow. |
| `support-hero` | Support tab, top banner, right side | portrait | A laptop with a chat bubble and "Real people. Real support." handwriting. |
| `support-script` | Support tab, "Your success matters to us" handwriting at the bottom | landscape | Green handwriting with a small heart. |
| `explore-hero` | Explore Stores page, top banner, right side | landscape | A phone showing Sellapage stores, with plants and a "Shop Local, Grow Together" card. |
| `auth-hero` | Sign in and Create Store pages, beside the form on desktop, behind it on phones | landscape | A phone showing a store, with Secure Checkout, Fast Delivery, Analytics and Happy Customers cards around it. |
| `auth-otp-art` | Code screen (SMS and email codes), left side | landscape | A phone with a Sellapage code notification and a green envelope bubble. |
| `auth-script` | Code screen, "Almost there!" handwriting under the list | landscape | Green handwriting with a small heart. |
| `about-hero` | About page, top, the big photo on the right | landscape | A Nigerian businesswoman at a laptop, green blazer, plants, bright room. |
| `about-mission` | About page, "Our mission and vision", middle photo | landscape | A modern green glass building with palm trees and blue sky. |
| `about-cta` | About page, the green closing banner, right side | landscape | A proud boutique owner at her shop door holding her phone. |
