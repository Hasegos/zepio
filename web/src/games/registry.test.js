import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { games, liveGames } from "./registry.js";

const CATEGORIES = ["puzzle", "arcade", "action", "racing", "simulation", "strategy", "casual"];
const STATUSES = ["live", "coming", "hidden"];
const RUNTIMES = ["module", "iframe"];
const DEVICES = ["mobile", "desktop"];
const INPUTS = ["touch", "mouse", "keyboard", "gamepad"];
const REQUIRED = [
  "id",
  "slug",
  "name",
  "description",
  "category",
  "thumbnail",
  "estimatedPlayTime",
  "supportedDevices",
  "inputs",
  "status",
  "runtime",
];
const contents = import.meta.glob("./*/content.js", { eager: true });

describe("registry", () => {
  it("모든 게임이 필수 필드를 비어 있지 않게 가진다", () => {
    for (const game of games) {
      for (const key of REQUIRED) {
        expect(game[key], `${game.slug}.${key}`).toBeTruthy();
      }
    }
  });

  it("id와 slug가 중복되지 않고 slug가 URL에 안전하다", () => {
    expect(new Set(games.map((game) => game.id)).size).toBe(games.length);
    expect(new Set(games.map((game) => game.slug)).size).toBe(games.length);
    for (const game of games) {
      expect(game.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("열거형 필드가 허용 값 안에 있다", () => {
    for (const game of games) {
      expect(CATEGORIES).toContain(game.category);
      expect(STATUSES).toContain(game.status);
      expect(RUNTIMES).toContain(game.runtime);
      expect(game.supportedDevices.every((device) => DEVICES.includes(device))).toBe(true);
      expect(game.inputs.every((input) => INPUTS.includes(input))).toBe(true);
    }
  });

  it("썸네일 파일이 public에 있고 title용 설명이 중복되지 않는다", () => {
    for (const game of games) {
      expect(existsSync(join(process.cwd(), "public", game.thumbnail)), game.thumbnail).toBe(true);
    }
    expect(new Set(games.map((game) => game.description)).size).toBe(games.length);
  });

  it("live 게임은 설명과 조작 방법 본문이 있다", () => {
    for (const game of liveGames) {
      const content = contents[`./${game.slug}/content.js`]?.default;
      expect(content, `${game.slug}/content.js`).toBeDefined();
      expect(content.intro.length).toBeGreaterThan(0);
      expect(content.intro.every((paragraph) => paragraph.trim())).toBe(true);
      expect(content.howToPlay.length).toBeGreaterThan(0);
      expect(content.howToPlay.every((step) => step.trim())).toBe(true);
    }
  });

  it("각 게임 모듈이 존재하고 mount 계약을 지킨다", async () => {
    for (const game of games) {
      const module = await game.load();
      expect(typeof module.default.mount, `${game.slug}.mount`).toBe("function");
    }
  });
});