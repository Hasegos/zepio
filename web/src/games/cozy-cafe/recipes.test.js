import { describe, expect, it } from "vitest";
import { initialSimulation } from "./simulation.js";
import { discoverRecipe, setMenu } from "./recipes.js";

describe("네 칸 메뉴와 할머니의 노트",()=>{
  it("열린 메뉴만 네 칸 안에서 중복 없이 편성한다",()=>{
    const fresh=initialSimulation(1);
    expect(setMenu(fresh,0,"latte")).toBe(fresh);
    const s={...fresh,elapsed:60000};
    expect(setMenu(s,0,"latte").menus).toEqual(["latte","drip","milk","toast"]);
    expect(setMenu(s,4,"latte")).toBe(s);
    expect(setMenu(s,0,"milk")).toBe(s);
  });
  it("순서와 무관하게 조합을 발견하고 중복 지급하지 않는다",()=>{
    const fresh={...initialSimulation(1),elapsed:90000};
    const found=discoverRecipe(fresh,["milk","espresso"]).state;
    expect(found.discovered).toEqual(["cloud"]);
    expect(setMenu(found,0,"cloud").menus[0]).toBe("cloud");
    expect(discoverRecipe(found,["espresso","milk"]).state).toBe(found);
    expect(discoverRecipe(fresh,["milk","drip"]).state).toBe(fresh);
    expect(discoverRecipe(fresh,["milk","milk"]).state).toBe(fresh);
    expect(fresh.coins).toBe(0);
  });
});
