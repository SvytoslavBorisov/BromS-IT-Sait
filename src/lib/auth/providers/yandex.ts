import YandexProvider from "next-auth/providers/yandex";

export default function yandexProvider() {
  return YandexProvider({
    clientId: process.env.YANDEX_CLIENT_ID!,
    clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    authorization: { params: { scope: "login:email login:info" } },
    profile(profile: any) {
      const email =
        (profile.default_email as string | undefined) ||
        (Array.isArray(profile.emails) ? profile.emails[0] : undefined) ||
        null;

      return {
        id: profile.id?.toString(),
        name:
          profile.display_name ||
          profile.real_name ||
          profile.login ||
          "Yandex User",
        email,
        image: profile.default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
          : null,
      };
    },
  });
}
