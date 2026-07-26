/* =========================================================
   서울대 빅데이터 핀테크 AI 고급 전문과정 13기 - 수업자료 아카이브
   tabs(해시 라우팅) / 파일목록(GitHub API) / 드래그앤드롭 업로드(서버리스 함수 경유)
   ========================================================= */

/* ---------------------------------------------------------
   설정값 — 저장소·경로·업로드 엔드포인트를 여기서만 관리합니다.
   --------------------------------------------------------- */
const CONFIG = {
  GITHUB_OWNER: "binsue0",
  GITHUB_REPO: ".github",
  GITHUB_BRANCH: "main",

  // 통계 탭 하위 폴더가 매핑되는 실제 저장소 경로
  FOLDER_PATHS: {
    project_progress: "Basic_day1/project_progress",
    lecture_materials: "Basic_day1/lecture_materials",
  },

  // Level B 업로드를 처리할 서버리스 함수(Cloudflare Worker) 주소.
  // 배포 후 이 값을 실제 워커 URL로 교체하세요.
  // 예: "https://snu-fintech-uploader.<your-subdomain>.workers.dev/upload"
  UPLOAD_ENDPOINT: "https://REPLACE-WITH-YOUR-WORKER-URL.workers.dev/upload",

  MAX_FILE_SIZE_MB: 25,
  ALLOWED_EXTENSIONS: [".pdf", ".py", ".ipynb", ".js", ".html", ".css", ".txt", ".md", ".csv", ".json"],
};

/* ---------------------------------------------------------
   업로드 비밀번호 — 세션 동안만 메모리에 보관 (새로고침하면 다시 입력)
   실제 검증은 서버(Worker) 쪽에서 이루어지므로, 여기서는 입력값을
   그대로 전달만 합니다. 클라이언트 코드에 정답 비밀번호를 절대
   하드코딩하지 마세요.
   --------------------------------------------------------- */
let cachedPassword = null;

/* =========================================================
   1. 해시(#) 기반 라우팅 — 탭·폴더 상태를 URL에 반영해 딥링크 지원
   ---------------------------------------------------------
   URL 형태:
     #stats/project_progress   → 통계 탭 · 프로젝트
     #stats/lecture_materials  → 통계 탭 · 수업자료
     #ml                       → 기계학습과 딥러닝 탭
   해시가 없으면 기본값(통계 · 프로젝트)으로 진입합니다.
   이 URL을 그대로 복사해서 공유하면, 상대방이 접속했을 때
   같은 탭·같은 폴더가 자동으로 열립니다.
   과목이 늘어나도(최대 10개) data-tab 값만 늘리면 동일하게 동작합니다.
   ========================================================= */
const DEFAULT_ROUTE = { tab: "stats", folder: "project_progress" };

function parseRouteFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { ...DEFAULT_ROUTE };

  const [tab, folder] = raw.split("/");
  const validTab = document.querySelector(`.tab-btn[data-tab="${tab}"]`) ? tab : DEFAULT_ROUTE.tab;

  if (validTab !== "stats") return { tab: validTab, folder: null };

  const validFolder = folder in CONFIG.FOLDER_PATHS ? folder : DEFAULT_ROUTE.folder;
  return { tab: "stats", folder: validFolder };
}

function routeToHash(tab, folder) {
  return tab === "stats" ? `#stats/${folder}` : `#${tab}`;
}

/** 실제 화면(탭/서브탭/패널)에 라우트 상태를 반영합니다. */
function renderRoute(route) {
  // 메인 탭 버튼 + 패널
  document.querySelectorAll(".tab-btn").forEach((b) => {
    const active = b.dataset.tab === route.tab;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const isTarget = panel.id === `panel-${route.tab}`;
    panel.classList.toggle("is-active", isTarget);
    panel.hidden = !isTarget;
  });

  // 통계 탭일 때만 서브탭(폴더) 반영
  if (route.tab === "stats" && route.folder) {
    document.querySelectorAll(".subtab-btn").forEach((b) => {
      const active = b.dataset.folder === route.folder;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".folder-panel").forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === `folder-${route.folder}`);
    });
  }
}

