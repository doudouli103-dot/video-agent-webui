import "./styles.css";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8090/api/v1";

const state = {
  apiBaseUrl: localStorage.getItem("videoAgentApiBaseUrl") || DEFAULT_API_BASE_URL,
  mode: "video",
  tasks: [],
  selectedTaskId: null,
  selectedTask: null,
  script: null,
  manifest: null,
  imageResult: null,
  loading: false,
  error: "",
  retrying: false,
  pollToken: 0,
};

const app = document.querySelector("#app");

function render() {
  app.innerHTML = `
    <main class="shell">
      <section class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">VideoAgent WebUI</p>
            <h1>AI 短视频与图片生成</h1>
          </div>
          <div class="status-pill ${state.loading ? "is-busy" : ""}">
            <span></span>
            ${state.loading ? "处理中" : "就绪"}
          </div>
        </header>

        <section class="grid">
          <form class="panel generator" id="generateForm">
            <div class="section-head">
              <h2>生成</h2>
              <div class="segmented" role="tablist" aria-label="生成类型">
                <button type="button" class="${state.mode === "video" ? "active" : ""}" data-mode="video">视频</button>
                <button type="button" class="${state.mode === "image" ? "active" : ""}" data-mode="image">图片</button>
              </div>
            </div>

            <label>
              <span>后端 API</span>
              <input name="apiBaseUrl" value="${escapeHtml(state.apiBaseUrl)}" />
            </label>

            <label>
              <span>${state.mode === "video" ? "视频主题" : "图片提示词"}</span>
              <textarea name="topic" rows="5" required>${state.mode === "video" ? "一个程序员发现自己开发的AI拥有意识" : "赛博朋克城市中的女性程序员，电影感，竖屏海报"}</textarea>
            </label>

            <div class="fields">
              <label>
                <span>风格</span>
                <input name="style" value="cinematic sci-fi" />
              </label>
              <label>
                <span>${state.mode === "video" ? "时长" : "尺寸"}</span>
                ${
                  state.mode === "video"
                    ? '<input name="duration" type="number" min="5" max="180" value="30" />'
                    : '<select name="imageSize"><option>1024x1024</option><option>1024x1792</option><option>1792x1024</option></select>'
                }
              </label>
            </div>

            ${
              state.mode === "video"
                ? `
                  <div class="fields">
                    <label>
                      <span>画幅</span>
                      <select name="aspectRatio">
                        <option>9:16</option>
                        <option>16:9</option>
                        <option>1:1</option>
                      </select>
                    </label>
                    <label>
                      <span>视频尺寸</span>
                      <select name="videoSize">
                        <option>1280x720</option>
                        <option>720x1280</option>
                        <option>1024x1024</option>
                      </select>
                    </label>
                  </div>
                `
                : ""
            }

            <div class="fields">
              <label>
                <span>图片模型</span>
                <input name="imageModel" value="qwen-image" />
              </label>
              ${
                state.mode === "video"
                  ? `
                    <label>
                      <span>视频模型</span>
                      <input name="videoModel" value="Wan2.2-TI2V-5B" />
                    </label>
                  `
                  : ""
              }
            </div>

            <button class="primary" type="submit">${state.mode === "video" ? "生成视频任务" : "生成图片"}</button>
            ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
          </form>

          <section class="panel result">
            <div class="section-head">
              <h2>${state.mode === "video" ? "任务" : "图片结果"}</h2>
              <button class="ghost" type="button" id="refreshTasks">刷新</button>
            </div>
            ${state.mode === "video" ? renderTasks() : renderImageResult()}
          </section>
        </section>

        <section class="panel details">
          <div class="section-head">
            <h2>详情</h2>
            <div class="actions">
              <button class="ghost" type="button" id="retryTask" ${canRetrySelectedTask() ? "" : "disabled"}>
                ${state.retrying ? "重试中" : "重试"}
              </button>
              <button class="ghost" type="button" id="loadScript" ${state.selectedTaskId ? "" : "disabled"}>脚本</button>
              <button class="ghost" type="button" id="loadManifest" ${state.selectedTaskId ? "" : "disabled"}>Manifest</button>
            </div>
          </div>
          ${renderDetails()}
        </section>
      </section>
    </main>
  `;

  bindEvents();
}

