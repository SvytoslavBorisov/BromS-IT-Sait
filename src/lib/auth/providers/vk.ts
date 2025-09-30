import VKProvider from "next-auth/providers/vk";
import { setOAuthCtxEmail } from "@/lib/auth/oauthCtx"; // сохраняем email

export default function vkProvider() {
  return VKProvider({
    clientId: process.env.VK_CLIENT_ID!,
    clientSecret: process.env.VK_CLIENT_SECRET!,
    authorization: { params: { scope: "email" } }, // email нужен явно
    profile(profile: any) {
      // VK возвращает email только при первом запросе через access_token
      const email = profile.email || null;

      // сохраняем email в модульном контексте
      if (email) setOAuthCtxEmail(email);

      return {
        id: profile.id?.toString(),
        name:
          profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile.screen_name || "VK User",
        email,
        image: profile.photo_200 || null, // стандартное поле с аватаркой 200px
      };
    },
  });
}
