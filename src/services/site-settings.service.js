import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { serializeSiteSettings } from "../utils/serializers.js";
import { createTtlCache } from "../utils/ttl-cache.js";
import { deleteManagedAsset } from "./media.service.js";

const settingsRecordCache = createTtlCache({ ttlMs: 60_000 });

function getDefaultSettingsInput() {
  return {
    restaurantName: "RajaMahendravaram PalavuCentre",
    tagline: "Rooted in Konaseema",
    restaurantDescription: "Authentic flavors, traditional recipes, unforgettable taste.",
    logoUrl: env.DEFAULT_LOGO_URL,
    heroMedia: env.DEFAULT_HERO_MEDIA_URL
      ? [{ type: "image", url: env.DEFAULT_HERO_MEDIA_URL }]
      : [{ type: "image", url: "/hero-bg.jpg" }],
    primaryCtaLabel: "Order Online",
    primaryCtaHref: "/menu",
    secondaryCtaLabel: "Contact Us",
    secondaryCtaHref: "/contact",
    addressText: "Hyderabad, Telangana",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d243647.3160399884!2d78.24323!3d17.412608!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb99daeaebd2c7%3A0xae93b78392bafbc2!2sHyderabad%2C%20Telangana!5e0!3m2!1sen!2sin!4v1234567890",
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
      "Order traditional Godavari biryanis, curries, and catering from RajaMahendravaram PalavuCentre in Hyderabad.",
    metaKeywords: [
      "RajaMahendravaram PalavuCentre",
      "Godavari cuisine",
      "Konaseema food",
      "Andhra restaurant Hyderabad",
    ],
    googleReviewUrl: "https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review",
    deliveryFeePaise: 0,
    freeDeliveryThresholdPaise: 0,
    orderTaxPercent: env.ORDER_TAX_PERCENT,
    currency: env.CURRENCY,
  };
}

function siteSettingsInclude() {
  return {
    socialLinks: {
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    },
  };
}

async function loadSettingsRecord() {
  const existing = await prisma.siteSetting.findUnique({
    where: { key: "primary" },
    include: siteSettingsInclude(),
  });

  if (existing) {
    return existing;
  }

  return prisma.siteSetting.create({
    data: {
      key: "primary",
      ...getDefaultSettingsInput(),
    },
    include: siteSettingsInclude(),
  });
}

async function getOrCreateSettingsRecord({ useCache = false } = {}) {
  if (useCache) {
    return settingsRecordCache.get(loadSettingsRecord);
  }

  return loadSettingsRecord();
}

export async function getPublicSiteSettings() {
  const settings = await getOrCreateSettingsRecord({ useCache: true });
  return serializeSiteSettings(settings);
}

export async function getAdminSiteSettings() {
  const settings = await getOrCreateSettingsRecord();
  return serializeSiteSettings(settings);
}

export async function getOrderConfig() {
  const settings = await getOrCreateSettingsRecord({ useCache: true });
  return {
    deliveryFeePaise: 0,
    freeDeliveryThresholdPaise: 0,
    taxPercent: Number(settings.orderTaxPercent),
    currency: settings.currency,
  };
}

export async function updateSiteSettings(payload) {
  const settings = await getOrCreateSettingsRecord();
  const { socialLinks, ...settingsPayload } = payload;
  settingsPayload.deliveryFeePaise = 0;
  settingsPayload.freeDeliveryThresholdPaise = 0;
  const previousLogoUrl = settings.logoUrl;
  const previousHeroUrls = Array.isArray(settings.heroMedia) ? settings.heroMedia.map((item) => item?.url).filter(Boolean) : [];

  const updated = await prisma.$transaction(async (tx) => {
    await tx.siteSetting.update({
      where: { id: settings.id },
      data: {
        ...settingsPayload,
      },
    });

    if (socialLinks) {
      await tx.socialLink.deleteMany({
        where: { siteSettingId: settings.id },
      });

      if (socialLinks.length > 0) {
        await tx.socialLink.createMany({
          data: socialLinks.map((link) => ({
            siteSettingId: settings.id,
            platform: link.platform,
            label: link.label,
            url: link.url,
            isActive: link.isActive ?? true,
            sortOrder: link.sortOrder ?? 0,
          })),
        });
      }
    }

    return tx.siteSetting.findUnique({
      where: { id: settings.id },
      include: {
        socialLinks: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  });

  if (Object.prototype.hasOwnProperty.call(settingsPayload, "logoUrl") && previousLogoUrl !== updated.logoUrl) {
    await deleteManagedAsset({ url: previousLogoUrl });
  }

  if (Object.prototype.hasOwnProperty.call(settingsPayload, "heroMedia")) {
    const nextHeroUrls = new Set((updated.heroMedia || []).map((item) => item?.url).filter(Boolean));

    await Promise.all(
      previousHeroUrls
        .filter((url) => !nextHeroUrls.has(url))
        .map((url) =>
          deleteManagedAsset({
            url,
          }),
        ),
    );
  }

  settingsRecordCache.clear();
  return serializeSiteSettings(updated);
}