function renderTasks() {
  if (!state.tasks.length) {
    return `<div class="empty">暂无任务</div>`;
  }

  return `
    <div class="task-list">
      ${state.tasks
        .map(
          (task) => `
            <button class="task ${task.id === state.selectedTaskId ? "active" : ""}" data-task-id="${escapeHtml(task.id)}">
              <span class="task-title">${escapeHtml(task.topic)}</span>
              <span class="task-meta">${escapeHtml(task.status)} · ${task.progress}% · ${task.current_shot}/${task.total_shots}</span>
              <span class="bar"><i style="width:${task.progress}%"></i></span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderImageResult() {
  if (!state.imageResult) {
    return `<div class="empty">生成图片后会显示 URL、文件 ID 或占位文件路径</div>`;
  }

  const result = state.imageResult;
  return `
    <div class="image-result">
      ${result.url ? `<img src="${escapeHtml(result.url)}" alt="生成图片" />` : ""}
      <div class="download-row">
        ${result.url ? renderDownloadLink(result.url, "打开图片") : ""}
        ${result.url ? renderDownloadLink(result.url, "下载图片", true) : ""}
        ${result.download_url ? renderDownloadLink(apiUrl(result.download_url), "下载占位文件", true) : ""}
      </div>
      <dl>
        <div><dt>模型</dt><dd>${escapeHtml(result.model)}</dd></div>
        <div><dt>尺寸</dt><dd>${escapeHtml(result.size)}</dd></div>
        <div><dt>URL</dt><dd>${result.url ? `<a href="${escapeHtml(result.url)}" target="_blank">${escapeHtml(result.url)}</a>` : "-"}</dd></div>
        <div><dt>文件 ID</dt><dd>${escapeHtml(result.file_id || "-")}</dd></div>
        <div><dt>占位文件</dt><dd>${escapeHtml(result.placeholder_path || "-")}</dd></div>
      </dl>
    </div>
  `;
}

function renderDetails() {
  if (state.selectedTask) {
    const outputDownloadUrl = artifactUrlFromPath(state.selectedTask.output_path);
    return `
      <div class="summary">
        <div><span>任务 ID</span><strong>${escapeHtml(state.selectedTask.id)}</strong></div>
        <div><span>状态</span><strong>${escapeHtml(state.selectedTask.status)}</strong></div>
        <div><span>进度</span><strong>${state.selectedTask.progress}%</strong></div>
        <div><span>创建时间</span><strong>${escapeHtml(formatTime(state.selectedTask.created_at))}</strong></div>
        <div><span>更新时间</span><strong>${escapeHtml(formatTime(state.selectedTask.updated_at))}</strong></div>
        <div>
          <span>输出</span>
          <strong>
            ${escapeHtml(state.selectedTask.output_path || "-")}
            ${outputDownloadUrl ? renderDownloadLink(outputDownloadUrl, "下载输出", true) : ""}
          </strong>
        </div>
      </div>
      ${state.selectedTask.error ? `<p class="error">${escapeHtml(state.selectedTask.error)}</p>` : ""}
      ${renderManifestDownloads(state.manifest)}
      ${renderJson("脚本", state.script)}
      ${renderJson("Manifest", state.manifest)}
    `;
  }

  return `<div class="empty">选择一个视频任务后查看脚本和合成清单</div>`;
}

function renderJson(title, value) {
  if (!value) {
    return "";
  }
  return `
    <details open>
      <summary>${title}</summary>
      <pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>
    </details>
  `;
}

function renderManifestDownloads(manifest) {
  if (!manifest?.shots?.length) {
    return "";
  }

  const links = manifest.shots.flatMap((shot) => {
    const items = [];
    if (shot.image_url) {
      items.push(renderDownloadLink(shot.image_url, `镜头 ${shot.id} 图片`, true));
    }
    if (shot.video_url) {
      items.push(renderDownloadLink(shot.video_url, `镜头 ${shot.id} 视频`, true));
    }
    return items;
  });

  if (!links.length) {
    return `<div class="hint">当前 manifest 没有真实媒体 URL。本地 mock 模式只会生成 prompt 和占位清单。</div>`;
  }

  return `
    <div class="downloads">
      <h3>媒体下载</h3>
      <div class="download-row">${links.join("")}</div>
    </div>
  `;
}

function renderDownloadLink(url, label, download = false) {
  return `
    <a class="download-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer" ${download ? "download" : ""}>
      ${escapeHtml(label)}
    </a>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.error = "";
      render();
    });
  });

  document.querySelector("#generateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.apiBaseUrl = String(form.get("apiBaseUrl")).replace(/\/$/, "");
    localStorage.setItem("videoAgentApiBaseUrl", state.apiBaseUrl);

    if (state.mode === "video") {
      await createVideo(form);
    } else {
      await createImage(form);
    }
  });

  document.querySelector("#refreshTasks")?.addEventListener("click", loadTasks);
  document.querySelector("#retryTask")?.addEventListener("click", retryTask);
  document.querySelector("#loadScript")?.addEventListener("click", loadScript);
  document.querySelector("#loadManifest")?.addEventListener("click", loadManifest);

  document.querySelectorAll("[data-task-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedTaskId = button.dataset.taskId;
      state.script = null;
      state.manifest = null;
      state.pollToken += 1;
      await loadTask(state.selectedTaskId);
    });
  });
}

async function createVideo(form) {
  await withLoading(async () => {
    const payload = {
      topic: String(form.get("topic")),
      duration: Number(form.get("duration")),
      style: String(form.get("style")),
      aspect_ratio: String(form.get("aspectRatio")),
      image_model: String(form.get("imageModel")),
      video_model: String(form.get("videoModel")),
      image_size: "1024x1024",
      video_size: String(form.get("videoSize")),
    };
    const task = await postJson("/videos", payload);
    state.selectedTaskId = task.id;
    state.selectedTask = task;
    state.script = null;
    state.manifest = null;
    await loadTasks();
    pollTask(task.id);
  });
}

async function createImage(form) {
  await withLoading(async () => {
    state.imageResult = await postJson("/images", {
      prompt: String(form.get("topic")),
      style: String(form.get("style")),
      model: String(form.get("imageModel")),
      size: String(form.get("imageSize")),
    });
  });
}

async function loadTasks() {
  await withLoading(async () => {
    const result = await getJson("/videos?limit=30");
    state.tasks = result.data || [];
    if (!state.selectedTaskId && state.tasks.length) {
      state.selectedTaskId = state.tasks[0].id;
      state.selectedTask = state.tasks[0];
    }
  });
}

async function loadTask(taskId) {
  await withLoading(async () => {
    state.selectedTask = await getJson(`/videos/${encodeURIComponent(taskId)}`);
  });
}

async function loadScript() {
  if (!state.selectedTaskId) return;
  await withLoading(async () => {
    state.script = await getJson(`/videos/${encodeURIComponent(state.selectedTaskId)}/script`);
  });
}

async function loadManifest() {
  if (!state.selectedTaskId) return;
  await withLoading(async () => {
    const result = await getJson(`/videos/${encodeURIComponent(state.selectedTaskId)}/manifest`);
    state.manifest = result.data;
  });
}

async function pollTask(taskId) {
  const token = (state.pollToken += 1);
  for (let index = 0; index < 240; index += 1) {
    await wait(2000);
    if (token !== state.pollToken) {
      return;
    }
    try {
      const task = await getJson(`/videos/${encodeURIComponent(taskId)}`);
      if (token !== state.pollToken) {
        return;
      }
      state.selectedTask = task;
      state.tasks = state.tasks.map((item) => (item.id === task.id ? task : item));
      render();
      if (task.status === "COMPLETED" || task.status === "FAILED") {
        return;
      }
    } catch (error) {
      if (token !== state.pollToken) {
        return;
      }
      state.error = error.message || String(error);
      render();
      return;
    }
  }
}

async function retryTask() {
  if (!canRetrySelectedTask()) {
    return;
  }
  state.retrying = true;
  state.error = "";
  render();
  try {
    const task = await postJson(`/videos/${encodeURIComponent(state.selectedTaskId)}/retry`, {});
    state.selectedTask = task;
    state.tasks = state.tasks.map((item) => (item.id === task.id ? task : item));
    state.script = null;
    state.manifest = null;
    pollTask(task.id);
  } catch (error) {
    state.error = error.message || String(error);
  } finally {
    state.retrying = false;
    render();
  }
}

function canRetrySelectedTask() {
  return state.selectedTaskId && state.selectedTask?.status === "FAILED" && !state.retrying;
}

async function withLoading(action) {
  state.loading = true;
  state.error = "";
  render();
  try {
    await action();
  } catch (error) {
    state.error = error.message || String(error);
  } finally {
    state.loading = false;
    render();
  }
}

async function postJson(path, payload) {
  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readResponse(response);
}

async function getJson(path) {
  const response = await fetch(`${state.apiBaseUrl}${path}`);
  return readResponse(response);
}

async function readResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.detail || response.statusText);
  }
  return data;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function apiUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${state.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function artifactUrlFromPath(path) {
  if (!path) {
    return "";
  }
  const normalized = String(path).replaceAll("\\", "/");
  const marker = "/storage/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) {
    return apiUrl(`/artifacts/${normalized.slice(markerIndex + marker.length)}`);
  }
  if (normalized.startsWith("storage/")) {
    return apiUrl(`/artifacts/${normalized.slice("storage/".length)}`);
  }
  return "";
}

function formatTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadTasks().then(render);
