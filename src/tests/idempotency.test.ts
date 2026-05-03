import test from "node:test";
import assert from "node:assert/strict";
import { isWithinAlertWindow } from "../skills/deadline-watch/index.js";

test("deadline window helper accepts only dates in range", () => {
  const today = new Date();
  const in2Days = new Date(today);
  in2Days.setDate(in2Days.getDate() + 2);
  const in10Days = new Date(today);
  in10Days.setDate(in10Days.getDate() + 10);

  const i2 = in2Days.toISOString().slice(0, 10);
  const i10 = in10Days.toISOString().slice(0, 10);

  assert.equal(isWithinAlertWindow(i2, 3), true);
  assert.equal(isWithinAlertWindow(i10, 3), false);
});

test("simple dedupe set prevents repeat processing", () => {
  const seen = new Set<string>();
  const emailId = "gmail-123";

  const first = !seen.has(emailId);
  if (first) seen.add(emailId);
  const second = !seen.has(emailId);

  assert.equal(first, true);
  assert.equal(second, false);
});
