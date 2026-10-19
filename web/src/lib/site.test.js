import { describe, expect, it } from "vitest";
import { canonicalUrl, missingProductionEnv } from "./site.js";

describe("missingProductionEnv", () => {
  it("production이 아니면 아무것도 요구하지 않는다", () => {
    expect(missingProductionEnv({})).toEqual([]);
    expect(missingProductionEnv({ PUBLIC_SITE_ENV: "preview" })).toEqual([]);
  });

  it("production이면 사이트 주소와 문의 이메일이 없거나 공백일 때 이름을 알려준다", () => {
    expect(missingProductionEnv({ PUBLIC_SITE_ENV: "production" })).toEqual([
      "PUBLIC_SITE_URL",
      "PUBLIC_CONTACT_EMAIL",
    ]);
    expect(
      missingProductionEnv({
        PUBLIC_SITE_ENV: "production",
        PUBLIC_SITE_URL: "https://example.com",
        PUBLIC_CONTACT_EMAIL: "  ",
      }),
    ).toEqual(["PUBLIC_CONTACT_EMAIL"]);
    expect(
      missingProductionEnv({
        PUBLIC_SITE_ENV: "production",
        PUBLIC_SITE_URL: "https://example.com",
        PUBLIC_CONTACT_EMAIL: "hi@example.com",
      }),
    ).toEqual([]);
  });
});

describe("canonicalUrl", () => {
  it("경로 끝에 슬래시를 붙이고 이미 있으면 그대로 둔다", () => {
    expect(canonicalUrl("https://example.com", "/")).toBe("https://example.com/");
    expect(canonicalUrl("https://example.com", "/about")).toBe("https://example.com/about/");
    expect(canonicalUrl(new URL("https://example.com"), "/games/memory-sequence/")).toBe(
      "https://example.com/games/memory-sequence/",
    );
  });

  it("사이트 주소 끝의 슬래시와 하위 경로를 처리한다", () => {
    expect(canonicalUrl("https://example.com/", "/privacy")).toBe("https://example.com/privacy/");
  });
});