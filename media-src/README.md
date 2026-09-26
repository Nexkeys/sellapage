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
| `home-hero-main` | Homepage, top of the page, the big laptop picture | landscape | A laptop screen recording of the dashboard, 10 to 15 seconds, or a screenshot. |
| `home-hero-phone` | Homepage, top of the page, the phone in front of the laptop | portrait | Record your phone screen: add a product, tap share, post to WhatsApp status. 10 to 15 seconds, no sound needed. |
| `feature-store-page` | Homepage card: Create Your Commerce Page | landscape | A storefront as a customer sees it. |
| `feature-products` | Homepage card: Manage Products & Services | landscape | The products list in the dashboard. |
| `feature-payments` | Homepage card: Accept Payments | landscape | The checkout screen. |
| `feature-delivery` | Homepage card: Manage Delivery | landscape | Delivery rates or a shipment being booked. |
| `feature-customers` | Homepage card: Customer CRM | landscape | The customers list. |
| `feature-reviews` | Homepage card: Reviews & Ratings | landscape | Stars on a product card. |
| `feature-discounts` | Homepage card: Discounts & Promos | landscape | A discount code being created. |
| `feature-analytics` | Homepage card: Analytics & Growth | landscape | The analytics charts. |
| `feature-receipts` | Homepage card: Receipts & Invoices | landscape | A generated receipt. |
| `feature-loyalty` | Homepage card: Loyalty Points | landscape | A points card. |
| `feature-abandoned` | Homepage card: Abandoned Checkout Recovery | landscape | The abandoned checkouts list. |
| `home-showcase` | Homepage, "Less chaos. More orders." section | landscape | The dashboard on a laptop. |
| `home-app-1` | Homepage, "Run your shop from your pocket", first phone | portrait | An app screen. |
| `home-app-2` | Homepage, "Run your shop from your pocket", second phone | portrait | Another app screen. |
| `testimonial-1` | Homepage, "Loved by Business Owners", first person | square | A real vendor, face centred, ideally with their product. |
| `testimonial-2` | Homepage, "Loved by Business Owners", second person | square | A real vendor, face centred. |
| `testimonial-3` | Homepage, "Loved by Business Owners", third person | square | A real vendor, face centred. |
| `dashboard-banner` | Dashboard home, top right, the "Level up your store" banner | landscape | Products and a plant on a light background, fading to white on the right where the text sits. |
| `dashboard-howto` | Dashboard home, the "Watch how Sellapage works" card under Recent Activity | landscape | The still shown on the card. The card itself only appears once HOWTO_VIDEO_URL in src/media/howto.js is set. |
| `products-hero` | Products and Services tabs, top banner, right side | portrait | Product boxes and a sneaker on a light green background. |
| `products-marketing-phone` | Products tab, "Turn browsing into buying" card | portrait | A phone showing a store. |
| `products-empty-hero` | Products and Services tabs with nothing added yet, top banner | landscape | A phone with a store and an Add Product button. |
| `products-empty-art` | Products and Services tabs with nothing added yet, above "No products added yet" | landscape | A product card with a sneaker and a small plant. |
| `products-first-popper` | Products and Services tabs with nothing added yet, "Good things start" card | square | A small party popper, 3D style. |
| `products-growth-chart` | Products and Services tabs, "Get more with Growth" card | square | Green rising bars with an arrow. |
