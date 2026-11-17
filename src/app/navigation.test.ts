import { describe, expect, it } from "vitest"
import {
  isLockedScreen,
  lockedScreens,
  pagePaths,
  type Page,
} from "./navigation"

describe("screen access configuration", () => {
  it("locks only References, Feedbacks, and campaign template", () => {
    expect(lockedScreens).toEqual(["references", "feedbacks", "template"])
  })

  it("provides unique direct paths for all screens", () => {
    const paths = Object.values(pagePaths)
    expect(paths).toContain("/")
    expect(new Set(paths).size).toBe(paths.length)
  })

  it("locks only the configured screens for users without a paid plan", () => {
    const allScreens = Object.keys(pagePaths) as Page[]
    const freeScreens = allScreens.filter(
      (screen) => !lockedScreens.some((locked) => locked === screen),
    )
    expect(freeScreens.every((screen) => !isLockedScreen(screen, false))).toBe(
      true,
    )
    expect(lockedScreens.every((screen) => isLockedScreen(screen, false))).toBe(
      true,
    )
    expect(allScreens.every((screen) => !isLockedScreen(screen, true))).toBe(
      true,
    )
  })
})