/** 클릭으로 라우트를 바꿀 때: 해시만 갱신 → hashchange 이벤트가 화면 반영을 담당 */
function navigateTo(tab, folder) {
  const nextHash = routeToHash(tab, folder);
  if (window.location.hash === nextHash) {
    renderRoute({ tab, folder }); // 같은 해시라도 즉시 반영되도록 보정
  } else {
    window.location.hash = nextHash;
  }
}

function initRouting() {
  // 메인 탭(우측 세로 탭) 클릭 — 과목이 늘어나도 동일하게 동작
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      navigateTo(tab, tab === "stats" ? DEFAULT_ROUTE.folder : null);
    });
  });

  // 하위 폴더 서브탭 클릭
  document.querySelectorAll(".subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo("stats", btn.dataset.folder));
  });

  // 뒤로가기/앞으로가기 및 해시 직접 변경 대응
  window.addEventListener("hashchange", () => renderRoute(parseRouteFromHash()));

  // 최초 진입 시 URL의 해시를 읽어 초기 화면 결정
  renderRoute(parseRouteFromHash());
}

/* =========================================================
   1-1. "이 화면 링크 복사" 버튼 — URL만 공유하면 해당 폴더로 바로 이동
   ========================================================= */
function initCopyLinkButtons() {
  const toast = document.getElementById("toast");
  let toastTimer = null;

  document.querySelectorAll(".link-btn[data-route]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const [tab, folder] = btn.dataset.route.split("/");
      const url = `${window.location.origin}${window.location.pathname}${routeToHash(tab, folder)}`;

      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // 클립보드 API 미지원 브라우저 대비 폴백
        const temp = document.createElement("textarea");
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }

      toast.classList.add("is-visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
    });
  });
}

/* =========================================================
   2. GitHub 저장소 파일 목록 불러오기 (읽기 전용, 인증 불필요)
   ========================================================= */
