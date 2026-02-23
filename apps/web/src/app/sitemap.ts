import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://subscriptions-manager.vercel.app",
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: "https://subscriptions-manager.vercel.app/login",
      changeFrequency: "never",
      priority: 0.5,
    },
    {
      url: "https://subscriptions-manager.vercel.app/login/confirmation",
      changeFrequency: "never",
      priority: 0.1,
    },
  ];
}
