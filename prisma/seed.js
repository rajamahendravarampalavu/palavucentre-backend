import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const menuCategories = [
  { slug: "starters", name: "Starters", description: "Classic Andhra and Godavari starters", icon: "utensils-crossed", sortOrder: 1 },
  { slug: "mains", name: "Main Course", description: "Traditional curries and meals", icon: "chef-hat", sortOrder: 2 },
  { slug: "biryani", name: "Biryani & Specials", description: "Signature biryanis and pulaos", icon: "flame", sortOrder: 3 },
  { slug: "desserts", name: "Desserts", description: "Traditional sweets", icon: "star", sortOrder: 4 },
  { slug: "beverages", name: "Beverages", description: "Coolers and classic drinks", icon: "coffee", sortOrder: 5 },
];

const menuItems = [
  { categorySlug: "starters", name: "Punugulu", description: "Crispy rice fritters with ginger & green chili", price: 120, imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400", isVeg: true, isBestseller: true },
  { categorySlug: "starters", name: "Royyala Vepudu", description: "Spicy Godavari-style prawn fry", price: 280, imageUrl: "https://images.unsplash.com/photo-1633504581786-316c8002b1b9?w=400", isVeg: false, isBestseller: true },
  { categorySlug: "starters", name: "Mirchi Bajji", description: "Stuffed chili fritters with tangy chutney", price: 100, imageUrl: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "starters", name: "Pesarattu", description: "Green gram dosa with upma filling", price: 90, imageUrl: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "starters", name: "Vankaya Bajji", description: "Crispy eggplant fritters", price: 110, imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "starters", name: "Kodi Vepudu", description: "Spicy chicken fry starter", price: 260, imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400", isVeg: false, isBestseller: false },
  { categorySlug: "mains", name: "Gongura Chicken", description: "Tangy sorrel leaves chicken curry", price: 240, imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400", isVeg: false, isBestseller: true },
  { categorySlug: "mains", name: "Natu Kodi Pulusu", description: "Country chicken curry with traditional spices", price: 320, imageUrl: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400", isVeg: false, isBestseller: false },
  { categorySlug: "mains", name: "Royyala Iguru", description: "Prawns cooked in thick onion tomato gravy", price: 340, imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400", isVeg: false, isBestseller: false },
  { categorySlug: "mains", name: "Chepala Pulusu", description: "Tangy fish curry with tamarind", price: 280, imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400", isVeg: false, isBestseller: false },
  { categorySlug: "mains", name: "Mamidikaya Pappu", description: "Raw mango dal with traditional tempering", price: 160, imageUrl: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "mains", name: "Bendakaya Fry", description: "Crispy okra fry with spices", price: 140, imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "biryani", name: "Natu Kodi Biryani", description: "Country chicken biryani with aromatic spices", price: 350, imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400", isVeg: false, isBestseller: true },
  { categorySlug: "biryani", name: "Royyala Biryani", description: "Prawn biryani with coastal flavors", price: 380, imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400", isVeg: false, isBestseller: false },
  { categorySlug: "biryani", name: "Vegetable Dum Biryani", description: "Mixed vegetable biryani cooked in dum style", price: 220, imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "biryani", name: "Kodi Pulao", description: "Chicken pulao with mild spices", price: 280, imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400", isVeg: false, isBestseller: false },
  { categorySlug: "biryani", name: "Pesarattu Upma", description: "Green gram dosa with upma combo", price: 150, imageUrl: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "desserts", name: "Pala Thalikalu", description: "Traditional milk sweet with cardamom", price: 90, imageUrl: "https://images.unsplash.com/photo-1589113110374-2786355913e6?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "desserts", name: "Bobbatlu", description: "Sweet flatbread with jaggery lentil filling", price: 80, imageUrl: "https://images.unsplash.com/photo-1626128666497-ecdf23fcd750?w=400", isVeg: true, isBestseller: true },
  { categorySlug: "desserts", name: "Ariselu", description: "Traditional rice flour sweet with jaggery", price: 100, imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "desserts", name: "Kova Kajjikayalu", description: "Fried dumplings with khoya filling", price: 120, imageUrl: "https://images.unsplash.com/photo-1621447509370-588bc3b23089?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "beverages", name: "Filter Coffee", description: "Traditional South Indian filter coffee", price: 50, imageUrl: "https://images.unsplash.com/photo-1544787210-2213d2426687?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "beverages", name: "Majjiga", description: "Spiced buttermilk with curry leaves", price: 40, imageUrl: "https://images.unsplash.com/photo-1600271772470-bd22aeb19409?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "beverages", name: "Fresh Lime Soda", description: "Refreshing lime soda with mint", price: 60, imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400", isVeg: true, isBestseller: false },
  { categorySlug: "beverages", name: "Mango Lassi", description: "Creamy mango yogurt drink", price: 80, imageUrl: "https://images.unsplash.com/photo-1571006682858-a5c7154eaa44?w=400", isVeg: true, isBestseller: false },
];

const galleryItems = [
  { url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800", category: "food", sortOrder: 1 },
  { url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800", category: "food", sortOrder: 2 },
  { url: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=800", category: "food", sortOrder: 3 },
  { url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800", category: "food", sortOrder: 4 },
  { url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800", category: "food", sortOrder: 5 },
  { url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800", category: "food", sortOrder: 6 },
  { url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800", category: "food", sortOrder: 7 },
  { url: "https://images.unsplash.com/photo-1546173159-315724a31696?w=800", category: "food", sortOrder: 8 },
  { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800", category: "ambience", sortOrder: 9 },
  { url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", category: "ambience", sortOrder: 10 },
  { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800", category: "events", sortOrder: 11 },
  { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800", category: "events", sortOrder: 12 },
];

const reviews = [
  { name: "Rajesh Kumar", rating: 5, text: "Authentic Godavari flavors! The Natu Kodi Biryani reminded me of my grandmother's cooking. Absolutely delicious!", reviewDate: new Date("2024-02-15"), sortOrder: 1 },
  { name: "Priya Sharma", rating: 5, text: "Best traditional Andhra food in Hyderabad. The Gongura Chicken is a must-try. Great ambiance and service.", reviewDate: new Date("2024-02-10"), sortOrder: 2 },
  { name: "Venkat Reddy", rating: 4, text: "Loved the authentic taste and presentation. Prices are reasonable for the quality. Will definitely visit again.", reviewDate: new Date("2024-02-05"), sortOrder: 3 },
  { name: "Lakshmi Devi", rating: 5, text: "The Punugulu and Royyala Vepudu were outstanding. Takes me back to my village days. Highly recommended!", reviewDate: new Date("2024-01-28"), sortOrder: 4 },
  { name: "Anil Varma", rating: 5, text: "Exceptional food quality and taste. The staff is very courteous. A hidden gem for authentic Konaseema cuisine.", reviewDate: new Date("2024-01-20"), sortOrder: 5 },
  { name: "Swathi Reddy", rating: 4, text: "Great experience overall. The fish curry was perfectly spiced. Loved the traditional serving style.", reviewDate: new Date("2024-01-15"), sortOrder: 6 },
];

const offers = [
  {
    slug: "weekday-biryani-fest",
    title: "Weekday Biryani Fest",
    description: "Get 10% off on signature biryanis from Monday to Thursday.",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200",
    ctaLabel: "Order Now",
    ctaHref: "/menu",
    status: "active",
    isFeatured: true,
    sortOrder: 1,
  },
  {
    slug: "catering-early-booking",
    title: "Catering Early Booking",
    description: "Book catering 14 days ahead and get complimentary welcome drinks.",
    imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200",
    ctaLabel: "Plan Event",
    ctaHref: "/catering",
    status: "scheduled",
    isFeatured: false,
    sortOrder: 2,
  },
];

const promoCodes = [
  {
    code: "WELCOME10",
    title: "Welcome 10% Off",
    description: "Get 10% off on your first order above Rs. 299.",
    discountType: "percentage",
    discountValue: 10,
    minOrderPaise: 29900,
    maxDiscountPaise: 15000,
    maxUses: null,
    isActive: true,
  },
  {
    code: "SAVE100",
    title: "Flat Rs. 100 Off",
    description: "Flat Rs. 100 off on orders above Rs. 699.",
    discountType: "fixed",
    discountValue: 100,
    minOrderPaise: 69900,
    maxDiscountPaise: null,
    maxUses: null,
    isActive: true,
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("Skipping admin seed: set ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap an admin user.");
    return;
  }

  const adminName = process.env.ADMIN_NAME?.trim() || email;
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: {
      name: adminName,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      name: adminName,
      passwordHash,
      isActive: true,
    },
  });
}

async function seedMenu() {
  const categoryMap = new Map();

  for (const category of menuCategories) {
    const created = await prisma.menuCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });

    categoryMap.set(category.slug, created.id);
  }

  for (const [index, item] of menuItems.entries()) {
    const slug = slugify(item.name);

    await prisma.menuItem.upsert({
      where: { slug },
      update: {
        categoryId: categoryMap.get(item.categorySlug),
        name: item.name,
        shortDescription: item.description,
        description: item.description,
        imageUrl: item.imageUrl,
        pricePaise: item.price * 100,
        isVeg: item.isVeg,
        isBestseller: item.isBestseller,
        isAvailable: true,
        sortOrder: index + 1,
      },
      create: {
        categoryId: categoryMap.get(item.categorySlug),
        name: item.name,
        slug,
        shortDescription: item.description,
        description: item.description,
        imageUrl: item.imageUrl,
        pricePaise: item.price * 100,
        isVeg: item.isVeg,
        isBestseller: item.isBestseller,
        isAvailable: true,
        sortOrder: index + 1,
      },
    });
  }
}

async function seedContent() {
  await prisma.galleryItem.deleteMany({});
  await prisma.galleryItem.createMany({
    data: galleryItems.map((item) => ({
      ...item,
      altText: "RajaMahendravaram PalavuCentre gallery image",
      isVisible: true,
      mediaType: "image",
    })),
  });

  await prisma.review.deleteMany({});
  await prisma.review.createMany({
    data: reviews.map((review) => ({
      ...review,
      source: "manual",
      isVisible: true,
      isDeleted: false,
    })),
  });

  const now = new Date();
  const activeEndDate = new Date(now);
  activeEndDate.setDate(activeEndDate.getDate() + 21);
  const scheduledStartDate = new Date(now);
  scheduledStartDate.setDate(scheduledStartDate.getDate() + 7);
  const scheduledEndDate = new Date(now);
  scheduledEndDate.setDate(scheduledEndDate.getDate() + 45);

  for (const offer of offers) {
    await prisma.offer.upsert({
      where: { slug: offer.slug },
      update: {
        ...offer,
        startDate: offer.status === "active" ? now : scheduledStartDate,
        endDate: offer.status === "active" ? activeEndDate : scheduledEndDate,
      },
      create: {
        ...offer,
        startDate: offer.status === "active" ? now : scheduledStartDate,
        endDate: offer.status === "active" ? activeEndDate : scheduledEndDate,
      },
    });
  }
}

async function seedSettings() {
  const settings = await prisma.siteSetting.upsert({
    where: { key: "primary" },
    update: {
      restaurantName: "RajaMahendravaram PalavuCentre",
      tagline: "Rooted in Konaseema",
      restaurantDescription: "Authentic flavors, traditional recipes, unforgettable taste.",
      logoUrl: process.env.DEFAULT_LOGO_URL || null,
      heroMedia: [
        {
          type: "image",
          url: process.env.DEFAULT_HERO_MEDIA_URL || "/hero-bg.jpg",
        },
      ],
      primaryCtaLabel: "Order Online",
      primaryCtaHref: "/menu",
      secondaryCtaLabel: "Contact Us",
      secondaryCtaHref: "/contact",
      addressText: "Hyderabad, Telangana",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d243647.3160399884!2d78.24323!3d17.412608!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb99daeaebd2c7%3A0xae93b78392bafbc2!2sHyderabad%2C%20Telangana!5e0!3m2!1sen!2sin!4v1234567890",
      mapLink: "https://maps.google.com/?q=Hyderabad,Telangana",
      phone: "9966655997",
      email: "rajamahendravarampalavu@gmail.com",
      hoursText: "Monday - Sunday, 12:00 PM - 11:00 PM",
      whatsappNumber: "919966655997",
      floatingWhatsappEnabled: true,
      cuisineType: "Godavari, Konaseema, Andhra",
      city: "Hyderabad",
      areaKeywords: ["Hyderabad", "Godavari cuisine", "Konaseema food", "Andhra restaurant"],
      metaTitle: "RajaMahendravaram PalavuCentre | Authentic Godavari Cuisine in Hyderabad",
      metaDescription:
        "Order traditional Godavari biryanis, curries, catering, and family feasts from RajaMahendravaram PalavuCentre in Hyderabad.",
      metaKeywords: [
        "RajaMahendravaram PalavuCentre",
        "Godavari cuisine",
        "Konaseema food",
        "Andhra restaurant Hyderabad",
        "biryani Hyderabad",
      ],
      googleReviewUrl: "https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review",
      orderTaxPercent: Number(process.env.ORDER_TAX_PERCENT || 5),
      currency: process.env.CURRENCY || "INR",
    },
    create: {
      key: "primary",
      restaurantName: "RajaMahendravaram PalavuCentre",
      tagline: "Rooted in Konaseema",
      restaurantDescription: "Authentic flavors, traditional recipes, unforgettable taste.",
      logoUrl: process.env.DEFAULT_LOGO_URL || null,
      heroMedia: [
        {
          type: "image",
          url: process.env.DEFAULT_HERO_MEDIA_URL || "/hero-bg.jpg",
        },
      ],
      primaryCtaLabel: "Order Online",
      primaryCtaHref: "/menu",
      secondaryCtaLabel: "Contact Us",
      secondaryCtaHref: "/contact",
      addressText: "Hyderabad, Telangana",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d243647.3160399884!2d78.24323!3d17.412608!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb99daeaebd2c7%3A0xae93b78392bafbc2!2sHyderabad%2C%20Telangana!5e0!3m2!1sen!2sin!4v1234567890",
      mapLink: "https://maps.google.com/?q=Hyderabad,Telangana",
      phone: "9966655997",
      email: "rajamahendravarampalavu@gmail.com",
      hoursText: "Monday - Sunday, 12:00 PM - 11:00 PM",
      whatsappNumber: "919966655997",
      floatingWhatsappEnabled: true,
      cuisineType: "Godavari, Konaseema, Andhra",
      city: "Hyderabad",
      areaKeywords: ["Hyderabad", "Godavari cuisine", "Konaseema food", "Andhra restaurant"],
      metaTitle: "RajaMahendravaram PalavuCentre | Authentic Godavari Cuisine in Hyderabad",
      metaDescription:
        "Order traditional Godavari biryanis, curries, catering, and family feasts from RajaMahendravaram PalavuCentre in Hyderabad.",
      metaKeywords: [
        "RajaMahendravaram PalavuCentre",
        "Godavari cuisine",
        "Konaseema food",
        "Andhra restaurant Hyderabad",
        "biryani Hyderabad",
      ],
      googleReviewUrl: "https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review",
      orderTaxPercent: Number(process.env.ORDER_TAX_PERCENT || 5),
      currency: process.env.CURRENCY || "INR",
    },
  });

  await prisma.socialLink.deleteMany({
    where: { siteSettingId: settings.id },
  });

  await prisma.socialLink.createMany({
    data: [
      {
        siteSettingId: settings.id,
        platform: "whatsapp",
        label: "WhatsApp",
        url: "https://wa.me/919966655997",
        isActive: true,
        sortOrder: 1,
      },
      {
        siteSettingId: settings.id,
        platform: "instagram",
        label: "Instagram",
        url: "https://instagram.com/palavucentre",
        isActive: true,
        sortOrder: 2,
      },
      {
        siteSettingId: settings.id,
        platform: "facebook",
        label: "Facebook",
        url: "https://facebook.com/palavucentre",
        isActive: true,
        sortOrder: 3,
      },
      {
        siteSettingId: settings.id,
        platform: "linkedin",
        label: "LinkedIn",
        url: "https://linkedin.com/company/palavucentre",
        isActive: true,
        sortOrder: 4,
      },
    ],
  });
}

async function seedPromoCodes() {
  for (const promoCode of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: promoCode.code },
      update: promoCode,
      create: promoCode,
    });
  }
}

async function main() {
  await seedAdmin();
  await seedMenu();
  await seedContent();
  await seedSettings();
  await seedPromoCodes();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