async function loadFileList(folderKey, listElId) {
  const listEl = document.getElementById(listElId);
  listEl.innerHTML = `<li class="file-list-loading">불러오는 중...</li>`;

  const path = CONFIG.FOLDER_PATHS[folderKey];
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}?ref=${CONFIG.GITHUB_BRANCH}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (res.status === 404) {
      // 폴더가 아직 없는 경우 (첫 업로드 전)
      listEl.innerHTML = `<li class="file-list-empty">아직 업로드된 파일이 없습니다.</li>`;
      return;
    }
    if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);

    const items = await res.json();
    const files = (Array.isArray(items) ? items : []).filter((i) => i.type === "file");

    if (files.length === 0) {
      listEl.innerHTML = `<li class="file-list-empty">아직 업로드된 파일이 없습니다.</li>`;
      return;
    }

    listEl.innerHTML = "";
    files
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((file) => listEl.appendChild(renderFileRow(file)));
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<li class="file-list-empty">목록을 불러오지 못했습니다. (GitHub API 요청 제한일 수 있습니다)</li>`;
  }
}

function renderFileRow(file) {
  const li = document.createElement("li");
  const ext = file.name.split(".").pop().toLowerCase();
  const isPdf = ext === "pdf";
  const iconLabel = isPdf ? "PDF" : ext.slice(0, 3).toUpperCase();

  li.innerHTML = `
    <span class="file-icon ${isPdf ? "pdf" : "code"}">${iconLabel}</span>
    <a class="file-name" href="${file.html_url}" target="_blank" rel="noopener">${file.name}</a>
    <span class="file-meta">${formatBytes(file.size)}</span>
  `;
  return li;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* =========================================================
   3. 비밀번호 모달 (Promise 기반)
   ========================================================= */
function askPassword() {
  return new Promise((resolve) => {
    const backdrop = document.getElementById("passwordModal");
    const input = document.getElementById("uploadPassword");
    const errorMsg = document.getElementById("modalError");
    const confirmBtn = document.getElementById("modalConfirm");
    const cancelBtn = document.getElementById("modalCancel");

    errorMsg.hidden = true;
    input.value = "";
    backdrop.hidden = false;
    input.focus();

    function cleanup() {
      backdrop.hidden = true;
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      input.removeEventListener("keydown", onKeydown);
    }
    function onConfirm() {
      cleanup();
      resolve(input.value);
    }
    function onCancel() {
      cleanup();
      resolve(null);
    }
    function onKeydown(e) {
      if (e.key === "Enter") onConfirm();
      if (e.key === "Escape") onCancel();
    }

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    input.addEventListener("keydown", onKeydown);
  });
}

/* =========================================================
   4. 드래그앤드롭 업로드
   ========================================================= */
function initDropzone() {
  const dropzone = document.getElementById("dropzone-project");
  const fileInput = document.getElementById("fileInput-project");

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) handleFiles(files);
  });

  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    if (files.length) handleFiles(files);
    fileInput.value = ""; // 같은 파일 재선택 가능하도록 초기화
  });
}

async function handleFiles(files) {
  const validFiles = files.filter((f) => validateFile(f));
  if (validFiles.length === 0) return;

  if (cachedPassword === null) {
    const pw = await askPassword();
    if (pw === null) return; // 사용자가 취소
    cachedPassword = pw;
  }

  for (const file of validFiles) {
    await uploadOneFile(file);
  }

  loadFileList("project_progress", "fileList-project");
}

function validateFile(file) {
  const sizeOk = file.size <= CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
  const ext = "." + file.name.split(".").pop().toLowerCase();
  const extOk = CONFIG.ALLOWED_EXTENSIONS.includes(ext);

  if (!sizeOk) {
    alert(`"${file.name}" 파일이 ${CONFIG.MAX_FILE_SIZE_MB}MB를 초과합니다.`);
    return false;
  }
  if (!extOk) {
    alert(`"${file.name}"은 허용되지 않는 파일 형식입니다.`);
    return false;
  }
  return true;
}

function addQueueItem(fileName) {
  const queue = document.getElementById("uploadQueue-project");
  const li = document.createElement("li");
  li.className = "upload-item";
  li.innerHTML = `
    <span class="upload-item-name">${fileName}</span>
    <span class="upload-item-bar"><span class="upload-item-bar-fill"></span></span>
    <span class="upload-item-status">업로드 중...</span>
  `;
  queue.appendChild(li);
  return li;
}

async function uploadOneFile(file) {
  const itemEl = addQueueItem(file.name);
  const barFill = itemEl.querySelector(".upload-item-bar-fill");
  const statusEl = itemEl.querySelector(".upload-item-status");
  barFill.style.width = "35%";

  try {
    const base64Content = await fileToBase64(file);
    barFill.style.width = "70%";

    const res = await fetch(CONFIG.UPLOAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: CONFIG.GITHUB_OWNER,
        repo: CONFIG.GITHUB_REPO,
        branch: CONFIG.GITHUB_BRANCH,
        path: `${CONFIG.FOLDER_PATHS.project_progress}/${file.name}`,
        content: base64Content,
        message: `업로드: ${file.name} (수업자료 아카이브)`,
        password: cachedPassword,
      }),
    });

    if (res.status === 401) {
      cachedPassword = null; // 비밀번호 오류 → 다음 업로드 때 다시 물어봄
      throw new Error("비밀번호가 올바르지 않습니다.");
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `업로드 실패 (${res.status})`);
    }

    itemEl.classList.add("is-success");
    statusEl.textContent = "완료";
  } catch (err) {
    console.error(err);
    itemEl.classList.add("is-error");
    statusEl.textContent = err.message || "업로드 실패";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // data:application/pdf;base64,XXXX... 형태에서 base64 부분만 추출
      const result = reader.result;
      const base64 = result.substring(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================================================
   초기화
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initRouting();
  initCopyLinkButtons();
  initDropzone();

  loadFileList("project_progress", "fileList-project");
  loadFileList("lecture_materials", "fileList-lecture");

  document
    .getElementById("refreshBtn-project")
    .addEventListener("click", () => loadFileList("project_progress", "fileList-project"));
  document
    .getElementById("refreshBtn-lecture")
    .addEventListener("click", () => loadFileList("lecture_materials", "fileList-lecture"));
});
