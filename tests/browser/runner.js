const frame = document.querySelector("#app");
const wait = async (predicate) => {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error("Timed out waiting for expected UI");
};
const doc = () => frame.contentDocument;
const el = (id) => doc().getElementById(id);
const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const txt = (id) => el(id).textContent;
async function reset(options = {}) {
  window.qa = { errors: [], ...options };
  localStorage.clear(); // Test origin only (8002), not the app on 8001.
  frame.src = "/?case=" + Math.random();
  await new Promise((resolve) => (frame.onload = resolve));
  await wait(() => el("refresh") && !el("refresh").disabled);
}
async function ready() {
  await wait(() => txt("station-source").includes("KMDW"));
}
async function search(name, keyboard = false) {
  const input = el("city-search");
  input.focus();
  input.value = name;
  input.dispatchEvent(
    new frame.contentWindow.Event("input", { bubbles: true }),
  );
  el("search-form").dispatchEvent(
    new frame.contentWindow.Event("submit", {
      bubbles: true,
      cancelable: true,
    }),
  );
  await wait(
    () => !el("suggestions").hidden && el("suggestions").children.length,
  );
  if (keyboard) {
    input.dispatchEvent(
      new frame.contentWindow.KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert(
      input.hasAttribute("aria-activedescendant"),
      "Active search result not announced",
    );
    input.dispatchEvent(
      new frame.contentWindow.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
  } else el("suggestions").children[0].click();
}
const cases = [
  [
    "Observed temperature and model forecast are in separate sections",
    async () => {
      await reset();
      await ready();
      assert(txt("current-temp") === "52°", "Station conversion incorrect");
      assert(
        !el("current-title").closest("section").contains(el("current-icon")),
        "Forecast icon inside observation card",
      );
      assert(
        el("outlook-title").closest("section").contains(el("current-icon")),
        "Forecast icon missing",
      );
    },
  ],
  [
    "Keyboard city selection changes both the forecast and station",
    async () => {
      await reset();
      await ready();
      await search("Bauxite", true);
      await wait(
        () =>
          txt("location-name") === "Bauxite" &&
          txt("station-source").includes("KSUZ"),
      );
      assert(
        txt("current-temp") === "70°",
        "Wrong station after switching city",
      );
      assert(
        el("city-search").getAttribute("aria-expanded") === "false",
        "Search remains expanded",
      );
    },
  ],
  [
    "Late city responses cannot replace the latest selection",
    async () => {
      await reset({ slowBauxite: true });
      await ready();
      await search("Bauxite");
      await search("Chicago");
      await wait(
        () => txt("location-name") === "Chicago" && !el("refresh").disabled,
      );
      await new Promise((r) => setTimeout(r, 750));
      assert(
        txt("location-name") === "Chicago" &&
          txt("station-source").includes("KMDW"),
        "Late response replaced selected city",
      );
    },
  ],
  [
    "Initial forecast failure can recover through Try again",
    async () => {
      await reset({ failForecast: true });
      assert(!el("retry").hidden, "Missing retry control");
      assert(el("weather-content").hidden, "Incomplete weather shown");
      qa.failForecast = false;
      el("retry").click();
      await ready();
      assert(!el("weather-content").hidden, "Forecast did not recover");
    },
  ],
  [
    "Refresh failure keeps the previous city clearly labeled",
    async () => {
      await reset();
      await ready();
      qa.failForecast = true;
      el("refresh").click();
      await wait(() => !el("refresh").disabled);
      assert(
        txt("notice-text").includes("Previous forecast for Chicago"),
        "Old data not labeled",
      );
      assert(txt("location-name") === "Chicago", "City lost on error");
    },
  ],
  [
    "Old, missing, rejected and failed station reports never become model temperatures",
    async () => {
      for (const mode of ["stale", "missing", "rejected", "failure"]) {
        await reset({ stationMode: mode });
        await wait(() => !txt("station-source").includes("Checking"));
        assert(
          txt("current-temp") === "—",
          "Invalid observation displayed: " + mode,
        );
        assert(
          doc().querySelectorAll(".hour-card").length === 12,
          "Forecast missing: " + mode,
        );
      }
    },
  ],
  [
    "An observation that ages out is removed from the current reading",
    async () => {
      await reset();
      await ready();
      qa.clockDelta = 7200000;
      el("unit-c").click();
      assert(
        txt("current-temp") === "—",
        "Expired temperature remains current",
      );
      assert(txt("updated-at").includes("Out of date"), "Missing expiry label");
    },
  ],
  [
    "Outside US coverage, forecasts remain available",
    async () => {
      await reset();
      await ready();
      await search("Tokyo");
      await wait(() => txt("location-name") === "Tokyo");
      await wait(() => txt("station-source").includes("US locations"));
      assert(
        txt("current-temp") === "—",
        "Unsupported station temperature shown",
      );
      assert(
        doc().querySelectorAll(".hour-card").length === 12,
        "International forecast missing",
      );
    },
  ],
  [
    "24-hour graph, data table and units stay in sync",
    async () => {
      await reset();
      await ready();
      el("hours-toggle").click();
      assert(
        doc().querySelectorAll("#temperature-chart circle").length === 24,
        "Wrong point count",
      );
      assert(
        el("hourly-table").children.length === 24,
        "Wrong table row count",
      );
      el("unit-c").click();
      assert(txt("current-temp") === "11°", "Celsius conversion incorrect");
      assert(txt("chart-summary").includes("°C"), "Chart units not updated");
      el("unit-f").click();
      assert(txt("current-temp") === "52°", "Fahrenheit conversion incorrect");
    },
  ],
  [
    "Empty search and Escape give clear keyboard feedback",
    async () => {
      await reset();
      await ready();
      await search("Bauxite");
      await wait(() => txt("location-name") === "Bauxite");
      const input = el("city-search");
      input.value = "zzzz";
      el("search-form").dispatchEvent(
        new frame.contentWindow.Event("submit", {
          bubbles: true,
          cancelable: true,
        }),
      );
      await wait(() => txt("search-status").includes("No matching"));
      assert(el("suggestions").hidden, "Empty suggestions visible");
      input.dispatchEvent(
        new frame.contentWindow.KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        }),
      );
      assert(
        txt("search-status").includes("dismissed"),
        "Escape feedback missing",
      );
    },
  ],
  [
    "Mobile layout scrolls hours without overflowing the page",
    async () => {
      frame.style.width = "390px";
      await reset();
      await ready();
      assert(
        doc().documentElement.scrollWidth <= frame.contentWindow.innerWidth,
        "Page overflows mobile viewport",
      );
      const scroll = doc().querySelector(".hourly-scroll");
      scroll.dispatchEvent(
        new frame.contentWindow.KeyboardEvent("keydown", {
          key: "End",
          bubbles: true,
          cancelable: true,
        }),
      );
      await wait(() => scroll.scrollLeft > 0);
      assert(scroll.scrollLeft > 0, "Keyboard navigation failed");
      frame.style.width = "100%";
    },
  ],
];
document.querySelector("#run").addEventListener("click", async () => {
  const button = document.querySelector("#run");
  button.disabled = true;
  document.querySelector("#results").replaceChildren();
  let passed = 0;
  for (const [name, run] of cases) {
    const li = document.createElement("li");
    li.textContent = name;
    document.querySelector("#results").append(li);
    document.querySelector("#result").textContent = "Running: " + name;
    try {
      await run();
      assert(!qa.errors.length, qa.errors.join("; "));
      li.className = "pass";
      li.textContent = "PASS · " + name;
      passed++;
    } catch (e) {
      li.className = "fail";
      li.textContent = "FAIL · " + name + " — " + e.message;
    }
  }
  document.querySelector("#result").textContent =
    passed + "/" + cases.length + " browser checks passed";
  button.disabled = false;
});
