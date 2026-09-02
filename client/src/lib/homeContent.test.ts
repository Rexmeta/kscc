import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HOME_CONTENT,
  getDefaultHomeTranslation,
  parseHomeTranslation,
} from "@shared/homeContent";

test("home content uses the selected locale defaults", () => {
  const translation = getDefaultHomeTranslation("en");
  const content = parseHomeTranslation(translation, "en");

  assert.equal(content.hero.title, DEFAULT_HOME_CONTENT.en.hero.title);
  assert.equal(content.news.readMore, "Read More");
  assert.equal(content.benefits.cards[2].description, "Priority registration and discount benefits");
});

test("home content falls back per field for malformed structured values", () => {
  const content = parseHomeTranslation({
    title: "관리 가능한 홈 제목",
    subtitle: 123,
    excerpt: "",
    content: JSON.stringify({
      hero: { cta: { member: "새 회원 CTA", event: false } },
      events: { subtitle: ["잘못된 값"], empty: "새로운 빈 상태" },
      about: {
        benefits: [
          { title: "첫 번째 제목", description: 42 },
          { title: "두 번째 제목", description: "두 번째 설명" },
        ],
      },
      benefits: { cards: "잘못된 배열" },
    }),
  }, "ko");

  assert.equal(content.hero.title, "관리 가능한 홈 제목");
  assert.equal(content.hero.subtitle, DEFAULT_HOME_CONTENT.ko.hero.subtitle);
  assert.equal(content.hero.description, DEFAULT_HOME_CONTENT.ko.hero.description);
  assert.equal(content.hero.cta.member, "새 회원 CTA");
  assert.equal(content.hero.cta.event, DEFAULT_HOME_CONTENT.ko.hero.cta.event);
  assert.equal(content.events.subtitle, DEFAULT_HOME_CONTENT.ko.events.subtitle);
  assert.equal(content.events.empty, "새로운 빈 상태");
  assert.equal(content.about.benefits[0].title, DEFAULT_HOME_CONTENT.ko.about.benefits[0].title);
  assert.equal(content.about.benefits[0].description, DEFAULT_HOME_CONTENT.ko.about.benefits[0].description);
  assert.deepEqual(content.benefits.cards, DEFAULT_HOME_CONTENT.ko.benefits.cards);
});

test("invalid JSON preserves all safe defaults without executing content", () => {
  const content = parseHomeTranslation({
    content: "<script>alert('unsafe')</script>",
  }, "zh");

  assert.equal(content.hero.title, DEFAULT_HOME_CONTENT.zh.hero.title);
  assert.equal(content.about.heading, DEFAULT_HOME_CONTENT.zh.about.heading);
});