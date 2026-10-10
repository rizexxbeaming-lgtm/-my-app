(() => {
  const STORAGE_KEY = "pulse.planner.v1";
  const DAY_LABELS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const PRIORITY_LABEL = { hot: "Hot", glow: "Glow", soft: "Soft" };

  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor("#05010a");
      tg.setBackgroundColor("#05010a");
    } catch (_) {
      /* older clients */
    }
  }

  const state = {
    selectedDate: dateKey(new Date()),
    filter: "all",
    view: "today",
    tasks: loadTasks(),
  };

  const els = {
    greeting: document.getElementById("greeting"),
    daystrip: document.getElementById("daystrip"),
    taskList: document.getElementById("task-list"),
    empty: document.getElementById("empty-state"),
    listMeta: document.getElementById("list-meta"),
    ring: document.getElementById("ring-progress"),
    progressPct: document.getElementById("progress-pct"),
    sheet: document.getElementById("sheet"),
    backdrop: document.getElementById("sheet-backdrop"),
    form: document.getElementById("task-form"),
    title: document.getElementById("task-title"),
    time: document.getElementById("task-time"),
  };

  boot();

  function boot() {
    setGreeting();
    renderDaystrip();
    bindUi();
    render();
  }

  function setGreeting() {
    const hour = new Date().getHours();
    const name = tg?.initDataUnsafe?.user?.first_name;
    const part =
      hour < 5 ? "Ночной режим" :
      hour < 12 ? "Утренний импульс" :
      hour < 18 ? "Дневной фокус" :
      "Вечерний сет";
    els.greeting.textContent = name ? `${part}, ${name}` : part;
  }

  function bindUi() {
    document.getElementById("quick-add").addEventListener("click", openSheet);
    document.getElementById("dock-add").addEventListener("click", openSheet);
    document.getElementById("focus-mode").addEventListener("click", () => {
      document.body.classList.toggle("focus-mode");
      haptic("medium");
    });

    els.backdrop.addEventListener("click", closeSheet);
    els.form.addEventListener("submit", onSubmit);

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        state.filter = chip.dataset.filter;
        haptic("light");
        render();
      });
    });

    document.querySelectorAll(".dock-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".dock-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.view = btn.dataset.view;
        if (state.view === "today") state.selectedDate = dateKey(new Date());
        renderDaystrip();
        render();
        haptic("light");
      });
    });

    document.querySelectorAll("[data-haptic]").forEach((node) => {
      node.addEventListener("click", () => haptic(node.dataset.haptic));
    });

    if (tg) {
      tg.BackButton.onClick(closeSheet);
    }
  }

  function renderDaystrip() {
    const base = startOfWeek(new Date());
    els.daystrip.innerHTML = "";

    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = dateKey(d);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day" + (key === state.selectedDate ? " is-active" : "");
      btn.innerHTML = `<small>${DAY_LABELS[d.getDay()]}</small><strong>${d.getDate()}</strong>`;
      btn.addEventListener("click", () => {
        state.selectedDate = key;
        state.view = "week";
        document.querySelectorAll(".dock-btn").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.view === "week");
        });
        renderDaystrip();
        render();
        haptic("light");
      });
      els.daystrip.appendChild(btn);
    }
  }

  function visibleTasks() {
    let list = state.tasks.filter((t) => t.date === state.selectedDate);

    if (state.filter === "open") list = list.filter((t) => !t.done);
    if (state.filter === "done") list = list.filter((t) => t.done);
    if (state.filter === "hot") list = list.filter((t) => t.priority === "hot");

    const rank = { hot: 0, glow: 1, soft: 2 };
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return rank[a.priority] - rank[b.priority];
    });
  }

  function render() {
    const dayTasks = state.tasks.filter((t) => t.date === state.selectedDate);
    const done = dayTasks.filter((t) => t.done).length;
    const total = dayTasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const circ = 2 * Math.PI * 52;

    els.ring.style.strokeDasharray = String(circ);
    els.ring.style.strokeDashoffset = String(circ - (circ * pct) / 100);
    els.ring.style.stroke = pct >= 100 ? "var(--cyan)" : "var(--pink)";
    els.progressPct.textContent = `${pct}%`;

    const list = visibleTasks();
    els.taskList.innerHTML = "";
    els.empty.classList.toggle("is-visible", list.length === 0);
    els.listMeta.textContent = `${list.length} ${plural(list.length, "действие", "действия", "действий")}`;

    list.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "task" + (task.done ? " is-done" : "");
      li.dataset.priority = task.priority;
      li.style.animationDelay = `${Math.min(index * 0.04, 0.24)}s`;

      li.innerHTML = `
        <button type="button" class="check" aria-label="Отметить"></button>
        <div class="task-body">
          <p class="task-title"></p>
          <p class="task-meta">
            <span class="pill pill-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
            <span class="time"></span>
          </p>
        </div>
        <button type="button" class="task-delete" aria-label="Удалить">✕</button>
      `;

      li.querySelector(".task-title").textContent = task.title;
      li.querySelector(".time").textContent = task.time ? task.time : "без времени";

      li.querySelector(".check").addEventListener("click", () => toggleTask(task.id));
      li.querySelector(".task-body").addEventListener("click", () => toggleTask(task.id));
      li.querySelector(".task-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        removeTask(task.id);
      });

      els.taskList.appendChild(li);
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    const title = els.title.value.trim();
    if (!title) return;

    const priority = els.form.querySelector('input[name="priority"]:checked')?.value || "glow";
    state.tasks.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title,
      time: els.time.value || "",
      priority,
      date: state.selectedDate,
      done: false,
      createdAt: Date.now(),
    });

    saveTasks();
    els.form.reset();
    els.form.querySelector('input[name="priority"][value="hot"]').checked = true;
    closeSheet();
    render();
    haptic("success");
    if (tg?.showPopup) {
      /* keep silent — visual feedback is enough */
    }
  }

  function toggleTask(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    saveTasks();
    render();
    haptic(task.done ? "success" : "light");
  }

  function removeTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
    haptic("warning");
  }

  function openSheet() {
    els.backdrop.hidden = false;
    requestAnimationFrame(() => {
      els.backdrop.classList.add("is-open");
      els.sheet.classList.add("is-open");
      els.sheet.setAttribute("aria-hidden", "false");
    });
    tg?.BackButton?.show();
    setTimeout(() => els.title.focus(), 220);
  }

  function closeSheet() {
    els.backdrop.classList.remove("is-open");
    els.sheet.classList.remove("is-open");
    els.sheet.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      els.backdrop.hidden = true;
    }, 250);
    tg?.BackButton?.hide();
  }

  function haptic(type) {
    try {
      const h = tg?.HapticFeedback;
      if (!h) return;
      if (type === "success" || type === "warning" || type === "error") {
        h.notificationOccurred(type);
      } else {
        h.impactOccurred(type || "light");
      }
    } catch (_) {
      /* ignore */
    }
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedTasks();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : seedTasks();
    } catch {
      return seedTasks();
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  }

  function seedTasks() {
    const today = dateKey(new Date());
    return [
      {
        id: "seed-1",
        title: "Разобрать входящие",
        time: "10:00",
        priority: "hot",
        date: today,
        done: false,
        createdAt: Date.now() - 3000,
      },
      {
        id: "seed-2",
        title: "Прогулка 20 минут",
        time: "13:30",
        priority: "soft",
        date: today,
        done: false,
        createdAt: Date.now() - 2000,
      },
      {
        id: "seed-3",
        title: "Закрыть один важный кусок работы",
        time: "16:00",
        priority: "glow",
        date: today,
        done: false,
        createdAt: Date.now() - 1000,
      },
    ];
  }

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function startOfWeek(d) {
    const copy = new Date(d);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }
})();
